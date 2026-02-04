import type { LaunchRow as LaunchRowType } from "./types";

type LaunchRowProps = {
  row: LaunchRowType;
};

export default function LaunchRow({ row }: LaunchRowProps) {
  return (
    <div className={`launch-row ${row.type}`}>
      <span className="col-description">
        {row.type === "transfer"
          ? "⇄ Transferência"
          : row.description}
      </span>

      <span className="col-account">
        {renderAccount(row)}
      </span>

      <span className="col-category">
        {row.category?.name ?? "—"}
      </span>

      <span className="col-value">
        {formatValue(row)}
      </span>
    </div>
  );
}

function renderAccount(row: LaunchRowType) {
  if (row.type === "transfer") {
    return `${row.fromAccount?.name} → ${row.toAccount?.name}`;
  }
  return row.account?.name ?? "—";
}

function formatValue(row: LaunchRowType) {
  const value = row.value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  if (row.type === "income") return `+ ${value}`;
  if (row.type === "expense") return `- ${value}`;
  return value;
}
