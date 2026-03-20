import api from "./api";
import type { Account } from "../features/accounts/types";

type AccountPayload = {
  id?: string;
  name?: string;
  initialBalance?: number;
  currentBalance?: number;
  isEnabled?: boolean;
  isDeleted?: boolean;
};

function isValidAccountPayload(value: unknown): value is AccountPayload {
  return typeof value === "object" && value !== null;
}

function normalizeAccount(
  payload: AccountPayload | null | undefined,
  fallback?: Partial<Account>,
): Account {
  return {
    id: payload?.id ?? fallback?.id ?? "",
    name: payload?.name ?? fallback?.name ?? "",
    initialBalance: payload?.initialBalance ?? fallback?.initialBalance ?? 0,
    currentBalance: payload?.currentBalance ?? fallback?.currentBalance ?? 0,
    isEnabled: payload?.isEnabled ?? fallback?.isEnabled ?? true,
    isDeleted: payload?.isDeleted ?? fallback?.isDeleted ?? false,
  };
}

export async function getAccounts(): Promise<Account[]> {
  const { data } = await api.get<unknown[]>("/accounts");

  return data
    .filter(isValidAccountPayload)
    .map((account) => normalizeAccount(account))
    .filter((account) => account.id && !account.isDeleted);
}

export async function createAccount(payload: {
  name: string;
  initialBalance: number;
}) {
  const { data } = await api.post<AccountPayload | null>("/accounts", payload);
  return normalizeAccount(data, {
    name: payload.name,
    initialBalance: payload.initialBalance,
    currentBalance: payload.initialBalance,
    isEnabled: true,
  });
}

export async function updateAccount(
  id: string,
  payload: {
    name: string;
    initialBalance: number;
    isEnabled?: boolean;
  },
) {
  const { data } = await api.put<AccountPayload | null>(`/accounts/${id}`, payload);
  return normalizeAccount(data, {
    id,
    name: payload.name,
    initialBalance: payload.initialBalance,
    isEnabled: payload.isEnabled,
  });
}

export async function deleteAccount(id: string) {
  await api.delete(`/accounts/${id}`);
}
