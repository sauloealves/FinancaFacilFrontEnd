export type LaunchType = "income" | "expense" | "transfer";
export type OccurrenceType = "single" | "installment" | "recurring";
export type FailedTransactionType = Extract<LaunchType, "income" | "expense">;
export type LaunchSortField = "default" | "description" | "account" | "category" | "value";
export type LaunchViewMode = "grouped" | "spreadsheet";

export type AccountRef = {
  id: string;
  name?: string;
};

export type CategoryRef = {
  id: string;
  name?: string;
};

export type LaunchRow = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: LaunchType;
  value: number;

  // Receita / Despesa
  account?: AccountRef;
  category?: CategoryRef;

  // Transferência
  fromAccount?: AccountRef;
  toAccount?: AccountRef;

  occurrenceType?: OccurrenceType;
  groupId?: string;
};

export type FailedTransactionRow = {
  id: string;
  rawMessage: string;
  description: string;
  date: string;
  type: FailedTransactionType;
  value: number;
  account?: AccountRef;
  category?: CategoryRef;
};

export type DayGroup = {
  date: string;
  rows: LaunchRow[];
  incomeTotal: number;
  expenseTotal: number;
  dayBalance: number;
};

export type LaunchTableData = {
  month: string;            // YYYY-MM
  openingBalance: number;
  days: DayGroup[];
};
