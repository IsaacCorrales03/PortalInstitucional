"use client";

import { useEffect, useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";

// ─── ROLES ─────────────────────────────────────
const ROLE_LABELS = {
  admin: "Admin",
  profesor: "Profesor",
  superadmin: "Superadmin",
  estudiante: "Estudiante",
};

const ROLE_COLOR = {
  admin: "badge--blue",
  profesor: "badge--orange",
  superadmin: "badge--red",
  estudiante: "badge--green",
};

const JORNADAS = ["diurna", "nocturna"];
const NIVELES = [1, 2, 3];

// ─── UTILS ─────────────────────────────────────
function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── FORM INICIAL ──────────────────────────────
const EMPTY_FORM = {
  email: "",
  full_name: "",
  national_id: "",
  role: "estudiante",

  student_profile: {
    section_id: "",
    specialty_id: "",
    section_part: "",
    year_level: "",
    section_shift: "",
    enrolled_since: "",
  },

  professor_profile: {
    specialty_area: "",
    availabilities: [],
    course_ids: [],
  },
};

// ══════════════════════════════════════════════
//  MODAL CONTRASEÑA
// ══════════════════════════════════════════════
function PasswordModal({ password, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="db-modal-backdrop">
      <div className="db-modal db-modal--sm">

        <div className="db-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--success-soft)",
              border: "1px solid rgba(52,211,153,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                stroke="var(--success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8l3.5 3.5L13 4" />
              </svg>
            </div>
            <div className="db-modal-title">Usuario creado</div>
          </div>
          <button className="db-modal-close" onClick={onClose}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="db-modal-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
              El usuario fue creado exitosamente. Compartí la contraseña temporal
              de forma segura —{" "}
              <strong style={{ color: "var(--text)" }}>no se mostrará de nuevo.</strong>
            </p>

            {/* Bloque de contraseña */}
            <div style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-md)",
              padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--text-subtle)",
              }}>
                Contraseña temporal
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <code style={{
                  flex: 1,
                  fontFamily: "'DM Mono', 'Fira Mono', 'Courier New', monospace",
                  fontSize: 20, fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: "0.14em",
                  wordBreak: "break-all",
                  lineHeight: 1.3,
                }}>
                  {password}
                </code>

                <button onClick={handleCopy} style={{
                  background: copied ? "var(--success-soft)" : "var(--bg-hover)",
                  border: `1px solid ${copied ? "rgba(52,211,153,0.35)" : "var(--border-light)"}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "7px 11px",
                  cursor: "pointer",
                  fontSize: 12, fontWeight: 600,
                  color: copied ? "var(--success)" : "var(--text-muted)",
                  transition: "all 0.18s",
                  flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 5,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {copied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
                        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8l3.5 3.5L13 4" />
                      </svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
                        stroke="currentColor" strokeWidth="1.8">
                        <rect x="5" y="5" width="9" height="9" rx="1.5" />
                        <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5"
                          strokeLinecap="round" />
                      </svg>
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="db-inline-alert db-inline-alert--warning" style={{ fontSize: 12 }}>
              Anotá esta contraseña antes de cerrar. No podrás recuperarla después.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="db-btn db-btn--primary" onClick={onClose}>
                Entendido
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  HELPERS VISUALES
// ══════════════════════════════════════════════
function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--text-subtle)", whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

function InfoChip({ label, value, accent = false }) {
  return (
    <div>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: accent ? "var(--accent)" : "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  CAMPOS ESTUDIANTE
//
//  Estructura de sections[]:
//    { id, name, academic_year, guide_professor_name,
//      specialties: [{ id, name, part }] }
//
//  El usuario elige:
//    1. Sección  →  filtra las combos disponibles
//    2. Especialidad + Parte (combo único del API)
//    3. Nivel y Jornada (selects libres)
// ══════════════════════════════════════════════
function EstudianteFields({ form, setForm, sections }) {
  const sp = form.student_profile;

  const seccion = useMemo(
    () => sections.find((s) => s.id === Number(sp.section_id)) ?? null,
    [sections, sp.section_id]
  );

  // Combos especialidad+parte de la sección elegida
  const combos = seccion?.specialties ?? [];

  // Resetear dependientes al cambiar sección
  const handleSeccion = (e) => {
    const id = Number(e.target.value) || "";
    setForm((f) => ({
      ...f,
      student_profile: {
        ...f.student_profile,
        section_id: id,
        specialty_id: "",
        section_part: "",
      },
    }));
  };

  // Elegir especialidad+parte (vienen juntas del API como { id, name, part })
  const handleCombo = (e) => {
    const val = e.target.value;
    if (!val) {
      setForm((f) => ({
        ...f,
        student_profile: { ...f.student_profile, specialty_id: "", section_part: "" },
      }));
      return;
    }
    const [sid, part] = val.split("::");
    setForm((f) => ({
      ...f,
      student_profile: { ...f.student_profile, specialty_id: Number(sid), section_part: part },
    }));
  };

  const comboValue = sp.specialty_id && sp.section_part
    ? `${sp.specialty_id}::${sp.section_part}`
    : "";

  const comboLabel = combos.find(
    (c) => c.id === Number(sp.specialty_id) && c.part === sp.section_part
  );

  return (
    <>
      <Divider label="Sección y especialidad" />

      {/* 1 — Sección */}
      <div className="db-field">
        <label className="db-field-label">Sección</label>
        <select className="db-input" value={sp.section_id} onChange={handleSeccion}>
          <option value="">— Seleccionar sección —</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.academic_year ? ` · ${s.academic_year}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* 2 — Especialidad + Parte (solo si hay sección) */}
      {seccion && (
        <div className="db-field">
          <label className="db-field-label">Especialidad y parte</label>
          {combos.length === 0 ? (
            <div className="db-inline-alert db-inline-alert--warning" style={{ fontSize: 12 }}>
              Esta sección no tiene especialidades configuradas.
            </div>
          ) : (
            <select className="db-input" value={comboValue} onChange={handleCombo}>
              <option value="">— Seleccionar especialidad y parte —</option>
              {combos.map((c) => (
                <option key={`${c.id}::${c.part}`} value={`${c.id}::${c.part}`}>
                  {c.name} — Parte {c.part}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Resumen de lo elegido */}
      {seccion && sp.specialty_id && sp.section_part && (
        <div style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px 20px",
        }}>
          <InfoChip label="Sección" value={seccion.name} />
          <InfoChip label="Parte" value={`Parte ${sp.section_part}`} accent />
          <InfoChip label="Especialidad" value={comboLabel?.name ?? `ID ${sp.specialty_id}`} />
          {seccion.academic_year && (
            <InfoChip label="Año lectivo" value={seccion.academic_year} />
          )}
        </div>
      )}

      <Divider label="Detalles adicionales" />

      {/* 3 — Nivel + Jornada */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="db-field">
          <label className="db-field-label">Nivel</label>
          <select
            className="db-input"
            value={sp.year_level}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                student_profile: { ...f.student_profile, year_level: Number(e.target.value) || "" },
              }))
            }
          >
            <option value="">— Nivel —</option>
            {NIVELES.map((n) => (
              <option key={n} value={n}>{n}° año</option>
            ))}
          </select>
        </div>

        <div className="db-field">
          <label className="db-field-label">Jornada</label>
          <select
            className="db-input"
            value={sp.section_shift}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                student_profile: { ...f.student_profile, section_shift: e.target.value },
              }))
            }
          >
            <option value="">— Jornada —</option>
            {JORNADAS.map((j) => (
              <option key={j} value={j}>
                {j.charAt(0).toUpperCase() + j.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 — Fecha matrícula */}
      <div className="db-field">
        <label className="db-field-label">Matriculado desde</label>
        <input
          className="db-input"
          type="date"
          value={sp.enrolled_since}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              student_profile: { ...f.student_profile, enrolled_since: e.target.value },
            }))
          }
        />
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
//  VALIDACIÓN
// ══════════════════════════════════════════════
function validate(form) {
  if (!form.full_name.trim()) return "Nombre completo requerido.";
  if (!form.email.trim()) return "Correo electrónico requerido.";
  if (!form.national_id.trim()) return "Cédula requerida.";

  if (form.role === "estudiante") {
    const sp = form.student_profile;
    if (!sp.section_id) return "Seleccioná una sección.";
    if (!sp.specialty_id) return "Seleccioná la especialidad y parte.";
    if (!sp.section_part) return "Seleccioná la parte (A/B).";
    if (!sp.year_level) return "Seleccioná el nivel.";
    if (!sp.section_shift) return "Seleccioná la jornada.";
    if (!sp.enrolled_since) return "Ingresá la fecha de matrícula.";
  }

  if (form.role === "profesor") {
    const pp = form.professor_profile;

    if (!pp.specialty_area.trim())
      return "Área requerida.";

    if (pp.course_ids.length === 0)
      return "Debe asignar al menos una materia.";

    if (pp.availabilities.length === 0)
      return "Debe definir al menos un horario.";
  }

  return null;
}

