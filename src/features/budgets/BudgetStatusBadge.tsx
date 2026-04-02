import type { BudgetHealth, BudgetStatus } from "./types";
import { getBudgetStatusLabel } from "./utils";

type BudgetStatusBadgeProps = {
  status?: BudgetStatus;
  health?: BudgetHealth;
};

export default function BudgetStatusBadge({ status, health }: Readonly<BudgetStatusBadgeProps>) {
  if (status) {
    return (
      <span className={`budget-badge budget-badge-status budget-badge-${status}`}>
        {getBudgetStatusLabel(status)}
      </span>
    );
  }

  return (
    <span className={`budget-badge budget-badge-health budget-badge-${health ?? "ok"}`}>
      {health === "over" ? "Estourado" : health === "warning" ? "Atenção" : "OK"}
    </span>
  );
}