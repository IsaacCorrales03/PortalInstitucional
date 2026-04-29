const API_BASE = "http://localhost:8000";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Error ${res.status}`);
  }
  return res.json();
}

// ── USERS ──────────────────────────────────────────────
export const getUsers   = ()           => apiFetch("/admin/users");
export const createUser = (data)       => apiFetch("/admin/users/create", { method: "POST", body: JSON.stringify(data) });
export const updateUser = (id, params) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
  ).toString();
  return apiFetch(`/admin/users/${id}?${qs}`, { method: "PUT" });
};
export const deleteUser = (id) => apiFetch(`/admin/users/${id}`, { method: "DELETE" });

// ── COURSES ────────────────────────────────────────────
export const getCourses   = ()         => apiFetch("/admin/courses");
export const getCourse    = (id)       => apiFetch(`/admin/courses/${id}`);
export const createCourse = (data)     => apiFetch("/admin/courses", { method: "POST", body: JSON.stringify(data) });
export const updateCourse = (id, data) => apiFetch(`/admin/courses/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCourse = (id)       => apiFetch(`/admin/courses/${id}`, { method: "DELETE" });

// ── SPECIALTIES ────────────────────────────────────────
export const getSpecialties  = ()         => apiFetch("/specialties/");
export const createSpecialty = (data)     => apiFetch("/specialties/", { method: "POST", body: JSON.stringify(data) });
export const updateSpecialty = (id, data) => apiFetch(`/specialties/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteSpecialty = (id)       => apiFetch(`/specialties/${id}`, { method: "DELETE" });

// ── SECTIONS ───────────────────────────────────────────
export const getSections     = (courseId)              => apiFetch(`/admin/sections${courseId ? `?course_id=${courseId}` : ""}`);
export const createSection   = (data)                  => apiFetch("/admin/sections", { method: "POST", body: JSON.stringify(data) });
export const updateSection   = (id, data)              => apiFetch(`/admin/sections/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteSection   = (id)                    => apiFetch(`/admin/sections/${id}`, { method: "DELETE" });
export const assignProfessor = (sectionId, professorId) =>
  apiFetch(`/admin/sections/${sectionId}/assign_professor`, { method: "PUT", body: JSON.stringify({ professor_id: professorId }) });

// ── ENROLLMENTS ────────────────────────────────────────
export const getEnrollments   = (params = {}) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  return apiFetch(`/admin/enrollments${qs ? `?${qs}` : ""}`);
};
export const createEnrollment = (data)            => apiFetch("/admin/enrollments", { method: "POST", body: JSON.stringify(data) });
export const updateEnrollment = (uid, sid, data)  => apiFetch(`/admin/enrollments/${uid}/${sid}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteEnrollment = (uid, sid)        => apiFetch(`/admin/enrollments/${uid}/${sid}`, { method: "DELETE" });

// ── PERMISSIONS ────────────────────────────────────────
export const getPermissions      = ()     => apiFetch("/admin/permissions");
export const createPermission    = (data) => apiFetch("/admin/permissions", { method: "POST", body: JSON.stringify(data) });
export const deletePermission    = (id)   => apiFetch(`/admin/permissions/${id}`, { method: "DELETE" });
export const getUserPermissions  = (uid)  => apiFetch(`/admin/users/${uid}/permissions`);

// ── EVENTS ─────────────────────────────────────────────
export const getEvents   = ()         => apiFetch("/admin/events");
export const createEvent = (data)     => apiFetch("/admin/events", { method: "POST", body: JSON.stringify(data) });
export const deleteEvent = (id)       => apiFetch(`/admin/events/${id}`, { method: "DELETE" });

// ── ANNOUNCEMENTS ──────────────────────────────────────
export const getAnnouncements    = ()     => apiFetch("/admin/announcements");
export const createAnnouncement  = (data) => apiFetch("/admin/announcements", { method: "POST", body: JSON.stringify(data) });
export const publishAnnouncement = (id)   => apiFetch(`/admin/announcements/${id}/publish`, { method: "PUT" });
export const deleteAnnouncement  = (id)   => apiFetch(`/admin/announcements/${id}`, { method: "DELETE" });

// ── MEETINGS ───────────────────────────────────────────
export const getMeetings   = ()         => apiFetch("/admin/meetings");
export const createMeeting = (data)     => apiFetch("/admin/meetings", { method: "POST", body: JSON.stringify(data) });
export const deleteMeeting = (id)       => apiFetch(`/admin/meetings/${id}`, { method: "DELETE" });

export const changePassword = (data) =>
  apiFetch("/auth/change-password", { method: "PUT", body: JSON.stringify(data) });

export async function getMyDashboard()           { return apiFetch("/dashboard/"); }
export async function getMySection()             { return apiFetch("/dashboard/me/section"); }
export async function getMyCourses()             { return apiFetch("/dashboard/me/courses"); }
export async function getMyAttendance(sectionId) {
  return apiFetch(`/dashboard/me/attendance${sectionId ? `?section_id=${sectionId}` : ""}`);
}
export async function getMyGrades(periodId) {
  return apiFetch(`/dashboard/me/grades${periodId ? `?period_id=${periodId}` : ""}`);
}
export const getProfessors = () => apiFetch("/admin/professors");
export const getProfessorsByCourse = (courseId) =>
  apiFetch(`/admin/professors/by-course/${courseId}`);
export const getStudyPlanByYearLevel = (yearLevel) => apiFetch(`/admin/study-plans/by-year-level/${yearLevel}`);
export const getStudyPlanBySpecialty = (yearLevel, specialtyId) =>
  apiFetch(`/admin/study-plans/technical/${yearLevel}/${specialtyId}`);
export async function getMySchedule(sectionId) {
  return apiFetch(`/dashboard/me/scholar_scheduale/${sectionId}`);
}
// ── SCHOLARSHIPS ───────────────────────────────────────
export const getMyScholarships  = ()     => apiFetch("/scholarships/me");
export const applyScholarship   = (type) => apiFetch("/scholarships/me/apply", { method: "POST", body: JSON.stringify({ type }) });
export const getCorreoInbox    = () => apiFetch("/dashboard/me/correo");
export const getCorreoEnviados = () => apiFetch("/dashboard/me/correo/enviados");
export const getCorreoUsers    = () => apiFetch("/dashboard/me/correo/users");
export const markCorreoRead = (mailId, isRead) =>
  apiFetch(`/dashboard/me/correo/${mailId}/read`, {
    method: "PATCH",
    body: JSON.stringify({ is_read: isRead }),
  });
export const sendCorreo = (data) =>
  apiFetch("/dashboard/me/correo/send", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── ELECTORAL ────────────────────────────────────────────────────────────────

// Procesos electorales
export const getProcesos      = ()                    => apiFetch("/electoral/procesos");
export const getProceso       = (id)                  => apiFetch(`/electoral/procesos/${id}`);
export const crearProceso     = (data)                => apiFetch("/electoral/procesos", { method: "POST", body: JSON.stringify(data) });
export const cerrarProceso    = (id, closedBy)        => apiFetch(`/electoral/procesos/${id}/cerrar?closed_by=${closedBy}`, { method: "PUT" });
export const toggleInscripcion = (id, estado)         => apiFetch(`/electoral/procesos/${id}/inscripcion?estado=${estado}`, { method: "PUT" });

// Partidos (solo aprobados — para el votante)
export const getPartidos        = (params = {}) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  return apiFetch(`/electoral/partidos${qs ? `?${qs}` : ""}`);
};
export const getPartido         = (id)          => apiFetch(`/electoral/partidos/${id}`);
export const crearPartido       = (data)        => apiFetch("/electoral/partidos", { method: "POST", body: JSON.stringify(data) });
export const editarPartido      = (id, data)    => apiFetch(`/electoral/partidos/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const enviarPartido      = (id)          => apiFetch(`/electoral/partidos/${id}/enviar`, { method: "PUT" });
export const marcarEnRevision   = (id)          => apiFetch(`/electoral/partidos/${id}/revisar`, { method: "PUT" });
export const resolverRevision   = (id, data)    => apiFetch(`/electoral/partidos/${id}/resolver`, { method: "PUT", body: JSON.stringify(data) });
export const eliminarPartido    = (id)          => apiFetch(`/electoral/partidos/${id}`, { method: "DELETE" });
 
// Votos — llamado internamente por el servidor Socket.IO, pero por si lo necesitas desde el frontend
export const getConteoVotos   = (processId)           => apiFetch(`/electoral/votos/conteo?process_id=${processId}`);