"use client";

// ─── Íconos SVG inline ────────────────────────────────────────────────────────

const Icon = {
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  video: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  layout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  award: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6"/>
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  logo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  // Toggle sidebar icons
  panelLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  ),
  chevronsLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="11 17 6 12 11 7"/>
      <polyline points="18 17 13 12 18 7"/>
    </svg>
  ),
  chevronsRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 17 18 12 13 7"/>
      <polyline points="6 17 11 12 6 7"/>
    </svg>
  ),
};

// ─── Definición de nav ────────────────────────────────────────────────────────

const NAV_BASE = [
  { key: "perfil", label: "Mi perfil", icon: Icon.user },
];

const NAV_STUDENT = [
  { key: "miseccion",    label: "Mi sección",    icon: Icon.layout },
  { key: "miscursos",    label: "Mis cursos",    icon: Icon.book },
  { key: "mi-asistencia", label: "Mi asistencia", icon: Icon.check },
  { key: "mis-notas",     label: "Mis notas",     icon: Icon.layers },
  { key: "mis-becas",     label: "Mis becas",     icon: Icon.award },
  { key: "mis-avisos",    label: "Mis avisos",    icon: Icon.mail },
];

const NAV_ADMIN = [
  { perm: "nav.usuarios",       key: "usuarios",       label: "Usuarios",       icon: Icon.users },
  { perm: "nav.cursos",         key: "cursos",         label: "Cursos",         icon: Icon.book },
  { perm: "nav.secciones",      key: "secciones",      label: "Secciones",      icon: Icon.layout },
  { perm: "nav.especialidades", key: "especialidades", label: "Especialidades", icon: Icon.layers },
  { perm: "nav.matriculas",     key: "matriculas",     label: "Matrículas",     icon: Icon.grid },
  { perm: "nav.anuncios",       key: "anuncios",       label: "Anuncios",       icon: Icon.bell },
  { perm: "nav.eventos",        key: "eventos",        label: "Eventos",        icon: Icon.calendar },
  { perm: "nav.reuniones",      key: "reuniones",      label: "Reuniones",      icon: Icon.video },
  { perm: "nav.permisos",       key: "permisos",       label: "Permisos",       icon: Icon.shield },
  { perm: "nav.asignaturas",    key: "asignaturas",    label: "Asignaturas",    icon: Icon.book },
];

function buildSections(roles = [], perms = []) {
  const isSuperadmin = roles.includes("superadmin");
  const isStudent    = roles.includes("estudiante");

  const sections = [{ title: null, items: NAV_BASE }];

  if (isStudent) {
    sections.push({ title: "Mi portal", items: NAV_STUDENT });
  }

  const adminItems = NAV_ADMIN.filter(
    ({ perm }) => isSuperadmin || perms.includes(perm)
  );

  if (adminItems.length > 0) {
    sections.push({ title: "Gestión", items: adminItems });
  }

  return sections;
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ item, active, onClick, collapsed }) {
  return (
    <button
      className={`db-sidebar-link ${active ? "db-sidebar-link--active" : ""}`}
      onClick={() => onClick(item.key)}
      title={collapsed ? item.label : undefined}
    >
      <span className="db-sidebar-link-icon">{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </button>
  );
}

// ─── DashboardSidebar ─────────────────────────────────────────────────────────

export default function DashboardSidebar({
  currentView,
  roles,
  perms,
  onNavigate,
  onLogout,
  collapsed,
  onToggleCollapse,
}) {
  const sections = buildSections(roles, perms);

  return (
    <>
      {/* Overlay for mobile when sidebar is open */}
      {!collapsed && (
        <div
          className="db-sidebar-overlay"
          onClick={onToggleCollapse}
          aria-hidden="true"
        />
      )}

      <aside className={`db-sidebar ${collapsed ? "db-sidebar--collapsed" : ""}`}>
        {/* Brand */}
        <div className="db-sidebar-brand">
          <div className="db-sidebar-logo">{Icon.logo}</div>
          {!collapsed && (
            <div>
              <div className="db-sidebar-brand-name">CTP Pavas</div>
              <div className="db-sidebar-brand-role">Panel institucional</div>
            </div>
          )}
          <button
            className={`db-sidebar-toggle ${collapsed ? "db-sidebar-toggle--collapsed" : ""}`}
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? Icon.chevronsRight : Icon.chevronsLeft}
          </button>
        </div>

        {/* Nav */}
        <nav className="db-sidebar-nav">
          {sections.map((section, i) => (
            <div key={i} className="db-sidebar-section">
              {section.title && !collapsed && (
                <span className="db-sidebar-nav-label">{section.title}</span>
              )}
              {section.items.map((item) => (
                <NavItem
                  key={item.key}
                  item={item}
                  active={currentView === item.key}
                  onClick={onNavigate}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="db-sidebar-footer">
          <button
            className="db-sidebar-logout"
            onClick={onLogout}
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            {Icon.logout}
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}