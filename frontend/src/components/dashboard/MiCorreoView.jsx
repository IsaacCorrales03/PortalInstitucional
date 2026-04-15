"use client";

import { useState, useEffect } from "react";
import { usePreload } from "@/lib/usePreload";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "estudiante", label: "Todos los estudiantes" },
  { value: "professor",  label: "Todos los profesores"  },
  { value: "admin",      label: "Todos los admins"      },
];

// ─── Íconos ───────────────────────────────────────────────────────────────────

const Icon = {
  inbox: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
  send: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  compose: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  back: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  close: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  user: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  users: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  paperclip: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  ),
  dot: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
      <circle cx="4" cy="4" r="4"/>
    </svg>
  ),
  tag: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000) return "ahora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h`;
  if (diff < 7 * 86_400_000) return d.toLocaleDateString("es-CR", { weekday: "short" });
  return d.toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

function fullDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--accent-soft, rgba(99,102,241,0.12))",
      color: "var(--accent)", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
      border: "1.5px solid var(--accent)",
      userSelect: "none",
    }}>
      {getInitials(name)}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ width = "100%", height = 14, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: "var(--bg-elevated)",
      animation: "db-pulse 1.5s ease-in-out infinite",
      ...style,
    }} />
  );
}

function MailListSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
          <Skeleton width={36} height={36} style={{ borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <Skeleton width="35%" height={13} />
            <Skeleton width="70%" height={11} />
          </div>
          <Skeleton width={36} height={11} />
        </div>
      ))}
    </div>
  );
}

// ─── MailRow ──────────────────────────────────────────────────────────────────

function MailRow({ mail, active, onClick, isSent }) {
  const displayName = isSent ? `Para: ${mail.sender_name}` : mail.sender_name;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", cursor: "pointer",
        borderBottom: "1px solid var(--border)",
        background: active
          ? "var(--accent-soft)"
          : !mail.is_read && !isSent
          ? "var(--bg-elevated)"
          : "transparent",
        transition: "background 0.15s",
        position: "relative",
      }}
    >
      {!mail.is_read && !isSent && (
        <span style={{
          position: "absolute", left: 4, top: "50%",
          transform: "translateY(-50%)",
          color: "var(--accent)", lineHeight: 1,
        }}>
          {Icon.dot}
        </span>
      )}

      <Avatar name={mail.sender_name} size={36} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
          <span style={{
            fontSize: 13, fontWeight: !mail.is_read && !isSent ? 700 : 500,
            color: "var(--text)", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {displayName}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
            {formatDate(mail.sent_at)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: !mail.is_read && !isSent ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {mail.subject}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2, opacity: 0.7 }}>
          {mail.content?.slice(0, 80)}
        </div>
      </div>

      {mail.attachments?.length > 0 && (
        <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{Icon.paperclip}</span>
      )}
    </div>
  );
}

// ─── MailDetail ───────────────────────────────────────────────────────────────

function MailDetail({ mail, onBack, onMarkRead }) {
  useEffect(() => {
    if (!mail.is_read && !mail.is_mine) onMarkRead(mail.id);
  }, [mail.id]);

  return (
    <div className="db-view" style={{ padding: 0 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 20px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
        position: "sticky", top: 0, zIndex: 2,
      }}>
        <button className="db-btn db-btn--ghost" onClick={onBack} style={{ padding: "6px 10px", gap: 6 }}>
          {Icon.back} Volver
        </button>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 700 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "0 0 16px" }}>
          {mail.subject}
        </h2>

        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px",
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-md, 10px)",
          border: "1px solid var(--border)",
          marginBottom: 24,
        }}>
          <Avatar name={mail.sender_name} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{mail.sender_name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{fullDate(mail.sent_at)}</div>
          </div>
          {!mail.is_read && !mail.is_mine && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 8px",
              borderRadius: 5, background: "var(--accent-soft)",
              color: "var(--accent)", border: "1px solid var(--accent)",
            }}>
              Sin leer
            </span>
          )}
        </div>

        <div style={{
          fontSize: 14, lineHeight: 1.75, color: "var(--text)",
          whiteSpace: "pre-wrap", wordBreak: "break-word", padding: "0 4px",
        }}>
          {mail.content}
        </div>

        {mail.attachments?.length > 0 && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Adjuntos
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {mail.attachments.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", fontSize: 12, fontWeight: 600,
                    borderRadius: 7, background: "var(--bg-elevated)",
                    border: "1px solid var(--border)", color: "var(--accent)",
                    textDecoration: "none",
                  }}
                >
                  {Icon.paperclip} {url.split("/").pop()}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RecipientTag ─────────────────────────────────────────────────────────────

