import type { LaunchRow, LaunchType } from "../launches/types";
import { isTransactionType } from "../../utils/sortUtils";
import type { PeriodMode } from "../../contexts/period.types";
import "./MonthlyComparisonChart.css";

type MonthlyComparisonChartProps = {
  launches: LaunchRow[];
  month: string;
  periodMode?: PeriodMode;
  type: Extract<LaunchType, "expense" | "income">;
};

function getPreviousPeriod(month: string, periodMode: PeriodMode): string {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);

  if (periodMode === "yearly") {
    return `${year - 1}-${monthText}`;
  }

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

function formatPeriodLabel(month: string, periodMode: PeriodMode): string {
  const [yearText, monthText] = month.split("-");

  if (periodMode === "yearly") {
    return `Ano de ${yearText}`;
  }

  const date = new Date(Number(yearText), Number(monthText) - 1, 1);

  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function sumByMonth(
  launches: LaunchRow[],
  month: string,
  periodMode: PeriodMode,
  type: Extract<LaunchType, "expense" | "income">,
): number {
  const periodPrefix = periodMode === "yearly" ? `${month.slice(0, 4)}-` : month;

  return launches
    .filter((launch) => {
      const launchMonth = launch.date.slice(0, 7);

      return (
        launchMonth.startsWith(periodPrefix) &&
        isTransactionType(launch.type, type) &&
        !isTransactionType(launch.type, "transfer")
      );
    })
    .reduce((sum, launch) => sum + Math.abs(launch.value), 0);
}

export default function MonthlyComparisonChart({
  launches,
  month,
  periodMode = "monthly",
  type,
}: Readonly<MonthlyComparisonChartProps>) {
  const previousMonth = getPreviousPeriod(month, periodMode);
  const currentValue = sumByMonth(launches, month, periodMode, type);
  const previousValue = sumByMonth(launches, previousMonth, periodMode, type);
  const maxValue = Math.max(currentValue, previousValue, 1);
  const currentProgress = currentValue / maxValue;
  const previousProgress = previousValue / maxValue;
  const chartLabel = type === "expense" ? "Despesas" : "Proventos";
  const chartModifier = type === "expense" ? "expense" : "income";
  const currentMonthLabel = formatPeriodLabel(month, periodMode);
  const previousMonthLabel = formatPeriodLabel(previousMonth, periodMode);
  const centerLabel = periodMode === "yearly" ? "Ano atual" : "Mês atual";
  const subtitle = periodMode === "yearly" ? "Ano selecionado x anterior" : "Mês atual x anterior";
  const previousLabel = periodMode === "yearly" ? "Ano anterior" : "Mês anterior";

  return (
    <div className={`monthly-comparison monthly-comparison-${chartModifier}`}>
      <div className="monthly-comparison-header">
        <span className="monthly-comparison-kicker">{chartLabel}</span>
        <span className="monthly-comparison-subtitle">{subtitle}</span>
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
          <span className="monthly-comparison-center-label">{centerLabel}</span>
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
          <span className="monthly-comparison-stat-label">{previousLabel}</span>
          <span className="monthly-comparison-stat-month">{previousMonthLabel}</span>
          <strong>{formatCurrency(previousValue)}</strong>
        </div>
      </div>
    </div>
  );
}