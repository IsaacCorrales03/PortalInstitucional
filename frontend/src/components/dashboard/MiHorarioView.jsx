"use client";

import { useState } from "react";
import { useSchedule } from "@/lib/usePreload";

/* ─── CONSTANTS ──────────────────────────────────────────────────── */
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const LESSON_TIME = {
  "1":  { start: [7, 0],   end: [7, 40] },
  "2":  { start: [7, 40],  end: [8, 20] },
  "3":  { start: [8, 20],  end: [9, 0] },
  "4":  { start: [9, 20],  end: [10, 0] },
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

const fmt = (h, m) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

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
    const firstKey = key;
    const lastKey  = keys[i + span - 1];
    blocks.push({
      lessons: keys.slice(i, i + span),
      firstLesson: firstKey,
      lastLesson: lastKey,
      start: lessonTime(firstKey).start,
      end:   lessonTime(lastKey).end,
      span,
      ...cell,
    });
    i += span;
  }
  return blocks;
}

/* ─── ICONS ──────────────────────────────────────────────────────── */
function IcoBook() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
}
function IcoWrench() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
}
function IcoUser() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>;
}
function IcoDoor() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/></svg>;
}
function IcoChevron({ up }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? "rotate(180deg)" : "none", transition: "transform .2s" }}><polyline points="6 9 12 15 18 9"/></svg>;
}
function IcoCal() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
}

/* ─── LESSON BLOCK CARD ──────────────────────────────────────────── */
function LessonCard({ block, isCurrentDay, currentLesson }) {
  const isTech   = block.es_tecnica;
  const isActive = isCurrentDay && currentLesson !== null && block.lessons.includes(currentLesson);

  const accent     = isTech ? "#6382ff" : "#4ade80";
  const accentRgb  = isTech ? "99,130,255" : "74,222,128";
  const bg         = isActive
    ? (isTech ? "rgba(99,130,255,.13)" : "rgba(74,222,128,.11)")
    : (isTech ? "rgba(99,130,255,.055)" : "rgba(74,222,128,.05)");
  const border     = isActive ? accent : (isTech ? "rgba(99,130,255,.22)" : "rgba(74,222,128,.2)");

  const lessonLabel = block.span === 1
    ? `lección ${block.firstLesson}`
    : `lecciones ${block.firstLesson}–${block.lastLesson}`;

  return (
    <div style={{
      display: "flex",
      borderRadius: 10,
      overflow: "hidden",
      border: `1px solid ${border}`,
      background: bg,
      boxShadow: isActive ? `0 0 0 2.5px rgba(${accentRgb},.18)` : "none",
      position: "relative",
      animation: "fadeUp .22s ease both",
    }}>
      {/* left bar */}
      <div style={{
        width: 4,
        flexShrink: 0,
        background: isTech
          ? "linear-gradient(180deg,#6382ff,#a78bfa)"
          : "linear-gradient(180deg,#4ade80,#34d399)",
        opacity: isActive ? 1 : .55,
      }} />

      <div style={{ flex: 1, padding: "11px 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {/* time row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: isActive ? accent : "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>
            {block.start} – {block.end}
            <span style={{ fontWeight: 500, color: "var(--text-muted, rgba(255,255,255,.28))", marginLeft: 5 }}>
              · {lessonLabel}
            </span>
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 9.5, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase",
            color: accent,
            background: isTech ? "rgba(99,130,255,.1)" : "rgba(74,222,128,.09)",
            border: `1px solid ${isTech ? "rgba(99,130,255,.2)" : "rgba(74,222,128,.2)"}`,
            padding: "2px 7px 2px 6px", borderRadius: 5,
          }}>
            {isTech ? <IcoWrench /> : <IcoBook />}
            {isTech ? "Técnica" : "Académica"}
          </span>
        </div>

        {/* subject */}
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)", letterSpacing: "-.012em", lineHeight: 1.25 }}>
          {block.materia}
        </div>

        {/* meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--text-subtle)", fontWeight: 500 }}>
            <span style={{ color: accent, opacity: .7 }}><IcoUser /></span>
            {block.profesor}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--text-subtle)", fontWeight: 500 }}>
            <span style={{ color: accent, opacity: .7 }}><IcoDoor /></span>
            {block.aula}
          </span>
        </div>
      </div>

      {/* live dot */}
      {isActive && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          width: 7, height: 7, borderRadius: "50%",
          background: accent,
          boxShadow: `0 0 0 3px rgba(${accentRgb},.22)`,
        }} />
      )}
    </div>
  );
}

