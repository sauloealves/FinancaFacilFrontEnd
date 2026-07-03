import type { LaunchRow as LaunchRowType } from "./types";

import "./LaunchRow.css";
import { isTransactionType } from "../../utils/sortUtils";
import CategoryTagsTooltip from "../tags/CategoryTagsTooltip";

type LaunchRowProps = {
  row: LaunchRowType;
  isSelected: boolean;
  onToggleSelection: (rowId: string, checked: boolean) => void;
  onEdit: (row: LaunchRowType) => void;
  onDelete: (row: LaunchRowType) => void;
};

export default function LaunchRow({
  row,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
}: Readonly<LaunchRowProps>) {

  return (
    <div className={`launch-row ${row.type}`}>
      <span className="col-select">
        <input
          type="checkbox"
          checked={isSelected}
          aria-label={`Selecionar lançamento ${row.description}`}
          onChange={(event) => onToggleSelection(row.id, event.target.checked)}
          onClick={(event) => event.stopPropagation()}
        />
      </span>

      <button
        type="button"
        className="row-edit-trigger col-description"
        onClick={() => onEdit(row)}
      >
        <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isTransactionType(row.type, "transfer") ? (
            <>
              <span>⇄ Transferência</span>
              <span className="occurrence-tag transfer-tag">Transfer</span>
            </>
          )  : (
            <span className="value-display" style={{ marginRight: '8px' }}>
              {row.description}
            </span>
          )}
          
          {row.occurrenceType === "installment" && (
            <span className="occurrence-tag installment-tag">Parcelado</span>
          )}
          {row.occurrenceType === "recurring" && (
            <span className="occurrence-tag recurring-tag">Recorrente</span>
          )}
        </span>
      </button>

      <button
        type="button"
        className="row-edit-trigger col-account"
        onClick={() => onEdit(row)}
      >
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
      </button>

      <button
        type="button"
        className="row-edit-trigger col-category"
        onClick={() => onEdit(row)}
      >
        {isTransactionType(row.type, "transfer") ? (
          "—"
        ) : (
          <CategoryTagsTooltip categoryId={row.category?.id}>
            <span
              className="category-display"
            >
              {row.category?.name ?? "Selecionar"}
            </span>
          </CategoryTagsTooltip>
        )}
      </button>

      <button
        type="button"
        className="row-edit-trigger col-value"
        onClick={() => onEdit(row)}
      >
        {(
          <span
            className="value-display"            
          >
            {formatValue(row)}
          </span>
        )}
      </button>

      <span className="col-actions">
        <button
          type="button"
          className="row-action-button"
          title="Editar transação"
          aria-label="Editar transação"
          onClick={() => onEdit(row)}
        >
          ✏️
        </button>
        <button
          type="button"
          className="row-action-button delete-transaction-button"
          title="Excluir transação"
          aria-label="Excluir transação"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row);
          }}
        >
          🗑️
        </button>
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
