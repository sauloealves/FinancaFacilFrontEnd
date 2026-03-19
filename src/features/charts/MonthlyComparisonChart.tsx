import type { LaunchRow, LaunchType } from "../launches/types";
import { isTransactionType } from "../../utils/sortUtils";
import "./MonthlyComparisonChart.css";

type MonthlyComparisonChartProps = {
  launches: LaunchRow[];
  month: string;
  type: Extract<LaunchType, "expense" | "income">;
};

function getPreviousMonth(month: string): string {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);

  if (monthNumber > 1) {
    return `${year}-${String(monthNumber - 1).padStart(2, "0")}`;
  }

  return `${year - 1}-12`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatMonthLabel(month: string): string {
  const [yearText, monthText] = month.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);

  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function sumByMonth(
  launches: LaunchRow[],
  month: string,
  type: Extract<LaunchType, "expense" | "income">,
): number {
  return launches
    .filter((launch) => {
      const launchMonth = launch.date.slice(0, 7);

      return (
        launchMonth === month &&
        isTransactionType(launch.type, type) &&
        !isTransactionType(launch.type, "transfer")
      );
    })
    .reduce((sum, launch) => sum + Math.abs(launch.value), 0);
}

export default function MonthlyComparisonChart({
  launches,
  month,
  type,
}: Readonly<MonthlyComparisonChartProps>) {
  const previousMonth = getPreviousMonth(month);
  const currentValue = sumByMonth(launches, month, type);
  const previousValue = sumByMonth(launches, previousMonth, type);
  const maxValue = Math.max(currentValue, previousValue, 1);
  const currentProgress = currentValue / maxValue;
  const previousProgress = previousValue / maxValue;
  const chartLabel = type === "expense" ? "Despesas" : "Proventos";
  const chartModifier = type === "expense" ? "expense" : "income";
  const currentMonthLabel = formatMonthLabel(month);
  const previousMonthLabel = formatMonthLabel(previousMonth);

  return (
    <div className={`monthly-comparison monthly-comparison-${chartModifier}`}>
      <div className="monthly-comparison-header">
        <span className="monthly-comparison-kicker">{chartLabel}</span>
        <span className="monthly-comparison-subtitle">Mês atual x anterior</span>
      </div>

      <div className="monthly-comparison-visual">
        <div
          className="monthly-comparison-ring monthly-comparison-ring-outer"
          style={{ ["--progress" as string]: `${currentProgress}` }}
          aria-hidden="true"
        />
        <div
          className="monthly-comparison-ring monthly-comparison-ring-inner"
          style={{ ["--progress" as string]: `${previousProgress}` }}
          aria-hidden="true"
        />

        <div className="monthly-comparison-center">
          <span className="monthly-comparison-center-label">Mês atual</span>
          <strong className="monthly-comparison-center-value">
            {formatCurrency(currentValue)}
          </strong>
        </div>
      </div>

      <div className="monthly-comparison-footer">
        <div className="monthly-comparison-stat current">
          <span className="monthly-comparison-stat-label">Selecionado</span>
          <span className="monthly-comparison-stat-month">{currentMonthLabel}</span>
          <strong>{formatCurrency(currentValue)}</strong>
        </div>

        <div className="monthly-comparison-stat previous">
          <span className="monthly-comparison-stat-label">Mês anterior</span>
          <span className="monthly-comparison-stat-month">{previousMonthLabel}</span>
          <strong>{formatCurrency(previousValue)}</strong>
        </div>
      </div>
    </div>
  );
}