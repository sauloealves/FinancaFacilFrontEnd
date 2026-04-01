import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAccounts } from "../contexts/accounts/useAccounts";
import { useAccountFilter } from "../contexts/AccountFilterContext";
import { useCategories } from "../contexts/categories/useCategories";
import { useTheme } from "../contexts/theme/useTheme";
import { getLaunches } from "../services/launchService";
import { normalizeDateFromBackend, formatDateBR } from "../utils/date";
import { isTransactionType } from "../utils/sortUtils";
import type { LaunchRow, LaunchType } from "../features/launches/types";
import "./ReportComparisonPage.css";

type ComparisonType = Extract<LaunchType, "expense" | "income">;

type ComparisonPeriod = {
  id: string;
  startDate: string;
  endDate: string;
};

type ComparisonFilters = {
  type: ComparisonType;
  periods: ComparisonPeriod[];
};

type ComparisonSeries = {
  id: string;
  label: string;
  rangeLabel: string;
  total: number;
  color: string;
  transactionCount: number;
};

type ComparisonChartRow = {
  category: string;
  total: number;
} & Record<string, string | number>;

type ComparisonModel = {
  rows: ComparisonChartRow[];
  series: ComparisonSeries[];
};

const CHART_COLORS = [
  "#2563eb",
  "#0f766e",
  "#ea580c",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#65a30d",
  "#d97706",
  "#db2777",
  "#4f46e5",
  "#059669",
  "#9333ea",
];

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildPeriodId(): string {
  return `period-${globalThis.crypto.randomUUID()}`;
}