function RecipientTag({ label, onRemove }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 6,
      background: "var(--accent-soft)", border: "1px solid var(--accent)",
      color: "var(--accent)", fontSize: 12, fontWeight: 600,
    }}>
      {Icon.user} {label}
      <button
        onClick={onRemove}
        style={{
          background: "none", border: "none", padding: 0,
          cursor: "pointer", color: "var(--accent)",
          display: "flex", alignItems: "center", lineHeight: 1,
        }}
      >
        {Icon.close}
      </button>
    </span>
  );
}

// ─── ComposeModal ─────────────────────────────────────────────────────────────

function ComposeModal({ onClose, onSent }) {
  const [form, setForm]             = useState({ subject: "", content: "" });
  const [targetMode, setTargetMode] = useState("direct");
  const [selectedRole, setSelectedRole] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // ── Usuarios del store ────────────────────────────────────────
  const { ensure } = useStore();
  const allUsers   = useStore((s) => s.correoUsers?.data ?? []);

  useEffect(() => {
    ensure("correoUsers");
  }, []);

  // ── Filtro local ──────────────────────────────────────────────
  const searchResults = search.trim().length >= 2
    ? allUsers
        .filter((u) =>
          u.full_name.toLowerCase().includes(search.trim().toLowerCase()) &&
          !recipients.find((r) => r.id === u.id)
        )
        .slice(0, 8)
    : [];

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError(null);
  }

  function addRecipient(user) {
    if (!recipients.find(r => r.id === user.id)) {
      setRecipients(p => [...p, { id: user.id, name: user.full_name }]);
    }
    setSearch("");
  }

  function removeRecipient(id) {
    setRecipients(p => p.filter(r => r.id !== id));
  }

  async function handleSend() {
    if (!form.subject.trim()) { setError("El asunto no puede estar vacío.");    return; }
    if (!form.content.trim()) { setError("El contenido no puede estar vacío."); return; }

    const payload = {
      subject:           form.subject.trim(),
      content:           form.content.trim(),
      recipient_ids:     targetMode === "direct" ? recipients.map(r => r.id) : [],
      target_role:       targetMode === "role"   ? selectedRole || null : null,
      target_section_id: null,
      attachments:       [],
    };

    if (targetMode === "direct" && payload.recipient_ids.length === 0) {
      setError("Debes agregar al menos un destinatario."); return;
    }
    if (targetMode === "role" && !payload.target_role) {
      setError("Seleccioná un rol destinatario."); return;
    }

    setLoading(true); setError(null);
    try {
      await api.sendCorreo(payload);
      onSent?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "var(--bg, var(--color-background-primary, #fff))",
        border: "1.5px solid var(--border)",
        borderRadius: 14, width: "100%", maxWidth: 600,
        maxHeight: "90vh", overflowY: "auto",
        display: "flex", flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {Icon.compose} Nuevo correo
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex", alignItems: "center" }}>
            {Icon.close}
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div className="db-inline-alert db-inline-alert--error">{error}</div>}

          {/* Modo destinatario */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
              Tipo de destinatario
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { key: "direct", label: "Usuarios", icon: Icon.user },
                { key: "role",   label: "Por rol",  icon: Icon.tag  },
              ].map(mode => (
                <button
                  key={mode.key}
                  onClick={() => { setTargetMode(mode.key); setError(null); }}
                  className="db-btn"
                  style={{
                    padding: "7px 14px", gap: 6, fontSize: 12, fontWeight: 600,
                    background: targetMode === mode.key ? "var(--accent-soft)" : "var(--bg-elevated)",
                    border: `1.5px solid ${targetMode === mode.key ? "var(--accent)" : "var(--border)"}`,
                    color: targetMode === mode.key ? "var(--accent)" : "var(--text-muted)",
                    borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center",
                  }}
                >
                  {mode.icon} {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Destinatarios directos */}
          {targetMode === "direct" && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                Para
              </label>
              <div style={{
                border: "1.5px solid var(--border)", borderRadius: 9,
                padding: "8px 12px", background: "var(--bg-elevated)",
                display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
              }}>
                {recipients.map(r => (
                  <RecipientTag key={r.id} label={r.name} onRemove={() => removeRecipient(r.id)} />
                ))}
                <div style={{ position: "relative", flex: "1 1 120px", minWidth: 100 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{Icon.search}</span>
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar usuario…"
                      style={{
                        background: "none", border: "none", outline: "none",
                        fontSize: 13, color: "var(--text)", width: "100%",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                      background: "var(--bg, #fff)",
                      border: "1.5px solid var(--border)", borderRadius: 9,
                      zIndex: 10, overflow: "hidden",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    }}>
                      {searchResults.map(u => (
                        <div
                          key={u.id}
                          onClick={() => addRecipient(u)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "9px 14px", cursor: "pointer",
                            borderBottom: "1px solid var(--border)",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <Avatar name={u.full_name} size={28} />
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                            {u.full_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {recipients.length === 0 && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>
                  Escribí al menos 2 caracteres para buscar usuarios.
                </p>
              )}
            </div>
          )}

          {/* Por rol */}
          {targetMode === "role" && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                Rol destinatario
              </label>
              <select className="db-input" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                <option value="">— Seleccioná un rol —</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {selectedRole && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 8,
                  background: "var(--accent-soft)", border: "1px solid var(--accent)",
                  display: "flex", alignItems: "center", gap: 7,
                  fontSize: 12, color: "var(--accent)", fontWeight: 600,
                }}>
                  {Icon.users} Se enviará a: {ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}
                </div>
              )}
            </div>
          )}

          {/* Asunto */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
              Asunto
            </label>
            <input
              className="db-input" type="text" name="subject"
              value={form.subject} onChange={handleChange}
              placeholder="Asunto del correo" maxLength={120}
            />
          </div>

          {/* Mensaje */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
              Mensaje
            </label>
            <textarea
              className="db-input" name="content"
              value={form.content} onChange={handleChange}
              placeholder="Escribí tu mensaje aquí…"
              rows={6} style={{ resize: "vertical", minHeight: 120 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "14px 24px", borderTop: "1px solid var(--border)",
        }}>
          <button className="db-btn db-btn--ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="db-btn db-btn--primary" onClick={handleSend} disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            {Icon.send} {loading ? "Enviando…" : "Enviar correo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CorreoView ───────────────────────────────────────────────────────────────

export default function CorreoView() {
  const [tab, setTab]                   = useState("inbox");
  const [selectedMail, setSelectedMail] = useState(null);
  const [showCompose, setShowCompose]   = useState(false);

  const { data: inbox,   isLoading: loadingInbox, error: errorInbox,   refetch: reloadInbox   } = usePreload("correo");
  const { data: sent,    isLoading: loadingSent,  error: errorSent,    refetch: reloadSent    } = usePreload("correoEnviados");

  const mails   = tab === "inbox" ? (inbox ?? []) : (sent ?? []);
  const loading = tab === "inbox" ? loadingInbox  : loadingSent;
  const error   = tab === "inbox" ? errorInbox    : errorSent;

  const unread = (inbox ?? []).filter(m => !m.is_read && !m.is_mine).length;

  async function markRead(mailId) {
    try {
      await api.markCorreoRead(mailId);
      reloadInbox();
    } catch {}
  }

  function handleMailClick(mail) {
    setSelectedMail(mail);
    if (!mail.is_read && !mail.is_mine) markRead(mail.id);
  }

  function handleSent() {
    reloadSent();
    reloadInbox();
  }

  if (selectedMail) {
    return (
      <MailDetail
        mail={selectedMail}
        onBack={() => setSelectedMail(null)}
        onMarkRead={markRead}
      />
    );
  }

  const isSent = tab === "sent";

  return (
    <div className="db-view" style={{ padding: 0 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[
            { key: "inbox", label: "Recibidos", icon: Icon.inbox },
            { key: "sent",  label: "Enviados",  icon: Icon.send  },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectedMail(null); }}
              className="db-btn"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", fontSize: 13, fontWeight: 600,
                borderRadius: 8, cursor: "pointer",
                background: tab === t.key ? "var(--accent-soft)" : "transparent",
                border: `1.5px solid ${tab === t.key ? "var(--accent)" : "transparent"}`,
                color: tab === t.key ? "var(--accent)" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >
              {t.icon}
              {t.label}
              {t.key === "inbox" && unread > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 9,
                  background: "var(--accent)", color: "white",
                  fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 4px",
                }}>
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          className="db-btn db-btn--primary"
          onClick={() => setShowCompose(true)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", fontSize: 13 }}
        >
          {Icon.compose} Redactar
        </button>
      </div>

      {/* Lista */}
      <div style={{ flex: 1 }}>
        {loading && <MailListSkeleton />}

        {!loading && error && (
          <div style={{ padding: 24 }}>
            <div className="db-inline-alert db-inline-alert--error">{error}</div>
          </div>
        )}

        {!loading && !error && mails.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 10, padding: "60px 20px",
            color: "var(--text-muted)",
          }}>
            <span style={{ opacity: 0.35 }}>{isSent ? Icon.send : Icon.inbox}</span>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text-muted)" }}>
              {isSent ? "No has enviado correos todavía" : "Tu bandeja está vacía"}
            </p>
            {!isSent && (
              <button
                className="db-btn db-btn--ghost"
                onClick={() => setShowCompose(true)}
                style={{ marginTop: 4, fontSize: 13 }}
              >
                {Icon.compose} Redactar tu primer correo
              </button>
            )}
          </div>
        )}

        {!loading && !error && mails.length > 0 && (
          <div>
            {mails.map(mail => (
              <MailRow
                key={mail.id}
                mail={mail}
                active={selectedMail?.id === mail.id}
                onClick={() => handleMailClick(mail)}
                isSent={isSent}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}