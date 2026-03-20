import { useState } from "react";
import type { LaunchRow, LaunchTableData } from "./types";
import DayGroup from "./DayGroup";
import { formatMonthBR } from "../../utils/date";
import "./LauncheTable.css";


type LaunchTableProps = {
  data: LaunchTableData;
  ignoreHistoricalBalance: boolean;
  onIgnoreHistoricalBalanceChange: (checked: boolean) => void;
  onEdit: (row: LaunchRow) => void;
  onDelete: (row: LaunchRow) => void;
};

export default function LaunchTable({
  data,
  ignoreHistoricalBalance,
  onIgnoreHistoricalBalanceChange,
  onEdit,
  onDelete,
}: Readonly<LaunchTableProps>) {
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const allDaysCollapsed = data.days.length > 0 && data.days.every((day) => collapsedDays[day.date]);

  function handleToggleAllDays() {
    setCollapsedDays(
      data.days.reduce<Record<string, boolean>>((accumulator, day) => {
        accumulator[day.date] = !allDaysCollapsed;
        return accumulator;
      }, {}),
    );
  }

  function handleToggleDay(dayDate: string) {
    setCollapsedDays((current) => ({
      ...current,
      [dayDate]: !current[dayDate],
    }));
  }

  return (
    <div className="launch-table">
      <div className="launch-table-header">
        <h2>{formatMonthBR(data.month)}</h2>
        <div className="opening-balance-group">
          <div className="opening-balance-row">
            <span className="opening-balance">
              Saldo inicial:{" "}
              {data.openingBalance.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>

            <label className="opening-balance-toggle">
              <input
                type="checkbox"
                checked={ignoreHistoricalBalance}
                onChange={(event) => onIgnoreHistoricalBalanceChange(event.target.checked)}
              />
              <span>Ocultar saldo do mês anterior</span>
            </label>
          </div>
          <button type="button" className="collapse-all-button" onClick={handleToggleAllDays}>
            {allDaysCollapsed ? "Expandir todos" : "Recolher todos"}
          </button>
        </div>
      </div>

      {data.days.map(day => (
        <DayGroup
          key={day.date}
          day={day}
          isCollapsed={!!collapsedDays[day.date]}
          onToggleCollapse={() => handleToggleDay(day.date)}
          onEdit={(row) => {
            onEdit(row);
            console.log("Editando lançamento", row);
          }}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}