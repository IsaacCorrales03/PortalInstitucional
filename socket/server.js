/**
 * Servidor Socket.IO — Sistema de Votación
 * Node.js standalone, corre separado de FastAPI y de Next.js
 *
 * Instalar: npm install socket.io express cors axios
 * Correr:   node server.js
 *
 * Variables de entorno:
 *   PORT           Puerto de este servidor        (default: 3001)
 *   FASTAPI_URL    URL base del backend FastAPI   (default: http://localhost:8000)
 *   ALLOWED_ORIGIN URL del frontend Next.js       (default: http://localhost:3000)
 */

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const axios      = require("axios");

const PORT           = process.env.PORT           || 3001;
const FASTAPI_URL    = process.env.FASTAPI_URL    || "http://localhost:8000";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:3000";

const app    = express();
const server = http.createServer(app);
app.use(express.json());

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN, methods: ["GET", "POST"] },
});

// ─── Estado en memoria ────────────────────────────────────────────────────────
// salas[salaId] = { nombre, votos: [{ votanteId, timestamp }] }
const salas = {};
// votosPendientes[salaId][socketId] = { votanteId, partidoId }
// El partido NUNCA sale del servidor hacia el auxiliar
const votosPendientes = {};

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_, res) =>
  res.json({ ok: true, salas: Object.keys(salas) })
);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[+] conectado: ${socket.id}`);

  // Crear sala — lo hace el votante
  socket.on("crear_sala", ({ nombre, processId }, cb) => {
    const salaId = `sala-${Date.now()}`;
    salas[salaId] = { nombre, processId, votos: [] }; // + processId
    votosPendientes[salaId] = {};
    socket.join(salaId);
    socket.data.salaId = salaId;
    console.log(`[sala] creada: ${salaId} — "${nombre}" (proceso: ${processId})`);
    cb?.({ ok: true, salaId, nombre });
  });

  // Unirse a sala — lo hace el auxiliar
  socket.on("unirse_sala", ({ salaId }, cb) => {
    if (!salas[salaId]) {
      cb?.({ ok: false, error: "Sala no encontrada" });
      return;
    }
    socket.join(salaId);
    socket.data.salaId = salaId;
    console.log(`[sala] auxiliar ${socket.id} → ${salaId}`);
    cb?.({ ok: true, nombre: salas[salaId].nombre });
  });

  // Listar salas activas
  socket.on("listar_salas", (_, cb) => {
    const lista = Object.entries(salas).map(([id, s]) => ({
      salaId: id,
      nombre: s.nombre,
      totalVotos: s.votos.length,
    }));
    cb?.({ ok: true, salas: lista });
  });

  // Emitir voto — votante envía partido, el servidor lo guarda internamente
  socket.on("emitir_voto", ({ salaId, votanteId, partidoId }, cb) => {
    if (!salas[salaId]) {
      cb?.({ ok: false, error: "Sala no encontrada" });
      return;
    }
    const yaVoto = salas[salaId].votos.some((v) => v.votanteId === votanteId);
    if (yaVoto) {
      cb?.({ ok: false, error: "Este votante ya emitió su voto" });
      return;
    }

    // Guardar partido solo en servidor — auxiliar nunca lo recibe
    votosPendientes[salaId][socket.id] = { votanteId, partidoId };

    // Al auxiliar solo llega el ID del votante
    io.to(salaId).emit("voto_pendiente", {
      socketId:  socket.id,
      votanteId,
      timestamp: new Date().toISOString(),
    });

    cb?.({ ok: true });
    console.log(`[voto] pendiente — sala: ${salaId}, votante: ${votanteId}`);
  });

  // Aceptar voto — auxiliar aprueba, servidor persiste en FastAPI
socket.on("aceptar_voto", async ({ salaId, socketId }, cb) => {
  const pendiente = votosPendientes[salaId]?.[socketId];
  if (!pendiente) {
    cb?.({ ok: false, error: "Voto no encontrado o ya procesado" });
    return;
  }

  const { votanteId, partidoId } = pendiente;

  try {
    // Llamada 1 — registra participación, sin partido
    await axios.post(`${FASTAPI_URL}/electoral/votos/participacion`, {
      sala_id:    salaId,
      votante_id: votanteId,
      process_id: salas[salaId].processId, // ver nota abajo
    });

    // Llamada 2 — suma al contador, sin votante
    // Solo si no es voto nulo
    if (partidoId !== null) {
      await axios.post(`${FASTAPI_URL}/electoral/votos/sumar`, {
        partido_id: partidoId,
      });
    }

    salas[salaId].votos.push({ votanteId, timestamp: new Date().toISOString() });
    delete votosPendientes[salaId][socketId];

    io.to(salaId).emit("voto_aceptado", { socketId, votanteId });
    io.to(socketId).emit("tu_voto_aceptado");

    cb?.({ ok: true });
    console.log(`[voto] aceptado — sala: ${salaId}, partido: ${partidoId ?? "nulo"}`);
  } catch (err) {
    console.error("[error] al persistir voto:", err.response?.data ?? err.message);
    cb?.({ ok: false, error: "Error al guardar el voto" });
  }
});

  // Rechazar voto — auxiliar rechaza
  socket.on("rechazar_voto", ({ salaId, socketId }, cb) => {
    const pendiente = votosPendientes[salaId]?.[socketId];
    if (!pendiente) {
      cb?.({ ok: false, error: "Voto no encontrado" });
      return;
    }
    const { votanteId } = pendiente;
    delete votosPendientes[salaId][socketId];

    io.to(salaId).emit("voto_rechazado", { socketId, votanteId });
    io.to(socketId).emit("tu_voto_rechazado");

    cb?.({ ok: true });
    console.log(`[voto] rechazado — sala: ${salaId}, votante: ${votanteId}`);
  });

  // Desconexión — limpiar votos pendientes huérfanos
  socket.on("disconnect", () => {
    console.log(`[-] desconectado: ${socket.id}`);
    for (const salaId of Object.keys(votosPendientes)) {
      delete votosPendientes[salaId][socket.id];
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n✓ Socket.IO corriendo en :${PORT}`);
  console.log(`  FastAPI:  ${FASTAPI_URL}`);
  console.log(`  CORS:     ${ALLOWED_ORIGIN}\n`);
});
