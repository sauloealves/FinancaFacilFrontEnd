import api from "./api";
import type {
  BudgetCell,
  BudgetDetail,
  BudgetListItem,
  BudgetMonthCategory,
  BudgetMonthDetail,
  BudgetPlannerRow,
  BudgetStatus,
  BudgetSummary,
  BudgetTransaction,
  CreateBudgetPayload,
  UpdateBudgetItemPayload,
  UpdateBudgetItemResult,
} from "../features/budgets/types";
import type { Category } from "../features/categories/types";
import {
  buildBudgetSummaryFromMonths,
  buildMonthKey,
  formatBudgetMonthLabel,
  getBudgetHealth,
  mergePlannerRowsWithCategories,
  rebuildPlannerRows,
} from "../features/budgets/utils";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value.replaceAll(".", "").replace(",", "."));
    return Number.isFinite(normalized) ? normalized : fallback;
  }

  return fallback;
}

function normalizeBudgetStatus(value: unknown): BudgetStatus {
  const normalized = getString(value).trim().toLowerCase();

  if (["active", "ativo", "ativa"].includes(normalized)) {
    return "active";
  }

  if (["closed", "encerrado", "encerrada", "archived"].includes(normalized)) {
    return "closed";
  }

  return "planning";
}

function normalizeMonthKey(value: unknown, year: number, fallbackMonthNumber = 1): string {
  if (typeof value === "string") {
    const normalized = value.trim();

    if (/^\d{4}-\d{2}$/.test(normalized)) {
      return normalized;
    }

    if (/^\d{4}-\d$/.test(normalized)) {
      const [yearText, monthText] = normalized.split("-");
      return `${yearText}-${monthText.padStart(2, "0")}`;
    }

    if (/^\d{1,2}$/.test(normalized)) {
      return buildMonthKey(year, Number(normalized));
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return buildMonthKey(year, value);
  }

  return buildMonthKey(year, fallbackMonthNumber);
}

function extractCollection(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = asRecord(payload);

  if (!record) {
    return [];
  }

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeBudgetListItem(payload: unknown): BudgetListItem | null {
  const record = asRecord(payload);

  if (!record) {
    return null;
  }

  const id = getString(record.id || record.budgetId);
  const name = getString(record.name || record.title, "Orçamento");
  const year = getNumber(record.year, new Date().getFullYear());

  if (!id) {
    return null;
  }

  return {
    id,
    name,
    year,
    status: normalizeBudgetStatus(record.status),
    updatedAt: getString(record.updatedAt || record.lastUpdatedAt) || undefined,
  };
}

function normalizeBudgetMutationResponse(payload: unknown): BudgetListItem | null {
  const directMatch = normalizeBudgetListItem(payload);
  if (directMatch) {
    return directMatch;
  }

  const record = asRecord(payload);

  if (!record) {
    return null;
  }

  return (
    normalizeBudgetListItem(record.budget)
    ?? normalizeBudgetListItem(record.item)
    ?? normalizeBudgetListItem(record.data)
  );
}

function getIdFromLocationHeader(locationHeader: unknown): string | null {
  const location = getString(locationHeader).trim();

  if (!location) {
    return null;
  }

  const match = /\/budgets\/([^/?#]+)/i.exec(location);
  return match?.[1] ?? null;
}

function normalizeBudgetCell(payload: unknown, year: number, fallbackMonthNumber: number): BudgetCell {
  const record = asRecord(payload);
  const monthKey = normalizeMonthKey(
    record?.monthKey ?? record?.month ?? record?.monthNumber,
    year,
    fallbackMonthNumber,
  );
  const monthNumber = Number(monthKey.slice(5, 7));
  const planned = getNumber(record?.planned ?? record?.plannedAmount ?? record?.amount ?? record?.targetValue ?? record?.value);
  const realized = getNumber(record?.realized ?? record?.realizedAmount ?? record?.actual ?? record?.spent);

  return {
    itemId: getString(record?.id || record?.itemId) || undefined,
    budgetMonthId: getString(record?.budgetMonthId) || undefined,
    monthKey,
    monthNumber,
    planned,
    realized,
    status: getBudgetHealth(planned, realized),
  };
}

function normalizeMonthsMap(rawMonths: unknown, year: number): BudgetCell[] {
  if (Array.isArray(rawMonths)) {
    return rawMonths.map((item, index) => normalizeBudgetCell(item, year, index + 1));
  }

  const monthMap = asRecord(rawMonths);

  if (!monthMap) {
    return Array.from({ length: 12 }, (_, index) => normalizeBudgetCell({}, year, index + 1));
  }

  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = index + 1;
    const keys = [
      String(monthNumber),
      String(monthNumber).padStart(2, "0"),
      buildMonthKey(year, monthNumber),
    ];
    const entry = keys.map((key) => monthMap[key]).find(Boolean);
    return normalizeBudgetCell(entry, year, monthNumber);
  });
}

function normalizeBudgetPlannerRow(payload: unknown, year: number): BudgetPlannerRow | null {
  const record = asRecord(payload);

  if (!record) {
    return null;
  }

  const categoryRecord = asRecord(record.category);
  const categoryId = getString(record.categoryId || record.id || categoryRecord?.id);
  const categoryName = getString(record.categoryName || record.name || categoryRecord?.name);

  if (!categoryId && !categoryName) {
    return null;
  }

  const monthEntries = record.months ?? record.items ?? record.values;
  const months = normalizeMonthsMap(monthEntries, year).sort((a, b) => a.monthNumber - b.monthNumber);
  const annualPlanned = months.reduce((acc, month) => acc + month.planned, 0);
  const annualRealized = months.reduce((acc, month) => acc + month.realized, 0);

  return {
    categoryId: categoryId || categoryName,
    categoryName,
    months,
    annualPlanned,
    annualRealized,
    status: getBudgetHealth(annualPlanned, annualRealized),
  };
}

function createMonthDetailMap(plannerRows: BudgetPlannerRow[], year: number): BudgetMonthDetail[] {
  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = index + 1;
    const monthKey = buildMonthKey(year, monthNumber);
    const categories: BudgetMonthCategory[] = plannerRows.map((row) => {
      const month = row.months.find((cell) => cell.monthKey === monthKey);
      return {
        itemId: month?.itemId,
        budgetMonthId: month?.budgetMonthId,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        planned: month?.planned ?? 0,
        realized: month?.realized ?? 0,
        status: getBudgetHealth(month?.planned ?? 0, month?.realized ?? 0),
      };
    });

    const plannedTotal = categories.reduce((acc, category) => acc + category.planned, 0);
    const realizedTotal = categories.reduce((acc, category) => acc + category.realized, 0);

      const sortedCategories = [...categories].sort((a, b) => b.realized - a.realized);

      return {
      monthKey,
      label: formatBudgetMonthLabel(monthKey),
      plannedTotal,
      realizedTotal,
        categories: sortedCategories,
    };
  });
}

