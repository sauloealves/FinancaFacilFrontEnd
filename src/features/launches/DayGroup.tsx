import type { DayGroup as DayGroupType, LaunchRow as LaunchRowType } from "./types";
import { formatDateBR } from "../../utils/date";
import LaunchRow from "./LaunchRow";

type DayGroupProps = {
    day: DayGroupType;
    onEdit: (row: LaunchRowType) => void;
  onDelete: (row: LaunchRowType) => void;
};

export default function DayGroup({ day, onEdit, onDelete }: Readonly<DayGroupProps>) {
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
          <LaunchRow 
            key={row.id}
            row={row}
            onEdit={(row) => {
              onEdit(row);
              console.log("Editando linha", row);
            }}
            onDelete={onDelete}
            />
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



