"use client";

import { useState } from "react";
import { usePreload } from "@/lib/usePreload";

/* ─── CONSTANTS ──────────────────────────────────────────────────── */

const STATUS_CONFIG = {
  presente:    { label: "Presente",    color: "#4ade80", rgb: "74,222,128",   bg: "rgba(74,222,128,.1)",  border: "rgba(74,222,128,.22)" },
  tardia:      { label: "Tardía",      color: "#f59e0b", rgb: "245,158,11",   bg: "rgba(245,158,11,.1)", border: "rgba(245,158,11,.22)" },
  ausente:     { label: "Ausente",     color: "#f87171", rgb: "248,113,113",  bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.22)" },
  justificado: { label: "Justificado", color: "#60a5fa", rgb: "96,165,250",   bg: "rgba(96,165,250,.1)",  border: "rgba(96,165,250,.22)" },
};

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/* ─── ICONS ──────────────────────────────────────────────────────── */

function IcoBook() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
}
function IcoCheck() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IcoX() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function IcoClock() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>;
}
function IcoShield() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function IcoChevron({ up }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? "rotate(180deg)" : "none", transition: "transform .2s" }}><polyline points="6 9 12 15 18 9"/></svg>;
}

/* ─── HELPERS ────────────────────────────────────────────────────── */

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

function statusIcon(status) {
  if (status === "presente")    return <IcoCheck />;
  if (status === "ausente")     return <IcoX />;
  if (status === "tardia")      return <IcoClock />;
  if (status === "justificado") return <IcoShield />;
  return null;
}

/* ─── RATE RING ──────────────────────────────────────────────────── */

function RateRing({ rate, color }) {
  const r   = 18;
  const circ = 2 * Math.PI * r;
  const dash = (rate / 100) * circ;

  return (
    <svg width="48" height="48" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--border, rgba(255,255,255,.08))" strokeWidth="3.5" />
      <circle
        cx="24" cy="24" r={r} fill="none"
        stroke={color} strokeWidth="3.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
        style={{ transition: "stroke-dasharray .5s ease" }}
      />
      <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
        {Math.round(rate)}%
      </text>
    </svg>
  );
}

/* ─── STATUS DOT MINI ────────────────────────────────────────────── */

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ausente;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      padding: "2px 7px 2px 6px", borderRadius: 5,
    }}>
      {statusIcon(status)}
      {cfg.label}
    </span>
  );
}

/* ─── RECORD ROW ─────────────────────────────────────────────────── */

function RecordRow({ rec, index }) {
  const cfg = STATUS_CONFIG[rec.status] ?? STATUS_CONFIG.ausente;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px",
      borderRadius: 8,
      background: "var(--bg, rgba(255,255,255,.02))",
      border: "1px solid var(--border-light, rgba(255,255,255,.07))",
      animation: "fadeUp .18s ease both",
      animationDelay: `${index * 0.03}s`,
    }}>
      {/* Status bar */}
      <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: cfg.color, opacity: .7, flexShrink: 0 }} />

      {/* Date */}
      <div style={{ minWidth: 90, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "-.01em" }}>
          {fmtDate(rec.date)}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-muted, rgba(255,255,255,.3))", marginTop: 1 }}>
          Lección {rec.lesson_number}
          {rec.lesson_count > 1 && `–${rec.lesson_number + rec.lesson_count - 1}`}
          {" "}· {rec.lesson_count} lec.
        </div>
      </div>

      {/* Status pill */}
      <div style={{ flex: 1 }}>
        <StatusPill status={rec.status} />
      </div>

      {/* Justification */}
      {rec.justification && (
        <div style={{
          fontSize: 11, color: "var(--text-subtle)", fontStyle: "italic",
          maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {rec.justification}
        </div>
      )}
    </div>
  );
}

/* ─── STAT CHIP ──────────────────────────────────────────────────── */

function StatChip({ label, value, status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 2, padding: "8px 12px", borderRadius: 8,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      minWidth: 52,
    }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: cfg.color, letterSpacing: "-.02em" }}>{value}</span>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: cfg.color, opacity: .8, letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

/* ─── COURSE CARD ────────────────────────────────────────────────── */

