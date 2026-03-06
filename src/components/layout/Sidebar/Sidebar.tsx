import { NavLink } from "react-router-dom";
import { menu } from "../../../app/config/menu";
import "./Sidebar.css";
import { useNavigate } from "react-router-dom";
import SidebarAccounts from "../SidebarAccounts/SidebarAccounts";


export default function Sidebar() {
  const navigate = useNavigate();
  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        Controle
      </div>

      <nav className="sidebar-menu">
        {menu.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "sidebar-item active" : "sidebar-item"
            }
          >
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={logout}
          className="sidebar-item sidebar-logout"
        >
          Sair
        </button>
      </nav>   
      <div className="sidebar-divider" />
        <div className="sidebar-accounts">
        <SidebarAccounts  />
      </div>
      
    </aside>
  );
}
