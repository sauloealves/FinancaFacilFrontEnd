import { useState } from "react";
import Button from "../../ui/Button/Button";
import "./Header.css";
import RevenueModal from "../../../features/revenue/RevenueModal";
import ExpenseModal from '../../../features/expense/expenseModal';
import TransferModal from '../../../features/transfer/TransferModal';
import { formatMonthBR } from "../../../utils/date";

type HeaderProps = {
  title?: string;
  month?: string;
  onMonthChange?: (month: string) => void;
};

function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  let nextMonth = parseInt(month) + 1;
  let nextYear = parseInt(year);
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function getPreviousMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  let prevMonth = parseInt(month) - 1;
  let prevYear = parseInt(year);
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

export default function Header({ title = "Dashboard", month, onMonthChange }: HeaderProps) {
  const [openRevenue, setOpenRevenue] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
  const currentYear = month ? parseInt(month.split("-")[0]) : new Date().getFullYear();
  const currentMonth = month ? parseInt(month.split("-")[1]) : new Date().getMonth() + 1;
  
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
  
  return (
    <header className="header">
      {/* LEFT */}
      <div className="header-left">
        <h2 className="header-title">{title}</h2>
      </div>

      {/* CENTER */}
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
                        key={index}
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
        <div
          className="month-picker-overlay"
          onClick={() => setShowMonthPicker(false)}
        />
      )}

      {/* RIGHT */}
      <div className="header-right">
        <Button onClick={() => setOpenRevenue(true)}>+ Receita</Button>
        <Button variant="danger" onClick={() => setOpenExpense(true)}>+ Despesa</Button>
        <Button variant="secondary" onClick={() => setOpenTransfer(true)}>+ Transferência</Button>

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
  );
}
