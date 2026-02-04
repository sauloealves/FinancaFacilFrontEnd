import type { DayGroup as DayGroupType } from "./types";
import { formatDateBR } from "../../utils/date";



import LaunchRow from "./LaunchRow";

type DayGroupProps = {
  day: DayGroupType;
};

export default function DayGroup({ day }: DayGroupProps) {
  return (
    <div className="day-group">
      {/* HEADER DO DIA */}
      <div className="day-header">
        <span className="day-date">
          {formatDateBR(day.date)}
        </span>
      </div>

      {/* LANÇAMENTOS DO DIA */}
      <div className="day-rows">
        {day.rows.map(row => (
          <LaunchRow key={row.id} row={row} />
        ))}
      </div>

      {/* SALDO ACUMULADO DO DIA */}
      <div className="day-footer">
        <span>Saldo do dia</span>
        <strong>
          {day.dayBalance.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </strong>
      </div>
    </div>
  );
}



