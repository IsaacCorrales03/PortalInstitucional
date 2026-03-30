#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  refactor-dashboard.sh
#  Ejecutar desde: src/
#  Crea useEntityCRUD, EntityTable, y reescribe los *View.js
# ─────────────────────────────────────────────────────────────
set -e

# ── 0. Verificar que estamos en src/ ──────────────────────────
if [ ! -d "components/dashboard" ] || [ ! -d "lib" ]; then
  echo "❌  Ejecuta este script desde dentro de src/"
  exit 1
fi

echo "🔧  Iniciando refactor DRY del dashboard..."

# ══════════════════════════════════════════════════════════════
# 1. NUEVO HOOK: lib/useEntityCRUD.js
# ══════════════════════════════════════════════════════════════
cat > lib/useEntityCRUD.js << 'EOF'
"use client";

import { useState } from "react";
import { useEntity } from "./useEntity";

/**
 * Hook genérico para views CRUD del dashboard.
 * Centraliza: modal, selected, submitting, formError, confirmLoad.
 *
 * Uso:
 *   const crud = useEntityCRUD("specialties");
 *   crud.run(() => createSpecialty(form))
 *   crud.run(() => deleteSpecialty(id), { isConfirm: true })
 *   crud.run(() => updateSpecialty(id, form), { onSuccess: (res) => ... })
 */
export function useEntityCRUD(entityKey) {
  const { data, loading, error, reload } = useEntity(entityKey);

  const [modal,       setModal]   = useState(null);
  const [selected,    setSelected] = useState(null);
  const [submitting,  setSub]     = useState(false);
  const [formError,   setFErr]    = useState("");
  const [confirmLoad, setConf]    = useState(false);

  const openCreate = ()    => { setSelected(null); setFErr(""); setModal("create"); };
  const openEdit   = (row) => { setSelected(row);  setFErr(""); setModal("edit"); };
  const openDelete = (row) => { setSelected(row);  setModal("delete"); };
  const closeModal = ()    => setModal(null);

  /**
   * Ejecuta fn() con manejo automático de loading/error/reload.
   * @param {() => Promise} fn         - Llamada a la API
   * @param {object}        opts
   * @param {boolean}       opts.isConfirm  - true → usa confirmLoad en vez de submitting, errores con alert()
   * @param {(result)=>void} opts.onSuccess - callback opcional tras éxito
   * @param {boolean}       opts.noClose   - true → no cierra el modal al terminar
   */
  const run = async (fn, { isConfirm = false, onSuccess, noClose = false } = {}) => {
    if (isConfirm) setConf(true); else setSub(true);
    setFErr("");
    try {
      const result = await fn();
      if (!noClose) closeModal();
      reload();
      onSuccess?.(result);
    } catch (e) {
      if (isConfirm) alert(e.message);
      else setFErr(e.message);
    } finally {
      if (isConfirm) setConf(false); else setSub(false);
    }
  };

  return {
    // datos del store
    data, loading, error, reload,
    // estado de modales
    modal, selected, submitting, formError, confirmLoad,
    // helpers de navegación
    openCreate, openEdit, openDelete, closeModal,
    // ejecutor de mutaciones
    run,
    // control manual de error (por si el form necesita validar antes de llamar a run)
    setFormError: setFErr,
  };
}
EOF
echo "✅  lib/useEntityCRUD.js"

# ══════════════════════════════════════════════════════════════
# 2. NUEVO COMPONENTE: components/dashboard/EntityTable.js
# ══════════════════════════════════════════════════════════════
cat > components/dashboard/EntityTable.js << 'EOF'
"use client";

import { Spinner, EmptyState, InlineAlert, Table } from "./ui";

/**
 * Componente genérico que maneja los estados loading / error / vacío / datos
 * de forma uniforme en todas las views del dashboard.
 *
 * Props:
 *   loading       {boolean}
 *   error         {string|null}
 *   data          {Array|null}
 *   emptyMessage  {string}
 *   columns       {Array}   — igual que <Table columns={...} />
 *   onEdit        {fn}      — opcional
 *   onDelete      {fn}      — opcional
 *   extraActions  {fn}      — opcional, igual que <Table extraActions={...} />
 */
export function EntityTable({
  loading,
  error,
  data,
  emptyMessage = "Sin resultados.",
  columns,
  onEdit,
  onDelete,
  extraActions,
}) {
  if (loading) return <div className="db-loading"><Spinner size={28} /></div>;
  if (error)   return <InlineAlert message={error} />;
  if (!data || data.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <Table
      columns={columns}
      rows={data}
      onEdit={onEdit}
      onDelete={onDelete}
      extraActions={extraActions}
    />
  );
}
EOF
echo "✅  components/dashboard/EntityTable.js"

# ══════════════════════════════════════════════════════════════
# 3. REESCRITURA DE VIEWS
# ══════════════════════════════════════════════════════════════

# ── 3a. SpecialtiesView ──────────────────────────────────────
cat > components/dashboard/SpecialtiesView.js << 'EOF'
"use client";

import { createSpecialty, updateSpecialty, deleteSpecialty } from "@/lib/api";
import { useEntityCRUD } from "@/lib/useEntityCRUD";
import { EntityTable }   from "./EntityTable";
import {
  Modal, ConfirmDialog, SectionHeader,
  Field, Input, Textarea, InlineAlert, Spinner,
} from "./ui";
import { useState } from "react";

