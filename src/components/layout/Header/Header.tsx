import { useEffect, useRef, useState } from "react";
import Button from "../../ui/Button/Button";
import "./Header.css";
import RevenueModal from "../../../features/revenue/RevenueModal";
import ExpenseModal from '../../../features/expense/expenseModal';
import TransferModal from '../../../features/transfer/TransferModal';
import ImportTransactionsAction from "../../../features/import/ImportTransactionsAction";
import ProfileSettingsModal from "../../../features/profile/ProfileSettingsModal";
import ChangePasswordModal from "../../../features/profile/ChangePasswordModal";
import { formatMonthBR } from "../../../utils/date";
import { useAuth } from "../../../contexts/auth/AuthContext";
import { useNavigate } from "react-router-dom";

type HeaderProps = {
  title?: string;
  month?: string;
  onMonthChange?: (month: string) => void;
  showImportAction?: boolean;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  let nextMonth = Number.parseInt(month, 10) + 1;
  let nextYear = Number.parseInt(year, 10);
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function getPreviousMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  let prevMonth = Number.parseInt(month, 10) - 1;
  let prevYear = Number.parseInt(year, 10);
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

export default function Header({
  title = "Dashboard",
  month,
  onMonthChange,
  showImportAction = false,
  isSidebarOpen,
  isSidebarCollapsed,
  onToggleSidebar,
}: Readonly<HeaderProps>) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [openRevenue, setOpenRevenue] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const currentYear = month ? Number.parseInt(month.split("-")[0], 10) : new Date().getFullYear();
  const currentMonth = month ? Number.parseInt(month.split("-")[1], 10) : new Date().getMonth() + 1;
  
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  const handleMonthSelect = (selectedMonth: number) => {
    if (onMonthChange) {
      onMonthChange(`${currentYear}-${String(selectedMonth).padStart(2, "0")}`);
      setShowMonthPicker(false);
    }
  };
  
  const handleYearChange = (year: number) => {
    if (onMonthChange) {
      onMonthChange(`${year}-${String(currentMonth).padStart(2, "0")}`);
    }
  };

  function handleOpenRevenue() {
    setShowMobileActions(false);
    setOpenRevenue(true);
  }

  function handleOpenExpense() {
    setShowMobileActions(false);
    setOpenExpense(true);
  }

  function handleOpenTransfer() {
    setShowMobileActions(false);
    setOpenTransfer(true);
  }

  function handleToggleUserMenu() {
    setShowMobileActions(false);
    setShowMonthPicker(false);
    setIsUserMenuOpen((current) => !current);
  }

  function handleOpenProfile() {
    setShowMobileActions(false);
    setShowMonthPicker(false);
    setIsUserMenuOpen(false);
    setIsProfileOpen(true);
  }

  function handleOpenChangePassword() {
    setShowMobileActions(false);
    setShowMonthPicker(false);
    setIsUserMenuOpen(false);
    setIsChangePasswordOpen(true);
  }

  function handleLogout() {
    setShowMobileActions(false);
    setShowMonthPicker(false);
    logout();
    setIsUserMenuOpen(false);
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isUserMenuOpen]);

  const avatarLabel = user?.name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart.charAt(0).toUpperCase())
    .join("") || "US";
  
  return (
    <>
    <header className={`header ${isUserMenuOpen || showMonthPicker ? "header-floating-open" : ""}`}>
      <div className="header-left">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
          aria-expanded={isSidebarOpen}
          title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          <span className="sidebar-toggle-icon" aria-hidden="true">
            {isSidebarOpen ? "✕" : "☰"}
          </span>
        </button>
        <h2 className="header-title">{title}</h2>
      </div>

      <div className="header-center">
        {month && onMonthChange && (
          <div className="month-navigator">
            <button
              className="month-btn"
              onClick={() => onMonthChange(getPreviousMonth(month))}
              title="Mês anterior"
            >
              ←
            </button>
            <div className="month-picker-wrapper">
              <span className="month-display">
                {formatMonthBR(month).charAt(0).toUpperCase() + formatMonthBR(month).slice(1)}
              </span>
              <button
                className="calendar-btn"
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                title="Selecionar mês e ano"
              >
                📅
              </button>
              
              {showMonthPicker && (
                <div className="month-picker-popup">
                  <div className="year-selector">
                    <button
                      className="year-nav-btn"
                      onClick={() => handleYearChange(currentYear - 1)}
                      title="Ano anterior"
                    >
                      ←
                    </button>
                    <span className="year-display">{currentYear}</span>
                    <button
                      className="year-nav-btn"
                      onClick={() => handleYearChange(currentYear + 1)}
                      title="Próximo ano"
                    >
                      →
                    </button>
                  </div>
                  
                  <div className="month-grid">
                    {months.map((monthName, index) => (
                      <button
                        key={monthName}
                        className={`month-option ${currentMonth === index + 1 ? "active" : ""}`}
                        onClick={() => handleMonthSelect(index + 1)}
                      >
                        {monthName.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              className="month-btn"
              onClick={() => onMonthChange(getNextMonth(month))}
              title="Próximo mês"
            >
              →
            </button>
          </div>
        )}
      </div>

      {showMonthPicker && (
        <button
          type="button"
          className="month-picker-overlay"
          onClick={() => setShowMonthPicker(false)}
          aria-label="Fechar seletor de mês"
        />
      )}

      <div className="header-right">
        <div className="header-actions-desktop">
          {showImportAction && <ImportTransactionsAction />}
          <Button onClick={handleOpenRevenue}>+ Receita</Button>
          <Button variant="danger" onClick={handleOpenExpense}>+ Despesa</Button>
          <Button variant="secondary" onClick={handleOpenTransfer}>+ Transferência</Button>
        </div>

        <RevenueModal
          isOpen={openRevenue}
          onClose={() => setOpenRevenue(false)}
        />

        <TransferModal
          isOpen={openTransfer}
          onClose={() => setOpenTransfer(false)}
        />

        <ExpenseModal
          isOpen={openExpense}
          onClose={() => setOpenExpense(false)}
        />

        <div className="header-user" ref={userMenuRef}>
          <button
            type="button"
            className="user-avatar-button"
            onClick={handleToggleUserMenu}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            title={user?.name ?? user?.email ?? "Usuário"}
          >
            <span className="user-avatar">{avatarLabel}</span>
          </button>

          {isUserMenuOpen && (
            <div className="user-menu" role="menu">
              <div className="user-menu-header">
                <strong>{user?.name ?? "Usuário"}</strong>
                <span>{user?.email ?? ""}</span>
              </div>
              <button
                type="button"
                className="user-menu-item"
                onClick={handleOpenProfile}
              >
                Editar Perfil
              </button>
              <button
                type="button"
                className="user-menu-item"
                onClick={handleOpenChangePassword}
              >
                Trocar Senha
              </button>
              <button
                type="button"
                className="user-menu-item danger"
                onClick={handleLogout}
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    {isProfileOpen && (
      <ProfileSettingsModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    )}

    {isChangePasswordOpen && (
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    )}

    <button
      type="button"
      className={`mobile-actions-backdrop ${showMobileActions ? "visible" : ""}`}
      onClick={() => setShowMobileActions(false)}
      aria-label="Fechar ações rápidas"
    />

    <div className={`mobile-actions-panel ${showMobileActions ? "open" : ""}`}>
      {showImportAction && <ImportTransactionsAction compact />}
      <button type="button" className="mobile-action-button revenue" onClick={handleOpenRevenue}>
        <span aria-hidden="true">↑</span>
        <span>Receita</span>
      </button>
      <button type="button" className="mobile-action-button expense" onClick={handleOpenExpense}>
        <span aria-hidden="true">↓</span>
        <span>Despesa</span>
      </button>
      <button type="button" className="mobile-action-button transfer" onClick={handleOpenTransfer}>
        <span aria-hidden="true">⇄</span>
        <span>Transferência</span>
      </button>
    </div>

    <button
      type="button"
      className={`mobile-fab ${showMobileActions ? "open" : ""}`}
      onClick={() => setShowMobileActions((current) => !current)}
      aria-label={showMobileActions ? "Fechar ações rápidas" : "Abrir ações rápidas"}
    >
      {showMobileActions ? "✕" : "+"}
    </button>

    <button
      type="button"
      className={`user-menu-backdrop ${isUserMenuOpen ? "visible" : ""}`}
      onClick={() => setIsUserMenuOpen(false)}
      aria-label="Fechar menu do usuário"
    />
    </>
  );
}
