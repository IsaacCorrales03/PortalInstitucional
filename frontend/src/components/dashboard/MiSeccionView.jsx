"use client";

import { useEffect } from "react";
import { getMySection } from "@/lib/api";
import { useState } from "react";

// ─── Íconos ───────────────────────────────────────────────────────────────────

const Icon = {
  book: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  sun: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  moon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  star: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  calendar: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  layers: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  tag: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SHIFT_MAP = {
  diurna:   { label: "Diurna",   icon: Icon.sun },
  nocturna: { label: "Nocturna", icon: Icon.moon },
};

function getInitials(name = "") {
  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function InfoCard({ icon, label, value, accent = false }) {
  if (!value && value !== 0) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        borderRadius: "var(--radius-md, 10px)",
        background: accent ? "var(--accent-soft)" : "var(--bg-elevated)",
        border: `1.5px solid ${accent ? "var(--accent)" : "var(--border)"}`,
        flex: "1 1 200px",
        minWidth: 0,
      }}
    >
      <span
        style={{
          color: accent ? "var(--accent)" : "var(--text-muted)",
          marginTop: 1,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-subtle, var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: accent ? "var(--accent)" : "var(--text)", wordBreak: "break-word" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function GuideAvatar({ name }) {
  const initials = getInitials(name);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        className="db-profile-avatar"
        style={{ width: 44, height: 44, fontSize: 15, fontWeight: 700, color: "white", flexShrink: 0 }}
      >
        {initials}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Profesor guía</div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ width = "100%", height = 16, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: "var(--bg-elevated)",
        animation: "db-pulse 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

function SectionSkeleton() {
  return (
    <div className="db-view">
      <div className="db-profile-card">
        <Skeleton width={72} height={72} style={{ borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="40%" height={22} />
          <Skeleton width="25%" height={14} />
          <Skeleton width="35%" height={14} />
        </div>
      </div>
      <div className="db-profile-section" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {[1,2,3,4].map(i => <Skeleton key={i} height={70} style={{ flex: "1 1 200px", borderRadius: 10 }} />)}
      </div>
    </div>
  );
}

// ─── MiSeccionView ────────────────────────────────────────────────────────────

export default function MiSeccionView() {
  const [section,  setSection]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    setLoading(true);
    getMySection()
      .then(setSection)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SectionSkeleton />;

  if (error) {
    return (
      <div className="db-view">
        <div className="db-inline-alert db-inline-alert--error">{error}</div>
      </div>
    );
  }

  if (!section) return null;

  const shiftInfo = SHIFT_MAP[section.shift] ?? { label: section.shift, icon: Icon.sun };
  const partLabel = section.section_part ? `Parte ${section.section_part.toUpperCase()}` : null;

  return (
    <div className="db-view">

      {/* ── Cabecera de sección ── */}
      <div className="db-profile-card">
        {/* Ícono decorativo */}
        <div
          className="db-profile-avatar"
          style={{ width: 72, height: 72, fontSize: 26, fontWeight: 800, color: "white" }}
        >
          {Icon.book}
        </div>

        <div className="db-profile-info">
          <div className="db-profile-name" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {section.section_name}
            {partLabel && (
              <span
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase", padding: "3px 8px",
                  borderRadius: 5, background: "var(--accent-soft)",
                  color: "var(--accent)", border: "1px solid var(--accent)",
                }}
              >
                {partLabel}
              </span>
            )}
          </div>

          <div className="db-profile-role">
            Año académico {section.academic_year}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
            <span style={{ color: "var(--text-muted)" }}>{shiftInfo.icon}</span>
            Jornada {shiftInfo.label}
          </div>
        </div>
      </div>

      {/* ── Cards de información ── */}
      <div className="db-profile-section">
        <div className="db-profile-section-header">
          <div>
            <h2 className="db-profile-section-title">Detalles de la sección</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>
              Información general de tu grupo
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <InfoCard
            icon={Icon.layers}
            label="Especialidad"
            value={section.specialty_name}
            accent
          />
          <InfoCard
            icon={Icon.calendar}
            label="Año académico"
            value={section.academic_year}
          />
          <InfoCard
            icon={shiftInfo.icon}
            label="Jornada"
            value={shiftInfo.label}
          />
          {partLabel && (
            <InfoCard
              icon={Icon.tag}
              label="División"
              value={partLabel}
            />
          )}
        </div>
      </div>

      {/* ── Profesor guía ── */}
      {section.guide_professor_name && (
        <div className="db-profile-section">
          <div className="db-profile-section-header">
            <div>
              <h2 className="db-profile-section-title">Profesor guía</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>
                Docente responsable de tu sección
              </p>
            </div>
          </div>
          <GuideAvatar name={section.guide_professor_name} />
        </div>
      )}

    </div>
  );
}