function SpecialtyForm({ initial = {}, onSubmit, loading, error }) {
  const [form, setForm] = useState({
    name:        initial.name        ?? "",
    description: initial.description ?? "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="db-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <InlineAlert message={error} />
      <Field label="Nombre de la especialidad">
        <Input value={form.name} onChange={set("name")} required placeholder="ej. Informática Empresarial" />
      </Field>
      <Field label="Descripción">
        <Textarea value={form.description} onChange={set("description")} placeholder="Breve descripción..." rows={3} />
      </Field>
      <button type="submit" className="db-btn db-btn--primary" disabled={loading}>
        {loading ? <Spinner size={16} /> : initial.id ? "Guardar cambios" : "Crear especialidad"}
      </button>
    </form>
  );
}

const COLUMNS = [
  { key: "id",          label: "ID" },
  { key: "name",        label: "Nombre" },
  { key: "description", label: "Descripción" },
];

export default function SpecialtiesView() {
  const crud = useEntityCRUD("specialties");
  const { data, loading, error, modal, selected, submitting, formError, confirmLoad } = crud;

  return (
    <div className="db-view">
      <SectionHeader
        title="Especialidades técnicas"
        subtitle={`${(data ?? []).length} especialidades registradas`}
        action={
          <button className="db-btn db-btn--primary" onClick={crud.openCreate}>
            Nueva especialidad
          </button>
        }
      />

      <EntityTable
        loading={loading} error={error} data={data}
        emptyMessage="No hay especialidades registradas."
        columns={COLUMNS}
        onEdit={crud.openEdit}
        onDelete={crud.openDelete}
      />

      {modal === "create" && (
        <Modal title="Nueva especialidad" onClose={crud.closeModal}>
          <SpecialtyForm
            onSubmit={(form) => crud.run(() => createSpecialty(form))}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "edit" && selected && (
        <Modal title={`Editar — ${selected.name}`} onClose={crud.closeModal}>
          <SpecialtyForm
            initial={selected}
            onSubmit={(form) => crud.run(() => updateSpecialty(selected.id, form))}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "delete" && selected && (
        <ConfirmDialog
          message={`¿Eliminar la especialidad "${selected.name}"? Solo es posible si no tiene cursos, secciones ni estudiantes asociados.`}
          onConfirm={() => crud.run(() => deleteSpecialty(selected.id), { isConfirm: true })}
          onCancel={crud.closeModal}
          loading={confirmLoad}
        />
      )}
    </div>
  );
}
EOF
echo "✅  SpecialtiesView.js"

# ── 3b. CoursesView ──────────────────────────────────────────
cat > components/dashboard/CoursesView.js << 'EOF'
"use client";

import { useState } from "react";
import { useEntity } from "@/lib/useEntity";
import { useEntityCRUD } from "@/lib/useEntityCRUD";
import { createCourse, updateCourse, deleteCourse } from "@/lib/api";
import { EntityTable } from "./EntityTable";
import {
  Modal, ConfirmDialog, SectionHeader,
  Field, Input, Select, Textarea, InlineAlert, Spinner,
} from "./ui";

function CourseForm({ initial = {}, specialties = [], onSubmit, loading, error }) {
  const [form, setForm] = useState({
    name:         initial.name         ?? "",
    description:  initial.description  ?? "",
    specialty_id: initial.specialty_id ?? "",
    year_level:   initial.year_level   ?? 1,
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="db-form" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ ...form, specialty_id: Number(form.specialty_id), year_level: Number(form.year_level) });
    }}>
      <InlineAlert message={error} />
      <Field label="Nombre del curso">
        <Input value={form.name} onChange={set("name")} required placeholder="ej. Matemática I" />
      </Field>
      <Field label="Descripción">
        <Textarea value={form.description} onChange={set("description")} placeholder="Descripción breve..." rows={2} />
      </Field>
      <Field label="Especialidad">
        <Select value={form.specialty_id} onChange={set("specialty_id")} required>
          <option value="">Seleccionar especialidad</option>
          {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Año">
        <Select value={form.year_level} onChange={set("year_level")}>
          {[1, 2, 3].map((y) => <option key={y} value={y}>Año {y}</option>)}
        </Select>
      </Field>
      <button type="submit" className="db-btn db-btn--primary" disabled={loading}>
        {loading ? <Spinner size={16} /> : initial.id ? "Guardar cambios" : "Crear curso"}
      </button>
    </form>
  );
}

const COLUMNS = [
  { key: "id",           label: "ID" },
  { key: "name",         label: "Nombre" },
  { key: "specialty_id", label: "Especialidad" },
  { key: "year_level",   label: "Año", render: (v) => `Año ${v}` },
  { key: "description",  label: "Descripción" },
];

export default function CoursesView() {
  const crud = useEntityCRUD("courses");
  const { data: specialties } = useEntity("specialties");
  const { data, loading, error, modal, selected, submitting, formError, confirmLoad } = crud;

  const [search, setSearch] = useState("");
  const filtered = (data ?? []).filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = COLUMNS.map((col) =>
    col.key === "specialty_id"
      ? { ...col, render: (v) => (specialties ?? []).find((s) => s.id === v)?.name ?? v }
      : col
  );

  return (
    <div className="db-view">
      <SectionHeader
        title="Cursos"
        subtitle={`${(data ?? []).length} cursos registrados`}
        action={
          <button className="db-btn db-btn--primary" onClick={crud.openCreate}>
            Nuevo curso
          </button>
        }
      />

      <div className="db-search-wrap">
        <input className="db-search" placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <EntityTable
        loading={loading} error={error} data={filtered}
        emptyMessage="No hay cursos registrados."
        columns={columns}
        onEdit={crud.openEdit}
        onDelete={crud.openDelete}
      />

      {modal === "create" && (
        <Modal title="Nuevo curso" onClose={crud.closeModal}>
          <CourseForm
            specialties={specialties ?? []}
            onSubmit={(form) => crud.run(() => createCourse(form))}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "edit" && selected && (
        <Modal title={`Editar — ${selected.name}`} onClose={crud.closeModal}>
          <CourseForm
            initial={selected}
            specialties={specialties ?? []}
            onSubmit={(form) => crud.run(() => updateCourse(selected.id, form))}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "delete" && selected && (
        <ConfirmDialog
          message={`¿Eliminar el curso "${selected.name}"? Solo es posible si no tiene secciones asociadas.`}
          onConfirm={() => crud.run(() => deleteCourse(selected.id), { isConfirm: true })}
          onCancel={crud.closeModal}
          loading={confirmLoad}
        />
      )}
    </div>
  );
}
EOF
echo "✅  CoursesView.js"

# ── 3c. EnrollmentsView ──────────────────────────────────────
cat > components/dashboard/EnrollmentsView.js << 'EOF'
"use client";

import { useState } from "react";
import { useEntity } from "@/lib/useEntity";
import { useEntityCRUD } from "@/lib/useEntityCRUD";
import { createEnrollment, updateEnrollment, deleteEnrollment } from "@/lib/api";
import { EntityTable } from "./EntityTable";
import {
  Modal, ConfirmDialog, SectionHeader, Badge,
  Field, Select, InlineAlert, Spinner,
} from "./ui";

const STATUSES = ["activo", "retirado", "aprobado", "reprobado"];

function EnrollForm({ students = [], sections = [], onSubmit, loading, error }) {
  const [form, setForm] = useState({ user_id: "", section_id: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="db-form" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ user_id: Number(form.user_id), section_id: Number(form.section_id) });
    }}>
      <InlineAlert message={error} />
      <Field label="Estudiante">
        <Select value={form.user_id} onChange={set("user_id")} required>
          <option value="">Seleccionar estudiante</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </Select>
      </Field>
      <Field label="Sección">
        <Select value={form.section_id} onChange={set("section_id")} required>
          <option value="">Seleccionar sección</option>
          {sections.map((s) => <option key={s.id} value={s.id}>Sección #{s.id} — {s.academic_year} ({s.shift})</option>)}
        </Select>
      </Field>
      <button type="submit" className="db-btn db-btn--primary" disabled={loading}>
        {loading ? <Spinner size={16} /> : "Inscribir estudiante"}
      </button>
    </form>
  );
}

function StatusForm({ initial, onSubmit, loading, error }) {
  const [status, setStatus] = useState(initial?.status ?? "activo");
  return (
    <form className="db-form" onSubmit={(e) => { e.preventDefault(); onSubmit({ status }); }}>
      <InlineAlert message={error} />
      <Field label="Estado de la inscripción">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </Select>
      </Field>
      <button type="submit" className="db-btn db-btn--primary" disabled={loading}>
        {loading ? <Spinner size={16} /> : "Actualizar estado"}
      </button>
    </form>
  );
}

export default function EnrollmentsView() {
  const crud = useEntityCRUD("enrollments");
  const { data: allUsers } = useEntity("users");
  const { data: sections } = useEntity("sections");
  const { data, loading, error, modal, selected, submitting, formError, confirmLoad } = crud;

  const students = (allUsers ?? []).filter((u) => u.role === "estudiante");
  const userName = (id) => (allUsers ?? []).find((u) => u.id === id)?.full_name ?? `#${id}`;
  const secLabel = (id) => { const s = (sections ?? []).find((s) => s.id === id); return s ? `#${s.id} ${s.academic_year}` : `#${id}`; };

  const COLUMNS = [
    { key: "user_id",     label: "Estudiante", render: (v) => userName(v) },
    { key: "section_id",  label: "Sección",    render: (v) => secLabel(v) },
    { key: "enrolled_at", label: "Fecha" },
    { key: "status",      label: "Estado",     render: (v) => <Badge label={v} /> },
  ];

  const rows = (data ?? []).map((e, i) => ({ ...e, id: i }));

  return (
    <div className="db-view">
      <SectionHeader
        title="Inscripciones"
        subtitle={`${(data ?? []).length} inscripciones activas`}
        action={
          <button className="db-btn db-btn--primary" onClick={crud.openCreate}>
            Nueva inscripción
          </button>
        }
      />

      <EntityTable
        loading={loading} error={error} data={rows}
        emptyMessage="No hay inscripciones."
        columns={COLUMNS}
        onEdit={crud.openEdit}
        onDelete={crud.openDelete}
      />

      {modal === "create" && (
        <Modal title="Inscribir estudiante" onClose={crud.closeModal}>
          <EnrollForm
            students={students} sections={sections ?? []}
            onSubmit={(form) => crud.run(() => createEnrollment(form))}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "status" && selected && (
        <Modal title="Actualizar estado" onClose={crud.closeModal} size="sm">
          <StatusForm
            initial={selected}
            onSubmit={(form) => crud.run(() => updateEnrollment(selected.user_id, selected.section_id, form))}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "delete" && selected && (
        <ConfirmDialog
          message={`¿Dar de baja a ${userName(selected.user_id)} de la sección ${secLabel(selected.section_id)}?`}
          onConfirm={() => crud.run(() => deleteEnrollment(selected.user_id, selected.section_id), { isConfirm: true })}
          onCancel={crud.closeModal}
          loading={confirmLoad}
        />
      )}
    </div>
  );
}
EOF
echo "✅  EnrollmentsView.js"

# ── 3d. PermissionsView ──────────────────────────────────────
cat > components/dashboard/PermissionsView.js << 'EOF'
"use client";

import { useState } from "react";
import { useEntityCRUD } from "@/lib/useEntityCRUD";
import { createPermission, deletePermission } from "@/lib/api";
import { EntityTable } from "./EntityTable";
import {
  Modal, ConfirmDialog, SectionHeader,
  Field, Input, Textarea, InlineAlert, Spinner,
} from "./ui";

function PermissionForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState({ code: "", description: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="db-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <InlineAlert message={error} />
      <Field label="Código">
        <Input value={form.code} onChange={set("code")} required placeholder="ej. manage_events" />
      </Field>
      <Field label="Descripción">
        <Textarea value={form.description} onChange={set("description")} placeholder="Descripción opcional" rows={3} />
      </Field>
      <button type="submit" className="db-btn db-btn--primary" disabled={loading}>
        {loading ? <Spinner size={16} /> : "Crear"}
      </button>
    </form>
  );
}

const COLUMNS = [
  { key: "code",        label: "Código" },
  { key: "description", label: "Descripción" },
];

export default function PermissionsView() {
  const crud = useEntityCRUD("permissions");
  const { data, loading, error, modal, selected, submitting, formError, confirmLoad } = crud;

  return (
    <div className="db-view">
      <SectionHeader
        title="Permisos"
        description="Gestiona los permisos del sistema."
        action={
          <button className="db-btn db-btn--primary" onClick={crud.openCreate}>
            Nuevo permiso
          </button>
        }
      />

      <EntityTable
        loading={loading} error={error} data={data}
        emptyMessage="No hay permisos registrados."
        columns={COLUMNS}
        onDelete={crud.openDelete}
      />

      {modal === "create" && (
        <Modal title="Nuevo permiso" onClose={crud.closeModal}>
          <PermissionForm
            onSubmit={(form) => {
              if (!form.code.trim()) { crud.setFormError("El código del permiso es obligatorio."); return; }
              crud.run(() => createPermission({ code: form.code.trim(), description: form.description.trim() || undefined }));
            }}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "delete" && selected && (
        <ConfirmDialog
          message={`¿Eliminar el permiso "${selected.code}"? Esta acción no se puede deshacer.`}
          onConfirm={() => crud.run(() => deletePermission(selected.id), { isConfirm: true })}
          onCancel={crud.closeModal}
          loading={confirmLoad}
        />
      )}
    </div>
  );
}
EOF
echo "✅  PermissionsView.js"

# ── 3e. AnnouncementsView ────────────────────────────────────
cat > components/dashboard/AnnouncementsView.js << 'EOF'
"use client";

import { useState } from "react";
import { useEntityCRUD } from "@/lib/useEntityCRUD";
import { createAnnouncement, publishAnnouncement, deleteAnnouncement } from "@/lib/api";
import { EntityTable } from "./EntityTable";
import {
  Modal, ConfirmDialog, SectionHeader, Badge,
  Field, Input, Textarea, InlineAlert, Spinner,
} from "./ui";

function formatDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" });
}

const EMPTY_FORM = { title: "", content: "", target_role: "", target_section_id: "" };

function AnnouncementForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="db-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <InlineAlert message={error} />
      <Field label="Título">
        <Input value={form.title} onChange={set("title")} placeholder="Título del anuncio" required />
      </Field>
      <Field label="Contenido">
        <Textarea value={form.content} onChange={set("content")} placeholder="Escribe el mensaje del anuncio..." rows={5} required />
      </Field>
      <Field label="Rol destinatario (opcional)">
        <Input value={form.target_role} onChange={set("target_role")} placeholder="ej. estudiante, profesor" />
      </Field>
      <button type="submit" className="db-btn db-btn--primary" disabled={loading}>
        {loading ? <Spinner size={16} /> : "Guardar borrador"}
      </button>
    </form>
  );
}

export default function AnnouncementsView() {
  const crud = useEntityCRUD("announcements");
  const { data, loading, error, modal, selected, submitting, formError, confirmLoad } = crud;

  const [publishTarget, setPublishTarget] = useState(null);

  const columns = [
    { key: "title", label: "Título" },
    {
      key: "is_published",
      label: "Estado",
      render: (row) => row.is_published
        ? <Badge variant="success">Publicado</Badge>
        : <Badge variant="warning">Borrador</Badge>,
    },
    { key: "published_at", label: "Publicado el", render: (row) => formatDate(row.published_at) },
    {
      key: "_publish",
      label: "",
      render: (row) => !row.is_published ? (
        <button className="db-btn db-btn--ghost db-btn--sm" onClick={(e) => { e.stopPropagation(); setPublishTarget(row); }}>
          Publicar
        </button>
      ) : null,
    },
  ];

  return (
    <div className="db-view">
      <SectionHeader
        title="Anuncios"
        description="Redacta y publica anuncios para la comunidad educativa."
        action={
          <button className="db-btn db-btn--primary" onClick={crud.openCreate}>
            Nuevo anuncio
          </button>
        }
      />

      <EntityTable
        loading={loading} error={error} data={data}
        emptyMessage="No hay anuncios registrados."
        columns={columns}
        onDelete={crud.openDelete}
      />

      {modal === "create" && (
        <Modal title="Nuevo anuncio" onClose={crud.closeModal}>
          <AnnouncementForm
            onSubmit={(form) => {
              if (!form.title.trim()) { crud.setFormError("El título es obligatorio."); return; }
              if (!form.content.trim()) { crud.setFormError("El contenido es obligatorio."); return; }
              crud.run(() => createAnnouncement({
                title: form.title.trim(),
                content: form.content.trim(),
                target_role: form.target_role.trim() || undefined,
                target_section_id: form.target_section_id ? Number(form.target_section_id) : undefined,
              }));
            }}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "delete" && selected && (
        <ConfirmDialog
          message={`¿Eliminar el anuncio "${selected.title}"? Esta acción no se puede deshacer.`}
          onConfirm={() => crud.run(() => deleteAnnouncement(selected.id), { isConfirm: true })}
          onCancel={crud.closeModal}
          loading={confirmLoad}
        />
      )}

      {publishTarget && (
        <ConfirmDialog
          message={`¿Publicar el anuncio "${publishTarget.title}"? Será visible para los destinatarios.`}
          onConfirm={async () => {
            await publishAnnouncement(publishTarget.id);
            crud.reload();
            setPublishTarget(null);
          }}
          onCancel={() => setPublishTarget(null)}
          confirmLabel="Publicar"
        />
      )}
    </div>
  );
}
EOF
echo "✅  AnnouncementsView.js"

# ── 3f. EventsView ───────────────────────────────────────────
cat > components/dashboard/EventsView.js << 'EOF'
"use client";

import { useState } from "react";
import { useEntityCRUD } from "@/lib/useEntityCRUD";
import { createEvent, deleteEvent } from "@/lib/api";
import { EntityTable } from "./EntityTable";
import {
  Modal, ConfirmDialog, SectionHeader, Badge,
  Field, Input, Select, Textarea, InlineAlert, Spinner,
} from "./ui";

const EVENT_TYPES = [
  { value: "academico",      label: "Académico" },
  { value: "cultural",       label: "Cultural" },
  { value: "deportivo",      label: "Deportivo" },
  { value: "administrativo", label: "Administrativo" },
  { value: "otro",           label: "Otro" },
];

const STATUS_VARIANT = { activo: "success", cancelado: "error", finalizado: "neutral" };

function formatDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" });
}

const EMPTY_FORM = {
  title: "", description: "", type: "academico",
  start_datetime: "", end_datetime: "", location: "",
  target_role: "", target_section_id: "",
};

function EventForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="db-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <InlineAlert message={error} />
      <Field label="Título">
        <Input value={form.title} onChange={set("title")} placeholder="Nombre del evento" required />
      </Field>
      <Field label="Tipo">
        <Select value={form.type} onChange={set("type")} options={EVENT_TYPES} />
      </Field>
      <Field label="Descripción">
        <Textarea value={form.description} onChange={set("description")} placeholder="Descripción opcional" rows={3} />
      </Field>
      <Field label="Fecha y hora de inicio">
        <Input type="datetime-local" value={form.start_datetime} onChange={set("start_datetime")} required />
      </Field>
      <Field label="Fecha y hora de fin">
        <Input type="datetime-local" value={form.end_datetime} onChange={set("end_datetime")} />
      </Field>
      <Field label="Lugar">
        <Input value={form.location} onChange={set("location")} placeholder="Salón, auditorio, etc." />
      </Field>
      <button type="submit" className="db-btn db-btn--primary" disabled={loading}>
        {loading ? <Spinner size={16} /> : "Crear"}
      </button>
    </form>
  );
}

