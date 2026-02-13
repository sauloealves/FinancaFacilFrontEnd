import type { LaunchRow, LaunchTableData } from "./types";
import DayGroup from "./DayGroup";
import { formatMonthBR } from "../../utils/date";
import "./LauncheTable.css";


type LaunchTableProps = {
  data: LaunchTableData;
  onEdit: (row: LaunchRow) => void;
};

export default function LaunchTable({ data, onEdit }: LaunchTableProps) {
  return (
    <div className="launch-table">
      <div className="launch-table-header">
        <h2>{formatMonthBR(data.month)}</h2>
        <span className="opening-balance">
          Saldo inicial:{" "}
          {data.openingBalance.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </span>
      </div>

      {data.days.map(day => (
        <DayGroup 
          key={day.date} 
          day={day}
          onEdit={(row) => {
            onEdit(row);
            console.log("Editando lançamento", row);
          }}
        />
      ))}
    </div>
  );
}