"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";

/* ─── CSS MODAL ENHANCEMENTS ──────────────────────────────────────────────────
   Añadí estas clases. Pegalas en tu globals.css o en el <style> global.

  .db-modal-backdrop {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(0,0,0,.55);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: backdropIn .18s ease;
  }
  @keyframes backdropIn { from { opacity: 0 } to { opacity: 1 } }

  .db-modal {
    background: var(--bg-surface, #18191f);
    border: 1px solid var(--border-light, rgba(255,255,255,.08));
    border-radius: 16px;
    box-shadow:
      0 0 0 1px rgba(255,255,255,.04) inset,
      0 24px 64px rgba(0,0,0,.55),
      0 8px 24px rgba(0,0,0,.35);
    width: 100%; max-width: 540px;
    max-height: 88vh; overflow: hidden;
    display: flex; flex-direction: column;
    animation: modalIn .22s cubic-bezier(.22,1,.36,1);
  }
  @keyframes modalIn {
    from { opacity: 0; transform: translateY(14px) scale(.97) }
    to   { opacity: 1; transform: translateY(0)    scale(1)   }
  }

  .db-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 22px 16px;
    border-bottom: 1px solid var(--border, rgba(255,255,255,.07));
    flex-shrink: 0;
  }
  .db-modal-title {
    font-size: 15px; font-weight: 700;
    letter-spacing: -.015em;
    color: var(--text, #f0f0f0);
  }
  .db-modal-close {
    width: 28px; height: 28px;
    border-radius: 8px;
    border: 1px solid var(--border-light, rgba(255,255,255,.08));
    background: transparent;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted, #888);
    transition: background .15s, color .15s;
  }
  .db-modal-close:hover {
    background: var(--bg-hover, rgba(255,255,255,.06));
    color: var(--text, #f0f0f0);
  }
  .db-modal-close svg { width: 13px; height: 13px; }

  .db-modal-body {
    padding: 20px 22px 22px;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 10px;
    scrollbar-width: thin;
    scrollbar-color: var(--border, rgba(255,255,255,.1)) transparent;
  }

  .db-field { display: flex; flex-direction: column; gap: 5px; }
  .db-field-label {
    font-size: 10px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    color: var(--text-subtle, #666);
  }

  .db-input {
    width: 100%; padding: 9px 12px;
    background: var(--bg-elevated, #1e1f27);
    border: 1px solid var(--border, rgba(255,255,255,.09));
    border-radius: 9px;
    color: var(--text, #f0f0f0);
    font-size: 13px; font-family: inherit;
    transition: border-color .15s, box-shadow .15s;
    outline: none;
  }
  .db-input:focus {
    border-color: var(--accent, #6382ff);
    box-shadow: 0 0 0 3px rgba(99,130,255,.15);
  }
  .db-input::placeholder { color: var(--text-subtle, #555); }

  .db-assignment-row {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 12px;
    background: var(--bg-elevated, #1e1f27);
    border: 1px solid var(--border, rgba(255,255,255,.07));
    border-radius: 9px;
    font-size: 12px; color: var(--text-muted, #999);
    animation: rowIn .15s ease;
  }
  @keyframes rowIn { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:translateX(0) } }
  .db-assignment-row strong { color: var(--text, #f0f0f0); font-weight: 600; }
  .db-assignment-arrow { color: var(--accent, #6382ff); font-weight: 700; margin: 0 2px; }

  .db-modal-actions {
    display: flex; justify-content: flex-end; gap: 8px;
    padding-top: 6px;
  }
─────────────────────────────────────────────────────────────────────────── */

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: ".1em",
        textTransform: "uppercase", color: "var(--text-subtle)",
        whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  academic_year: new Date().getFullYear(),
  year_level: "",
  guide_professor_id: "",
  specialty_id_a: "",   // guardamos el ID internamente
  specialty_id_b: "",
  course_assignments: [],
};

