/**
 * usePreload.js
 *
 * Hook que expone los datos pre-cargados por AppLoader desde el store global.
 * Las vistas usan este hook en lugar de hacer sus propios fetch.
 *
 * Ejemplo en MisCursosView:
 *
 *   import { usePreload } from "@/lib/usePreload";
 *
 *   export default function MisCursosView() {
 *     const { mycourses, isLoading, error } = usePreload("mycourses");
 *     // mycourses ya está cargado desde AppLoader, sin espera
 *   }
 *
 * Si por alguna razón los datos no están en el store (p. ej. navegación directa
 * sin pasar por AppLoader), el hook los carga de forma transparente.
 */

"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

const BASE = "http://localhost:8000";

const storeSet = (key, val) => useStore.setState({ [key]: val });
const storeGet = (key)      => useStore.getState()[key];

// ─── Mapa de endpoints por clave ──────────────────────────────────────────────
//
// Extiende este objeto si agregás más slices al store.
//
const ENDPOINTS = {
  profile:     "/dashboard/",
  mysection:   "/student/my-section",
  mycourses:   "/student/my-courses",
  users:       "/admin/users",
  sections:    "/admin/sections",
  courses:     "/admin/courses",
  specialties: "/admin/specialties",
  // "schedule" requiere el section_id → se maneja por separado en useSchedule
};

async function apiFetch(path) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Error ${res.status}`);
  }
  return res.json();
}

// ─── usePreload ───────────────────────────────────────────────────────────────

/**
 * @param {string} key - Clave del store (ej. "mycourses", "mysection")
 * @returns {{ data: any, isLoading: boolean, error: string | null, refetch: () => void }}
 */
export function usePreload(key) {
  // Suscribirse al slice reactivamente
  const slot = useStore((s) => s[key] ?? null);

  const data      = slot?.data    ?? null;
  const isLoading = slot?.loading ?? false;
  const error     = slot?.error   ?? null;
  const hasData   = data !== null;

  // Fetch de respaldo si AppLoader no corrió
  useEffect(() => {
    if (hasData || isLoading) return;
    const endpoint = ENDPOINTS[key];
    if (!endpoint) return;

    storeSet(key, { data: null, loading: true, error: "" });
    apiFetch(endpoint)
      .then((res) => storeSet(key, { data: res, loading: false, error: "" }))
      .catch((err) => storeSet(key, { data: null, loading: false, error: err.message }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function refetch() {
    const endpoint = ENDPOINTS[key];
    if (!endpoint) return;
    storeSet(key, { data: null, loading: true, error: "" });
    apiFetch(endpoint)
      .then((res) => storeSet(key, { data: res, loading: false, error: "" }))
      .catch((err) => storeSet(key, { data: null, loading: false, error: err.message }));
  }

  return { data, isLoading, error, refetch };
}

// ─── useSchedule ─────────────────────────────────────────────────────────────
//
// El horario necesita el section_id, así que tiene su propio hook.
//

/**
 * @returns {{ schedule: any, sectionName: string, isLoading: boolean, error: string | null }}
 */
export function useSchedule() {
  const scheduleSlot = useStore((s) => s["schedule"] ?? null);
  const sectionSlot  = useStore((s) => s["mysection"] ?? null);

  const sectionData = sectionSlot?.data ?? null;
  const sectionId   = sectionData?.section_id ?? null;
  const part        = sectionData?.section_part?.toUpperCase() ?? "A";

  const isLoading = scheduleSlot?.loading ?? sectionSlot?.loading ?? false;
  const error     = scheduleSlot?.error   ?? null;
  const raw       = scheduleSlot?.data    ?? null;

  useEffect(() => {
    if (!sectionId) return;
    if (raw !== null || scheduleSlot?.loading) return;

    storeSet("schedule", { data: null, loading: true, error: "" });
    apiFetch(`/student/schedule/${sectionId}`)
      .then((res) => storeSet("schedule", { data: res, loading: false, error: "" }))
      .catch((err) => storeSet("schedule", { data: null, loading: false, error: err.message }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  return {
    schedule:    raw?.schedule?.[part] ?? null,
    sectionName: raw?.section_name ?? "",
    part,
    isLoading,
    error,
  };
}