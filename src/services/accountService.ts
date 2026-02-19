import api from "./api";
import type { Account } from "../features/accounts/types";

export async function getAccounts(): Promise<Account[]> {
  const { data } = await api.get<Account[]>("/accounts");
  return data.filter(a => !a.isDeleted);
}

export async function createAccount(payload: {
  name: string;
  initialBalance: number;
}) {
  const { data } = await api.post<Account>(
    "/accounts",
    payload
  );
  return data;
}

export async function updateAccount(
  id: string,
  payload: {
    name: string;
    initialBalance: number;
  }
) {
  const { data } = await api.put<Account>(
    `/accounts/${id}`,
    payload
  );
  return data;
}

export async function deleteAccount(id: string) {
  await api.delete(`/accounts/${id}`);
}
