export type BudgetStatus = "planning" | "active" | "closed";

export type BudgetHealth = "ok" | "warning" | "over";

export type BudgetListItem = {
  id: string;
  name: string;
  year: number;
  status: BudgetStatus;
  updatedAt?: string;
};

export type BudgetCell = {
  itemId?: string;
  budgetMonthId?: string;
  monthKey: string;
  monthNumber: number;
  planned: number;
  realized: number;
  status: BudgetHealth;
};

export type BudgetPlannerRow = {
  categoryId: string;
  categoryName: string;
  months: BudgetCell[];
  annualPlanned: number;
  annualRealized: number;
  status: BudgetHealth;
};

export type BudgetSummaryMonth = {
  monthKey: string;
  label: string;
  planned: number;
  realized: number;
};

export type BudgetCategorySummary = {
  categoryId: string;
  categoryName: string;
  planned: number;
  realized: number;
  status: BudgetHealth;
};

export type BudgetMonthCategory = {
  itemId?: string;
  budgetMonthId?: string;
  categoryId: string;
  categoryName: string;
  planned: number;
  realized: number;
  status: BudgetHealth;
};

export type BudgetMonthDetail = {
  monthKey: string;
  label: string;
  plannedTotal: number;
  realizedTotal: number;
  categories: BudgetMonthCategory[];
};

export type BudgetSummary = {
  totalPlanned: number;
  totalRealized: number;
  balance: number;
  monthlyComparison: BudgetSummaryMonth[];
  categoryDistribution: BudgetCategorySummary[];
};

export type BudgetDetail = {
  id: string;
  name: string;
  year: number;
  status: BudgetStatus;
  description?: string;
  plannerRows: BudgetPlannerRow[];
  summary: BudgetSummary;
  months: BudgetMonthDetail[];
};

export type BudgetTransaction = {
  id: string;
  date: string;
  description: string;
  value: number;
  category: string;
};

export type CreateBudgetPayload = {
  name: string;
  year: number;
  status: BudgetStatus;
};

export type UpdateBudgetItemPayload = {
  budgetMonthId?: string;
  categoryId: string;
  monthKey: string;
  planned: number;
  itemId?: string;
};

export type UpdateBudgetItemResult = {
  itemId?: string;
  budgetMonthId?: string;
  monthKey: string;
  planned: number;
  realized: number;
};