"use client";
import { usePreload } from "@/lib/usePreload";

/* ─────────────────────────────────────────────────────────────────
   ICONS
───────────────────────────────────────────────────────────────── */
function IconBook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <path d="M8 7h8M8 11h6"/>
    </svg>
  );
}

function IconWrench() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function IconEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}

function CourseCard({ course, index, accentVar, accentSoft, borderVar }) {
  return (
    <div
      className="db-stat-card"
      style={{ gap: 0, padding: 0, overflow: "hidden",
        animationDelay: `${index * 0.04}s`,
        animation: "courseIn .3s ease both",
        cursor: "default",
      }}
    >
      <div style={{ height: 3, background: accentVar, flexShrink: 0, opacity: 0.85 }} />

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
          {course.course_name}
        </div>

        <p style={{
          margin: 0, fontSize: 12, lineHeight: 1.6,
          color: course.description ? "var(--text-muted)" : "var(--text-subtle)",
          fontStyle: course.description ? "normal" : "italic",
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1,
        }}>
          {course.description || "Sin descripción"}
        </p>

        {(course.is_guide || course.section_part) && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {course.is_guide && (
              <span className="db-badge badge--orange" style={{ fontSize: 10 }}>★ Guía</span>
            )}
            {course.section_part && (
              <span className="db-badge" style={{
                fontSize: 10,
                background: accentSoft,
                color: accentVar,
                border: `1px solid ${borderVar}`,
              }}>
                Parte {course.section_part}
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 18px 14px",
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: accentSoft,
          border: `1px solid ${borderVar}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accentVar, flexShrink: 0,
        }}>
          <IconUser />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          {course.professor_name}
        </span>
      </div>
    </div>
  );
}

function CourseBlock({ title, subtitle, Icon, courses, countLabel, accentVar, accentSoft, borderVar }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="db-profile-section" style={{ gap: 0, padding: 0, overflow: "hidden" }}>
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${accentVar} 0%, transparent 100%)`,
          flexShrink: 0,
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 26px" }}>
          <div className="db-stat-icon" style={{
            background: accentSoft,
            border: `1px solid ${borderVar}`,
            color: accentVar,
            width: 46, height: 46, flexShrink: 0,
          }}>
            <Icon />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {title}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, fontWeight: 500 }}>
              {subtitle}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: accentVar, lineHeight: 1, letterSpacing: "-0.03em" }}>
              {courses.length}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {countLabel}
            </span>
          </div>

          <div style={{ color: "var(--text-subtle)" }}><IconChevron /></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {courses.map((c, i) => (
          <CourseCard
            key={`${c.course_id}-${c.section_part ?? "none"}-${i}`}
            course={c} index={i}
            accentVar={accentVar}
            accentSoft={accentSoft}
            borderVar={borderVar}
          />
        ))}
      </div>
    </section>
  );
}

export default function MisCursosView() {
  const { data, isLoading, error } = usePreload("mycourses");
  const all = data ?? [];

  const academic  = all.filter(c => !c.is_technical || c.course_name === "Educación Física");
  const technical = all.filter(c => c.is_technical  && c.course_name !== "Educación Física");

  return (
    <>
      <style>{`
        @keyframes courseIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="db-view">
        <div className="db-section-header">
          <div>
            <h1 className="db-section-title">Mis Materias</h1>
            <p className="db-section-subtitle">
              {all.length > 0
                ? `${all.length} ${all.length === 1 ? "materia" : "materias"} · ${academic.length} académicas · ${technical.length} técnicas`
                : "Cursos asignados a tu sección"}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="db-loading" style={{ padding: "60px 0" }}>
            <span className="db-spinner" style={{ width: 22, height: 22 }} />
          </div>
        )}

        {!isLoading && error && (
          <div className="db-inline-alert db-inline-alert--error">{error}</div>
        )}

        {!isLoading && !error && all.length === 0 && (
          <div className="db-empty">
            <IconEmpty />
            <p>No hay materias asignadas</p>
            <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>
              Tu sección aún no tiene cursos registrados.
            </span>
          </div>
        )}

        {!isLoading && !error && all.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {academic.length > 0 && (
              <CourseBlock
                title="Materias Académicas"
                subtitle="Plan general de estudios"
                Icon={IconBook}
                courses={academic}
                countLabel={academic.length === 1 ? "materia" : "materias"}
                accentVar="var(--accent)"
                accentSoft="var(--accent-soft)"
                borderVar="var(--border-light)"
              />
            )}
            {technical.length > 0 && (
              <CourseBlock
                title="Materias Técnicas"
                subtitle="Especialidad"
                Icon={IconWrench}
                courses={technical}
                countLabel={technical.length === 1 ? "materia" : "materias"}
                accentVar="var(--accent2)"
                accentSoft="var(--accent2-soft)"
                borderVar="var(--border-light)"
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}