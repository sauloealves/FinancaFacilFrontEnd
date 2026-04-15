import { Fragment, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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

function Sidebar({
  isOpen,
  isCollapsed,
  onClose,
}: Readonly<SidebarProps>) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((current) => {
      const nextState = { ...current };

      for (const item of menu) {
        if (item.children && location.pathname.startsWith(item.path)) {
          nextState[item.path] = true;
        }
      }

      return nextState;
    });
  }, [location.pathname]);

  function toggleGroup(path: string) {
    setOpenGroups((current) => ({
      ...current,
      [path]: !(current[path] ?? false),
    }));
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
        {menu.map((item) => {
          const isGroup = Boolean(item.children?.length);
          const isGroupActive = location.pathname.startsWith(item.path);
          const isGroupOpen = openGroups[item.path] ?? isGroupActive;

          if (!isGroup) {
            return (
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
            );
          }

          return (
            <Fragment key={item.path}>
              <div className={`sidebar-group ${isGroupOpen ? "is-open" : ""}`}>
              <button
                type="button"
                className={`sidebar-item sidebar-group-toggle ${isGroupActive ? "active" : ""}`}
                title={isCollapsed ? item.label : undefined}
                onClick={() => toggleGroup(item.path)}
                aria-expanded={isGroupOpen}
                aria-haspopup="true"
              >
                <span className="sidebar-item-icon" aria-hidden="true">
                  {menuIcons[item.path] ?? "•"}
                </span>
                <span className="sidebar-item-label">{item.label}</span>
                <span className="sidebar-submenu-arrow" aria-hidden="true">
                  {isGroupOpen ? "▾" : "▸"}
                </span>
              </button>

              {isGroupOpen && (
                <div className={`sidebar-submenu ${isCollapsed ? "sidebar-submenu-popout" : ""}`}>
                  {item.children?.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        isActive ? "sidebar-submenu-item active" : "sidebar-submenu-item"
                      }
                    >
                      <span className="sidebar-submenu-bullet" aria-hidden="true">•</span>
                      <span className="sidebar-submenu-label">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
              </div>
            </Fragment>
          );
        })}
      </nav>   
      <div className="sidebar-divider" />
      <div className="sidebar-accounts">
        <SidebarAccounts  />
      </div>
      
    </aside>
  );
}

export default Sidebar;