/* ─── DAY PANEL ──────────────────────────────────────────────────── */
function DayPanel({ day, dayData, currentDay, currentLesson }) {
  const blocks  = mergeBlocks(dayData);
  const isToday = day === currentDay;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {blocks.length === 0 ? (
        <div style={{ padding: "18px 0", textAlign: "center", fontSize: 12.5, color: "var(--text-muted, rgba(255,255,255,.25))", fontStyle: "italic" }}>
          Sin lecciones
        </div>
      ) : (
        blocks.map((block, i) => (
          <LessonCard
            key={i}
            block={block}
            isCurrentDay={isToday}
            currentLesson={currentLesson}
          />
        ))
      )}
    </div>
  );
}

/* ─── DAY ACCORDION ROW ──────────────────────────────────────────── */
function DayRow({ day, dayData, currentDay, currentLesson, defaultOpen }) {
  const [open, setOpen]  = useState(defaultOpen);
  const blocks           = mergeBlocks(dayData);
  const isToday          = day === currentDay;
  const count            = blocks.length;

  return (
    <div style={{
      borderRadius: 12,
      border: isToday
        ? "1px solid rgba(99,130,255,.35)"
        : "1px solid var(--border, rgba(255,255,255,.09))",
      overflow: "hidden",
      background: isToday ? "rgba(99,130,255,.04)" : "var(--bg-elevated, rgba(255,255,255,.03))",
    }}>
      {/* header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          padding: "13px 16px", gap: 10,
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {/* today indicator bar */}
        <div style={{
          width: 3, height: 18, borderRadius: 2, flexShrink: 0,
          background: isToday ? "#6382ff" : "var(--border-light, rgba(255,255,255,.12))",
        }} />

        <span style={{ flex: 1, textAlign: "left", fontSize: 13.5, fontWeight: isToday ? 800 : 600, color: isToday ? "#6382ff" : "var(--text-subtle)", letterSpacing: "-.01em" }}>
          {day}
          {isToday && (
            <span style={{
              marginLeft: 8, fontSize: 9, fontWeight: 800, letterSpacing: ".08em",
              textTransform: "uppercase", verticalAlign: "middle",
              color: "#6382ff", background: "rgba(99,130,255,.12)",
              border: "1px solid rgba(99,130,255,.25)",
              padding: "2px 7px", borderRadius: 5,
            }}>
              Hoy
            </span>
          )}
        </span>

        {/* block count pill */}
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: count > 0 ? (isToday ? "#6382ff" : "var(--text-muted)") : "var(--text-muted, rgba(255,255,255,.2))",
          background: count > 0 ? (isToday ? "rgba(99,130,255,.1)" : "var(--bg-hover, rgba(255,255,255,.06))") : "transparent",
          padding: count > 0 ? "3px 10px" : "3px 4px",
          borderRadius: 99,
          border: count > 0 ? `1px solid ${isToday ? "rgba(99,130,255,.22)" : "var(--border-light, rgba(255,255,255,.1))"}` : "none",
        }}>
          {count > 0 ? `${count} bloque${count === 1 ? "" : "s"}` : "libre"}
        </span>

        <span style={{ color: "var(--text-muted, rgba(255,255,255,.3))", flexShrink: 0 }}>
          <IcoChevron up={open} />
        </span>
      </button>

      {/* body */}
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <DayPanel
            day={day}
            dayData={dayData}
            currentDay={currentDay}
            currentLesson={currentLesson}
          />
        </div>
      )}
    </div>
  );
}

/* ─── EMPTY ──────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "72px 0", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--bg-elevated)", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-subtle)" }}>
        <IcoCal />
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-subtle)", marginBottom: 4 }}>No hay horario disponible</div>
        <div style={{ fontSize: 12, color: "var(--text-muted, rgba(255,255,255,.25))" }}>Tu sección aún no tiene un horario registrado.</div>
      </div>
    </div>
  );
}

/* ─── MAIN VIEW ──────────────────────────────────────────────────── */
export default function MiHorarioView() {
  const { schedule, sectionName, part, isLoading, error } = useSchedule();
  const { dayName: currentDay, currentLesson } = getCurrentContext();

  const totalBlocks = schedule
    ? DAYS.reduce((acc, d) => acc + mergeBlocks(schedule[d] ?? {}).length, 0)
    : 0;

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
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

        {/* Loading */}
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-subtle)", padding: "40px 0" }}>
            <span className="db-spinner" style={{ width: 14, height: 14 }} />
            Cargando horario...
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="db-inline-alert db-inline-alert--error">{error}</div>
        )}

        {/* Empty */}
        {!isLoading && !error && !schedule && <EmptyState />}

        {/* Accordion days */}
        {!isLoading && !error && schedule && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DAYS.map(day => (
              <DayRow
                key={day}
                day={day}
                dayData={schedule[day] ?? {}}
                currentDay={currentDay}
                currentLesson={currentLesson}
                defaultOpen={day === currentDay || (currentDay === null && day === "Lunes")}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}