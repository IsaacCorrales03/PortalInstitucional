"use client";

import { useState } from "react";
import { usePreload } from "@/lib/usePreload";
import { getTokenPayload } from "./DashboardShell";
import { useTheme } from "@/lib/useTheme";   // ← hook de tema



// ─── Constantes ───────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  superadmin: "Super Administrador",
  admin:      "Administrador",
  professor:  "Profesor",
  estudiante: "Estudiante",
};

const SHIFT_LABELS  = { diurna: "Diurna", nocturna: "Nocturna" };
const STATUS_LABELS = { activo: "Activo", inactivo: "Inactivo", egresado: "Egresado", retirado: "Retirado" };
const STATUS_COLOR  = { activo: "badge--green", inactivo: "badge--gray", egresado: "badge--blue", retirado: "badge--orange" };

function getRoleLabel(roles = []) {
  for (const key of ["superadmin", "admin", "professor", "estudiante"]) {
    if (roles.includes(key)) return ROLE_LABELS[key] ?? "Usuario";
  }
  return "Usuario";
}

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

// ─── Validación de contraseña ─────────────────────────────────────────────────

const PASSWORD_CHECKS = [
  { key: "length",  label: "Mínimo 8 caracteres",       test: (p) => p.length >= 8 },
  { key: "upper",   label: "Una letra mayúscula (A-Z)",  test: (p) => /[A-Z]/.test(p) },
  { key: "lower",   label: "Una letra minúscula (a-z)",  test: (p) => /[a-z]/.test(p) },
  { key: "number",  label: "Un número (0-9)",            test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "Un símbolo (!@#$%^&*…)",     test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getPasswordScore(p) { return PASSWORD_CHECKS.filter((c) => c.test(p)).length; }

function getPasswordStrengthLabel(score) {
  if (score <= 1) return { label: "Muy débil",  color: "var(--error)" };
  if (score === 2) return { label: "Débil",      color: "var(--error)" };
  if (score === 3) return { label: "Regular",    color: "var(--warning)" };
  if (score === 4) return { label: "Fuerte",     color: "var(--success)" };
  return                   { label: "Muy fuerte", color: "var(--success)" };
}

function validatePassword(p) {
  const failed = PASSWORD_CHECKS.filter((c) => !c.test(p));
  return failed.length === 0 ? null : `Contraseña inválida: ${failed.map((c) => c.label.toLowerCase()).join(", ")}.`;
}

// ─── Íconos ───────────────────────────────────────────────────────────────────

const Icon = {
  mail: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  id:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><path d="M6 12h4"/><path d="M6 16h12"/></svg>,
  lock: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  eye:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  edit:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  sun:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  monitor: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  leaf: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  waves: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>,

  flower: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/><path d="M12 14a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/><path d="M2 12a4 4 0 0 1 4-4 4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4z"/><path d="M14 12a4 4 0 0 1 4-4 4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4z"/></svg>,

  flame: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,

  zap: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
};

// ─── ProfileField ─────────────────────────────────────────────────────────────

function ProfileField({ label, value, mono = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="db-profile-field">
      <span className="db-profile-field-label">{label}</span>
      <span className="db-profile-field-value" style={mono ? { fontFamily: "monospace", letterSpacing: "0.04em" } : {}}>
        {value}
      </span>
    </div>
  );
}

// ─── PasswordInput ────────────────────────────────────────────────────────────

function PasswordInput({ name, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        className="db-input"
        type={show ? "text" : "password"}
        name={name} value={value} onChange={onChange}
        placeholder={placeholder} style={{ paddingRight: 40 }}
        autoComplete="new-password"
      />
      <button
        type="button" onClick={() => setShow((s) => !s)}
        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
        tabIndex={-1}
      >
        {show ? Icon.eyeOff : Icon.eye}
      </button>
    </div>
  );
}

// ─── PasswordStrength ─────────────────────────────────────────────────────────

function PasswordStrength({ password }) {
  if (!password) return null;
  const score = getPasswordScore(password);
  const { label, color } = getPasswordStrengthLabel(score);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 6, alignItems: "center" }}>
        {PASSWORD_CHECKS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < score ? color : "var(--border)", transition: "background 0.25s" }} />
        ))}
        <span style={{ fontSize: 11, fontWeight: 700, color, marginLeft: 8, whiteSpace: "nowrap", minWidth: 72 }}>{label}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px" }}>
        {PASSWORD_CHECKS.map((c) => {
          const ok = c.test(password);
          return (
            <span key={c.key} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5, color: ok ? "var(--success)" : "var(--text-muted)", transition: "color 0.2s" }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: ok ? "var(--success-soft)" : "var(--bg-elevated)", border: `1px solid ${ok ? "rgba(82,212,138,0.3)" : "var(--border)"}`, color: ok ? "var(--success)" : "var(--text-subtle)", transition: "all 0.2s" }}>
                {ok ? Icon.check : Icon.x}
              </span>
              {c.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── PasswordSection ──────────────────────────────────────────────────────────

const EMPTY_PASS = { current: "", next: "", confirm: "" };

function PasswordSection({ userId }) {
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState(EMPTY_PASS);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);

  function handleChange(e) { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setError(null); setSuccess(false); }

  async function handleSubmit() {
    if (!form.current) { setError("Ingresá tu contraseña actual."); return; }
    if (!form.next)    { setError("Ingresá la nueva contraseña."); return; }
    const pwError = validatePassword(form.next);
    if (pwError) { setError(pwError); return; }
    if (form.next !== form.confirm) { setError("Las contraseñas nuevas no coinciden."); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch("/auth/change-password", { method: "PUT", body: JSON.stringify({ user_id: userId, current_password: form.current, new_password: form.next, confirm_password: form.confirm }) });
      setSuccess(true); setForm(EMPTY_PASS); setOpen(false);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  function handleCancel() { setForm(EMPTY_PASS); setError(null); setOpen(false); }
  const confirmMismatch = form.confirm && form.next !== form.confirm;

  return (
    <div className="db-profile-section">
      <div className="db-profile-section-header">
        <div>
          <h2 className="db-profile-section-title">Seguridad</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>Administrá el acceso a tu cuenta</p>
        </div>
        {!open && <button className="db-btn db-btn--ghost" onClick={() => setOpen(true)}>{Icon.lock} Cambiar contraseña</button>}
      </div>
      {success && <div className="db-inline-alert db-inline-alert--success">Contraseña actualizada correctamente.</div>}
      {open && (
        <div className="db-profile-form">
          {error && <div className="db-inline-alert db-inline-alert--error">{error}</div>}
          <div className="db-field">
            <label className="db-field-label">Contraseña actual</label>
            <PasswordInput name="current" value={form.current} onChange={handleChange} placeholder="Tu contraseña actual" />
          </div>
          <div className="db-field">
            <label className="db-field-label">Nueva contraseña</label>
            <PasswordInput name="next" value={form.next} onChange={handleChange} placeholder="Mínimo 8 caracteres" />
            <PasswordStrength password={form.next} />
          </div>
          <div className="db-field">
            <label className="db-field-label">Confirmar nueva contraseña</label>
            <PasswordInput name="confirm" value={form.confirm} onChange={handleChange} placeholder="Repetí la nueva contraseña" />
            {confirmMismatch && <p style={{ fontSize: 12, color: "var(--error)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>{Icon.x} Las contraseñas no coinciden.</p>}
            {form.confirm && !confirmMismatch && form.next && <p style={{ fontSize: 12, color: "var(--success)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>{Icon.check} Las contraseñas coinciden.</p>}
          </div>
          <div className="db-profile-form-actions">
            <button className="db-btn db-btn--ghost" onClick={handleCancel} disabled={loading}>Cancelar</button>
            <button className="db-btn db-btn--primary" onClick={handleSubmit} disabled={loading || confirmMismatch || !form.confirm}>
              {loading ? "Guardando…" : "Guardar contraseña"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EmailSection ─────────────────────────────────────────────────────────────

const EMPTY_EMAIL = { newEmail: "", confirmEmail: "", password: "" };
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function EmailSection({ userId, currentEmail }) {
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState(EMPTY_EMAIL);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);

  function handleChange(e) { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setError(null); setSuccess(false); }

  async function handleSubmit() {
    if (!form.newEmail)                      { setError("Ingresá el nuevo email."); return; }
    if (!isValidEmail(form.newEmail))        { setError("El email no tiene un formato válido."); return; }
    if (form.newEmail === currentEmail)      { setError("El nuevo email es igual al actual."); return; }
    if (!form.confirmEmail)                  { setError("Confirmá el nuevo email."); return; }
    if (form.newEmail !== form.confirmEmail) { setError("Los emails no coinciden."); return; }
    if (!form.password)                      { setError("Ingresá tu contraseña para confirmar."); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch("/auth/change-email", { method: "PUT", body: JSON.stringify({ user_id: userId, new_email: form.newEmail, password: form.password }) });
      setSuccess(true); setForm(EMPTY_EMAIL); setOpen(false);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  function handleCancel() { setForm(EMPTY_EMAIL); setError(null); setOpen(false); }
  const emailMismatch = form.confirmEmail && form.newEmail !== form.confirmEmail;

  return (
    <div className="db-profile-section">
      <div className="db-profile-section-header">
        <div>
          <h2 className="db-profile-section-title">Correo electrónico</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>{currentEmail ? `Actual: ${currentEmail}` : "Actualizá tu dirección de correo"}</p>
        </div>
        {!open && <button className="db-btn db-btn--ghost" onClick={() => setOpen(true)}>{Icon.edit} Cambiar email</button>}
      </div>
      {success && <div className="db-inline-alert db-inline-alert--success">Email actualizado correctamente.</div>}
      {open && (
        <div className="db-profile-form">
          {error && <div className="db-inline-alert db-inline-alert--error">{error}</div>}
          <div className="db-field">
            <label className="db-field-label">Nuevo email</label>
            <input className="db-input" type="email" name="newEmail" value={form.newEmail} onChange={handleChange} placeholder="nuevo@correo.com" autoComplete="email" />
            {form.newEmail && !isValidEmail(form.newEmail) && <p style={{ fontSize: 12, color: "var(--error)", marginTop: 4 }}>Formato de email inválido.</p>}
          </div>
          <div className="db-field">
            <label className="db-field-label">Confirmar nuevo email</label>
            <input className="db-input" type="email" name="confirmEmail" value={form.confirmEmail} onChange={handleChange} placeholder="Repetí el nuevo email" autoComplete="off" />
            {emailMismatch && <p style={{ fontSize: 12, color: "var(--error)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>{Icon.x} Los emails no coinciden.</p>}
            {form.confirmEmail && !emailMismatch && isValidEmail(form.newEmail) && <p style={{ fontSize: 12, color: "var(--success)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>{Icon.check} Los emails coinciden.</p>}
          </div>
          <div className="db-field">
            <label className="db-field-label">Contraseña actual (para confirmar)</label>
            <PasswordInput name="password" value={form.password} onChange={handleChange} placeholder="Tu contraseña actual" />
          </div>
          <div className="db-profile-form-actions">
            <button className="db-btn db-btn--ghost" onClick={handleCancel} disabled={loading}>Cancelar</button>
            <button className="db-btn db-btn--primary" onClick={handleSubmit} disabled={loading || emailMismatch || !form.confirmEmail}>
              {loading ? "Guardando…" : "Guardar email"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ThemeSection ─────────────────────────────────────────────────────────────

const BASE_THEMES = [
  { key: "dark",   label: "Oscuro",  icon: Icon.moon    },
  { key: "light",  label: "Claro",   icon: Icon.sun     },
  { key: "system", label: "Sistema", icon: Icon.monitor },
];

const COLOR_THEMES = [
  { key: "neon",   label: "Neón",   icon: Icon.zap    },
  { key: "lava",   label: "Lava",   icon: Icon.flame  },
  { key: "forest", label: "Bosque", icon: Icon.leaf   },
  { key: "ocean",  label: "Océano", icon: Icon.waves  },
  { key: "rose",   label: "Rose",   icon: Icon.flower },
];

function ThemeSection() {
  const { theme, resolved, colorName, setTheme, setColorName } = useTheme();

  const renderButton = (t, isActive, onClick) => (
    <button
      key={t.key}
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 8, padding: "12px 20px",
        borderRadius: "var(--radius-md)",
        border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
        background: isActive ? "var(--accent-soft)" : "var(--bg-elevated)",
        cursor: "pointer",
        color: isActive ? "var(--accent)" : "var(--text-muted)",
        transition: "all 0.18s",
        fontFamily: "inherit", minWidth: 82,
      }}
    >
      {t.icon}
      <span style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</span>
      {isActive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />}
    </button>
  );

  return (
    <div className="db-profile-section">
      <div className="db-profile-section-header">
        <div>
          <h2 className="db-profile-section-title">Apariencia</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>
            Elegí el fondo y el color de la interfaz
          </p>
        </div>
      </div>

      {/* Grupo 1: Fondo */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Fondo
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {BASE_THEMES.map((t) =>
            renderButton(t, theme === t.key, () => setTheme(t.key))
          )}
        </div>
      </div>

      {/* Grupo 2: Color */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Color
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* opción "default" — acento base del tema */}
          {renderButton(
            { key: "", label: "Default", icon: Icon.sun },
            colorName === "",
            () => setColorName("")
          )}
          {COLOR_THEMES.map((t) =>
            renderButton(t, colorName === t.key, () => setColorName(t.key))
          )}
        </div>
      </div>

      {/* Preview */}
      <div style={{
        marginTop: 12, padding: "12px 16px",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-elevated)", border: "1px solid var(--border)",
        fontSize: 13, color: "var(--text-muted)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {resolved === "dark" ? Icon.moon : Icon.sun}
        <span>
          Fondo: <strong style={{ color: "var(--text)" }}>{theme}</strong>
          {" · "}
          Color: <strong style={{ color: "var(--accent)" }}>{colorName || "default"}</strong>
          {theme === "system" && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text-subtle)" }}>(sistema: {resolved})</span>}
        </span>
      </div>
    </div>
  );
}

// ─── MiPerfilView ─────────────────────────────────────────────────────────────

export default function MiPerfilView() {
  const payload  = getTokenPayload();
  const roles    = payload?.roles   ?? [];
  const userId   = payload?.sub ? Number(payload.sub) : null;

  const { data: profile, isLoading, error } = usePreload("profile");

  const roleLabel   = getRoleLabel(roles);
  const isStudent   = roles.includes("estudiante");
  const displayName = profile?.full_name ?? null;
  const initials    = getInitials(displayName ?? "");

  return (
    <div className="db-view">

      {/* ── Tarjeta de identidad ── */}
      <div className="db-profile-card">
        <div className="db-profile-avatar" style={{ width: 76, height: 76, fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>
          {initials}
        </div>

        <div className="db-profile-info">
          {isLoading ? (
            <span className="db-spinner" style={{ width: 20, height: 20 }} />
          ) : error ? (
            <span style={{ fontSize: 13, color: "var(--error)" }}>{error}</span>
          ) : (
            <>
              {displayName && <div className="db-profile-name">{displayName}</div>}
              <div className="db-profile-role">{roleLabel}</div>
              {profile?.email && (
                <div className="db-profile-meta" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {Icon.mail} {profile.email}
                </div>
              )}
              {profile?.phone && <div className="db-profile-meta">{profile.phone}</div>}
              {userId && (
                <div className="db-profile-id" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {Icon.id} ID #{userId}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Datos académicos ── */}
      {isStudent && profile?.profile && (
        <div className="db-profile-section">
          <div className="db-profile-section-header">
            <div>
              <h2 className="db-profile-section-title">Datos académicos</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>Información de tu matrícula</p>
            </div>
            {profile.profile.status && (
              <span className={`db-badge ${STATUS_COLOR[profile.profile.status] ?? "badge--gray"}`}>
                {STATUS_LABELS[profile.profile.status] ?? profile.profile.status}
              </span>
            )}
          </div>
          <div className="db-profile-fields">
            <ProfileField label="Código estudiantil" value={profile.profile.student_code} mono />
            <ProfileField label="Especialidad"        value={profile.profile.specialty_name} />
            <ProfileField label="Año"                 value={profile.profile.year_level ? `${profile.profile.year_level}° año` : null} />
            <ProfileField label="Turno"               value={SHIFT_LABELS[profile.profile.section_shift] ?? profile.profile.section_shift} />
            <ProfileField label="Sección"             value={profile.profile.section_name} />
            <ProfileField
              label="Matriculado desde"
              value={profile.profile.enrolled_since
                ? new Date(profile.profile.enrolled_since).toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" })
                : null}
            />
          </div>
        </div>
      )}

      {userId && <EmailSection userId={userId} currentEmail={profile?.email ?? null} />}
      {userId && <PasswordSection userId={userId} />}
      <ThemeSection />
    </div>
  );
}