const COLUMNS = [
  { key: "title",          label: "Título" },
  { key: "type",           label: "Tipo" },
  { key: "status",         label: "Estado",  render: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "neutral"}>{row.status ?? "—"}</Badge> },
  { key: "start_datetime", label: "Inicio",  render: (row) => formatDateTime(row.start_datetime) },
  { key: "end_datetime",   label: "Fin",     render: (row) => formatDateTime(row.end_datetime) },
];

export default function EventsView() {
  const crud = useEntityCRUD("events");
  const { data, loading, error, modal, selected, submitting, formError, confirmLoad } = crud;

  return (
    <div className="db-view">
      <SectionHeader
        title="Eventos"
        description="Gestiona los eventos del centro educativo."
        action={
          <button className="db-btn db-btn--primary" onClick={crud.openCreate}>
            Nuevo evento
          </button>
        }
      />

      <EntityTable
        loading={loading} error={error} data={data}
        emptyMessage="No hay eventos registrados."
        columns={COLUMNS}
        onDelete={crud.openDelete}
      />

      {modal === "create" && (
        <Modal title="Nuevo evento" onClose={crud.closeModal}>
          <EventForm
            onSubmit={(form) => {
              if (!form.title.trim()) { crud.setFormError("El título es obligatorio."); return; }
              if (!form.start_datetime) { crud.setFormError("La fecha de inicio es obligatoria."); return; }
              crud.run(() => createEvent({
                title:             form.title.trim(),
                description:       form.description.trim() || undefined,
                type:              form.type,
                start_datetime:    form.start_datetime,
                end_datetime:      form.end_datetime || undefined,
                location:          form.location.trim() || undefined,
                target_role:       form.target_role.trim() || undefined,
                target_section_id: form.target_section_id ? Number(form.target_section_id) : undefined,
              }));
            }}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "delete" && selected && (
        <ConfirmDialog
          message={`¿Eliminar el evento "${selected.title}"? Esta acción no se puede deshacer.`}
          onConfirm={() => crud.run(() => deleteEvent(selected.id), { isConfirm: true })}
          onCancel={crud.closeModal}
          loading={confirmLoad}
        />
      )}
    </div>
  );
}
EOF
echo "✅  EventsView.js"

# ── 3g. MeetingsView ─────────────────────────────────────────
cat > components/dashboard/MeetingsView.js << 'EOF'
"use client";

import { useState } from "react";
import { useEntityCRUD } from "@/lib/useEntityCRUD";
import { createMeeting, deleteMeeting } from "@/lib/api";
import { EntityTable } from "./EntityTable";
import {
  Modal, ConfirmDialog, SectionHeader, Badge,
  Field, Input, Textarea, InlineAlert, Spinner,
} from "./ui";

const STATUS_VARIANT = { programada: "warning", realizada: "success", cancelada: "error" };

function formatDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" });
}

function MeetingForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState({ title: "", description: "", scheduled_at: "", location: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="db-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <InlineAlert message={error} />
      <Field label="Título">
        <Input value={form.title} onChange={set("title")} placeholder="Nombre de la reunión" required />
      </Field>
      <Field label="Descripción">
        <Textarea value={form.description} onChange={set("description")} placeholder="Descripción opcional" rows={3} />
      </Field>
      <Field label="Fecha y hora">
        <Input type="datetime-local" value={form.scheduled_at} onChange={set("scheduled_at")} required />
      </Field>
      <Field label="Lugar">
        <Input value={form.location} onChange={set("location")} placeholder="Sala de reuniones, virtual, etc." />
      </Field>
      <button type="submit" className="db-btn db-btn--primary" disabled={loading}>
        {loading ? <Spinner size={16} /> : "Crear"}
      </button>
    </form>
  );
}

const COLUMNS = [
  { key: "title",        label: "Título" },
  { key: "status",       label: "Estado",          render: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "neutral"}>{row.status ?? "—"}</Badge> },
  { key: "scheduled_at", label: "Programada para", render: (row) => formatDateTime(row.scheduled_at) },
];

export default function MeetingsView() {
  const crud = useEntityCRUD("meetings");
  const { data, loading, error, modal, selected, submitting, formError, confirmLoad } = crud;

  return (
    <div className="db-view">
      <SectionHeader
        title="Reuniones"
        description="Programa y gestiona reuniones del centro educativo."
        action={
          <button className="db-btn db-btn--primary" onClick={crud.openCreate}>
            Nueva reunión
          </button>
        }
      />

      <EntityTable
        loading={loading} error={error} data={data}
        emptyMessage="No hay reuniones registradas."
        columns={COLUMNS}
        onDelete={crud.openDelete}
      />

      {modal === "create" && (
        <Modal title="Nueva reunión" onClose={crud.closeModal}>
          <MeetingForm
            onSubmit={(form) => {
              if (!form.title.trim()) { crud.setFormError("El título es obligatorio."); return; }
              if (!form.scheduled_at) { crud.setFormError("La fecha y hora son obligatorias."); return; }
              crud.run(() => createMeeting({
                title:        form.title.trim(),
                description:  form.description.trim() || undefined,
                scheduled_at: form.scheduled_at,
                location:     form.location.trim() || undefined,
              }));
            }}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "delete" && selected && (
        <ConfirmDialog
          message={`¿Eliminar la reunión "${selected.title}"? Esta acción no se puede deshacer.`}
          onConfirm={() => crud.run(() => deleteMeeting(selected.id), { isConfirm: true })}
          onCancel={crud.closeModal}
          loading={confirmLoad}
        />
      )}
    </div>
  );
}
EOF
echo "✅  MeetingsView.js"

# ── 3h. SectionsView ─────────────────────────────────────────
cat > components/dashboard/SectionsView.js << 'EOF'
"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useEntityCRUD } from "@/lib/useEntityCRUD";
import { createSection, updateSection, deleteSection, assignProfessor } from "@/lib/api";
import { EntityTable } from "./EntityTable";
import {
  Modal, ConfirmDialog, SectionHeader,
  Field, Input, Select, InlineAlert, Spinner,
} from "./ui";

function SectionForm({ initial = {}, specialties = [], professors = [], onSubmit, loading, error }) {
  const [form, setForm] = useState({
    name:               initial.name               ?? "",
    academic_year:      initial.academic_year      ?? new Date().getFullYear().toString(),
    specialty_id_a:     initial.specialty_id_a     ?? "",
    specialty_id_b:     initial.specialty_id_b     ?? "",
    guide_professor_id: initial.guide_professor_id ?? "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="db-form" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        ...form,
        specialty_id_a:     Number(form.specialty_id_a),
        specialty_id_b:     Number(form.specialty_id_b),
        guide_professor_id: form.guide_professor_id ? Number(form.guide_professor_id) : null,
      });
    }}>
      <InlineAlert message={error} />
      <Field label="Nombre sección">
        <Input value={form.name} onChange={set("name")} required placeholder="10-4" />
      </Field>
      <Field label="Año académico">
        <Input value={form.academic_year} onChange={set("academic_year")} required />
      </Field>
      <Field label="Especialidad A">
        <Select value={form.specialty_id_a} onChange={set("specialty_id_a")} required>
          <option value="">Seleccionar</option>
          {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Especialidad B">
        <Select value={form.specialty_id_b} onChange={set("specialty_id_b")} required>
          <option value="">Seleccionar</option>
          {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Profesor guía">
        <Select value={form.guide_professor_id} onChange={set("guide_professor_id")}>
          <option value="">Sin asignar</option>
          {professors.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </Select>
      </Field>
      <button className="db-btn db-btn--primary" disabled={loading}>
        {loading ? <Spinner size={16} /> : initial.id ? "Guardar cambios" : "Crear sección"}
      </button>
    </form>
  );
}

function AssignProfessorForm({ section, professors = [], onSubmit, loading, error }) {
  const [profId, setProfId] = useState(section.guide_professor_id ?? "");
  return (
    <form className="db-form" onSubmit={(e) => { e.preventDefault(); onSubmit(Number(profId)); }}>
      <InlineAlert message={error} />
      <Field label="Profesor guía">
        <Select value={profId} onChange={(e) => setProfId(e.target.value)}>
          <option value="">Sin asignar</option>
          {professors.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </Select>
      </Field>
      <button className="db-btn db-btn--primary" disabled={loading}>
        {loading ? <Spinner size={16} /> : "Guardar"}
      </button>
    </form>
  );
}

const COLUMNS = [
  { key: "id",                   label: "ID" },
  { key: "name",                 label: "Sección" },
  { key: "academic_year",        label: "Año" },
  { key: "specialty_a_name",     label: "Especialidad A" },
  { key: "specialty_b_name",     label: "Especialidad B" },
  { key: "guide_professor_name", label: "Profesor guía" },
];

export default function SectionsView() {
  const { sections, users, specialties, ensure, reload: storeReload } = useStore();
  const crud = useEntityCRUD("sections");
  const { modal, selected, submitting, formError, confirmLoad } = crud;

  useEffect(() => {
    ensure("sections");
    ensure("users");
    ensure("specialties");
  }, []);

  const sectionsData    = sections.data    ?? [];
  const usersData       = users.data       ?? [];
  const specialtiesData = specialties.data ?? [];
  const professors      = usersData.filter((u) => u.role === "profesor");

  const isLoading = sections.loading || users.loading || specialties.loading;
  const error     = sections.error   || users.error   || specialties.error;

  return (
    <div className="db-view">
      <SectionHeader
        title="Secciones"
        subtitle={`${sectionsData.length} secciones registradas`}
        action={
          <button className="db-btn db-btn--primary" onClick={crud.openCreate}>
            Nueva sección
          </button>
        }
      />

      <EntityTable
        loading={isLoading} error={error} data={sectionsData}
        emptyMessage="No hay secciones registradas."
        columns={COLUMNS}
        onEdit={crud.openEdit}
        onDelete={crud.openDelete}
        extraActions={(row) => (
          <button className="db-action-btn" title="Asignar profesor guía"
            onClick={() => { crud.openEdit(row); /* reuse selected */ }}>
            Asignar guía
          </button>
        )}
      />

      {modal === "create" && (
        <Modal title="Nueva sección" onClose={crud.closeModal}>
          <SectionForm
            specialties={specialtiesData} professors={professors}
            onSubmit={(form) => crud.run(() => createSection(form))}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "edit" && selected && (
        <Modal title={`Editar sección #${selected.id}`} onClose={crud.closeModal}>
          <SectionForm
            initial={selected} specialties={specialtiesData} professors={professors}
            onSubmit={(form) => crud.run(() => updateSection(selected.id, form))}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "assign" && selected && (
        <Modal title="Asignar profesor guía" onClose={crud.closeModal} size="sm">
          <AssignProfessorForm
            section={selected} professors={professors}
            onSubmit={(profId) => crud.run(() => assignProfessor(selected.id, profId))}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "delete" && selected && (
        <ConfirmDialog
          message={`¿Eliminar la sección "${selected.name}"?`}
          onConfirm={() => crud.run(() => deleteSection(selected.id), { isConfirm: true })}
          onCancel={crud.closeModal}
          loading={confirmLoad}
        />
      )}
    </div>
  );
}
EOF
echo "✅  SectionsView.js"

# ── 3i. UsersView — se mantiene casi igual, solo se extrae EntityTable ──
# (UsersView es lo suficientemente complejo como para no simplificar más)
cat > components/dashboard/UsersView.js << 'EOF'
"use client";

import { useState, useEffect } from "react";
import { useEntity } from "@/lib/useEntity";
import { useEntityCRUD } from "@/lib/useEntityCRUD";
import { useStore } from "@/lib/store";
import { createUser, updateUser, deleteUser } from "@/lib/api";
import { EntityTable } from "./EntityTable";
import {
  Modal, ConfirmDialog, Badge, SectionHeader,
  Field, Input, Select, InlineAlert, Spinner,
} from "./ui";
import { useToast } from "@/lib/Toast";

const ROLES          = ["estudiante", "profesor", "admin"];
const ROLE_STUDENT   = "estudiante";
const ROLE_PROFESSOR = "profesor";

function UserForm({ initial = {}, onSubmit, loading, error }) {
  const { specialties, sections, ensure } = useStore();

  useEffect(() => {
    ensure("specialties");
    ensure("sections");
  }, []);

  const [form, setForm] = useState({
    email:       initial.email       ?? "",
    full_name:   initial.full_name   ?? "",
    national_id: initial.national_id ?? "",
    role:        initial.role        ?? ROLE_STUDENT,
    is_active:   initial.is_active   ?? true,
    student_profile: {
      specialty_id:  "",
      section_id:    "",
      section_part:  "",
      section_shift: "diurna",
      year_level:    "1",
    },
    professor_profile: { specialty_area: "" },
  });

  const set          = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setBool      = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value === "true" }));
  const setProfessor = (k) => (e) =>
    setForm((f) => ({ ...f, professor_profile: { ...f.professor_profile, [k]: e.target.value } }));

  const handleSpecialtyChange = (e) => {
    setForm((f) => ({
      ...f,
      student_profile: { ...f.student_profile, specialty_id: e.target.value, section_id: "", section_part: "" },
    }));
  };

  const handleSectionChange = (e) => {
    const sectionId = e.target.value;
    const sp        = form.student_profile;
    const section   = (sections.data ?? []).find((s) => String(s.id) === String(sectionId));
    const match     = section?.specialties?.find((spec) => String(spec.id) === String(sp.specialty_id));
    setForm((f) => ({
      ...f,
      student_profile: { ...f.student_profile, section_id: sectionId, section_part: match?.part ?? "" },
    }));
  };

  const sp = form.student_profile;

  const filteredSections = (sections.data ?? []).filter((s) =>
    !sp.specialty_id || s.specialties?.some((spec) => String(spec.id) === String(sp.specialty_id))
  );

  const derivedPartLabel = sp.section_part
    ? `Parte ${sp.section_part}`
    : sp.section_id ? "No determinada" : "—";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.role === ROLE_STUDENT) {
      if (!sp.specialty_id || !sp.section_id || !sp.section_part)
        return onSubmit(null, "Selecciona especialidad y sección para continuar");
      return onSubmit({
        email: form.email, full_name: form.full_name, national_id: form.national_id,
        role: form.role, is_active: form.is_active,
        student_profile: {
          year_level:    Number(sp.year_level),
          specialty_id:  Number(sp.specialty_id),
          section_id:    Number(sp.section_id),
          section_part:  sp.section_part,
          section_shift: sp.section_shift,
          enrolled_since: sp.enrolled_since ?? null,
        },
      });
    }
    if (form.role === ROLE_PROFESSOR) {
      return onSubmit({
        email: form.email, full_name: form.full_name, national_id: form.national_id,
        role: form.role, is_active: form.is_active,
        professor_profile: { specialty_area: form.professor_profile.specialty_area || null },
      });
    }
    onSubmit({ email: form.email, full_name: form.full_name, national_id: form.national_id, role: form.role, is_active: form.is_active });
  };

  return (
    <form className="db-form" onSubmit={handleSubmit}>
      <InlineAlert message={error} />
      {!initial.id && (
        <Field label="Correo electrónico">
          <Input type="email" value={form.email} onChange={set("email")} required />
        </Field>
      )}
      <Field label="Nombre completo">
        <Input value={form.full_name} onChange={set("full_name")} required />
      </Field>
      {!initial.id && (
        <Field label="Cédula">
          <Input value={form.national_id} onChange={set("national_id")} required />
        </Field>
      )}
      <Field label="Rol">
        <Select value={form.role} onChange={set("role")}>
          {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </Select>
      </Field>

      {form.role === ROLE_PROFESSOR && (
        <>
          <SectionHeader title="Perfil del profesor" />
          <Field label="Área de especialidad">
            <Input value={form.professor_profile.specialty_area} onChange={setProfessor("specialty_area")} placeholder="Ej: Matemáticas, Redes, Programación" />
          </Field>
        </>
      )}

      {form.role === ROLE_STUDENT && (
        <>
          <SectionHeader title="Perfil del estudiante" />
          <Field label="Año técnico">
            <Select value={sp.year_level} onChange={(e) => setForm((f) => ({ ...f, student_profile: { ...f.student_profile, year_level: e.target.value } }))} required>
              <option value="1">1°</option>
              <option value="2">2°</option>
              <option value="3">3°</option>
            </Select>
          </Field>
          <Field label="Especialidad">
            <Select value={sp.specialty_id} onChange={handleSpecialtyChange} required>
              <option value="">Seleccionar</option>
              {(specialties.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Jornada">
            <Select value={sp.section_shift} onChange={(e) => setForm((f) => ({ ...f, student_profile: { ...f.student_profile, section_shift: e.target.value } }))}>
              <option value="diurna">Diurna</option>
              <option value="nocturna">Nocturna</option>
            </Select>
          </Field>
          <Field label="Sección">
            {sections.loading ? <Spinner size={16} /> : (
              <Select value={sp.section_id} onChange={handleSectionChange} required disabled={!sp.specialty_id}>
                <option value="">{sp.specialty_id ? "Seleccionar sección" : "Primero elige una especialidad"}</option>
                {filteredSections.length === 0 && sp.specialty_id
                  ? <option disabled value="">No hay secciones disponibles</option>
                  : filteredSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
                }
              </Select>
            )}
            {sections.error && <span style={{ fontSize: "0.75rem", color: "var(--db-error)" }}>{sections.error}</span>}
          </Field>
          {sp.section_id && (
            <Field label="Parte asignada">
              <div style={{ padding: "6px 10px", background: "var(--db-surface-2, #f4f4f5)", borderRadius: 6, fontSize: "0.9rem", color: sp.section_part ? "var(--db-text)" : "var(--db-text-muted)" }}>
                {derivedPartLabel}
              </div>
            </Field>
          )}
        </>
      )}

      {initial.id && (
        <Field label="Estado">
          <Select value={String(form.is_active)} onChange={setBool("is_active")}>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </Select>
        </Field>
      )}

      <button type="submit" className="db-btn db-btn--primary" disabled={loading}>
        {loading ? <Spinner size={16} /> : initial.id ? "Guardar cambios" : "Crear usuario"}
      </button>
    </form>
  );
}

function CreatedPasswordModal({ data, onClose }) {
  const { addToast } = useToast();
  useEffect(() => {
    navigator.clipboard.writeText(data.password)
      .then(()  => addToast("Contraseña copiada al portapapeles", "success"))
      .catch(() => addToast("No se pudo copiar automáticamente",  "warning"));
  }, []);

  return (
    <Modal title="Usuario creado" onClose={onClose} size="sm" disableBackdropClose>
      <p className="db-confirm-msg">El usuario fue creado exitosamente. Guarda la contraseña generada:</p>
      <div className="db-password-box">
        <span className="db-password-label">Contraseña temporal</span>
        <code className="db-password-value">{data.password}</code>
      </div>
      <p style={{ fontSize: 12, color: "var(--db-text-muted)", marginTop: 8 }}>
        Esta contraseña solo se muestra una vez. El usuario deberá cambiarla al ingresar.
      </p>
      <button className="db-btn db-btn--primary" onClick={onClose} style={{ marginTop: 16, width: "100%" }}>
        Entendido
      </button>
    </Modal>
  );
}

const TABS    = ["Todos", "Estudiantes", "Profesores", "Administradores"];
const tabRole = { Todos: null, Estudiantes: "estudiante", Profesores: "profesor", Administradores: "admin" };

const COLUMNS = [
  { key: "id",        label: "ID" },
  { key: "full_name", label: "Nombre" },
  { key: "email",     label: "Correo" },
  { key: "role",      label: "Rol",    render: (v) => <Badge label={v} /> },
  { key: "is_active", label: "Estado", render: (v) => <Badge label={v ? "activo" : "inactivo"} /> },
];

export default function UsersView() {
  const crud = useEntityCRUD("users");
  const { data, loading, error, modal, selected, submitting, formError, confirmLoad } = crud;

  const [tab,         setTab]     = useState("Todos");
  const [search,      setSearch]  = useState("");
  const [createdUser, setCreated] = useState(null);

  const filtered = (data ?? []).filter((u) => {
    const roleMatch = !tabRole[tab] || u.role === tabRole[tab];
    const q         = search.toLowerCase();
    const textMatch = !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    return roleMatch && textMatch;
  });

  const handleCreate = async (form, customError) => {
    if (customError) return crud.setFormError(customError);
    crud.run(() => createUser(form), {
      noClose: true,
      onSuccess: (res) => { setCreated(res); crud.closeModal(); },
    });
  };

  return (
    <div className="db-view">
      <SectionHeader
        title="Usuarios del sistema"
        subtitle={`${(data ?? []).length} usuarios registrados`}
        action={
          <button className="db-btn db-btn--primary" onClick={crud.openCreate}>
            Nuevo usuario
          </button>
        }
      />

      <div className="db-tabs">
        {TABS.map((t) => (
          <button key={t} className={`db-tab ${tab === t ? "db-tab--active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="db-search-wrap">
        <input className="db-search" placeholder="Buscar por nombre o correo..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <EntityTable
        loading={loading} error={error} data={filtered}
        emptyMessage="No hay usuarios con este filtro."
        columns={COLUMNS}
        onEdit={crud.openEdit}
        onDelete={crud.openDelete}
      />

      {modal === "create" && (
        <Modal title="Crear nuevo usuario" onClose={crud.closeModal}>
          <UserForm onSubmit={handleCreate} loading={submitting} error={formError} />
        </Modal>
      )}

      {modal === "edit" && selected && (
        <Modal title={`Editar — ${selected.full_name}`} onClose={crud.closeModal}>
          <UserForm
            initial={selected}
            onSubmit={(form) => crud.run(() => updateUser(selected.id, { full_name: form.full_name, is_active: form.is_active, role_name: form.role }))}
            loading={submitting} error={formError}
          />
        </Modal>
      )}

      {modal === "delete" && selected && (
        <ConfirmDialog
          message={`¿Eliminar al usuario "${selected.full_name}"?`}
          onConfirm={() => crud.run(() => deleteUser(selected.id), { isConfirm: true })}
          onCancel={crud.closeModal}
          loading={confirmLoad}
        />
      )}

      {createdUser && <CreatedPasswordModal data={createdUser} onClose={() => setCreated(null)} />}
    </div>
  );
}
EOF
echo "✅  UsersView.js"

# ══════════════════════════════════════════════════════════════
echo ""
echo "✅  Refactor completado. Archivos creados/modificados:"
echo "   lib/useEntityCRUD.js                  (nuevo hook)"
echo "   components/dashboard/EntityTable.js   (nuevo componente)"
echo "   components/dashboard/AnnouncementsView.js"
echo "   components/dashboard/CoursesView.js"
echo "   components/dashboard/EnrollmentsView.js"
echo "   components/dashboard/EventsView.js"
echo "   components/dashboard/MeetingsView.js"
echo "   components/dashboard/PermissionsView.js"
echo "   components/dashboard/SectionsView.js"
echo "   components/dashboard/SpecialtiesView.js"
echo "   components/dashboard/UsersView.js"
echo ""
echo "   SectionsView: si usas el modal 'assign' para asignar guía,"
echo "   cambia openEdit() por una acción que llame setModal('assign')"
echo "   directamente desde extraActions."
