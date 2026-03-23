import { useState } from "react";
import Button from "../../ui/Button/Button";
import "./Header.css";
import RevenueModal from "../../../features/revenue/RevenueModal";
import ExpenseModal from '../../../features/expense/expenseModal';
import TransferModal from '../../../features/transfer/TransferModal';
import ImportTransactionsAction from "../../../features/import/ImportTransactionsAction";
import { formatMonthBR } from "../../../utils/date";

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
  const [openRevenue, setOpenRevenue] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  
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
  
  return (
    <>
    <header className="header">
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

        <div className="header-user">
          <span className="user-avatar">SA</span>
        </div>
      </div>
    </header>

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
    </>
  );
}