function normalizeBudgetMonthsPayload(payload: unknown, year: number): BudgetMonthDetail[] | null {
  const monthCollection = extractCollection(payload, ["months", "items"]);

  if (monthCollection.length === 0) {
    return null;
  }

  const firstRecord = asRecord(monthCollection[0]);

  if (firstRecord && Array.isArray(firstRecord.items)) {
    return monthCollection.map((monthPayload, index) => {
      const monthRecord = asRecord(monthPayload) ?? {};
      const budgetMonthId = getString(monthRecord.id || monthRecord.budgetMonthId) || undefined;
      const monthKey = normalizeMonthKey(
        monthRecord.monthKey ?? monthRecord.month ?? monthRecord.monthNumber ?? index + 1,
        year,
        index + 1,
      );

      const categories = asArray(monthRecord.items)
        .map((itemPayload): BudgetMonthCategory | null => {
          const itemRecord = asRecord(itemPayload);

          if (!itemRecord) {
            return null;
          }

          const categoryId = getString(itemRecord.categoryId || asRecord(itemRecord.category)?.id);
          const categoryName = getString(itemRecord.categoryName || itemRecord.name || asRecord(itemRecord.category)?.name);

          if (!categoryId && !categoryName) {
            return null;
          }

          const planned = getNumber(itemRecord.planned ?? itemRecord.plannedAmount ?? itemRecord.amount);
          const realized = getNumber(itemRecord.realized ?? itemRecord.realizedAmount ?? itemRecord.actual ?? itemRecord.spent);

          return {
            itemId: getString(itemRecord.id || itemRecord.itemId) || undefined,
            budgetMonthId,
            categoryId: categoryId || categoryName,
            categoryName: categoryName || categoryId,
            planned,
            realized,
            status: getBudgetHealth(planned, realized),
          };
        })
        .filter((category): category is BudgetMonthCategory => category !== null)
        .sort((a, b) => b.realized - a.realized);

      const plannedTotal = getNumber(
        monthRecord.totalPlanned ?? monthRecord.plannedTotal,
        categories.reduce((acc, category) => acc + category.planned, 0),
      );
      const realizedTotal = getNumber(
        monthRecord.totalRealized ?? monthRecord.realizedTotal,
        categories.reduce((acc, category) => acc + category.realized, 0),
      );

      return {
        monthKey,
        label: getString(monthRecord.monthName) || formatBudgetMonthLabel(monthKey),
        plannedTotal,
        realizedTotal,
        categories,
      };
    });
  }

  if (firstRecord && Array.isArray(firstRecord.categories)) {
    return monthCollection.map((monthPayload, index) => {
      const monthRecord = asRecord(monthPayload) ?? {};
      const budgetMonthId = getString(monthRecord.id || monthRecord.budgetMonthId) || undefined;
      const monthKey = normalizeMonthKey(monthRecord.monthKey ?? monthRecord.month ?? index + 1, year, index + 1);
      const categories = asArray(monthRecord.categories)
        .map((categoryPayload): BudgetMonthCategory | null => {
          const categoryRecord = asRecord(categoryPayload);
          if (!categoryRecord) {
            return null;
          }

          const nestedCategoryRecord = asRecord(categoryRecord.category);
          const categoryId = getString(categoryRecord.categoryId || categoryRecord.id || nestedCategoryRecord?.id);
          const categoryName = getString(categoryRecord.categoryName || categoryRecord.name || nestedCategoryRecord?.name);

          if (!categoryId && !categoryName) {
            return null;
          }

          const planned = getNumber(categoryRecord.planned ?? categoryRecord.plannedAmount ?? categoryRecord.amount);
          const realized = getNumber(categoryRecord.realized ?? categoryRecord.realizedAmount ?? categoryRecord.actual ?? categoryRecord.spent);

          return {
            itemId: getString(categoryRecord.id || categoryRecord.itemId) || undefined,
            budgetMonthId,
            categoryId: categoryId || categoryName,
            categoryName: categoryName || categoryId,
            planned,
            realized,
            status: getBudgetHealth(planned, realized),
          };
        })
        .filter((category): category is BudgetMonthCategory => category !== null);

      const plannedTotal = getNumber(monthRecord.plannedTotal ?? monthRecord.totalPlanned, categories.reduce((acc, category) => acc + category.planned, 0));
      const realizedTotal = getNumber(monthRecord.realizedTotal ?? monthRecord.totalRealized, categories.reduce((acc, category) => acc + category.realized, 0));

      return {
        monthKey,
        label: formatBudgetMonthLabel(monthKey),
        plannedTotal,
        realizedTotal,
        categories,
      };
    });
  }

  const plannerRows = monthCollection
    .map((row) => normalizeBudgetPlannerRow(row, year))
    .filter((row): row is BudgetPlannerRow => Boolean(row));

  return createMonthDetailMap(plannerRows, year);
}

