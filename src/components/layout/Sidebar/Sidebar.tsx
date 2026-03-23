import { NavLink, useNavigate } from "react-router-dom";
import { menu } from "../../../app/config/menu";
import "./Sidebar.css";
import SidebarAccounts from "../SidebarAccounts/SidebarAccounts";

type SidebarProps = {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
};

const menuIcons: Record<string, string> = {
  "/dashboard": "⌂",
  "/launches": "⇄",
  "/accounts": "◫",
  "/reports": "◔",
  "/categories": "#",
};

export default function Sidebar({
  isOpen,
  isCollapsed,
  onClose,
}: Readonly<SidebarProps>) {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("token");
    onClose();
    navigate("/login");
  }

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">Controle</span>
          <span className="sidebar-logo-compact">CF</span>
        </div>

        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Fechar menu"
        >
          ✕
        </button>
      </div>

      <nav className="sidebar-menu">
        {menu.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            title={isCollapsed ? item.label : undefined}
            onClick={onClose}
            className={({ isActive }) =>
              isActive ? "sidebar-item active" : "sidebar-item"
            }
          >
            <span className="sidebar-item-icon" aria-hidden="true">
              {menuIcons[item.path] ?? "•"}
            </span>
            <span className="sidebar-item-label">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={logout}
          className="sidebar-item sidebar-logout"
          title={isCollapsed ? "Sair" : undefined}
        >
          <span className="sidebar-item-icon" aria-hidden="true">⇥</span>
          <span className="sidebar-item-label">Sair</span>
        </button>
      </nav>   
      <div className="sidebar-divider" />
      <div className="sidebar-accounts">
        <SidebarAccounts  />
      </div>
      
    </aside>
  );
}
