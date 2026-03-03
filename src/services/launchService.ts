import api from "./api";
import type { LaunchRow } from "../features/launches/types";

export type GetTransactionsFilter = {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  occurrenceGroupId?: string;
};

export type CreateTransactionPayload =
  | {
      type: "expense";
      description: string;
      value: number;
      categoryId: string;
      accountId: string;
      startDate: string;
      occurrenceType: "single" | "installment" | "recurring";
      installmentFrom?: number;
      installmentTo?: number;
      recurrence?: "weekly" | "biweekly" | "monthly" | "yearly" | "indefinite";
      endDate?: string | null;
    }
  | {
      type: "income";
      description: string;
      value: number;
      categoryId: string;
      accountId: string;
      startDate: string;
      occurrenceType: "single" | "installment" | "recurring";
      installmentFrom?: number;
      installmentTo?: number;
      recurrence?: "weekly" | "biweekly" | "monthly" | "yearly" | "indefinite";
      endDate?: string | null;
    }
  | {
      type: "transfer";
      description: string;
      value: number;
      fromAccountId: string;
      toAccountId: string;
      categoryId?: string;
      startDate: string;
      occurrenceType: "single" | "installment" | "recurring";
      installmentFrom?: number;
      installmentTo?: number;
      recurrence?: "weekly" | "biweekly" | "monthly" | "yearly" | "indefinite";
      endDate?: string | null;
    };

export async function getLaunches(filter?: GetTransactionsFilter): Promise<LaunchRow[]> {
  const { data } = await api.get<LaunchRow[]>("/transactions", { params: filter });
  return data;
}

export async function createTransaction(payload: CreateTransactionPayload) {
  const { data } = await api.post<LaunchRow>("/transactions", payload);
  return data;
}

export async function updateLaunch(id: string, payload: Partial<CreateTransactionPayload>) {
  const { data } = await api.put<LaunchRow>(`/transactions/${id}`, payload);
  return data;
}

export async function deleteLaunch(id: string) {
  await api.delete(`/transactions/${id}`);
}