function normalizeBudgetSummary(payload: unknown, fallbackMonths: BudgetMonthDetail[]): BudgetSummary {
  const record = asRecord(payload);

  if (!record) {
    return buildBudgetSummaryFromMonths(fallbackMonths);
  }

  const monthlyComparisonSource = extractCollection(record.monthlyComparison ?? record.months, ["monthlyComparison", "months"]);
  const categoryDistributionSource = extractCollection(record.categoryDistribution ?? record.categories, ["categoryDistribution", "categories"]);

  const fallbackSummary = buildBudgetSummaryFromMonths(fallbackMonths);

  const monthlyComparison = monthlyComparisonSource.length > 0
    ? monthlyComparisonSource.map((item, index) => {
        const itemRecord = asRecord(item) ?? {};
        const monthKey = normalizeMonthKey(itemRecord.monthKey ?? itemRecord.month ?? index + 1, fallbackMonths[0] ? Number(fallbackMonths[0].monthKey.slice(0, 4)) : new Date().getFullYear(), index + 1);
        const planned = getNumber(itemRecord.planned ?? itemRecord.plannedAmount ?? itemRecord.totalPlanned);
        const realized = getNumber(itemRecord.realized ?? itemRecord.realizedAmount ?? itemRecord.totalRealized);

        return {
          monthKey,
          label: formatBudgetMonthLabel(monthKey),
          planned,
          realized,
        };
      })
    : fallbackSummary.monthlyComparison;

  const categoryDistribution = categoryDistributionSource.length > 0
    ? categoryDistributionSource.map((item, index) => {
        const itemRecord = asRecord(item) ?? {};
        const planned = getNumber(itemRecord.planned ?? itemRecord.plannedAmount ?? itemRecord.totalPlanned);
        const realized = getNumber(itemRecord.realized ?? itemRecord.realizedAmount ?? itemRecord.totalRealized);

        return {
          categoryId: getString(itemRecord.categoryId || itemRecord.id || asRecord(itemRecord.category)?.id) || `category-${index}`,
          categoryName: getString(itemRecord.categoryName || itemRecord.name || asRecord(itemRecord.category)?.name, "Sem categoria"),
          planned,
          realized,
          status: getBudgetHealth(planned, realized),
        };
      })
    : fallbackSummary.categoryDistribution;

  const totalPlanned = getNumber(record.totalPlanned ?? asRecord(record.totals)?.planned, fallbackSummary.totalPlanned);
  const totalRealized = getNumber(record.totalRealized ?? asRecord(record.totals)?.realized, fallbackSummary.totalRealized);

  return {
    totalPlanned,
    totalRealized,
    balance: getNumber(record.balance ?? asRecord(record.totals)?.balance, totalPlanned - totalRealized),
    monthlyComparison,
    categoryDistribution,
  };
}

