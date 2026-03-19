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
  return (
    <div className="launch-table">
      <div className="launch-table-header">
        <h2>{formatMonthBR(data.month)}</h2>
        <div className="opening-balance-group">
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
            <span>Saldo do mês anterior não incluso</span>
          </label>
        </div>
      </div>

      {data.days.map(day => (
        <DayGroup 
          key={day.date} 
          day={day}
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