function CourseCard({ course, index }) {
  const [open, setOpen] = useState(false);

  const rate    = course.attendance_rate;
  const color   = rate >= 85 ? "#4ade80" : rate >= 70 ? "#f59e0b" : "#f87171";
  const border  = open
    ? `1px solid ${color}40`
    : "1px solid var(--border, rgba(255,255,255,.09))";

  return (
    <div style={{
      borderRadius: 12,
      border,
      background: "var(--bg-elevated, rgba(255,255,255,.03))",
      overflow: "hidden",
      transition: "border-color .2s",
      animation: "fadeUp .28s ease both",
      animationDelay: `${index * 0.06}s`,
    }}>
      {/* ── Card header ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          gap: 14, padding: "16px 18px",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "inherit", textAlign: "left",
        }}
      >
        {/* Ring */}
        <RateRing rate={rate} color={color} />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-.012em", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {course.course_name}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <StatChip label="pres"  value={course.presente}    status="presente" />
            <StatChip label="tard"  value={course.tardia}      status="tardia" />
            <StatChip label="aus"   value={course.ausente}     status="ausente" />
            {course.justificado > 0 && (
              <StatChip label="just" value={course.justificado} status="justificado" />
            )}
          </div>
        </div>

        {/* Total + chevron */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted, rgba(255,255,255,.3))", fontWeight: 600 }}>
            {course.total} clases
          </span>
          <span style={{ color: "var(--text-muted, rgba(255,255,255,.3))" }}>
            <IcoChevron up={open} />
          </span>
        </div>
      </button>

      {/* ── Records ── */}
      {open && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ height: 1, background: "var(--border-light, rgba(255,255,255,.07))", marginBottom: 8 }} />
          {course.records.length === 0 ? (
            <div style={{ padding: "16px 0", textAlign: "center", fontSize: 12, color: "var(--text-muted, rgba(255,255,255,.25))", fontStyle: "italic" }}>
              Sin registros
            </div>
          ) : (
            course.records.map((rec, i) => (
              <RecordRow key={rec.record_id} rec={rec} index={i} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── EMPTY STATE ────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "72px 0", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--bg-elevated)", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-subtle)" }}>
        <IcoBook />
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-subtle)", marginBottom: 4 }}>Sin registros de asistencia</div>
        <div style={{ fontSize: 12, color: "var(--text-muted, rgba(255,255,255,.25))" }}>Aún no hay clases registradas este semestre.</div>
      </div>
    </div>
  );
}

/* ─── GLOBAL SUMMARY BAR ─────────────────────────────────────────── */

function SummaryBar({ courses }) {
  const total       = courses.reduce((a, c) => a + c.total, 0);
  const presente    = courses.reduce((a, c) => a + c.presente, 0);
  const ausente     = courses.reduce((a, c) => a + c.ausente, 0);
  const tardia      = courses.reduce((a, c) => a + c.tardia, 0);
  const justificado = courses.reduce((a, c) => a + c.justificado, 0);
  const rate        = total > 0 ? Math.round((presente / total) * 100) : 0;

  const color = rate >= 85 ? "#4ade80" : rate >= 70 ? "#f59e0b" : "#f87171";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "14px 18px",
      borderRadius: 12,
      background: "var(--bg-elevated, rgba(255,255,255,.03))",
      border: "1px solid var(--border-light, rgba(255,255,255,.09))",
      flexWrap: "wrap",
    }}>
      <RateRing rate={rate} color={color} />
      <div style={{ flex: 1, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginRight: 4 }}>Global</span>
        <StatChip label="pres"  value={presente}    status="presente" />
        <StatChip label="tard"  value={tardia}       status="tardia" />
        <StatChip label="aus"   value={ausente}      status="ausente" />
        {justificado > 0 && <StatChip label="just" value={justificado} status="justificado" />}
      </div>
      <span style={{ fontSize: 11, color: "var(--text-muted, rgba(255,255,255,.3))", fontWeight: 600, flexShrink: 0 }}>
        {total} clases · {courses.length} materias
      </span>
    </div>
  );
}

/* ─── MAIN VIEW ──────────────────────────────────────────────────── */

export default function MiAsistenciaView() {
  const { data, isLoading, error } = usePreload("attendance");
  const courses = data ?? [];

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="db-view">
        <div className="db-section-header">
          <div>
            <div className="db-section-title">Mi Asistencia</div>
            <div className="db-section-subtitle">
              {courses.length > 0
                ? `${courses.length} ${courses.length === 1 ? "materia" : "materias"} · semestre actual`
                : "Registros de asistencia por materia"}
            </div>
          </div>
        </div>

        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-subtle)", padding: "40px 0" }}>
            <span className="db-spinner" style={{ width: 14, height: 14 }} />
            Cargando asistencia...
          </div>
        )}

        {!isLoading && error && (
          <div className="db-inline-alert db-inline-alert--error">{error}</div>
        )}

        {!isLoading && !error && courses.length === 0 && <EmptyState />}

        {!isLoading && !error && courses.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SummaryBar courses={courses} />
            {courses.map((course, i) => (
              <CourseCard key={course.course_name} course={course} index={i} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
