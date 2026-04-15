"use client";

import { useSchedule } from "@/lib/usePreload";
import { useState, useEffect, useRef } from "react";

/* --- CONSTANTS --- */
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const LESSON_TIME = {
  "1":  { start: [7, 0],   end: [7, 40]  },
  "2":  { start: [7, 40],  end: [8, 20]  },
  "3":  { start: [8, 20],  end: [9, 0]   },
  "4":  { start: [9, 20],  end: [10, 0]  },
  "5":  { start: [10, 0],  end: [10, 40] },
  "6":  { start: [10, 40], end: [11, 20] },
  "7":  { start: [12, 10], end: [12, 50] },
  "8":  { start: [12, 50], end: [13, 30] },
  "9":  { start: [13, 30], end: [14, 10] },
  "10": { start: [14, 30], end: [15, 10] },
  "11": { start: [15, 10], end: [15, 50] },
  "12": { start: [15, 50], end: [16, 30] },
};

const DAY_JS = { Lunes: 1, Martes: 2, "Miércoles": 3, Jueves: 4, Viernes: 5 };

const fmt = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

function lessonTime(key) {
  const t = LESSON_TIME[key];
  if (!t) return null;
  return { start: fmt(...t.start), end: fmt(...t.end) };
}

function getCurrentContext() {
  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dayName = Object.keys(DAY_JS).find(d => DAY_JS[d] === now.getDay()) ?? null;
  let currentLesson = null;
  for (const [key, { start, end }] of Object.entries(LESSON_TIME)) {
    if (nowMin >= start[0] * 60 + start[1] && nowMin < end[0] * 60 + end[1]) {
      currentLesson = key;
      break;
    }
  }
  return { dayName, currentLesson };
}

function mergeBlocks(dayData) {
  const keys   = Object.keys(LESSON_TIME);
  const blocks = [];
  const toMin  = ([h, m]) => h * 60 + m;
  let i = 0;
  while (i < keys.length) {
    const key  = keys[i];
    const cell = dayData?.[key];
    if (!cell) { i++; continue; }
    let span = 1;
    while (i + span < keys.length) {
      const nextKey  = keys[i + span];
      const nextCell = dayData?.[nextKey];
      if (!nextCell) break;
      if (nextCell.materia !== cell.materia || nextCell.profesor !== cell.profesor) break;
      const prevEnd   = toMin(LESSON_TIME[keys[i + span - 1]].end);
      const nextStart = toMin(LESSON_TIME[nextKey].start);
      if (prevEnd !== nextStart) break;
      span++;
    }
    blocks.push({
      lessons:     keys.slice(i, i + span),
      firstLesson: key,
      lastLesson:  keys[i + span - 1],
      start:       lessonTime(key).start,
      end:         lessonTime(keys[i + span - 1]).end,
      span,
      ...cell,
    });
    i += span;
  }
  return blocks;
}

/* ─── ICONS ──────────────────────────────────────────────────────── */
function IcoBook()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>; }
function IcoWrench()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>; }
function IcoUser()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>; }
function IcoDoor()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/></svg>; }
function IcoCal()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }
function IcoX()       { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function IcoClock()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>; }

