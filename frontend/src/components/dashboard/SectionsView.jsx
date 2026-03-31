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

const EMPTY_DRAFT = {
  course_key:   "",   // formato "_part::course_id"
  course_id:    "",
  _part:        "",
  professor_id: "",
};

export default function SectionsView() {
  const { sections, specialties, professors, ensure, reload } = useStore();

  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const [assignmentDraft, setAssignmentDraft] = useState(EMPTY_DRAFT);

  // ── Plan general según year_level ─────────────────────────────
  const [planCourses, setPlanCourses]   = useState([]);
  const [planLoading, setPlanLoading]   = useState(false);
  const [planError, setPlanError]       = useState("");

  // ── Planes técnicos A y B ─────────────────────────────────────
  const [techCoursesA, setTechCoursesA] = useState([]);
  const [techCoursesB, setTechCoursesB] = useState([]);
  const [techLoadingA, setTechLoadingA] = useState(false);
  const [techLoadingB, setTechLoadingB] = useState(false);
  const [techErrorA,   setTechErrorA]   = useState("");
  const [techErrorB,   setTechErrorB]   = useState("");

  // ── Profesores disponibles para la materia del draft ──────────
  const [courseProfessors, setCourseProfessors]               = useState([]);
  const [courseProfessorsLoading, setCourseProfessorsLoading] = useState(false);

  useEffect(() => {
    ensure("sections");
    ensure("specialties");
    ensure("professors");
  }, [ensure]);

  // Cuando cambia year_level → cargar plan general
  useEffect(() => {
    if (!form.year_level) {
      setPlanCourses([]);
      setPlanError("");
      setForm(f => ({ ...f, course_assignments: [] }));
      setAssignmentDraft(EMPTY_DRAFT);
      return;
    }

    let cancelled = false;
    setPlanLoading(true);
    setPlanError("");

    api.getStudyPlanByYearLevel(form.year_level)
      .then(data => {
        if (!cancelled) {
          setPlanCourses(data.courses ?? []);
          setForm(f => ({ ...f, course_assignments: [] }));
          setAssignmentDraft(EMPTY_DRAFT);
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

  // Cuando cambia specialty_id_a o year_level → cargar plan técnico A
  useEffect(() => {
    if (!form.specialty_id_a || !form.year_level) {
      setTechCoursesA([]);
      setTechErrorA("");
      return;
    }
    let cancelled = false;
    setTechLoadingA(true);
    setTechErrorA("");
    api.getStudyPlanBySpecialty(form.year_level, form.specialty_id_a)
      .then(data => { if (!cancelled) setTechCoursesA(data.courses ?? []); })
      .catch(e  => { if (!cancelled) { setTechCoursesA([]); setTechErrorA(e.message || "No se encontró plan técnico A."); } })
      .finally(() => { if (!cancelled) setTechLoadingA(false); });
    return () => { cancelled = true; };
  }, [form.specialty_id_a, form.year_level]);

  // Cuando cambia specialty_id_b o year_level → cargar plan técnico B
  useEffect(() => {
    if (!form.specialty_id_b || !form.year_level) {
      setTechCoursesB([]);
      setTechErrorB("");
      return;
    }
    let cancelled = false;
    setTechLoadingB(true);
    setTechErrorB("");
    api.getStudyPlanBySpecialty(form.year_level, form.specialty_id_b)
      .then(data => { if (!cancelled) setTechCoursesB(data.courses ?? []); })
      .catch(e  => { if (!cancelled) { setTechCoursesB([]); setTechErrorB(e.message || "No se encontró plan técnico B."); } })
      .finally(() => { if (!cancelled) setTechLoadingB(false); });
    return () => { cancelled = true; };
  }, [form.specialty_id_b, form.year_level]);

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

  // ── Listas derivadas ──────────────────────────────────────────
  const professorsList = professors?.data ?? [];
  const specialtyList  = specialties?.data ?? [];

  // Materia guía del plan general (is_guide === true)
  const guideCourse = planCourses.find(c => c.is_guide) ?? null;

  // Pool unificado de todas las materias de los tres planes, etiquetadas por origen
  const allPlanCourses = [
    ...planCourses.map(c  => ({ ...c, _part: "General"   })),
    ...techCoursesA.map(c => ({ ...c, _part: "Técnico A" })),
    ...techCoursesB.map(c => ({ ...c, _part: "Técnico B" })),
  ];

  // Materias que aún no tienen profesor asignado.
  // La clave de unicidad es course_id + _part, así "Inglés Técnico" puede
  // aparecer tanto en Técnico A como en Técnico B con profesores distintos.
  const availablePlanCourses = allPlanCourses.filter(c =>
    !c.is_guide &&
    !form.course_assignments.some(
      a => a.course_id === c.id && a._part === c._part
    )
  );

  // ── Cambio de profesor guía → auto-asignar materia guía ───────
  const handleGuideProfessorChange = (e) => {
    const profId = e.target.value;

    setForm(f => {
      if (!guideCourse || !profId) {
        const withoutGuide = guideCourse
          ? f.course_assignments.filter(a => !(a.course_id === guideCourse.id && a._part === "General"))
          : f.course_assignments;
        return { ...f, guide_professor_id: profId, course_assignments: withoutGuide };
      }
      const withoutGuide = f.course_assignments.filter(
        a => !(a.course_id === guideCourse.id && a._part === "General")
      );
      return {
        ...f,
        guide_professor_id: profId,
        course_assignments: [
          ...withoutGuide,
          { course_id: guideCourse.id, professor_id: Number(profId), _part: "General" },
        ],
      };
    });
  };

  // ── Validación ────────────────────────────────────────────────
  function validate() {
    if (!form.name.trim())        return "Nombre requerido.";
    if (!form.year_level)         return "Nivel requerido.";
    if (planError)                return "No hay plan académico general válido para este nivel.";
    if (!form.specialty_id_a || !form.specialty_id_b)
                                  return "Especialidades A y B requeridas.";
    if (form.specialty_id_a === form.specialty_id_b)
                                  return "A y B no pueden ser iguales.";
    if (techErrorA)               return "No hay plan técnico válido para la especialidad A.";
    if (techErrorB)               return "No hay plan técnico válido para la especialidad B.";
    if (form.course_assignments.length === 0)
                                  return "Asignar al menos una materia.";
    return null;
  }

  // ── Submit ────────────────────────────────────────────────────
  const handleCreate = async () => {
    const err = validate();
    if (err) return setError(err);

    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        academic_year:      String(form.academic_year),
        year_level:         Number(form.year_level),
        specialty_id_a:     Number(form.specialty_id_a),
        specialty_id_b:     Number(form.specialty_id_b),
        guide_professor_id: form.guide_professor_id
          ? Number(form.guide_professor_id)
          : null,
        // _part es solo UI, no se envía al backend
        course_assignments: form.course_assignments.map(({ course_id, professor_id, _part }) => ({
        course_id,
        professor_id,
        section_part: _part || null,   // "Técnico A", "Técnico B", "General", o null
      }))
      };

      await api.createSection(payload);
      setOpen(false);
      setForm(EMPTY_FORM);
      setPlanCourses([]);
      setTechCoursesA([]);
      setTechCoursesB([]);
      reload("sections");
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers asignaciones ──────────────────────────────────────
  const addAssignment = () => {
    if (!assignmentDraft.course_id || !assignmentDraft.professor_id) return;

    setForm(f => ({
      ...f,
      course_assignments: [
        ...f.course_assignments,
        {
          course_id:    Number(assignmentDraft.course_id),
          professor_id: Number(assignmentDraft.professor_id),
          _part:        assignmentDraft._part ?? "",
        },
      ],
    }));
    setAssignmentDraft(EMPTY_DRAFT);
    setError("");
  };

  const removeAssignment = (idx) => {
    const removed = form.course_assignments[idx];
    const isGuideRow = guideCourse &&
      removed.course_id === guideCourse.id &&
      removed._part === "General";

    if (isGuideRow) {
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

  // ── ¿Están todos los planes cargados para habilitar la sección de materias? ──
  const plansLoading = planLoading || techLoadingA || techLoadingB;

  // ─────────────────────────────────────────────────────────────
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

              {/* Aviso plan general no encontrado */}
              {form.year_level && planError && (
                <div className="db-inline-alert db-inline-alert--warning" style={{ fontSize: 12 }}>
                  {planError}
                </div>
              )}

              {/* Aviso cargando plan general */}
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
                  {[
                    { sid: form.specialty_id_a, label: "A", loading: techLoadingA, error: techErrorA },
                    { sid: form.specialty_id_b, label: "B", loading: techLoadingB, error: techErrorB },
                  ].map(({ sid, label, loading: tl, error: te }) => {
                    const sp = specialtyList.find(s => String(s.id) === String(sid));
                    return (
                      <div key={label} style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 10px",
                        background: te ? "var(--error-soft, rgba(248,113,113,.08))" : "var(--accent-soft)",
                        border: `1px solid ${te ? "rgba(248,113,113,.25)" : "rgba(99,130,255,.2)"}`,
                        borderRadius: 8,
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800,
                          color: te ? "var(--error, #f87171)" : "var(--accent)",
                          letterSpacing: ".06em",
                        }}>
                          {label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", flex: 1 }}>
                          {sp?.name ?? `ID ${sid}`}
                        </span>
                        {tl && <span className="db-spinner" style={{ width: 10, height: 10, flexShrink: 0 }} />}
                        {!tl && !te && (
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"
                            stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round">
                            <path d="M3 8l4 4 6-6"/>
                          </svg>
                        )}
                        {!tl && te && (
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"
                            stroke="var(--error,#f87171)" strokeWidth="2.2" strokeLinecap="round">
                            <path d="M4 4l8 8M12 4l-8 8"/>
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Errores de planes técnicos */}
              {form.specialty_id_a && techErrorA && (
                <div className="db-inline-alert db-inline-alert--warning" style={{ fontSize: 12 }}>
                  Plan técnico A: {techErrorA}
                </div>
              )}
              {form.specialty_id_b && techErrorB && (
                <div className="db-inline-alert db-inline-alert--warning" style={{ fontSize: 12 }}>
                  Plan técnico B: {techErrorB}
                </div>
              )}

              {/* ── Materias y profesores ── */}
              <Divider label="Materias y profesores" />

              {!form.year_level || planError ? (
                <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", padding: "8px 0" }}>
                  Selecciona un nivel para ver las materias del plan.
                </div>
              ) : plansLoading ? (
                <div style={{ fontSize: 12, color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="db-spinner" style={{ width: 11, height: 11 }} />
                  Cargando planes técnicos...
                </div>
              ) : (techErrorA || techErrorB) ? (
                <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", padding: "8px 0" }}>
                  Resuelve los errores de planes técnicos para asignar materias.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Selector de materia — value = "_part::course_id" para unicidad */}
                    <select
                      className="db-input"
                      value={assignmentDraft.course_key}
                      onChange={e => {
                        const key = e.target.value;
                        if (!key) {
                          setAssignmentDraft(EMPTY_DRAFT);
                          return;
                        }
                        const separatorIdx = key.indexOf("::");
                        const part = key.slice(0, separatorIdx);
                        const id   = key.slice(separatorIdx + 2);
                        setAssignmentDraft({ course_key: key, course_id: id, _part: part, professor_id: "" });
                      }}
                      disabled={availablePlanCourses.length === 0}
                    >
                      <option value="">
                        {availablePlanCourses.length === 0
                          ? "— Todas asignadas —"
                          : "— Materia —"}
                      </option>
                      {["General", "Técnico A", "Técnico B"].map(part => {
                        const group = availablePlanCourses.filter(c => c._part === part);
                        if (group.length === 0) return null;
                        return (
                          <optgroup key={part} label={part}>
                            {group.map(c => (
                              <option key={`${part}::${c.id}`} value={`${part}::${c.id}`}>
                                {c.name}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
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
                    const c = allPlanCourses.find(x => x.id === a.course_id && x._part === a._part);
                    const p = professorsList.find(x => x.id === a.professor_id);
                    const isGuide = guideCourse?.id === a.course_id && a._part === "General";
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
                          {a._part && a._part !== "General" && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, letterSpacing: ".06em",
                              color: "var(--text-subtle)", background: "var(--bg-elevated)",
                              padding: "1px 5px", borderRadius: 4, textTransform: "uppercase",
                              border: "1px solid var(--border-light)",
                            }}>
                              {a._part}
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