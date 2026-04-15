"use client";

import { useState } from "react";
import { usePreload } from "@/lib/usePreload";

// ─── Constantes ───────────────────────────────────────────────────────────────

const SCHOLARSHIP_TYPES = [
  {
    key: "transporte",
    label: "Transporte",
    description: "Cubre el costo de traslado diario hacia y desde el colegio.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
  {
    key: "alimentacion",
    label: "Comedor",
    description: "Acceso al comedor estudiantil durante el horario lectivo.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
        <path d="M7 2v20"/>
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
      </svg>
    ),
  },
];

const STATUS_CONFIG = {
  activa:     { label: "Activa",     color: "var(--success)",  bg: "var(--success-soft)" },
  suspendida: { label: "Suspendida", color: "var(--warning)",  bg: "rgba(234,179,8,0.1)" },
  finalizada: { label: "Finalizada", color: "var(--text-muted)", bg: "var(--bg-elevated)" },
};

const TYPE_LABELS = { transporte: "Transporte", alimentacion: "Comedor" };

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-CR", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ─── Íconos ───────────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const EmptyIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ─── ScholarshipCard ──────────────────────────────────────────────────────────

function ScholarshipCard({ scholarship }) {
  const cfg = STATUS_CONFIG[scholarship.status] ?? STATUS_CONFIG.activa;
  const type = SCHOLARSHIP_TYPES.find((t) => t.key === scholarship.type);

  return (
    <div className="db-scholarship-card">
      <div className="db-scholarship-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "var(--radius-md)",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", flexShrink: 0,
          }}>
            {type?.icon}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
              Beca de {TYPE_LABELS[scholarship.type] ?? scholarship.type}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
              Desde {formatDate(scholarship.start_date)}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
          textTransform: "uppercase", padding: "3px 10px", borderRadius: 99,
          color: cfg.color, background: cfg.bg,
        }}>
          {cfg.label}
        </span>
      </div>

      {(scholarship.end_date || scholarship.notes) && (
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {scholarship.end_date && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              <span style={{ fontWeight: 500, color: "var(--text-subtle)" }}>Vence:</span>{" "}
              {formatDate(scholarship.end_date)}
            </div>
          )}
          {scholarship.notes && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <span style={{ fontWeight: 500, color: "var(--text-subtle)" }}>Nota:</span>{" "}
              {scholarship.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ApplyModal ───────────────────────────────────────────────────────────────

function ApplyModal({ activeTypes, onClose, onSuccess }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  async function handleApply() {
    if (!selected) { setError("Seleccioná un tipo de beca."); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch("/scholarships/me/apply", {
        method: "POST",
        body: JSON.stringify({ type: selected }),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", width: "100%", maxWidth: 420,
        padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            Aplicar para beca
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
            Seleccioná el tipo de beca al que querés aplicar.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {SCHOLARSHIP_TYPES.map((t) => {
            const isActive = activeTypes.includes(t.key);
            const isSelected = selected === t.key;
            return (
              <button
                key={t.key}
                disabled={isActive}
                onClick={() => { setSelected(t.key); setError(null); }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "14px 16px", borderRadius: "var(--radius-md)",
                  border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                  background: isSelected ? "var(--accent-soft)" : isActive ? "var(--bg-elevated)" : "var(--bg-card)",
                  cursor: isActive ? "not-allowed" : "pointer",
                  opacity: isActive ? 0.5 : 1,
                  textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
                  width: "100%",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--radius-sm)",
                  background: isSelected ? "var(--accent-soft)" : "var(--bg-elevated)",
                  border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: isSelected ? "var(--accent)" : "var(--text-muted)",
                  flexShrink: 0, transition: "all 0.15s",
                }}>
                  {t.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{t.label}</span>
                    {isActive && (
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--success)", background: "var(--success-soft)", padding: "1px 7px", borderRadius: 99 }}>
                        Ya activa
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "3px 0 0", lineHeight: 1.4 }}>
                    {t.description}
                  </p>
                </div>
                {isSelected && !isActive && (
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0, marginTop: 2 }}>
                    <CheckIcon />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="db-inline-alert db-inline-alert--error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="db-btn db-btn--ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="db-btn db-btn--primary"
            onClick={handleApply}
            disabled={loading || !selected}
          >
            {loading ? "Enviando…" : "Aplicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BecasView ────────────────────────────────────────────────────────────────

export default function BecasView() {
  const { data: scholarships, isLoading, error: loadError, refetch } = usePreload("scholarships");
  const [modalOpen, setModalOpen]   = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  function handleSuccess() {
    setSuccessMsg("Beca aplicada correctamente.");
    refetch();
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  const activeTypes = (scholarships ?? [])
    .filter((s) => s.status === "activa")
    .map((s) => s.type);

  const allTypesActive = SCHOLARSHIP_TYPES.every((t) => activeTypes.includes(t.key));

  return (
    <div className="db-view">

      {/* ── Header ── */}
      <div className="db-profile-section" style={{ padding: "20px 24px" }}>
        <div className="db-profile-section-header">
          <div>
            <h2 className="db-profile-section-title">Becas</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>
              Gestioná tus becas estudiantiles
            </p>
          </div>
          <button
            className="db-btn db-btn--primary"
            onClick={() => setModalOpen(true)}
            disabled={allTypesActive}
            title={allTypesActive ? "Ya tenés todas las becas disponibles activas" : undefined}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Aplicar para beca
          </button>
        </div>
      </div>

      {/* ── Feedback ── */}
      {successMsg && (
        <div className="db-inline-alert db-inline-alert--success" style={{ margin: "0 0 4px" }}>
          {successMsg}
        </div>
      )}

      {/* ── Lista ── */}
      <div className="db-profile-section">
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 14px" }}>
          Mis becas
        </h3>

        {isLoading && (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <span className="db-spinner" style={{ width: 22, height: 22 }} />
          </div>
        )}

        {loadError && (
          <div className="db-inline-alert db-inline-alert--error">{loadError}</div>
        )}

        {!isLoading && !loadError && scholarships?.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "36px 0", color: "var(--text-muted)" }}>
            <EmptyIcon />
            <p style={{ fontSize: 13, margin: 0 }}>No tenés becas registradas todavía.</p>
            <button className="db-btn db-btn--ghost" style={{ fontSize: 13 }} onClick={() => setModalOpen(true)}>
              Aplicar ahora
            </button>
          </div>
        )}

        {!isLoading && scholarships?.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {scholarships.map((s) => (
              <ScholarshipCard key={s.id} scholarship={s} />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <ApplyModal
          activeTypes={activeTypes}
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