function buildPlannerRowsFromMonths(months: BudgetMonthDetail[]): BudgetPlannerRow[] {
  const rowMap = new Map<string, BudgetPlannerRow>();

  for (const month of months) {
    const monthNumber = Number(month.monthKey.slice(5, 7));

    for (const category of month.categories) {
      const current = rowMap.get(category.categoryId) ?? {
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        months: [],
        annualPlanned: 0,
        annualRealized: 0,
        status: "ok" as const,
      };

      current.months.push({
        itemId: category.itemId,
        budgetMonthId: category.budgetMonthId,
        monthKey: month.monthKey,
        monthNumber,
        planned: category.planned,
        realized: category.realized,
        status: category.status,
      });

      rowMap.set(category.categoryId, current);
    }
  }

  const filledRows = Array.from(rowMap.values()).map((row) => {
    const months = Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1;
      return row.months.find((month) => month.monthNumber === monthNumber) ?? {
        monthKey: buildMonthKey(Number(row.months[0]?.monthKey.slice(0, 4) ?? new Date().getFullYear()), monthNumber),
        monthNumber,
        planned: 0,
        realized: 0,
        status: "ok" as const,
      };
    });

    return {
      ...row,
      months,
    };
  });

  return rebuildPlannerRows(filledRows).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

export async function getBudgets(): Promise<BudgetListItem[]> {
  const { data } = await api.get<unknown>("/budgets");
  return extractCollection(data, ["budgets", "items", "data"])
    .map(normalizeBudgetListItem)
    .filter((item): item is BudgetListItem => Boolean(item))
    .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));
}

export async function createBudget(payload: CreateBudgetPayload): Promise<BudgetListItem> {
  const requestBody = {
    name: payload.name,
    year: payload.year,
    status: payload.status,
  };

  const response = await api.post<unknown>("/budgets", requestBody);
  const normalized = normalizeBudgetMutationResponse(response.data);

  if (normalized) {
    return normalized;
  }

  const locationId = getIdFromLocationHeader(response.headers?.location);
  if (locationId) {
    return {
      id: locationId,
      name: payload.name,
      year: payload.year,
      status: payload.status,
    };
  }

  throw new Error("A API não retornou os dados do orçamento criado.");
}

