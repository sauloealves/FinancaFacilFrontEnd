import { useEffect, useRef, useState } from "react";
import Button from "../../ui/Button/Button";
import "./Header.css";
import RevenueModal from "../../../features/revenue/RevenueModal";
import ExpenseModal from '../../../features/expense/expenseModal';
import TransferModal from '../../../features/transfer/TransferModal';
import ImportTransactionsAction from "../../../features/import/ImportTransactionsAction";
import FailedTransactionsModal from "../../../features/launches/FailedTransactionsModal";
import ProfileSettingsModal from "../../../features/profile/ProfileSettingsModal";
import ChangePasswordModal from "../../../features/profile/ChangePasswordModal";
import { formatMonthBR } from "../../../utils/date";
import { useAuth } from "../../../contexts/auth/AuthContext";
import { useLaunches } from "../../../contexts/launches/useLaunches";
import { useTheme } from "../../../contexts/theme/useTheme";
import { useNavigate } from "react-router-dom";
import type { PeriodMode } from "../../../contexts/period.types";

const themeToggleLabels = {
  dark: "Ativar tema claro",
  light: "Ativar tema escuro",
} as const;

const themeToggleIcons = {
  dark: "☀",
  light: "☾",
} as const;

type HeaderProps = {
  title?: string;
  month?: string;
  periodMode?: PeriodMode;
  onPeriodChange?: (period: { mode: PeriodMode; month: string }) => void;
  showImportAction?: boolean;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

function buildMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

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
  periodMode = "monthly",
  onPeriodChange,
  showImportAction = false,
  isSidebarOpen,
  isSidebarCollapsed,
  onToggleSidebar,
}: Readonly<HeaderProps>) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { failedTransactions } = useLaunches();
  const { theme, toggleTheme } = useTheme();
  const [openRevenue, setOpenRevenue] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isFailedTransactionsOpen, setIsFailedTransactionsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pendingFailedTransactionsCount = failedTransactions.length;
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  
  const currentYear = month ? Number.parseInt(month.split("-")[0], 10) : new Date().getFullYear();
  const currentMonth = month ? Number.parseInt(month.split("-")[1], 10) : new Date().getMonth() + 1;
  const [draftYear, setDraftYear] = useState(currentYear);
  const [draftMonth, setDraftMonth] = useState(currentMonth);
  const [draftMode, setDraftMode] = useState<PeriodMode>(periodMode);
  
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const themeToggleLabel = themeToggleLabels[theme];
  const themeToggleIcon = themeToggleIcons[theme];

  useEffect(() => {
    setDraftYear(currentYear);
    setDraftMonth(currentMonth);
    setDraftMode(periodMode);
  }, [currentMonth, currentYear, periodMode]);
  
  const handleMonthSelect = (selectedMonth: number) => {
    setDraftMonth(selectedMonth);
    setDraftMode("monthly");
  };
  
  const handleYearChange = (year: number) => {
    setDraftYear(year);
  };

  const handleApplyPeriod = () => {
    if (onPeriodChange) {
      onPeriodChange({
        mode: draftMode,
        month: buildMonthKey(draftYear, draftMonth),
      });
      setShowMonthPicker(false);
    }
  };

  const handleCurrentPeriod = () => {
    if (onPeriodChange) {
      onPeriodChange({
        mode: "monthly",
        month: buildMonthKey(todayYear, todayMonth),
      });
      setShowMonthPicker(false);
    }
  };

  const handlePreviousPeriod = () => {
    if (!month || !onPeriodChange) return;

    if (periodMode === "yearly") {
      onPeriodChange({
        mode: "yearly",
        month: buildMonthKey(currentYear - 1, currentMonth),
      });
      return;
    }

    onPeriodChange({ mode: "monthly", month: getPreviousMonth(month) });
  };

  const handleNextPeriod = () => {
    if (!month || !onPeriodChange) return;

    if (periodMode === "yearly") {
      onPeriodChange({
        mode: "yearly",
        month: buildMonthKey(currentYear + 1, currentMonth),
      });
      return;
    }

    onPeriodChange({ mode: "monthly", month: getNextMonth(month) });
  };

  const formattedPeriodLabel = periodMode === "yearly"
    ? `Ano de ${currentYear}`
    : `${formatMonthBR(month ?? buildMonthKey(currentYear, currentMonth)).charAt(0).toUpperCase()}${formatMonthBR(month ?? buildMonthKey(currentYear, currentMonth)).slice(1)}`;

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

  function handleOpenFailedTransactions() {
    setShowMobileActions(false);
    setShowMonthPicker(false);
    setIsUserMenuOpen(false);
    setIsFailedTransactionsOpen(true);
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
        {month && onPeriodChange && (
          <div className="month-navigator">
            <button
              className="month-btn"
              onClick={handlePreviousPeriod}
              title={periodMode === "yearly" ? "Ano anterior" : "Mês anterior"}
            >
              ←
            </button>
            <div className="month-picker-wrapper">
              <span className="month-display">
                {formattedPeriodLabel}
              </span>
              <button
                className="calendar-btn"
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                title="Selecionar período"
              >
                📅
              </button>
              
              {showMonthPicker && (
                <div className="month-picker-popup">
                  <div className="year-selector">
                    <button
                      className="year-nav-btn"
                      onClick={() => handleYearChange(draftYear - 1)}
                      title="Ano anterior"
                    >
                      ←
                    </button>
                    <span className="year-display">{draftYear}</span>
                    <button
                      className="year-nav-btn"
                      onClick={() => handleYearChange(draftYear + 1)}
                      title="Próximo ano"
                    >
                      →
                    </button>
                  </div>
                  
                  <div className="month-grid">
                    {months.map((monthName, index) => (
                      <button
                        key={monthName}
                        className={`month-option ${draftMode === "monthly" && draftMonth === index + 1 ? "active" : ""}`}
                        onClick={() => handleMonthSelect(index + 1)}
                      >
                        {monthName.substring(0, 3)}
                      </button>
                    ))}
                  </div>

                  <div className="month-picker-actions">
                    <Button variant="secondary" onClick={handleCurrentPeriod}>
                      Período Atual
                    </Button>
                    <Button onClick={handleApplyPeriod}>Ir</Button>
                  </div>
                </div>
              )}
            </div>
            <button
              className="month-btn"
              onClick={handleNextPeriod}
              title={periodMode === "yearly" ? "Próximo ano" : "Próximo mês"}
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
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
        >
          <span aria-hidden="true" className="theme-toggle-icon">
            {themeToggleIcon}
          </span>
        </button>

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
            <span className="user-avatar-shell">
              <span className="user-avatar">{avatarLabel}</span>
              {pendingFailedTransactionsCount > 0 && (
                <span className="user-notification-badge">
                  {pendingFailedTransactionsCount > 99 ? "99+" : pendingFailedTransactionsCount}
                </span>
              )}
            </span>
          </button>

          {isUserMenuOpen && (
            <div className="user-menu" role="menu">
              <div className="user-menu-header">
                <strong>{user?.name ?? "Usuário"}</strong>
                <span>{user?.email ?? ""}</span>
              </div>
              <button
                type="button"
                className="user-menu-item user-menu-item-with-badge"
                onClick={handleOpenFailedTransactions}
              >
                <span>Lançamentos pendentes</span>
                {pendingFailedTransactionsCount > 0 && (
                  <span className="user-menu-count-badge">{pendingFailedTransactionsCount}</span>
                )}
              </button>
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

    <FailedTransactionsModal
      isOpen={isFailedTransactionsOpen}
      onClose={() => setIsFailedTransactionsOpen(false)}
    />

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
