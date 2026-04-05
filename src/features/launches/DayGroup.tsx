import type { DayGroup as DayGroupType, LaunchRow as LaunchRowType } from "./types";
import { formatDateBR } from "../../utils/date";
import LaunchRow from "./LaunchRow";

type DayGroupProps = {
  day: DayGroupType;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectedLaunchIds: string[];
  onToggleLaunchSelection: (rowId: string, checked: boolean) => void;
  onEdit: (row: LaunchRowType) => void;
  onDelete: (row: LaunchRowType) => void;
};

export default function DayGroup({
  day,
  isCollapsed,
  onToggleCollapse,
  selectedLaunchIds,
  onToggleLaunchSelection,
  onEdit,
  onDelete,
}: Readonly<DayGroupProps>) {
  const formattedDayBalance = day.dayBalance.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="day-group">
      {/* HEADER DO DIA */}
      <button
        type="button"
        className="day-header"
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
      >
        <span className="day-header-main">
          <span className="day-date">{formatDateBR(day.date)}</span>
          {isCollapsed && <span className="day-collapsed-balance">{formattedDayBalance}</span>}
        </span>
        <span className="day-header-meta">
          <span className="day-count">
            {day.rows.length} {day.rows.length === 1 ? "lançamento" : "lançamentos"}
          </span>
          <span className="day-toggle-indicator" aria-hidden="true">
            {isCollapsed ? "+" : "-"}
          </span>
        </span>
      </button>

      {!isCollapsed && (
        <>
          {/* LANÇAMENTOS DO DIA */}
          <div className="day-rows">
            {day.rows.map((row) => (
              <LaunchRow
                key={row.id}
                row={row}
                isSelected={selectedLaunchIds.includes(row.id)}
                onToggleSelection={onToggleLaunchSelection}
                onEdit={(currentRow) => {
                  onEdit(currentRow);
                }}
                onDelete={onDelete}
              />
            ))}
          </div>

          {/* SALDO ACUMULADO DO DIA */}
          <div className="day-footer">
            <span>Saldo do dia</span>
            <strong>{formattedDayBalance}</strong>
          </div>
        </>
      )}
    </div>
  );
}



