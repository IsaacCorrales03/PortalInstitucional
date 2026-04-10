"use client";

/**
 * AppLoader.jsx
 *
 * Pantalla de carga inicial del dashboard.
 * Carga todos los datos necesarios en paralelo ANTES de mostrar el dashboard,
 * de modo que al navegar entre vistas, los datos ya están en el store y
 * no hay que esperar.
 *
 * Uso en page.jsx (o donde montes el dashboard):
 *
 *   import AppLoader from "./AppLoader";
 *   export default function DashboardPage() {
 *     return <AppLoader />;
 *   }
 *
 * AppLoader renderiza <DashboardShell /> una vez que todo está listo.
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import DashboardShell, { getTokenPayload } from "./DashboardShell";

// Helpers para escribir/leer el store de Zustand sin hooks
const storeSet = (key, val) => useStore.setState({ [key]: val });
const storeGet = (key)      => useStore.getState()[key];

// ─── API base ─────────────────────────────────────────────────────────────────

const BASE = "http://localhost:8000";

async function apiFetch(path) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Error ${res.status}`);
  }
  return res.json();
}

// ─── Tasks de preload ─────────────────────────────────────────────────────────
//
// Cada tarea tiene:
//   key     → clave en el store (usada para marcar loading/data/error)
//   label   → texto que se muestra en la pantalla de carga
//   fetch   → función async que devuelve los datos
//   roles   → si se especifica, solo carga si el usuario tiene alguno de esos roles
//   perms   → si se especifica, solo carga si el usuario tiene alguno de esos permisos
//

function buildTasks(roles = [], perms = [], userId = null) {
  const isSuperadmin = roles.includes("superadmin");
  const isStudent    = roles.includes("estudiante");
  const isAdmin      = roles.includes("admin") || isSuperadmin;
  const isProfessor  = roles.includes("professor") || roles.includes("profesor");

  const tasks = [
    // ── Siempre ────────────────────────────────────────────────────────────
    {
      key:   "profile",
      label: "Perfil de usuario",
      fetch: () => apiFetch("/dashboard/"),
    },
    {
      key:   "permissions",
      label: "Permisos",
      fetch: () =>
        apiFetch("/dashboard/me/permissions")
          .then((data) => data.map((p) => p.code)),
    },
    {
      key:   "attendance",
      label: "Asistencia",
      fetch: () => apiFetch("/dashboard/me/attendance"),
    },

    // ── Estudiante ─────────────────────────────────────────────────────────
    ...(isStudent
      ? [
          {
            key:   "mysection",
            label: "Mi sección",
            fetch: () => apiFetch("/dashboard/me/section"),
          },
          {
            key:   "mycourses",
            label: "Mis materias",
            fetch: () => apiFetch("/dashboard/me/courses"),
          },
          {
            key:   "schedule",
            label: "Horario semanal",
            fetch: () => apiFetch("/dashboard/me/schedule"),
          },
        ]
      : []),

    // ── Admin / superadmin ─────────────────────────────────────────────────
    ...(isAdmin || isSuperadmin || perms.includes("nav.usuarios")
      ? [
          {
            key:   "users",
            label: "Usuarios",
            fetch: () => apiFetch("/admin/users"),
          },
        ]
      : []),

    ...(isAdmin || isSuperadmin || perms.includes("nav.secciones")
      ? [
          {
            key:   "sections",
            label: "Secciones",
            fetch: () => apiFetch("/admin/sections"),
          },
        ]
      : []),

    ...(isAdmin || isSuperadmin || perms.includes("nav.cursos")
      ? [
          {
            key:   "courses",
            label: "Cursos",
            fetch: () => apiFetch("/admin/courses"),
          },
        ]
      : []),

    ...(isAdmin || isSuperadmin || perms.includes("nav.especialidades")
      ? [
          {
            key:   "specialties",
            label: "Especialidades",
            fetch: () => apiFetch("/admin/specialties"),
          },
        ]
      : []),
  ];

  return tasks;
}

// ─── Animación de progreso ────────────────────────────────────────────────────

const LOGO_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);

// ─── AppLoader ────────────────────────────────────────────────────────────────

export default function AppLoader() {
  const router = useRouter();

  // fase: "loading" | "done" | "error"
  const [phase,    setPhase]    = useState("loading");
  const [progress, setProgress] = useState(0);          // 0-100
  const [current,  setCurrent]  = useState("Iniciando…");
  const [errorMsg, setErrorMsg] = useState(null);
  const [fadeOut,  setFadeOut]  = useState(false);

  // evitar doble ejecución en StrictMode
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      // 1. Validar token
      const payload = getTokenPayload();
      if (!payload) {
        router.replace("/login");
        return;
      }

      const roles  = payload.roles ?? [];
      const userId = payload.sub   ?? null;

      // 2. Construir lista de tareas
      const tasks = buildTasks(roles, [], userId);
      const total = tasks.length;

      let completed = 0;

      // 3. Ejecutar todas las tareas en paralelo, actualizando progreso
      await Promise.allSettled(
        tasks.map(async (task) => {
          setCurrent(task.label);
          storeSet(task.key, { data: null, loading: true, error: "" });

          try {
            const data = await task.fetch();
            storeSet(task.key, { data, loading: false, error: "" });
          } catch (err) {
            storeSet(task.key, { data: null, loading: false, error: err.message });
            console.warn(`[AppLoader] ${task.key} falló:`, err.message);
          } finally {
            completed += 1;
            setProgress(Math.round((completed / total) * 100));
          }
        })
      );

      // 4. Si permissions falló con 401, redirigir
      const permsSlot = storeGet("permissions");
      if (permsSlot?.error?.includes("401") || permsSlot?.error?.includes("403")) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      // 5. Si es estudiante, cargar horario (depende de mysection)
      if (roles.includes("estudiante")) {
        const sectionData = storeGet("mysection")?.data;
        if (sectionData?.section_id) {
          setCurrent("Horario semanal");
          // schedule no está en el store base → lo seteamos igual, Zustand lo acepta
          storeSet("schedule", { data: null, loading: true, error: "" });
          try {
            const res = await apiFetch(`/student/schedule/${sectionData.section_id}`);
            storeSet("schedule", { data: res, loading: false, error: "" });
          } catch (err) {
            storeSet("schedule", { data: null, loading: false, error: err.message });
          }
          setProgress(100);
        }
      }

      // 6. Fade out y mostrar dashboard
      setCurrent("¡Listo!");
      await delay(320);
      setFadeOut(true);
      await delay(480);
      setPhase("done");
    }

    run().catch((err) => {
      console.error("[AppLoader] error fatal:", err);
      setErrorMsg(err.message ?? "Error inesperado al cargar.");
      setPhase("error");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Renderizado ──────────────────────────────────────────────────────────────

  if (phase === "done") return <DashboardShell />;

  if (phase === "error") {
    return (
      <div style={styles.screen}>
        <div style={styles.card}>
          <div style={{ ...styles.logoWrap, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted, #888)", textAlign: "center", maxWidth: 280, lineHeight: 1.6 }}>
            {errorMsg}
          </p>
          <button
            style={styles.retryBtn}
            onClick={() => { ran.current = false; setPhase("loading"); setProgress(0); setErrorMsg(null); }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Loading screen ───────────────────────────────────────────────────────────

  return (
    <div style={{ ...styles.screen, opacity: fadeOut ? 0 : 1, transition: "opacity .48s ease" }}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logoWrap}>
          {LOGO_SVG}
        </div>

        {/* Brand */}
        <div style={{ textAlign: "center" }}>
          <div style={styles.brandName}>CTP Pavas</div>
          <div style={styles.brandSub}>Panel institucional</div>
        </div>

        {/* Progress bar */}
        <div style={styles.barTrack}>
          <div
            style={{
              ...styles.barFill,
              width: `${progress}%`,
              transition: "width .35s cubic-bezier(.25,.8,.25,1)",
            }}
          />
        </div>

        {/* Status */}
        <div style={styles.statusRow}>
          <span style={styles.spinner} />
          <span style={styles.statusText}>{current}</span>
          <span style={styles.pct}>{progress}%</span>
        </div>

      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  screen: {
    position:       "fixed",
    inset:          0,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    background:     "var(--bg, #0f1117)",
    zIndex:         9999,
  },
  card: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    gap:            20,
    width:          "100%",
    maxWidth:       320,
    padding:        "36px 32px",
  },
  logoWrap: {
    width:          52,
    height:         52,
    borderRadius:   14,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    background:     "var(--accent-soft, rgba(99,130,255,.1))",
    border:         "1px solid var(--accent, rgba(99,130,255,.3))",
    color:          "var(--accent, #6382ff)",
    marginBottom:   4,
  },
  brandName: {
    fontSize:       18,
    fontWeight:     800,
    color:          "var(--text, #fff)",
    letterSpacing:  "-.02em",
  },
  brandSub: {
    fontSize:       12,
    color:          "var(--text-muted, rgba(255,255,255,.4))",
    marginTop:      3,
    letterSpacing:  ".02em",
  },
  barTrack: {
    width:          "100%",
    height:         4,
    borderRadius:   99,
    background:     "var(--border, rgba(255,255,255,.08))",
    overflow:       "hidden",
    marginTop:      8,
  },
  barFill: {
    height:         "100%",
    borderRadius:   99,
    background:     "linear-gradient(90deg, #6382ff 0%, #a78bfa 100%)",
  },
  statusRow: {
    display:        "flex",
    alignItems:     "center",
    gap:            8,
    width:          "100%",
  },
  spinner: {
    display:        "inline-block",
    width:          12,
    height:         12,
    borderRadius:   "50%",
    border:         "2px solid var(--border, rgba(255,255,255,.12))",
    borderTopColor: "var(--accent, #6382ff)",
    animation:      "db-spin 0.7s linear infinite",
    flexShrink:     0,
  },
  statusText: {
    flex:           1,
    fontSize:       12,
    color:          "var(--text-subtle, rgba(255,255,255,.5))",
    overflow:       "hidden",
    whiteSpace:     "nowrap",
    textOverflow:   "ellipsis",
  },
  pct: {
    fontSize:       11,
    fontWeight:     700,
    color:          "var(--accent, #6382ff)",
    fontVariantNumeric: "tabular-nums",
    flexShrink:     0,
  },
  retryBtn: {
    marginTop:      8,
    padding:        "9px 22px",
    borderRadius:   8,
    border:         "1px solid var(--accent, #6382ff)",
    background:     "var(--accent-soft, rgba(99,130,255,.1))",
    color:          "var(--accent, #6382ff)",
    fontSize:       13,
    fontWeight:     600,
    cursor:         "pointer",
    fontFamily:     "inherit",
  },
};