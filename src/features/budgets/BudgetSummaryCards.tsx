import { Card } from "../../components/ui";
import type { BudgetSummary } from "./types";
import { formatCurrency } from "./utils";

type BudgetSummaryCardsProps = {
  summary: BudgetSummary;
};

export default function BudgetSummaryCards({ summary }: Readonly<BudgetSummaryCardsProps>) {
  const cards = [
    {
      label: "Total Planejado",
      value: summary.totalPlanned,
      tone: "neutral",
    },
    {
      label: "Total Realizado",
      value: summary.totalRealized,
      tone: "negative",
    },
    {
      label: "Saldo",
      value: summary.balance,
      tone: summary.balance < 0 ? "negative" : "positive",
    },
  ] as const;

  return (
    <div className="budget-summary-grid">
      {cards.map((card) => (
        <Card key={card.label}>
          <div className="budget-summary-card">
            <span className="budget-summary-label">{card.label}</span>
            <strong className={`budget-summary-value budget-summary-value-${card.tone}`}>
              {formatCurrency(card.value)}
            </strong>
          </div>
        </Card>
      ))}
    </div>
  );
}