/* ─── DETAIL MODAL ───────────────────────────────────────────────── */
function DetailModal({ block, onClose }) {
  const isTech     = block.es_tecnica;
  const accent     = isTech ? "var(--accent2)"     : "var(--accent)";
  const accentSoft = isTech ? "var(--accent2-soft)" : "var(--accent-soft)";

  const lessonLabel = block.span === 1
    ? `Lección ${block.firstLesson}`
    : `Lecciones ${block.firstLesson} – ${block.lastLesson}`;

  return (
    /* backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        animation: "fadeIn .15s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420,
          borderRadius: "var(--radius-lg)",
          background: "var(--bg-surface)",
          border: `1px solid ${accent}`,
          overflow: "hidden",
          animation: "slideUp .18s ease",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* top accent bar */}
        <div style={{ height: 4, background: accent }} />

        {/* header */}
        <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              {/* tipo badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 10, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase",
                color: accent, background: accentSoft,
                border: `1px solid ${accent}`,
                padding: "3px 9px", borderRadius: "var(--radius-sm)",
                marginBottom: 10,
              }}>
                {isTech ? <IcoWrench /> : <IcoBook />}
                {isTech ? "Técnica" : "Académica"}
              </span>
              {/* nombre materia */}
              <div style={{
                fontSize: 20, fontWeight: 800,
                color: "var(--text)",
                fontFamily: "var(--font-display)",
                letterSpacing: "-.02em",
                lineHeight: 1.2,
              }}>
                {block.materia}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", cursor: "pointer",
                color: "var(--text-muted)", display: "flex", alignItems: "center",
                justifyContent: "center", width: 30, height: 30, flexShrink: 0,
              }}
            >
              <IcoX />
            </button>
          </div>
        </div>

        {/* detail rows */}
        <div style={{ padding: "16px 22px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { icon: <IcoClock />, label: "Horario", value: `${block.start} – ${block.end}` },
            // en DetailModal, cambiá la row de lecciones:
            { icon: <IcoClock />, label: "Duración", value: `${block.span} lección${block.span === 1 ? "" : "es"} · ${block.span * 40} min` },
            { icon: <IcoUser />,  label: "Profesor",  value: block.profesor },
            { icon: <IcoDoor />,  label: "Aula",      value: block.aula },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "var(--radius-sm)",
                background: accentSoft,
                border: `1px solid var(--border)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: accent, flexShrink: 0,
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 1 }}>
                  {label}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── LESSON CARD ────────────────────────────────────────────────── */
function LessonCard({ block, isCurrentDay, currentLesson, onClick }) {
  const isTech     = block.es_tecnica;
  const isActive   = isCurrentDay && currentLesson !== null && block.lessons.includes(currentLesson);
  const accent     = isTech ? "var(--accent2)"      : "var(--accent)";
  const accentSoft = isTech ? "var(--accent2-soft)"  : "var(--accent-soft)";

  return (
    <button
      onClick={onClick}
      className="lesson-card"
      style={{
        width: "100%", textAlign: "left",
        display: "flex", alignItems: "stretch",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: `1px solid ${isActive ? accent : "var(--border)"}`,
        background: isActive ? accentSoft : "var(--bg-elevated)",
        cursor: "pointer",
        fontFamily: "inherit",
        animation: "fadeUp .2s ease both",
        transition: "border-color .15s, background .15s, box-shadow .15s, transform .15s",
        padding: 0,
        boxShadow: isActive
          ? `var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.05)`
          : "var(--shadow-sm)",
      }}
    >
      {/* franja izquierda */}
      <div style={{
        width: 4, flexShrink: 0,
        background: accent,
        opacity: isActive ? 1 : 0.45,
        transition: "opacity .15s",
      }} />

      {/* hora */}
      <div style={{
        width: 66, flexShrink: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "16px 0",
        borderRight: "1px solid var(--border)",
        gap: 2,
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: isActive ? accent : "var(--text)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {block.start}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-subtle)", lineHeight: 1, margin: "1px 0" }}>—</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: isActive ? accent : "var(--text-muted)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {block.end}
        </span>
      </div>

      {/* info principal */}
      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 5, minWidth: 0 }}>
        {/* materia */}
        <div style={{
          fontSize: 16, fontWeight: 800,
          color: "var(--text)",
          letterSpacing: "-.015em",
          lineHeight: 1.2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {block.materia}
        </div>

        {/* profesor */}
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: "var(--text-muted)",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ color: accent, opacity: .7, flexShrink: 0 }}><IcoUser /></span>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {block.profesor}
          </span>
        </div>

        {/* info / ahora — debajo del profe */}
        {isActive ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10.5, fontWeight: 800, color: accent,
            width: "fit-content",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: accent, display: "inline-block",
              animation: "pulse 1.4s ease-in-out infinite",
            }} />
            En curso ahora
          </span>
        ) : (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 10.5, fontWeight: 600,
            color: "var(--text-subtle)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "3px 8px",
            background: "var(--bg-surface)",
            width: "fit-content",
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Ver detalles
          </span>
        )}
      </div>

      {/* derecha: solo badge tipo */}
      <div style={{
        padding: "14px 14px 14px 0",
        display: "flex", flexDirection: "column",
        alignItems: "flex-end", justifyContent: "flex-start",
        flexShrink: 0,
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
          color: accent, background: accentSoft,
          border: `1px solid ${accent}`,
          padding: "3px 7px", borderRadius: "var(--radius-sm)",
        }}>
          {isTech ? <IcoWrench /> : <IcoBook />}
          {isTech ? "Téc." : "Acad."}
        </span>
      </div>
    </button>
  );
}
/* ─── DAY CONTENT ────────────────────────────────────────────────── */
function DayContent({ day, dayData, currentDay, currentLesson }) {
  const [selected, setSelected] = useState(null);
  const blocks  = mergeBlocks(dayData);
  const isToday = day === currentDay;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {selected && (
        <DetailModal block={selected} onClose={() => setSelected(null)} />
      )}

      {blocks.length === 0 ? (
        <div style={{
          padding: "48px", textAlign: "center",

          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "var(--radius-md)",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-subtle)",
          }}>
            <IcoCal />
          </div>
          <span style={{ fontSize: 13, color: "var(--text-subtle)", fontStyle: "italic" }}>
            {isToday ? "Hoy no tenés lecciones 🎉" : "Sin lecciones este día"}
          </span>
        </div>
      ) : (
        blocks.map((block, i) => (
          <LessonCard
            key={i}
            block={block}
            isCurrentDay={isToday}
            currentLesson={currentLesson}
            onClick={() => setSelected(block)}
          />
        ))
      )}
    </div>
  );
}

/* ─── TABS ───────────────────────────────────────────────────────── */
function DayTabs({ days, activeDay, onSelect, currentDay, schedule }) {
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft]   = useState(false);
  const [canRight, setCanRight] = useState(false);

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // espera a que el layout esté listo
    const ro = new ResizeObserver(() => checkScroll());
    ro.observe(el);

    el.addEventListener("scroll", checkScroll);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", checkScroll);
    };
  }, []);

  function nudge(dir) {
    scrollRef.current?.scrollBy({ left: dir * 120, behavior: "smooth" });
  }

  const ArrowBtn = ({ dir, visible }) => (
    <button
      onClick={() => nudge(dir)}
      style={{
        position: "absolute", top: "50%", transform: "translateY(-50%)",
        [dir === -1 ? "left" : "right"]: 0,
        zIndex: 2,
        width: 28, height: 28,
        borderRadius: "50%",
        border: "1px solid var(--border)",
        background: "var(--bg-surface)",
        color: "var(--text-muted)",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity .2s",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={dir === -1 ? "15 18 9 12 15 6" : "9 6 15 12 9 18"} />
      </svg>
    </button>
  );

  return (
    <div style={{ position: "relative", borderBottom: "1px solid var(--border)" }}>
      {/* fade izquierda */}
      {canLeft && (
        <div style={{
          position: "absolute", left: 28, top: 0, bottom: 0, width: 24, zIndex: 1,
          background: "linear-gradient(90deg, var(--bg-surface), transparent)",
          pointerEvents: "none",
        }} />
      )}
      {/* fade derecha */}
      {canRight && (
        <div style={{
          position: "absolute", right: 28, top: 0, bottom: 0, width: 24, zIndex: 1,
          background: "linear-gradient(270deg, var(--bg-surface), transparent)",
          pointerEvents: "none",
        }} />
      )}

      <ArrowBtn dir={-1} visible={canLeft} />
      <ArrowBtn dir={1}  visible={canRight} />

      <div
        ref={scrollRef}
        style={{
          display: "flex", gap: 4,
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: 0,
          paddingLeft: canLeft ? 32 : 0,
          paddingRight: canRight ? 32 : 0,
          transition: "padding .2s",
        }}
      >
        {days.map(day => {
          const isActive = day === activeDay;
          const isToday  = day === currentDay;

          return (
            <button
              key={day}
              onClick={() => onSelect(day)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "10px 16px 12px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "inherit", position: "relative",
                borderBottom: isActive ? "2.5px solid var(--accent)" : "2.5px solid transparent",
                marginBottom: -1,
                transition: "color .15s",
                flexShrink: 0,
              }}
            >
              <span style={{
                fontSize: 18, fontWeight: isActive ? 800 : 600,
                color: isActive ? "var(--accent)" : isToday ? "var(--text)" : "var(--text-muted)",
                letterSpacing: "-.01em",
              }}>
                {day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── EMPTY ──────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "72px 0", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-subtle)" }}>
        <IcoCal />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-subtle)", marginBottom: 4 }}>No hay horario disponible</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Tu sección aún no tiene un horario registrado.</div>
      </div>
    </div>
  );
}

/* ─── MAIN VIEW ──────────────────────────────────────────────────── */
export default function MiHorarioView() {
  const { schedule, sectionName, part, isLoading, error } = useSchedule();
  const { dayName: currentDay, currentLesson } = getCurrentContext();

  const defaultTab = currentDay ?? "Lunes";
  const [activeDay, setActiveDay] = useState(defaultTab);

  const totalBlocks = schedule
    ? DAYS.reduce((acc, d) => acc + mergeBlocks(schedule[d] ?? {}).length, 0)
    : 0;

  return (
    <>
      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse   { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.5; transform:scale(1.6) } }
      `}</style>

      <div className="db-view">
        {/* HEADER */}
        <div className="db-section-header">
          <div>
            <div className="db-section-title">Mi Horario</div>
            <div className="db-section-subtitle">
              {schedule
                ? `Semana ${part} · ${sectionName} · ${totalBlocks} bloques`
                : "Horario semanal de tu sección"}
            </div>
          </div>
        </div>

        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-subtle)", padding: "40px 0" }}>
            <span className="db-spinner" style={{ width: 14, height: 14 }} />
            Cargando horario...
          </div>
        )}

        {!isLoading && error && (
          <div className="db-inline-alert db-inline-alert--error">{error}</div>
        )}

        {!isLoading && !error && !schedule && <EmptyState />}

        {!isLoading && !error && schedule && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* tabs */}
            <DayTabs
              days={DAYS}
              activeDay={activeDay}
              onSelect={setActiveDay}
              currentDay={currentDay}
              schedule={schedule}
            />

            {/* contenido del día activo */}
            <div style={{ paddingTop: 16 }}>
              <DayContent
                key={activeDay}
                day={activeDay}
                dayData={schedule[activeDay] ?? {}}
                currentDay={currentDay}
                currentLesson={currentLesson}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}