export async function duplicateBudget(sourceBudget: BudgetListItem): Promise<BudgetListItem> {
  const payload = {
    name: `${sourceBudget.name} (cópia)`,
    year: sourceBudget.year,
    status: "planning",
    sourceBudgetId: sourceBudget.id,
    sourceId: sourceBudget.id,
    duplicateFromBudgetId: sourceBudget.id,
  };

  const response = await api.post<unknown>("/budgets", payload);
  const normalized = normalizeBudgetMutationResponse(response.data);

  if (normalized) {
    return normalized;
  }

  const locationId = getIdFromLocationHeader(response.headers?.location);
  if (locationId) {
    return {
      id: locationId,
      name: payload.name,
      year: payload.year,
      status: "planning",
    };
  }

  throw new Error("A API não retornou os dados do orçamento duplicado.");
}

export async function deleteBudget(id: string): Promise<void> {
  await api.delete(`/budgets/${id}`);
}

export async function getBudgetMeta(id: string): Promise<Omit<BudgetDetail, "plannerRows" | "summary" | "months">> {
  const { data } = await api.get<unknown>(`/budgets/${id}`);
  const record = asRecord(data) ?? {};
  const name = getString(record.name || record.title, "Orçamento");
  const year = getNumber(record.year, new Date().getFullYear());

  return {
    id: getString(record.id || record.budgetId, id) || id,
    name,
    year,
    status: normalizeBudgetStatus(record.status),
    description: getString(record.description) || undefined,
  };
}

export async function getBudgetMonths(id: string, year: number): Promise<BudgetMonthDetail[]> {
  const { data } = await api.get<unknown>(`/budgets/${id}/months`);
  return normalizeBudgetMonthsPayload(data, year) ?? createMonthDetailMap([], year);
}

export async function getBudgetSummary(id: string, fallbackMonths: BudgetMonthDetail[]): Promise<BudgetSummary> {
  const { data } = await api.get<unknown>(`/budgets/${id}/summary`);
  return normalizeBudgetSummary(data, fallbackMonths);
}

export async function getBudgetDetail(id: string): Promise<BudgetDetail> {
  const meta = await getBudgetMeta(id);
  const months = await getBudgetMonths(id, meta.year);
  const plannerRows = buildPlannerRowsFromMonths(months);
  const summary = await getBudgetSummary(id, months);

  return {
    ...meta,
    plannerRows,
    summary,
    months,
  };
}

export function applyBudgetCategoryFallback(detail: BudgetDetail, categories: Category[]): BudgetDetail {
  const plannerRows = mergePlannerRowsWithCategories(detail.plannerRows, categories, detail.year);

  if (plannerRows.length === detail.plannerRows.length) {
    return detail;
  }

  const months = createMonthDetailMap(plannerRows, detail.year);

  return {
    ...detail,
    plannerRows,
    months,
    summary: buildBudgetSummaryFromMonths(months),
  };
}

export async function updateBudgetItem(payload: UpdateBudgetItemPayload): Promise<UpdateBudgetItemResult> {
  const requestBody = {
    id: payload.itemId,
    categoryId: payload.categoryId,
    plannedAmount: payload.planned,
  };

  const { data } = await api.put<unknown>("/budgets/items", requestBody);
  const record = asRecord(data);
  const planned = getNumber(record?.planned ?? record?.plannedAmount, payload.planned);
  const realized = getNumber(record?.realized ?? record?.realizedAmount, 0);

  return {
    itemId: getString(record?.id || record?.itemId) || payload.itemId,
    budgetMonthId: getString(record?.budgetMonthId) || payload.budgetMonthId || payload.itemId,
    monthKey: normalizeMonthKey(record?.monthKey ?? record?.month, Number(payload.monthKey.slice(0, 4)), Number(payload.monthKey.slice(5, 7))),
    planned,
    realized,
  };
}

export async function getBudgetTransactions(params: { month: string; categoryId?: string; category?: string }): Promise<BudgetTransaction[]> {
  const { data } = await api.get<unknown>("/transactions", {
    params: {
      month: params.month,
      category: params.categoryId ?? params.category,
    },
  });

  return extractCollection(data, ["transactions", "items", "data"])
    .map((item, index) => {
      const record = asRecord(item);

      if (!record) {
        return null;
      }

      return {
        id: getString(record.id, `transaction-${index}`),
        date: getString(record.date || record.transactionDate, params.month),
        description: getString(record.description || record.title, "Lançamento"),
        value: getNumber(record.value ?? record.amount),
        category: getString(record.categoryName || asRecord(record.category)?.name, "Sem categoria"),
      } satisfies BudgetTransaction;
    })
    .filter((item): item is BudgetTransaction => Boolean(item));
}