export default function SectionsView() {
  const { sections, users, courses, specialties, professors, ensure, reload } = useStore();

  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [assignmentDraft, setAssignmentDraft] = useState({
    course_id: "",
    professor_id: "",
  });

  // Profesores disponibles para la materia elegida — cargados desde el backend
  const [courseProfessors, setCourseProfessors]               = useState([]);
  const [courseProfessorsLoading, setCourseProfessorsLoading] = useState(false);

  useEffect(() => {
    ensure("sections");
    ensure("courses");
    ensure("specialties");
    ensure("professors");           // para el select de profesor guía
  }, [ensure]);

  // Cuando cambia la materia del draft, traer profesores desde /admin/professors/by-course/:id
  useEffect(() => {
    if (!assignmentDraft.course_id) {
      setCourseProfessors([]);
      return;
    }
    let cancelled = false;
    setCourseProfessorsLoading(true);
    api.getProfessorsByCourse(assignmentDraft.course_id)
      .then(data => { if (!cancelled) setCourseProfessors(data); })
      .catch(() => { if (!cancelled) setCourseProfessors([]); })
      .finally(() => { if (!cancelled) setCourseProfessorsLoading(false); });
    return () => { cancelled = true; };
  }, [assignmentDraft.course_id]);

  // ─── Listas derivadas ────────────────────────────────────────────
  const professorsList = professors?.data ?? [];   // solo para el select de profesor guía
  const specialtyList  = specialties?.data ?? [];

  // ─── Validación ─────────────────────────────────────────────────
  function validate() {
    if (!form.name.trim())               return "Nombre requerido.";
    if (!form.year_level)                return "Nivel requerido.";
    if (!form.specialty_id_a || !form.specialty_id_b)
                                         return "Especialidades A y B requeridas.";
    if (form.specialty_id_a === form.specialty_id_b)
                                         return "A y B no pueden ser iguales.";
    if (form.course_assignments.length === 0)
                                         return "Asignar al menos una materia.";
    return null;
  }

  // ─── Submit ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    const err = validate();
    if (err) return setError(err);

    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        academic_year:      Number(form.academic_year),
        year_level:         Number(form.year_level),
        specialty_id_a:     Number(form.specialty_id_a),
        specialty_id_b:     Number(form.specialty_id_b),
        guide_professor_id: form.guide_professor_id
          ? Number(form.guide_professor_id)
          : null,
      };

      await api.createSection(payload);
      setOpen(false);
      setForm(EMPTY_FORM);
      reload("sections");
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────
  const addAssignment = () => {
    if (!assignmentDraft.course_id || !assignmentDraft.professor_id) return;

    // Evitar duplicado de materia
    if (form.course_assignments.some(a => a.course_id === Number(assignmentDraft.course_id))) {
      return setError("Esa materia ya fue asignada.");
    }

    setForm(f => ({
      ...f,
      course_assignments: [
        ...f.course_assignments,
        {
          course_id:    Number(assignmentDraft.course_id),
          professor_id: Number(assignmentDraft.professor_id),
        },
      ],
    }));
    setAssignmentDraft({ course_id: "", professor_id: "" });
    setError("");
  };

  const removeAssignment = (idx) =>
    setForm(f => ({
      ...f,
      course_assignments: f.course_assignments.filter((_, i) => i !== idx),
    }));

  // ────────────────────────────────────────────────────────────────
  return (
    <div className="db-view">

      {/* HEADER */}
      <div className="db-section-header">
        <div>
          <div className="db-section-title">Secciones</div>
          <div className="db-section-subtitle">
            {sections.data?.length ?? 0} registradas
          </div>
        </div>
        <button className="db-btn db-btn--primary" onClick={() => setOpen(true)}>
          Nueva sección
        </button>
      </div>

      {/* TABLA */}
      <div className="db-table-wrap">
        <table className="db-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Año</th>
            </tr>
          </thead>
          <tbody>
            {(sections.data ?? []).map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.academic_year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ══ MODAL CREAR ══ */}
      {open && (
        <div className="db-modal-backdrop">
          <div className="db-modal">

            <div className="db-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 34, height: 34, flexShrink: 0,
                  background: "var(--accent-soft)",
                  border: "1px solid rgba(99,130,255,.25)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
                    stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="2" y="3" width="12" height="11" rx="2"/>
                    <path d="M8 7v4M6 9h4"/>
                  </svg>
                </div>
                <span className="db-modal-title">Crear sección</span>
              </div>
              <button className="db-modal-close" onClick={() => setOpen(false)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8"/>
                </svg>
              </button>
            </div>

            <div className="db-modal-body">

              {/* ── Básico ── */}
              <div className="db-field">
                <label className="db-field-label">Nombre</label>
                <input
                  className="db-input"
                  placeholder="Ej. 10-1 Diurna"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="db-field">
                  <label className="db-field-label">Año lectivo</label>
                  <input
                    className="db-input"
                    type="number"
                    placeholder="2025"
                    value={form.academic_year}
                    onChange={e => setForm({ ...form, academic_year: e.target.value })}
                  />
                </div>

                <div className="db-field">
                  <label className="db-field-label">Nivel</label>
                  <select
                    className="db-input"
                    value={form.year_level}
                    onChange={e => setForm({ ...form, year_level: e.target.value })}
                  >
                    <option value="">— Nivel —</option>
                    {[1, 2, 3].map(n => (
                      <option key={n} value={n}>{n}° año</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Profesor guía ── */}
              <Divider label="Profesor guía" />
              <div className="db-field">
                <label className="db-field-label">Profesor guía (opcional)</label>
                <select
                  className="db-input"
                  value={form.guide_professor_id}
                  onChange={e => setForm({ ...form, guide_professor_id: e.target.value })}
                >
                  <option value="">— Sin asignar —</option>
                  {professorsList.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              {/* ── Especialidades por NOMBRE → ID interno ── */}
              <Divider label="Especialidades" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="db-field">
                  <label className="db-field-label">Especialidad A</label>
                  <select
                    className="db-input"
                    value={form.specialty_id_a}
                    onChange={e => setForm({ ...form, specialty_id_a: e.target.value })}
                  >
                    <option value="">— Seleccionar —</option>
                    {specialtyList.map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="db-field">
                  <label className="db-field-label">Especialidad B</label>
                  <select
                    className="db-input"
                    value={form.specialty_id_b}
                    onChange={e => setForm({ ...form, specialty_id_b: e.target.value })}
                  >
                    <option value="">— Seleccionar —</option>
                    {specialtyList
                      .filter(sp => String(sp.id) !== String(form.specialty_id_a))
                      .map(sp => (
                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Resumen especialidades */}
              {form.specialty_id_a && form.specialty_id_b && (
                <div style={{
                  display: "flex", gap: 8,
                  padding: "9px 12px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-light)",
                  borderRadius: "var(--radius-md)",
                }}>
                  {[form.specialty_id_a, form.specialty_id_b].map((sid, i) => {
                    const sp = specialtyList.find(s => String(s.id) === String(sid));
                    return (
                      <div key={i} style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 10px",
                        background: "var(--accent-soft)",
                        border: "1px solid rgba(99,130,255,.2)",
                        borderRadius: 8,
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, color: "var(--accent)",
                          letterSpacing: ".06em",
                        }}>
                          {i === 0 ? "A" : "B"}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                          {sp?.name ?? `ID ${sid}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Asignación de materias ── */}
              <Divider label="Materias y profesores" />

              <div style={{ display: "flex", gap: 8 }}>
                {/* Selector de materia */}
                <select
                  className="db-input"
                  value={assignmentDraft.course_id}
                  onChange={e => {
                    // Al cambiar materia, resetear el profesor para forzar re-selección
                    setAssignmentDraft({ course_id: e.target.value, professor_id: "" });
                  }}
                >
                  <option value="">— Materia —</option>
                  {(courses.data ?? []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* Selector de profesor — viene de /admin/professors/by-course/:id */}
                <select
                  className="db-input"
                  value={assignmentDraft.professor_id}
                  onChange={e =>
                    setAssignmentDraft({ ...assignmentDraft, professor_id: e.target.value })
                  }
                  disabled={!assignmentDraft.course_id || courseProfessorsLoading}
                >
                  <option value="">
                    {!assignmentDraft.course_id
                      ? "— Elige materia primero —"
                      : courseProfessorsLoading
                        ? "Cargando..."
                        : courseProfessors.length === 0
                          ? "Sin profesores disponibles"
                          : "— Profesor —"}
                  </option>
                  {courseProfessors.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>

                <button
                  className="db-btn db-btn--primary"
                  onClick={addAssignment}
                  disabled={!assignmentDraft.course_id || !assignmentDraft.professor_id}
                  style={{ flexShrink: 0, padding: "0 14px" }}
                >
                  +
                </button>
              </div>

              {/* Aviso cuando no hay profesores para la materia */}
              {assignmentDraft.course_id && !courseProfessorsLoading && courseProfessors.length === 0 && (
                <div className="db-inline-alert db-inline-alert--warning" style={{ fontSize: 12 }}>
                  Ningún profesor tiene asignada esa materia en su perfil.
                </div>
              )}

              {/* Lista de asignaciones */}
              {form.course_assignments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {form.course_assignments.map((a, i) => {
                    const c = courses.data?.find(x => x.id === a.course_id);
                    const p = (professors?.data ?? []).find(x => x.id === a.professor_id);
                    return (
                      <div key={i} className="db-assignment-row">
                        <strong>{c?.name ?? `Materia ${a.course_id}`}</strong>
                        <span className="db-assignment-arrow">→</span>
                        <span style={{ flex: 1 }}>{p?.full_name ?? `Profesor ${a.professor_id}`}</span>
                        <button
                          onClick={() => removeAssignment(i)}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-subtle)",
                            fontSize: 14,
                            lineHeight: 1,
                            padding: "0 2px",
                            borderRadius: 4,
                            transition: "color .15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = "var(--error, #f87171)"}
                          onMouseLeave={e => e.currentTarget.style.color = "var(--text-subtle)"}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="db-inline-alert db-inline-alert--error">{error}</div>
              )}

              {/* Acciones */}
              <div className="db-modal-actions">
                <button
                  className="db-btn db-btn--ghost"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  className="db-btn db-btn--primary"
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="db-spinner" style={{ width: 13, height: 13 }} />
                      Creando...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round">
                        <path d="M8 3v10M3 8h10"/>
                      </svg>
                      Crear sección
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}