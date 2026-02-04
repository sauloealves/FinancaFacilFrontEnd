import type { LaunchTableData } from "./types";
import DayGroup from "./DayGroup";
import { formatMonthBR } from "../../utils/date";
import "./LauncheTable.css";


type LaunchTableProps = {
  data: LaunchTableData;
};

export default function LaunchTable({ data }: LaunchTableProps) {
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
        <DayGroup key={day.date} day={day} />
      ))}
    </div>
  );
}