function toMonthStart(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function toMonthEnd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  ).padStart(2, "0")}`;
}

function shiftMonth(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function createDefaultPeriods(): ComparisonPeriod[] {
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonth = shiftMonth(currentMonth, -1);

  return [
    {
      id: buildPeriodId(),
      startDate: toMonthStart(previousMonth),
      endDate: toMonthEnd(previousMonth),
    },
    {
      id: buildPeriodId(),
      startDate: toMonthStart(currentMonth),
      endDate: toMonthEnd(currentMonth),
    },
  ];
}

function validatePeriods(periods: ComparisonPeriod[]): string {
  if (periods.length < 2) {
    return "Selecione pelo menos 2 períodos para comparar.";
  }

  if (periods.length > 12) {
    return "Selecione no máximo 12 períodos para comparar.";
  }

  for (const [index, period] of periods.entries()) {
    if (!period.startDate || !period.endDate) {
      return `Preencha a data inicial e final do período ${index + 1}.`;
    }

    if (period.endDate < period.startDate) {
      return `No período ${index + 1}, a data final deve ser maior ou igual à data inicial.`;
    }
  }

  return "";
}

function normalizeLaunches(launches: LaunchRow[]): LaunchRow[] {
  return launches.map((launch) => ({
    ...launch,
    date: normalizeDateFromBackend(launch.date),
  }));
}

function enrichLaunch(
  launch: LaunchRow,
  accounts: Array<{ id: string; name: string }>,
  categories: Array<{ id: string; name: string }>
): LaunchRow {
  const findAccountName = (id?: string) => accounts.find((account) => account.id === id)?.name;
  const findCategoryName = (id?: string) => categories.find((category) => category.id === id)?.name;

  return {
    ...launch,
    account: launch.account?.id
      ? { id: launch.account.id, name: launch.account.name ?? findAccountName(launch.account.id) ?? "Conta" }
      : launch.account,
    fromAccount: launch.fromAccount?.id
      ? { id: launch.fromAccount.id, name: launch.fromAccount.name ?? findAccountName(launch.fromAccount.id) ?? "Conta" }
      : launch.fromAccount,
    toAccount: launch.toAccount?.id
      ? { id: launch.toAccount.id, name: launch.toAccount.name ?? findAccountName(launch.toAccount.id) ?? "Conta" }
      : launch.toAccount,
    category: launch.category?.id
      ? { id: launch.category.id, name: launch.category.name ?? findCategoryName(launch.category.id) ?? "Sem categoria" }
      : launch.category,
  };
}

function filterLaunchesBySelectedAccounts(launches: LaunchRow[], selectedAccounts: string[]): LaunchRow[] {
  if (selectedAccounts.length === 0) {
    return launches;
  }

  return launches.filter((launch) => {
    if (isTransactionType(launch.type, "transfer")) {
      return (
        selectedAccounts.includes(launch.fromAccount?.id ?? "") ||
        selectedAccounts.includes(launch.toAccount?.id ?? "")
      );
    }

    return selectedAccounts.includes(launch.account?.id ?? "");
  });
}

function buildRangeLabel(period: ComparisonPeriod): string {
  return `${formatDateBR(period.startDate)} até ${formatDateBR(period.endDate)}`;
}

function getDateBounds(periods: ComparisonPeriod[]) {
  const startDate = periods
    .map((period) => period.startDate)
    .sort((left, right) => left.localeCompare(right))[0] ?? "";
  const endDate = periods
    .map((period) => period.endDate)
    .sort((left, right) => left.localeCompare(right))
    .at(-1) ?? "";

  return { startDate, endDate };
}

function getPeriodLaunches(launches: LaunchRow[], period: ComparisonPeriod): LaunchRow[] {
  return launches.filter((launch) => {
    return launch.date >= period.startDate && launch.date <= period.endDate;
  });
}

function getCategoryName(launch: LaunchRow): string {
  return launch.category?.name ?? "Sem categoria";
}

function buildComparisonData(periods: ComparisonPeriod[], launches: LaunchRow[]): ComparisonModel {
  const categoryMap = new Map<string, Record<string, number>>();

  const series = periods.map((period, index) => {
    const periodLaunches = getPeriodLaunches(launches, period);
    const total = periodLaunches.reduce((sum, launch) => sum + Math.abs(launch.value), 0);

    for (const launch of periodLaunches) {
      const categoryName = getCategoryName(launch);
      const existingTotals = categoryMap.get(categoryName) ?? {};

      existingTotals[period.id] = (existingTotals[period.id] ?? 0) + Math.abs(launch.value);
      categoryMap.set(categoryName, existingTotals);
    }

    return {
      id: period.id,
      label: `Período ${index + 1}`,
      rangeLabel: buildRangeLabel(period),
      total,
      color: CHART_COLORS[index % CHART_COLORS.length],
      transactionCount: periodLaunches.length,
    } satisfies ComparisonSeries;
  });

  const rows = Array.from(categoryMap.entries())
    .map(([category, categoryTotals]) => {
      const row: ComparisonChartRow = {
        category,
        total: 0,
      };

      for (const period of series) {
        const value = categoryTotals[period.id] ?? 0;
        row[period.id] = value;
        row.total += value;
      }

      return row;
    })
    .filter((row) => row.total > 0)
    .sort((left, right) => right.total - left.total);

  return { rows, series };
}

export default function ReportComparisonPage() {
  const { theme } = useTheme();
  const { accounts } = useAccounts();
  const { selectedAccounts } = useAccountFilter();
  const { categories } = useCategories();
  const [draftType, setDraftType] = useState<ComparisonType>("expense");
  const [draftPeriods, setDraftPeriods] = useState<ComparisonPeriod[]>(() => createDefaultPeriods());
  const [appliedFilters, setAppliedFilters] = useState<ComparisonFilters>({
    type: "expense",
    periods: createDefaultPeriods(),
  });
  const [validationError, setValidationError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonModel>({ rows: [], series: [] });

  useEffect(() => {
    let mounted = true;

    async function loadComparisonData() {
      setLoading(true);
      setLoadError("");

      try {
        const { startDate, endDate } = getDateBounds(appliedFilters.periods);

        const launches = await getLaunches({ startDate, endDate });
        const normalizedLaunches = normalizeLaunches(launches);
        const enrichedLaunches = normalizedLaunches.map((launch) => enrichLaunch(launch, accounts, categories));
        const accountFilteredLaunches = filterLaunchesBySelectedAccounts(enrichedLaunches, selectedAccounts);
        const typeFilteredLaunches = accountFilteredLaunches.filter((launch) => {
          return (
            isTransactionType(launch.type, appliedFilters.type) &&
            !isTransactionType(launch.type, "transfer")
          );
        });
        const nextData = buildComparisonData(appliedFilters.periods, typeFilteredLaunches);

        if (mounted) {
          setComparisonData(nextData);
        }
      } catch (error) {
        console.error(error);
        if (mounted) {
          setComparisonData({ rows: [], series: [] });
          setLoadError("Não foi possível carregar os dados do gráfico comparativo.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadComparisonData();

    return () => {
      mounted = false;
    };
  }, [appliedFilters, selectedAccounts, accounts, categories]);

  const chartTitle = draftType === "expense" ? "Comparativo de despesas" : "Comparativo de receitas";
  const maxPeriodsReached = draftPeriods.length >= 12;
  const minPeriodsReached = draftPeriods.length <= 2;
  const totalCompared = useMemo(() => {
    return comparisonData.series.reduce((sum, item) => sum + item.total, 0);
  }, [comparisonData]);
  const comparedCategoryCount = comparisonData.rows.length;
  const chartHeight = Math.max(360, comparisonData.rows.length * Math.max(52, comparisonData.series.length * 16 + 22));
  const axisColor = theme === "dark" ? "#cbd5e1" : "#475569";
  const gridColor = theme === "dark" ? "#334155" : "#d1d5db";
  const tooltipStyle = useMemo(
    () => ({
      backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
      border: `1px solid ${theme === "dark" ? "#334155" : "#d1d5db"}`,
      borderRadius: 12,
      color: theme === "dark" ? "#f8fafc" : "#0f172a",
      boxShadow: theme === "dark" ? "0 18px 40px rgba(2, 8, 23, 0.42)" : "0 18px 40px rgba(15, 23, 42, 0.12)",
    }),
    [theme]
  );

  function handlePeriodChange(periodId: string, field: "startDate" | "endDate", value: string) {
    setDraftPeriods((current) =>
      current.map((period) =>
        period.id === periodId
          ? { ...period, [field]: value }
          : period
      )
    );
  }

  function handleAddPeriod() {
    if (maxPeriodsReached) {
      return;
    }

    const referencePeriod = draftPeriods.at(-1);

    setDraftPeriods((current) => [
      ...current,
      {
        id: buildPeriodId(),
        startDate: referencePeriod?.startDate ?? "",
        endDate: referencePeriod?.endDate ?? "",
      },
    ]);
  }

  function handleRemovePeriod(periodId: string) {
    if (minPeriodsReached) {
      return;
    }

    setDraftPeriods((current) => current.filter((period) => period.id !== periodId));
  }

  function handleApplyFilters() {
    const errorMessage = validatePeriods(draftPeriods);

    if (errorMessage) {
      setValidationError(errorMessage);
      return;
    }

    setValidationError("");
    setAppliedFilters({
      type: draftType,
      periods: draftPeriods.map((period) => ({ ...period })),
    });
  }

  return (
    <div className="report-comparison-page">
      <div className="comparison-toolbar">
        <div className="report-type">Gráfico comparativo</div>

        <div className="comparison-type-switch" role="tablist" aria-label="Tipo do comparativo">
          <button
            type="button"
            className={`comparison-type-button ${draftType === "expense" ? "active expense" : ""}`}
            onClick={() => setDraftType("expense")}
          >
            Despesa
          </button>
          <button
            type="button"
            className={`comparison-type-button ${draftType === "income" ? "active income" : ""}`}
            onClick={() => setDraftType("income")}
          >
            Receita
          </button>
        </div>

        <div className="comparison-actions">
          <button
            type="button"
            className="apply-btn"
            onClick={handleAddPeriod}
            disabled={maxPeriodsReached}
          >
            Adicionar período
          </button>
          <button type="button" className="apply-btn comparison-apply-btn" onClick={handleApplyFilters}>
            Comparar
          </button>
        </div>
      </div>

      <div className="comparison-periods-panel">
        <div className="comparison-panel-header">
          <div>
            <h2>{chartTitle}</h2>
            <p>Selecione entre 2 e 12 períodos. Transferências são ignoradas automaticamente.</p>
          </div>
          <span className="comparison-period-counter">{draftPeriods.length}/12 períodos</span>
        </div>

        <div className="comparison-period-grid">
          {draftPeriods.map((period, index) => (
            <div key={period.id} className="comparison-period-card">
              <div className="comparison-period-card-header">
                <strong>Período {index + 1}</strong>
                <button
                  type="button"
                  className="comparison-remove-btn"
                  onClick={() => handleRemovePeriod(period.id)}
                  disabled={minPeriodsReached}
                >
                  Remover
                </button>
              </div>

              <label>
                <span>Data inicial</span>
                <input
                  type="date"
                  value={period.startDate}
                  onChange={(event) => handlePeriodChange(period.id, "startDate", event.target.value)}
                />
              </label>

              <label>
                <span>Data final</span>
                <input
                  type="date"
                  value={period.endDate}
                  onChange={(event) => handlePeriodChange(period.id, "endDate", event.target.value)}
                />
              </label>
            </div>
          ))}
        </div>

        {validationError && <p className="comparison-feedback error">{validationError}</p>}
      </div>

      <div className="comparison-chart-panel">
        <div className="comparison-chart-header">
          <div>
            <h2>{appliedFilters.type === "expense" ? "Despesas por categoria" : "Receitas por categoria"}</h2>
            <p>
              Total consolidado dos períodos selecionados: {formatCurrency(totalCompared)}
              {" • "}
              {comparedCategoryCount} categoria(s) comparada(s)
            </p>
          </div>
        </div>

        {loading && <div className="comparison-feedback">Carregando gráfico comparativo...</div>}
        {!loading && loadError && <div className="comparison-feedback error">{loadError}</div>}

        {!loading && !loadError && comparisonData.rows.length > 0 && (
          <>
            <div className="comparison-chart-shell">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  data={comparisonData.rows}
                  layout="vertical"
                  barCategoryGap="22%"
                  barGap={4}
                  margin={{ top: 16, right: 24, left: 16, bottom: 16 }}
                >
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCurrency(Number(value))}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: axisColor, fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={180}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: axisColor, fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => {
                      const series = comparisonData.series.find((item) => item.id === String(name));
                      return [formatCurrency(Number(value ?? 0)), `${series?.label ?? name} • ${series?.rangeLabel ?? ""}`];
                    }}
                    labelFormatter={(label) => `Categoria: ${label}`}
                  />
                  <Legend />
                  {comparisonData.series.map((series) => (
                    <Bar
                      key={series.id}
                      dataKey={series.id}
                      name={`${series.label}`}
                      fill={series.color}
                      radius={[0, 8, 8, 0]}
                      maxBarSize={18}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="comparison-summary-grid">
              {comparisonData.series.map((item) => (
                <article key={item.id} className="comparison-summary-card">
                  <span className="comparison-summary-kicker" style={{ color: item.color }}>
                    {item.label}
                  </span>
                  <strong>{formatCurrency(item.total)}</strong>
                  <span>{item.rangeLabel}</span>
                  <span>{item.transactionCount} lançamento(s) considerado(s)</span>
                </article>
              ))}
            </div>
          </>
        )}

        {!loading && !loadError && comparisonData.rows.length === 0 && (
          <div className="comparison-feedback">
            Nenhum lançamento encontrado para os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  );
}