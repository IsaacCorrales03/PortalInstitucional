"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardSidebar from "./DashboardSidebar";
import MiPerfilView from "./MiPerfilView";
import UsuariosView from "./UsuariosView";
import SectionsView from "./SectionsView"
// ─── Auth ─────────────────────────────────────────────────────────────────────

export function getTokenPayload() {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

// ─── Views ────────────────────────────────────────────────────────────────────

const VIEWS = {
  perfil:    MiPerfilView,
  usuarios:  UsuariosView,
  secciones: SectionsView
};

const DEFAULT_VIEW = "perfil";

// ─── Guards ───────────────────────────────────────────────────────────────────

export function withRole(...allowed) {
  return function (Component) {
    function Guard(props) {
      const roles = props.__roles ?? [];
      const ok =
        roles.includes("superadmin") ||
        allowed.some((r) => roles.includes(r));
      if (!ok) return <ForbiddenScreen />;
      return <Component {...props} />;
    }
    return Guard;
  };
}

export function withPermission(...required) {
  return function (Component) {
    function Guard(props) {
      const roles = props.__roles ?? [];
      const perms = props.__perms ?? [];
      if (roles.includes("superadmin")) return <Component {...props} />;
      const ok = required.every((p) => perms.includes(p));
      if (!ok) return <ForbiddenScreen />;
      return <Component {...props} />;
    }
    return Guard;
  };
}

// ─── 403 ──────────────────────────────────────────────────────────────────────

function ForbiddenScreen() {
  return (
    <div className="db-forbidden">
      <span className="db-forbidden-code">403</span>
      <p className="db-forbidden-msg">No tenés acceso a esta sección.</p>
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

const ROLE_LABEL = {
  superadmin: "Super Administrador",
  admin:      "Administrador",
  professor:  "Profesor",
  estudiante: "Estudiante",
};

function getHighestRole(roles) {
  for (const key of ["superadmin", "admin", "professor", "estudiante"]) {
    if (roles.includes(key)) return ROLE_LABEL[key];
  }
  return "Usuario";
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Ícono hamburguesa para el topbar en mobile
const MenuIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

function Topbar({ view, fullName, roles, onMenuToggle }) {
  const initials = getInitials(fullName);

  return (
    <header className="db-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Botón hamburguesa — solo visible en mobile */}
        <button
          className="db-topbar-menu-btn"
          onClick={onMenuToggle}
          aria-label="Abrir menú"
        >
          {MenuIcon}
        </button>
        <div className="db-topbar-title">{view}</div>
      </div>

      <div className="db-topbar-user">
        <div className="db-topbar-avatar">{initials}</div>
        <div>
          {fullName && <div className="db-topbar-name">{fullName}</div>}
          <div className="db-topbar-role">{getHighestRole(roles)}</div>
        </div>
      </div>
    </header>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function DashboardShell() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const view         = searchParams.get("view") ?? DEFAULT_VIEW;

  const [roles,     setRoles]     = useState([]);
  const [perms,     setPerms]     = useState([]);
  const [fullName,  setFullName]  = useState(null);
  const [ready,     setReady]     = useState(false);

  // Estado del sidebar: en desktop empieza expandido, en mobile empieza colapsado
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  // Al cambiar de tamaño, adaptar comportamiento
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) {
        // En mobile siempre empezar cerrado
        setCollapsed(true);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  useEffect(() => {
    const payload = getTokenPayload();
    if (!payload) { router.replace("/login"); return; }

    const token = localStorage.getItem("token");
    const r     = payload.roles ?? [];

    setRoles(r);
    setFullName(payload.full_name ?? null);

    const uid = payload.sub;
    fetch(`http://localhost:8000/admin/users/${uid}/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPerms(data.map((p) => p.code)))
      .catch(() => setPerms([]))
      .finally(() => setReady(true));
  }, [router]);

  const navigate = useCallback(
    (key) => {
      router.push(`/dashboard?view=${key}`);
      // En mobile, cerrar sidebar al navegar
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setCollapsed(true);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    router.replace("/login");
  }, [router]);

  if (!ready) {
    return <div className="db-shell db-shell--booting"><span className="db-spinner" style={{ width: 28, height: 28 }} /></div>;
  }

  const ViewComponent = VIEWS[view] ?? null;

  return (
    <div className="db-shell">
      <DashboardSidebar
        currentView={view}
        roles={roles}
        perms={perms}
        onNavigate={navigate}
        onLogout={logout}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <div className="db-main">
        <Topbar
          view={view}
          fullName={fullName}
          roles={roles}
          onMenuToggle={toggleCollapsed}
        />

        <main className="db-content">
          {ViewComponent ? (
            <ViewComponent __roles={roles} __perms={perms} />
          ) : (
            <div style={{ padding: 32, color: "var(--text-muted)" }}>Vista no encontrada</div>
          )}
        </main>
      </div>
    </div>
  );
}