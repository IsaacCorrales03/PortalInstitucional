/**
 * lib/store.js
 *
 * Global cache store using Zustand.
 * Install: npm install zustand
 *
 * Rules:
 *  - Data is fetched ONCE and cached in memory for the session.
 *  - After any mutation (create/update/delete), call reload(key)
 *    to re-fetch only that slice from the API.
 *  - Components read from the store — no direct useFetch in views.
 */
import { create } from "zustand";
import * as api from "./api";

// Map of store key → fetcher function
const FETCHERS = {
  users:         api.getUsers,
  specialties:   api.getSpecialties,
  courses:       api.getCourses,
  mycourses:     api.getMyCourses,
  sections:      api.getSections,
  enrollments:   api.getEnrollments,
  permissions:   api.getPermissions,
  events:        api.getEvents,
  announcements: api.getAnnouncements,
  meetings:      api.getMeetings,
  professors:    api.getProfessors,   // ← agregar esta línea
};

function emptySlice() {
  return { data: null, loading: false, error: "" };
}

export const useStore = create((set, get) => ({
  // ── Slices ────────────────────────────────────────────────────
  users:         emptySlice(),
  specialties:   emptySlice(),
  courses:       emptySlice(),
  mycourses:     emptySlice(),
  sections:      emptySlice(),
  enrollments:   emptySlice(),
  permissions:   emptySlice(),
  events:        emptySlice(),
  announcements: emptySlice(),
  meetings:      emptySlice(),
  professors: emptySlice(),

  // ── ensure(key) ───────────────────────────────────────────────
  // Fetches only if the slice has never been loaded (data === null).
  // Safe to call on every component mount — won't double-fetch.
  ensure: async (key) => {
    const slice = get()[key];
    if (slice.data !== null || slice.loading) return;

    set((s) => ({ [key]: { ...s[key], loading: true, error: "" } }));
    try {
      const data = await FETCHERS[key]();
      set({ [key]: { data, loading: false, error: "" } });
    } catch (e) {
      set((s) => ({ [key]: { ...s[key], loading: false, error: e.message } }));
    }
  },

  // ── reload(key) ───────────────────────────────────────────────
  // Forces a fresh fetch regardless of cache.
  // Call this after create / update / delete mutations.
  reload: async (key) => {
    set((s) => ({ [key]: { ...s[key], loading: true, error: "" } }));
    try {
      const data = await FETCHERS[key]();
      set({ [key]: { data, loading: false, error: "" } });
    } catch (e) {
      set((s) => ({ [key]: { ...s[key], loading: false, error: e.message } }));
    }
  },

  // ── reloadMany(keys) ──────────────────────────────────────────
  // Reload multiple slices in parallel.
  // Useful when a mutation affects more than one entity.
  // Example: deleting a section should also reload enrollments.
  reloadMany: async (keys) => {
    await Promise.all(keys.map((key) => get().reload(key)));
  },
}));