// ══════════════════════════════════════════════
//  COMPONENT PRINCIPAL
// ══════════════════════════════════════════════
export default function UsuariosView() {
  const users = useStore((s) => s.users);
  const sections = useStore((s) => s.sections);
  const ensure = useStore((s) => s.ensure);
  const reload = useStore((s) => s.reload);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordModal, setPasswordModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [availabilityDraft, setAvailabilityDraft] = useState({
    day_of_week: "lunes",
    start_time: "",
    end_time: "",
  });
  useEffect(() => {
    ensure("users");
    ensure("sections");
    ensure("courses");
  }, [ensure]);

  const rows = (users.data ?? []).filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const sectionsList = sections.data ?? [];

  // ─── Modal ───────────────────────────────────
  const openModal = () => { setForm(EMPTY_FORM); setError(""); setOpen(true); };
  const closeModal = () => { setOpen(false); setError(""); };

  // ─── Submit ──────────────────────────────────
  const handleCreate = async () => {
    const err = validate(form);
    if (err) { setError(err); return; }

    setLoading(true);
    setError("");

    try {
      const payload = {
        email: form.email,
        full_name: form.full_name,
        national_id: form.national_id,
        role: form.role,
      };

      if (form.role === "estudiante") {
        const sp = form.student_profile;
        payload.student_profile = {
          section_id: Number(sp.section_id),
          specialty_id: Number(sp.specialty_id),
          section_part: sp.section_part,
          year_level: Number(sp.year_level),
          section_shift: sp.section_shift,
          enrolled_since: sp.enrolled_since,
        };
      }

      if (form.role === "profesor") {
        payload.professor_profile = {
          specialty_area: form.professor_profile.specialty_area,
        };

        payload.availabilities = form.professor_profile.availabilities;

        payload.course_ids = form.professor_profile.course_ids;
      }

      const res = await api.createUser(payload);
      closeModal();
      setPasswordModal(res.password);
      reload("users");
    } catch (e) {
      setError(e?.message ?? "Error al crear el usuario.");
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────
  return (
    <div className="db-view">

      {/* HEADER */}
      <div className="db-section-header">
        <div>
          <div className="db-section-title">Usuarios</div>
          <div className="db-section-subtitle">
            {users.data?.length ?? 0} usuarios registrados
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="db-btn db-btn--secondary" onClick={() => reload("users")}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M13.5 8A5.5 5.5 0 112.5 5.5" strokeLinecap="round" />
              <path d="M2 2.5L2.5 5.5l3-.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Recargar
          </button>
          <button className="db-btn db-btn--primary" onClick={openModal}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Nuevo usuario
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="db-search-wrap">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="6.5" cy="6.5" r="4" />
          <path d="M10 10l3 3" strokeLinecap="round" />
        </svg>
        <input
          className="db-search"
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLA */}
      <div className="db-table-wrap">
        {users.loading ? (
          <div className="db-loading">
            <span className="db-spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="db-empty">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                      <p>No se encontraron usuarios.</p>
                    </div>
                  </td>
                </tr>
              ) : rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="db-profile-meta">
                      <div className="db-profile-avatar" style={{
                        width: 32, height: 32, fontSize: 11,
                        fontWeight: 700, color: "var(--accent)",
                      }}>
                        {getInitials(u.full_name)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{u.email}</td>
                  <td>
                    <span className={`db-badge ${ROLE_COLOR[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td>
                    <span className={`db-badge ${u.is_active ? "badge--green" : "badge--gray"}`}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ MODAL CREAR ══ */}
      {open && (
        <div className="db-modal-backdrop">
          <div className="db-modal db-modal--md">

            <div className="db-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 34, height: 34, flexShrink: 0,
                  background: "var(--accent-soft)",
                  border: "1px solid rgba(99,130,255,0.25)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
                    stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M8 1a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z" />
                  </svg>
                </div>
                <div className="db-modal-title">Crear usuario</div>
              </div>
              <button className="db-modal-close" onClick={closeModal}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            <div className="db-modal-body">
              <div className="db-form">

                {/* Datos básicos */}
                <div className="db-field">
                  <label className="db-field-label">Nombre completo</label>
                  <input
                    className="db-input"
                    placeholder="Ej. María González Rodríguez"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="db-field">
                    <label className="db-field-label">Correo electrónico</label>
                    <input
                      className="db-input"
                      type="email"
                      placeholder="correo@ctp.ed.cr"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="db-field">
                    <label className="db-field-label">Cédula</label>
                    <input
                      className="db-input"
                      placeholder="1-2345-6789"
                      value={form.national_id}
                      onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                    />
                  </div>
                </div>

                <div className="db-field">
                  <label className="db-field-label">Rol</label>
                  <select
                    className="db-input"
                    value={form.role}
                    onChange={(e) =>
                      // resetear el form completo al cambiar de rol
                      setForm({ ...EMPTY_FORM, role: e.target.value })
                    }
                  >
                    <option value="estudiante">Estudiante</option>
                    <option value="profesor">Profesor</option>
                  </select>
                </div>

                {/* ── Campos por rol ── */}
                {form.role === "estudiante" && (
                  <EstudianteFields
                    form={form}
                    setForm={setForm}
                    sections={sectionsList}
                  />
                )}

                {form.role === "profesor" && (
                  <>
                    <Divider label="Datos del profesor" />

                    {/* Área */}
                    <div className="db-field">
                      <label className="db-field-label">Área de especialidad</label>
                      <input
                        className="db-input"
                        value={form.professor_profile.specialty_area}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            professor_profile: {
                              ...form.professor_profile,
                              specialty_area: e.target.value,
                            },
                          })
                        }
                      />
                    </div>

                    {/* ───── HORARIO ───── */}
                    <Divider label="Horario laboral" />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8 }}>
                      <select
                        className="db-input"
                        value={availabilityDraft.day_of_week}
                        onChange={(e) =>
                          setAvailabilityDraft({ ...availabilityDraft, day_of_week: e.target.value })
                        }
                      >
                        {["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>

                      <input
                        type="time"
                        className="db-input"
                        value={availabilityDraft.start_time}
                        onChange={(e) =>
                          setAvailabilityDraft({ ...availabilityDraft, start_time: e.target.value })
                        }
                      />

                      <input
                        type="time"
                        className="db-input"
                        value={availabilityDraft.end_time}
                        onChange={(e) =>
                          setAvailabilityDraft({ ...availabilityDraft, end_time: e.target.value })
                        }
                      />

                      <button
                        className="db-btn db-btn--secondary"
                        onClick={() => {
                          if (!availabilityDraft.start_time || !availabilityDraft.end_time) return;

                          setForm((f) => ({
                            ...f,
                            professor_profile: {
                              ...f.professor_profile,
                              availabilities: [
                                ...f.professor_profile.availabilities,
                                availabilityDraft,
                              ],
                            },
                          }));
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Lista */}
                    {form.professor_profile.availabilities.map((a, i) => (
                      <div key={i} style={{ fontSize: 12 }}>
                        {a.day_of_week} {a.start_time} - {a.end_time}
                      </div>
                    ))}

                    {/* ───── MATERIAS ───── */}
                    <Divider label="Materias que imparte" />

                    <div className="db-field">
                      <select
                        multiple
                        className="db-input"
                        value={form.professor_profile.course_ids}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions, (o) => Number(o.value));
                          setForm((f) => ({
                            ...f,
                            professor_profile: {
                              ...f.professor_profile,
                              course_ids: values,
                            },
                          }));
                        }}
                      >
                        {(useStore.getState().courses.data ?? []).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Error */}
                {error && (
                  <div className="db-inline-alert db-inline-alert--error">
                    {error}
                  </div>
                )}

                {/* Acciones */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                  <button className="db-btn db-btn--ghost" onClick={closeModal} disabled={loading}>
                    Cancelar
                  </button>
                  <button className="db-btn db-btn--primary" onClick={handleCreate} disabled={loading}>
                    {loading ? (
                      <>
                        <span className="db-spinner" style={{ width: 13, height: 13 }} />
                        Creando...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M8 3v10M3 8h10" />
                        </svg>
                        Crear usuario
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL CONTRASEÑA ══ */}
      {passwordModal && (
        <PasswordModal password={passwordModal} onClose={() => setPasswordModal(null)} />
      )}

    </div>
  );
}