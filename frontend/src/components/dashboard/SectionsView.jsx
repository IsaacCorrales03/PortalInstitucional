"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";

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
  specialty_id_a: "",
  specialty_id_b: "",
  course_assignments: [],
};

export default function SectionsView() {
  const { sections, specialties, professors, ensure, reload } = useStore();

  const [open, setOpen]     = useState(false);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const [assignmentDraft, setAssignmentDraft] = useState({
    course_id: "",
    professor_id: "",
  });

  // ── Plan de estudios según year_level ──────────────────────────
  const [planCourses, setPlanCourses]     = useState([]);
  const [planLoading, setPlanLoading]     = useState(false);
  const [planError, setPlanError]         = useState("");

  // ── Profesores disponibles para la materia del draft ───────────
  const [courseProfessors, setCourseProfessors]               = useState([]);
  const [courseProfessorsLoading, setCourseProfessorsLoading] = useState(false);

  useEffect(() => {
    ensure("sections");
    ensure("specialties");
    ensure("professors");
  }, [ensure]);

  // Cuando cambia year_level → cargar materias del plan
  useEffect(() => {
    if (!form.year_level) {
      setPlanCourses([]);
      setPlanError("");
      // Limpiar asignaciones al cambiar de nivel
      setForm(f => ({ ...f, course_assignments: [] }));
      setAssignmentDraft({ course_id: "", professor_id: "" });
      return;
    }

    let cancelled = false;
    setPlanLoading(true);
    setPlanError("");

    api.getStudyPlanByYearLevel(form.year_level)
      .then(data => {
        if (!cancelled) {
          setPlanCourses(data.courses ?? []);
          // Limpiar asignaciones previas porque el plan cambió
          setForm(f => ({ ...f, course_assignments: [] }));
          setAssignmentDraft({ course_id: "", professor_id: "" });
        }
      })
      .catch(e => {
        if (!cancelled) {
          setPlanCourses([]);
          setPlanError(e.message || "No se encontró plan para este nivel.");
        }
      })
      .finally(() => { if (!cancelled) setPlanLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.year_level]);

  // Cuando cambia la materia del draft → cargar profesores
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

  // ── Listas derivadas ───────────────────────────────────────────
  const professorsList = professors?.data ?? [];
  const specialtyList  = specialties?.data ?? [];

  // Materia guía del plan actual (is_guide === true)
  const guideCourse = planCourses.find(c => c.is_guide) ?? null;

  // ── Cambio de profesor guía → auto-asignar materia guía ───────
  const handleGuideProfessorChange = (e) => {
    const profId = e.target.value;

    setForm(f => {
      // Si no hay materia guía en el plan o no se eligió profesor, solo actualizar el campo
      if (!guideCourse || !profId) {
        // Si se deselecciona el profesor, quitar la asignación de materia guía
        const withoutGuide = guideCourse
          ? f.course_assignments.filter(a => a.course_id !== guideCourse.id)
          : f.course_assignments;
        return { ...f, guide_professor_id: profId, course_assignments: withoutGuide };
      }

      // Remover asignación previa de la materia guía (si existía) y agregar la nueva
      const withoutGuide = f.course_assignments.filter(a => a.course_id !== guideCourse.id);
      return {
        ...f,
        guide_professor_id: profId,
        course_assignments: [
          ...withoutGuide,
          { course_id: guideCourse.id, professor_id: Number(profId) },
        ],
      };
    });
  };

  // ── Validación ─────────────────────────────────────────────────
  function validate() {
    if (!form.name.trim())          return "Nombre requerido.";
    if (!form.year_level)           return "Nivel requerido.";
    if (planError)                  return "No hay plan académico válido para este nivel.";
    if (!form.specialty_id_a || !form.specialty_id_b)
                                    return "Especialidades A y B requeridas.";
    if (form.specialty_id_a === form.specialty_id_b)
                                    return "A y B no pueden ser iguales.";
    if (form.course_assignments.length === 0)
                                    return "Asignar al menos una materia.";
    return null;
  }

  // ── Submit ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    const err = validate();
    if (err) return setError(err);

    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        academic_year:      String(form.academic_year),   // siempre string al backend
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
      setPlanCourses([]);
      reload("sections");
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers asignaciones ───────────────────────────────────────
  const addAssignment = () => {
    if (!assignmentDraft.course_id || !assignmentDraft.professor_id) return;

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

  const removeAssignment = (idx) => {
    const removed = form.course_assignments[idx];

    // Si se elimina la materia guía, también limpiar el profesor guía del form
    if (guideCourse && removed.course_id === guideCourse.id) {
      setForm(f => ({
        ...f,
        guide_professor_id: "",
        course_assignments: f.course_assignments.filter((_, i) => i !== idx),
      }));
    } else {
      setForm(f => ({
        ...f,
        course_assignments: f.course_assignments.filter((_, i) => i !== idx),
      }));
    }
  };

  // Materias del plan que aún no tienen profesor asignado
  // La materia guía se excluye porque se asigna automáticamente
  const availablePlanCourses = planCourses.filter(c =>
    !c.is_guide &&
    !form.course_assignments.some(a => a.course_id === c.id)
  );

  // ──────────────────────────────────────────────────────────────
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

              {/* Aviso plan no encontrado */}
              {form.year_level && planError && (
                <div className="db-inline-alert db-inline-alert--warning" style={{ fontSize: 12 }}>
                  {planError}
                </div>
              )}

              {/* Aviso cargando plan */}
              {planLoading && (
                <div style={{ fontSize: 12, color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="db-spinner" style={{ width: 11, height: 11 }} />
                  Cargando plan de estudios...
                </div>
              )}

              {/* ── Profesor guía ── */}
              <Divider label="Profesor guía" />
              <div className="db-field">
                <label className="db-field-label">
                  Profesor guía
                  {guideCourse && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, fontWeight: 600,
                      color: "var(--accent)", background: "var(--accent-soft)",
                      padding: "1px 6px", borderRadius: 4,
                    }}>
                      asignará «{guideCourse.name}» automáticamente
                    </span>
                  )}
                </label>
                <select
                  className="db-input"
                  value={form.guide_professor_id}
                  onChange={handleGuideProfessorChange}
                  disabled={!form.year_level || planLoading}
                >
                  <option value="">— Sin asignar —</option>
                  {professorsList.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              {/* ── Especialidades ── */}
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

              {/* ── Materias y profesores ── */}
              <Divider label="Materias y profesores" />

              {/* Bloquear sección si no hay plan cargado */}
              {!form.year_level || planError ? (
                <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", padding: "8px 0" }}>
                  Selecciona un nivel para ver las materias del plan.
                </div>
              ) : planLoading ? null : (
                <>
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Selector de materia — solo las del plan, no guía, no asignadas */}
                    <select
                      className="db-input"
                      value={assignmentDraft.course_id}
                      onChange={e =>
                        setAssignmentDraft({ course_id: e.target.value, professor_id: "" })
                      }
                      disabled={availablePlanCourses.length === 0}
                    >
                      <option value="">
                        {availablePlanCourses.length === 0
                          ? "— Todas asignadas —"
                          : "— Materia —"}
                      </option>
                      {availablePlanCourses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {/* Selector de profesor */}
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

                  {/* Aviso sin profesores para la materia */}
                  {assignmentDraft.course_id && !courseProfessorsLoading && courseProfessors.length === 0 && (
                    <div className="db-inline-alert db-inline-alert--warning" style={{ fontSize: 12 }}>
                      Ningún profesor tiene asignada esa materia en su perfil.
                    </div>
                  )}
                </>
              )}

              {/* Lista de asignaciones */}
              {form.course_assignments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {form.course_assignments.map((a, i) => {
                    const c = planCourses.find(x => x.id === a.course_id);
                    const p = professorsList.find(x => x.id === a.professor_id);
                    const isGuide = guideCourse?.id === a.course_id;
                    return (
                      <div key={i} className="db-assignment-row">
                        <strong style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          {c?.name ?? `Materia ${a.course_id}`}
                          {isGuide && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, letterSpacing: ".06em",
                              color: "var(--accent)", background: "var(--accent-soft)",
                              padding: "1px 5px", borderRadius: 4, textTransform: "uppercase",
                            }}>
                              guía
                            </span>
                          )}
                        </strong>
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