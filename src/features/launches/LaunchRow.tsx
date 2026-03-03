import type { LaunchRow as LaunchRowType } from "./types";

import "./LaunchRow.css";
import { isTransactionType } from "../../utils/sortUtils";

type LaunchRowProps = {
  row: LaunchRowType;
  onEdit: (row: LaunchRowType) => void;
};

export default function LaunchRow({row, onEdit}: LaunchRowProps) {

  return (
    <div className={`launch-row ${row.type}`} onClick={() => {
      onEdit(row);
      console.log("Clicou na linha", row);
    }}>
      <span className="col-description">
        {isTransactionType(row.type, "transfer") ? (
          "⇄ Transferência"
        )  : (
          <span
            className="value-display"            
          >
            {row.description}
          </span>
        )}
      </span>

      <span className="col-account">
        {isTransactionType(row.type, "transfer") ? (
            <span
              className="transfer-display"              
            >
              {row.fromAccount?.name ?? "—"} → {row.toAccount?.name ?? "—"}
            </span>
          )
         : (
          <span
            className="account-display"            
          >
            {row.account?.name ?? "Selecionar"}
          </span>
        )}
      </span>

      <span className="col-category">
        {isTransactionType(row.type, "transfer") ? (
          "—"
        ) : (
          <span
            className="category-display"            
          >
            {row.category?.name ?? "Selecionar"}
          </span>
        )}
      </span>

      <span className="col-value">
        {(
          <span
            className="value-display"            
          >
            {formatValue(row)}
          </span>
        )}
      </span>      
    </div>
  );
}

function formatValue(row: LaunchRowType) {
  const value = row.value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  if (isTransactionType(row.type, "income")) return `+ ${value}`;
  if (isTransactionType(row.type, "expense")) return `- ${value}`;
  return value;
}
