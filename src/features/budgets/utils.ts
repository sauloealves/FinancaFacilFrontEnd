import type {
  BudgetCategorySummary,
  BudgetDetail,
  BudgetHealth,
  BudgetMonthDetail,
  BudgetPlannerRow,
  BudgetStatus,
  BudgetSummary,
} from "./types";
import type { Category } from "../categories/types";

export const BUDGET_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function getBudgetStatusLabel(status: BudgetStatus): string {
  if (status === "planning") {
    return "Planejamento";
  }

  if (status === "active") {
    return "Ativo";
  }

  return "Encerrado";
}

export function getBudgetHealth(planned: number, realized: number): BudgetHealth {
  if (planned <= 0) {
    return realized > 0 ? "over" : "ok";
  }

  const ratio = realized / planned;

  if (ratio > 1) {
    return "over";
  }

  if (ratio >= 0.8) {
    return "warning";
  }

  return "ok";
}

export function formatBudgetMonthLabel(monthKey: string): string {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return monthKey;
  }

  return `${BUDGET_MONTHS[monthIndex]}/${String(year).slice(-2)}`;
}

export function buildMonthKey(year: number, monthNumber: number): string {
  return `${year}-${String(monthNumber).padStart(2, "0")}`;
}

export function buildBudgetSummaryFromMonths(months: BudgetMonthDetail[]): BudgetSummary {
  const monthlyComparison = months.map((month) => ({
    monthKey: month.monthKey,
    label: month.label,
    planned: month.plannedTotal,
    realized: month.realizedTotal,
  }));

  const categoryMap = new Map<string, BudgetCategorySummary>();

  for (const month of months) {
    for (const category of month.categories) {
      const current = categoryMap.get(category.categoryId) ?? {
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        planned: 0,
        realized: 0,
        status: "ok" as const,
      };

      current.planned += category.planned;
      current.realized += category.realized;
      current.status = getBudgetHealth(current.planned, current.realized);
      categoryMap.set(category.categoryId, current);
    }
  }

  const totalPlanned = monthlyComparison.reduce((acc, month) => acc + month.planned, 0);
  const totalRealized = monthlyComparison.reduce((acc, month) => acc + month.realized, 0);

  return {
    totalPlanned,
    totalRealized,
    balance: totalPlanned - totalRealized,
    monthlyComparison,
    categoryDistribution: Array.from(categoryMap.values()).sort((a, b) => b.realized - a.realized),
  };
}

export function distributeAnnualValue(total: number, monthsCount = 12): number[] {
  const cents = Math.round(total * 100);
  const base = Math.trunc(cents / monthsCount);
  const remainder = cents - base * monthsCount;

  return Array.from({ length: monthsCount }, (_, index) => {
    const valueInCents = base + (index < remainder ? 1 : 0);
    return valueInCents / 100;
  });
}

export function rebuildPlannerRows(rows: BudgetPlannerRow[]): BudgetPlannerRow[] {
  return rows.map((row) => {
    const annualPlanned = row.months.reduce((acc, month) => acc + month.planned, 0);
    const annualRealized = row.months.reduce((acc, month) => acc + month.realized, 0);

    return {
      ...row,
      months: row.months.map((month) => ({
        ...month,
        status: getBudgetHealth(month.planned, month.realized),
      })),
      annualPlanned,
      annualRealized,
      status: getBudgetHealth(annualPlanned, annualRealized),
    };
  });
}

export function buildEmptyPlannerRowsFromCategories(categories: Category[], year: number): BudgetPlannerRow[] {
  return rebuildPlannerRows(
    categories.map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      months: Array.from({ length: 12 }, (_, index) => ({
        monthKey: buildMonthKey(year, index + 1),
        monthNumber: index + 1,
        planned: 0,
        realized: 0,
        status: "ok" as const,
      })),
      annualPlanned: 0,
      annualRealized: 0,
      status: "ok" as const,
    })),
  ).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

export function mergePlannerRowsWithCategories(rows: BudgetPlannerRow[], categories: Category[], year: number): BudgetPlannerRow[] {
  if (categories.length === 0) {
    return rebuildPlannerRows(rows);
  }

  const missingCategories = categories.filter(
    (category) => !rows.some((row) => row.categoryId === category.id),
  );

  if (rows.length === 0) {
    return buildEmptyPlannerRowsFromCategories(categories, year);
  }

  if (missingCategories.length === 0) {
    return rebuildPlannerRows(rows);
  }

  return rebuildPlannerRows([
    ...rows,
    ...buildEmptyPlannerRowsFromCategories(missingCategories, year),
  ]).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

export function buildMonthsFromPlannerRows(rows: BudgetPlannerRow[]): BudgetMonthDetail[] {
  if (rows.length === 0) {
    return [];
  }

  const year = Number(rows[0].months[0]?.monthKey.slice(0, 4) ?? new Date().getFullYear());

  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = index + 1;
    const monthKey = buildMonthKey(year, monthNumber);
    const categories = rows.map((row) => {
      const month = row.months.find((cell) => cell.monthNumber === monthNumber);
      const planned = month?.planned ?? 0;
      const realized = month?.realized ?? 0;

      return {
        itemId: month?.itemId,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        planned,
        realized,
        status: getBudgetHealth(planned, realized),
      };
    });

    return {
      monthKey,
      label: formatBudgetMonthLabel(monthKey),
      plannedTotal: categories.reduce((acc, category) => acc + category.planned, 0),
      realizedTotal: categories.reduce((acc, category) => acc + category.realized, 0),
      categories: [...categories].sort((a, b) => b.realized - a.realized),
    };
  });
}

export function rebuildBudgetDetail(detail: BudgetDetail, rows: BudgetPlannerRow[]): BudgetDetail {
  const plannerRows = rebuildPlannerRows(rows);
  const months = buildMonthsFromPlannerRows(plannerRows);
  const summary = buildBudgetSummaryFromMonths(months);

  return {
    ...detail,
    plannerRows,
    months,
    summary,
  };
}