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
