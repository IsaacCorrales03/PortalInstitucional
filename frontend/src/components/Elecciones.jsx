"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { getPartidos } from "@/lib/api";
import styles from "./EleccionesView.module.css";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
function useSocket() {
  const socketRef = useRef(null);
  const [conectado, setConectado] = useState(false);
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect",    () => setConectado(true));
    socket.on("disconnect", () => setConectado(false));
    return () => socket.disconnect();
  }, []);
  return { socket: socketRef, conectado };
}

// ─── Status dot ──────────────────────────────────────────────────────────────
function StatusDot({ conectado }) {
  return (
    <span className={`${styles.statusBar} ${conectado ? styles.statusOnline : styles.statusOffline}`}>
      <span className={`${styles.dot} ${conectado ? styles.dotOnline : styles.dotOffline}`} />
      {conectado ? "Conectado" : "Conectando…"}
    </span>
  );
}

// ─── Admin ────────────────────────────────────────────────────────────────────
function AdminView({ socket, conectado }) {
  const [salas,      setSalas]      = useState([]);
  const [salaActiva, setSalaActiva] = useState(null);
  const [votosPend,  setVotosPend]  = useState([]);
  const [votosProc,  setVotosProc]  = useState([]);
  const [cargando,   setCargando]   = useState(false);

  const cargarSalas = useCallback(() => {
    socket.current?.emit("listar_salas", {}, (res) => {
      if (res.ok) setSalas(res.salas);
    });
  }, [socket]);

  useEffect(() => { if (conectado) cargarSalas(); }, [conectado, cargarSalas]);

  const entrarSala = (salaId) => {
    socket.current?.emit("unirse_sala", { salaId }, (res) => {
      if (res.ok) { setSalaActiva(salaId); setVotosPend([]); setVotosProc([]); }
    });
  };

  useEffect(() => {
    const sock = socket.current;
    if (!sock || !salaActiva) return;
    const onPendiente = ({ socketId, votanteId, timestamp }) =>
      setVotosPend((prev) => prev.find((v) => v.socketId === socketId) ? prev : [...prev, { socketId, votanteId, timestamp }]);
    const onAceptado  = ({ socketId, votanteId }) => {
      setVotosPend((prev) => prev.filter((v) => v.socketId !== socketId));
      setVotosProc((prev) => [...prev, { votanteId, estado: "aceptado" }]);
    };
    const onRechazado = ({ socketId, votanteId }) => {
      setVotosPend((prev) => prev.filter((v) => v.socketId !== socketId));
      setVotosProc((prev) => [...prev, { votanteId, estado: "rechazado" }]);
    };
    sock.on("voto_pendiente", onPendiente);
    sock.on("voto_aceptado",  onAceptado);
    sock.on("voto_rechazado", onRechazado);
    return () => {
      sock.off("voto_pendiente", onPendiente);
      sock.off("voto_aceptado",  onAceptado);
      sock.off("voto_rechazado", onRechazado);
    };
  }, [socket, salaActiva]);

  const procesarVoto = (socketId, accion) => {
    setCargando(true);
    socket.current?.emit(accion, { salaId: salaActiva, socketId }, (res) => {
      setCargando(false);
      if (!res.ok) alert(`Error: ${res.error}`);
    });
  };

  const salaInfo = salas.find((s) => s.salaId === salaActiva);

  if (salaActiva) {
    return (
      <div className={styles.cardStack}>
        {/* Header */}
        <div className={styles.topbar}>
          <div>
            <p className={styles.heading}>{salaInfo?.nombre ?? salaActiva}</p>
            <p className={styles.sub}>Monitoreando como auxiliar</p>
          </div>
          <button className={`${styles.btn} ${styles.btnSec}`} onClick={() => { setSalaActiva(null); cargarSalas(); }}>
            ← Volver
          </button>
        </div>

        {/* Pendientes */}
        <div className={styles.card}>
          <p className={styles.heading} style={{ fontSize: "0.9375rem", marginBottom: "0.75rem" }}>
            Votos pendientes ({votosPend.length})
          </p>
          {votosPend.length === 0 ? (
            <p className={styles.empty}>Esperando votos…</p>
          ) : (
            <div className={styles.cardStack}>
              {votosPend.map((v) => (
                <div key={v.socketId} className={styles.votoPendRow}>
                  <div>
                    <p className={styles.votoPendId}>ID: {v.votanteId}</p>
                    <p className={styles.votoPendTime}>{new Date(v.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <div className={styles.btnGroup}>
                    <button className={`${styles.btn} ${styles.btnOk}`} disabled={cargando} onClick={() => procesarVoto(v.socketId, "aceptar_voto")}>✓ Aceptar</button>
                    <button className={`${styles.btn} ${styles.btnDan}`} disabled={cargando} onClick={() => procesarVoto(v.socketId, "rechazar_voto")}>✗ Rechazar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Procesados */}
        {votosProc.length > 0 && (
          <div className={styles.card}>
            <p className={styles.heading} style={{ fontSize: "0.9375rem", marginBottom: "0.75rem" }}>
              Procesados ({votosProc.length})
            </p>
            <div className={styles.procesadosList}>
              {[...votosProc].reverse().map((v, i) => (
                <div key={i} className={styles.procesadoRow}>
                  <span className={`${styles.mono} ${styles.sub}`}>{v.votanteId}</span>
                  <span className={`${styles.badge} ${v.estado === "aceptado" ? styles.badgeOk : styles.badgeDan}`}>
                    {v.estado}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.cardStack}>
      <div className={styles.topbar}>
        <p className={styles.heading}>Salas activas</p>
        <button className={`${styles.btn} ${styles.btnSec}`} onClick={cargarSalas}>↻ Actualizar</button>
      </div>
      {salas.length === 0 ? (
        <div className={styles.card}><p className={styles.empty}>No hay salas activas</p></div>
      ) : (
        <div className={styles.cardStack}>
          {salas.map((sala) => (
            <div key={sala.salaId} className={`${styles.card} ${styles.salaRow}`}>
              <div>
                <p className={styles.salaName}>{sala.nombre}</p>
                <p className={styles.salaId}>{sala.salaId}</p>
                <p className={styles.salaVotos}>{sala.totalVotos} voto(s) procesado(s)</p>
              </div>
              <button className={`${styles.btn} ${styles.btnPri}`} onClick={() => entrarSala(sala.salaId)}>
                Monitorear →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Votante ──────────────────────────────────────────────────────────────────
function VotanteView({ socket, conectado }) {
  const [paso,       setPaso]       = useState("inicio");
  const [salaId,     setSalaId]     = useState("");
  const [nombreSala, setNombreSala] = useState("");
  const [votanteId,  setVotanteId]  = useState("");
  const [partidos,   setPartidos]   = useState([]);
  const [seleccion,  setSeleccion]  = useState(null);
  const [resultado,  setResultado]  = useState(null);
  const [error,      setError]      = useState("");
  const [cargando,   setCargando]   = useState(false);
  const [processId, setProcessId] = useState("");

  useEffect(() => {
    if (paso !== "votar" || partidos.length > 0) return;
    getPartidos({ status: "aprobado" })
      .then((data) => setPartidos(data.filter((p) => p.status === "aprobado")))
      .catch(() => setError("No se pudieron cargar los partidos"));
  }, [paso, partidos.length]);

  useEffect(() => {
    const sock = socket.current;
    if (!sock) return;
    const onAceptado  = () => { setResultado("aceptado");  setPaso("resultado"); };
    const onRechazado = () => { setResultado("rechazado"); setPaso("resultado"); };
    sock.on("tu_voto_aceptado",  onAceptado);
    sock.on("tu_voto_rechazado", onRechazado);
    return () => {
      sock.off("tu_voto_aceptado",  onAceptado);
      sock.off("tu_voto_rechazado", onRechazado);
    };
  }, [socket]);

  // VotanteView — crearSala
  const crearSala = () => {
    if (!nombreSala.trim() || !processId) return;
    setCargando(true);
    socket.current?.emit(
      "crear_sala",
      { nombre: nombreSala.trim(), processId: Number(processId) },
      (res) => {
        setCargando(false);
        if (res.ok) { setSalaId(res.salaId); setPaso("identidad"); }
        else setError("No se pudo crear la sala");
      }
    );
  };

  const confirmarIdentidad = () => { if (votanteId.trim()) setPaso("votar"); };

  const emitirVoto = () => {
    if (!seleccion) return;
    setCargando(true); setError("");
    socket.current?.emit(
      "emitir_voto",
      { salaId, votanteId: votanteId.trim(), partidoId: seleccion === "__nulo__" ? null : seleccion },
      (res) => {
        setCargando(false);
        if (res.ok) setPaso("espera");
        else setError(res.error || "Error al emitir el voto");
      }
    );
  };

  const reiniciar = () => {
    setPaso("identidad");          // vuelve a pedir cédula, no a crear sala
    setVotanteId("");
    setSeleccion(null);
    setResultado(null);
    setError("");
    setPartidos([]);               // fuerza recarga por si cambiaron
  };

  const primerColor = (colorsStr) => {
    if (!colorsStr) return "#9CA3AF";
    return colorsStr.split(",")[0].trim();
  };

  return (
    <div className={styles.cardStack} style={{ maxWidth: 448, margin: "0 auto" }}>

      {/* Paso 1: Crear sala */}
      {paso === "inicio" && (
  <div className={styles.card}>
    <p className={styles.heading} style={{ marginBottom: "0.25rem" }}>Nueva sala de votación</p>
    <p className={styles.sub} style={{ marginBottom: "1rem" }}>Ingresa los datos para identificar esta estación</p>

    <label className={styles.label}>ID del proceso electoral</label>
    <input
      className={styles.input}
      style={{ marginBottom: "1rem" }}
      placeholder="Ej: 1"
      type="number"
      min="1"
      value={processId}
      onChange={(e) => setProcessId(e.target.value)}
    />

    <label className={styles.label}>Nombre de la sala</label>
    <input
      className={styles.input}
      style={{ marginBottom: "1rem" }}
      placeholder="Ej: Mesa 1 — Aula 3"
      value={nombreSala}
      onChange={(e) => setNombreSala(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && crearSala()}
    />

    {error && <p style={{ color: "var(--error)", fontSize: "0.75rem", marginBottom: "0.75rem" }}>{error}</p>}

    <button
      className={`${styles.btn} ${styles.btnPri} ${styles.btnFull}`}
      disabled={!nombreSala.trim() || !processId || cargando || !conectado}
      onClick={crearSala}
    >
      {cargando ? "Creando sala…" : "Crear sala"}
    </button>

    {!conectado && (
      <p style={{ fontSize: "0.75rem", color: "var(--warning)", marginTop: "0.5rem", textAlign: "center" }}>
        Conectando con el servidor…
      </p>
    )}
  </div>
)}

      {/* Paso 2: Identidad */}
      {paso === "identidad" && (
        <div className={styles.card}>
          <p className={styles.heading} style={{ marginBottom: "0.25rem" }}>Verificar identidad</p>
          <p className={styles.sub} style={{ marginBottom: "1rem" }}>
            Sala: <strong style={{ color: "var(--text)", fontWeight: 500 }}>{nombreSala}</strong>
          </p>
          <label className={styles.label}>Número de cédula o ID del votante</label>
          <input
            className={styles.input}
            style={{ marginBottom: "1rem" }}
            placeholder="Ej: 1-2345-6789"
            value={votanteId}
            onChange={(e) => setVotanteId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmarIdentidad()}
          />
          <button className={`${styles.btn} ${styles.btnPri} ${styles.btnFull}`} disabled={!votanteId.trim()} onClick={confirmarIdentidad}>
            Continuar →
          </button>
        </div>
      )}

      {/* Paso 3: Votar */}
      {paso === "votar" && (
        <div className={styles.card}>
          <p className={styles.heading} style={{ marginBottom: "0.25rem" }}>Selecciona tu partido</p>
          <p className={styles.sub} style={{ marginBottom: "1rem" }}>
            Votante: <span className={styles.mono} style={{ fontWeight: 500, color: "var(--text)" }}>{votanteId}</span>
          </p>

          {partidos.length === 0 && !error ? (
            <p className={styles.empty}>Cargando partidos…</p>
          ) : error ? (
            <p style={{ color: "var(--error)", fontSize: "0.875rem", textAlign: "center", padding: "1.5rem 0" }}>{error}</p>
          ) : (
            <div className={styles.cardStack} style={{ marginBottom: "1rem" }}>
              {partidos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSeleccion(p.id)}
                  className={`${styles.partidoBtn} ${seleccion === p.id ? styles.partidoBtnActive : ""}`}
                >
                  <div className={styles.partidoInner}>
                    <span className={styles.partidoColor} style={{ backgroundColor: primerColor(p.colors) }} />
                    <div>
                      <p className={styles.partidoName}>{p.name}</p>
                      {p.initials && <p className={styles.partidoSiglas}>{p.initials}</p>}
                    </div>
                    {seleccion === p.id && <span className={styles.checkMark}>✓</span>}
                  </div>
                </button>
              ))}

              {/* Voto nulo */}
              <button
                onClick={() => setSeleccion("__nulo__")}
                className={`${styles.partidoBtn} ${seleccion === "__nulo__" ? styles.partidoBtnActive : ""}`}
              >
                <div className={styles.partidoInner}>
                  <span className={`${styles.partidoColor} ${styles.nuloColor}`} />
                  <div>
                    <p className={styles.partidoName}>Voto nulo</p>
                    <p className={styles.partidoSiglas}>Ningún partido</p>
                  </div>
                  {seleccion === "__nulo__" && <span className={styles.checkMark}>✓</span>}
                </div>
              </button>
            </div>
          )}

          {error && partidos.length > 0 && <p style={{ color: "var(--error)", fontSize: "0.75rem", marginBottom: "0.75rem" }}>{error}</p>}
          <button className={`${styles.btn} ${styles.btnPri} ${styles.btnFull}`} disabled={!seleccion || cargando} onClick={emitirVoto}>
            {cargando ? "Enviando voto…" : "Emitir voto →"}
          </button>
        </div>
      )}

      {/* Paso 4: Espera */}
      {paso === "espera" && (
        <div className={`${styles.card} ${styles.resultCenter}`}>
          <div className={`${styles.resultIcon} ${styles.pulseIcon}`}>⏳</div>
          <p className={styles.heading} style={{ marginBottom: "0.5rem" }}>Voto enviado</p>
          <p className={styles.sub}>Esperando validación del auxiliar…</p>
        </div>
      )}

      {/* Paso 5: Resultado */}
      {paso === "resultado" && (
        <div className={`${styles.card} ${styles.resultCenter}`}>
          <div className={styles.resultIcon}>{resultado === "aceptado" ? "✅" : "❌"}</div>
          <p className={styles.heading} style={{ marginBottom: "0.5rem" }}>
            {resultado === "aceptado" ? "¡Voto registrado!" : "Voto rechazado"}
          </p>
          <p className={styles.sub}>
            {resultado === "aceptado" ? "Tu voto fue aceptado correctamente." : "El auxiliar rechazó tu voto."}
          </p>
          <button
            className={`${styles.btn} ${styles.btnSec}`}
            style={{ marginTop: "1.5rem" }}
            onClick={reiniciar}
          >
            Siguiente votante
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function EleccionesView() {
  const { socket, conectado } = useSocket();
  const [modo, setModo] = useState(null);

  if (!modo) {
    return (
      <div className={`${styles.root} ${styles.hero}`}>
        <div style={{ textAlign: "center" }}>
          <h1 className={styles.heroTitle}>Sistema de Votación</h1>
          <p className={styles.heroSub}>Selecciona tu rol para continuar</p>
          <div style={{ marginTop: "0.5rem" }}>
            <StatusDot conectado={conectado} />
          </div>
        </div>
        <div className={styles.heroButtons}>
          <button className={`${styles.btn} ${styles.btnPri} ${styles.heroBtn}`} onClick={() => setModo("admin")}>
            🗂 Auxiliar / Admin
          </button>
          <button className={`${styles.btn} ${styles.btnSec} ${styles.heroBtn}`} onClick={() => setModo("votante")}>
            🗳 Votante
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.root} ${styles.wrapper}`}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button className={`${styles.btn} ${styles.btnSec}`} style={{ fontSize: "0.75rem" }} onClick={() => setModo(null)}>
            ← Inicio
          </button>
          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>
            {modo === "admin" ? "Auxiliar / Admin" : "Votante"}
          </span>
        </div>
        <StatusDot conectado={conectado} />
      </div>

      {modo === "admin"   && <AdminView   socket={socket} conectado={conectado} />}
      {modo === "votante" && <VotanteView socket={socket} conectado={conectado} />}
    </div>
  );
}