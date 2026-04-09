"use client";
import { usePreload } from "@/lib/usePreload";

/* ─────────────────────────────────────────────────────────────────
   ICONS
───────────────────────────────────────────────────────────────── */
function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <path d="M8 7h8M8 11h6"/>
    </svg>
  );
}

function IconWrench() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}

function IconUserTiny() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COURSE CARD
───────────────────────────────────────────────────────────────── */
function CourseCard({ course, variant, index }) {
  const isTech = variant === "technical";

  const accentColor     = isTech ? "#6382ff" : "#4ade80";
  const accentRgb       = isTech ? "99,130,255" : "74,222,128";
  const accentSoft      = isTech ? "rgba(99,130,255,.08)" : "rgba(74,222,128,.07)";
  const accentBorder    = isTech ? "rgba(99,130,255,.18)" : "rgba(74,222,128,.18)";
  const accentBorderHov = isTech ? "rgba(99,130,255,.4)" : "rgba(74,222,128,.4)";

  const animDelay = `${index * 0.045}s`;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: "0",
        background: "var(--bg-elevated)",
        border: `1px solid ${accentBorder}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: "transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease, border-color .15s",
        cursor: "default",
        animation: `fadeSlideUp .35s ease both`,
        animationDelay: animDelay,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px) scale(1.01)";
        e.currentTarget.style.boxShadow = `0 8px 28px rgba(${accentRgb},.14), 0 2px 8px rgba(0,0,0,.12)`;
        e.currentTarget.style.borderColor = accentBorderHov;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = accentBorder;
      }}
    >
      {/* Top color bar */}
      <div style={{
        height: 3,
        background: isTech
          ? `linear-gradient(90deg, #6382ff 0%, #a78bfa 100%)`
          : `linear-gradient(90deg, #4ade80 0%, #34d399 100%)`,
        flexShrink: 0,
      }} />

      {/* Body */}
      <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>

        {/* Badges row */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", minHeight: 18 }}>
          {course.is_guide && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 9, fontWeight: 800, letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "#f59e0b",
              background: "rgba(245,158,11,.1)",
              border: "1px solid rgba(245,158,11,.22)",
              padding: "2px 7px 2px 5px",
              borderRadius: 5,
            }}>
              <IconStar /> guía
            </span>
          )}
          {course.section_part && (
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: ".08em",
              textTransform: "uppercase",
              color: accentColor,
              background: accentSoft,
              border: `1px solid ${accentBorder}`,
              padding: "2px 7px",
              borderRadius: 5,
            }}>
              parte {course.section_part}
            </span>
          )}
        </div>

        {/* Course name */}
        <div style={{
          fontWeight: 700,
          fontSize: 14,
          color: "var(--text)",
          lineHeight: 1.3,
          letterSpacing: "-.01em",
        }}>
          {course.course_name}
        </div>

        {/* Description */}
        {course.description ? (
          <p style={{
            margin: 0,
            fontSize: 11.5,
            color: "var(--text-subtle)",
            lineHeight: 1.6,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {course.description}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-muted, rgba(255,255,255,.18))", fontStyle: "italic" }}>
            Sin descripción
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "10px 16px 13px",
        marginTop: 10,
        borderTop: "1px solid var(--border-light)",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: accentSoft,
          border: `1px solid ${accentBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accentColor, flexShrink: 0,
        }}>
          <IconUserTiny />
        </div>
        <span style={{
          fontSize: 11.5, color: "var(--text-subtle)", fontWeight: 500,
          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
        }}>
          {course.professor_name}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION BLOCK
───────────────────────────────────────────────────────────────── */
function CourseBlock({ title, subtitle, icon: Icon, courses, variant }) {
  const isTech = variant === "technical";

  const accentColor  = isTech ? "#6382ff" : "#4ade80";
  const accentSoft   = isTech ? "rgba(99,130,255,.09)" : "rgba(74,222,128,.08)";
  const accentBorder = isTech ? "rgba(99,130,255,.2)" : "rgba(74,222,128,.2)";

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Header pill */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: accentSoft,
        border: `1px solid ${accentBorder}`,
        borderRadius: 12,
      }}>
        <div style={{
          width: 36, height: 36, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 9,
          background: isTech ? "rgba(99,130,255,.15)" : "rgba(74,222,128,.13)",
          border: `1px solid ${accentBorder}`,
          color: accentColor,
        }}>
          <Icon />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 750,
            color: accentColor,
            letterSpacing: "-.015em",
          }}>
            {title}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 1 }}>
            {subtitle}
          </div>
        </div>

        <div style={{
          fontSize: 13, fontWeight: 800,
          minWidth: 30, textAlign: "center",
          padding: "5px 12px",
          borderRadius: 99,
          background: isTech ? "rgba(99,130,255,.15)" : "rgba(74,222,128,.13)",
          border: `1px solid ${accentBorder}`,
          color: accentColor,
          letterSpacing: "-.01em",
        }}>
          {courses.length}
        </div>
      </div>

      {/* Cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
        gap: 10,
      }}>
        {courses.map((c, i) => (
          <CourseCard
            key={`${c.course_id}-${c.section_part ?? "none"}-${i}`}
            course={c}
            variant={variant}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 12,
      padding: "72px 0",
      color: "var(--text-subtle)",
      textAlign: "center",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-light)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-subtle)",
      }}>
        <IconBook />
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-subtle)", marginBottom: 4 }}>
          No hay materias asignadas
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted, rgba(255,255,255,.25))" }}>
          Tu sección aún no tiene cursos registrados.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN VIEW
───────────────────────────────────────────────────────────────── */
export default function MisCursosView() {

  const { data, isLoading, error } = usePreload("mycourses");
  const all = data ?? [];

  // Técnicas sin specialty_id = compartidas (ej. Educación Física) → se muestran en el bloque académico
  const academic  = all.filter(c => !c.is_technical || c.course_name === "Educación Física");
  const technical = all.filter(c => c.is_technical && c.course_name !== "Educación Física");
  return (
    <>
      {/* Keyframes — inyectados una sola vez */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="db-view">

        {/* HEADER */}
        <div className="db-section-header">
          <div>
            <div className="db-section-title">Mis Materias</div>
            <div className="db-section-subtitle">
              {all.length > 0
                ? `${all.length} ${all.length === 1 ? "materia" : "materias"} · ${academic.length} académicas · ${technical.length} técnicas`
                : "Cursos asignados a tu sección"}
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 13, color: "var(--text-subtle)", padding: "40px 0",
          }}>
            <span className="db-spinner" style={{ width: 14, height: 14 }} />
            Cargando materias...
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="db-inline-alert db-inline-alert--error">{error}</div>
        )}

        {/* Empty */}
        {!isLoading && !error && all.length === 0 && <EmptyState />}

        {/* Content */}
        {!isLoading && !error && all.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            {academic.length > 0 && (
              <CourseBlock
                title="Materias Academicas"
                subtitle={`Plan general · ${academic.length} ${academic.length === 1 ? "materia" : "materias"}`}
                icon={IconBook}
                courses={academic}
                variant="academic"
              />
            )}
            {technical.length > 0 && (
              <CourseBlock
                title="Materias Tecnicas"
                subtitle={`Especialidad · ${technical.length} ${technical.length === 1 ? "materia" : "materias"}`}
                icon={IconWrench}
                courses={technical}
                variant="technical"
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}