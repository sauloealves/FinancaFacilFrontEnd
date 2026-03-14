import api from "./api";
import type {
  LaunchRow,
  LaunchType,
  OccurrenceType,
} from "../features/launches/types";

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

type LaunchPayloadShape = {
  type?: string;
  description?: string;
  value?: number;
  categoryId?: string;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  startDate?: string;
  occurrenceType?: string;
  transactionId?: string;
  date?: string;
};

type RawLaunchApiItem = {
  id?: string;
  date?: string;
  description?: string;
  type?: string;
  value?: number;
  occurrenceType?: string;
  occurrenceGroupId?: string;
  accountId?: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
};

function buildFallbackLaunchId(): string {
  const generatedId = globalThis.crypto?.randomUUID?.();
  return generatedId ?? `tmp-${Date.now()}`;
}

function normalizeLaunchType(type?: string): LaunchType {
  if (type === "income" || type === "expense" || type === "transfer") {
    return type;
  }

  return "expense";
}

function normalizeOccurrenceType(type?: string): OccurrenceType {
  if (type === "installment" || type === "recurring" || type === "single") {
    return type;
  }

  return "single";
}

function toTransferLaunch(
  groupId: string,
  items: RawLaunchApiItem[],
): LaunchRow | null {
  if (items.length !== 2) {
    return null;
  }

  const income = items.find((item) => item.type?.toLowerCase() === "income");
  const expense = items.find((item) => item.type?.toLowerCase() === "expense");

  if (!income || !expense) {
    return null;
  }

  if (!income.id || !expense.id || !expense.date || !expense.accountId || !income.accountId) {
    return null;
  }

  return {
    id: expense.id,
    date: expense.date,
    description: expense.description || "Transferência",
    type: "transfer",
    value: expense.value ?? 0,
    occurrenceType: "single",
    groupId,
    fromAccount: { id: expense.accountId },
    toAccount: { id: income.accountId },
  };
}

function groupTransfersByOccurrence(
  rawData: RawLaunchApiItem[],
): Map<string, RawLaunchApiItem[]> {
  const transferGroupMap = new Map<string, RawLaunchApiItem[]>();

  for (const item of rawData) {
    if (
      item.occurrenceGroupId &&
      item.occurrenceType?.toLowerCase() === "single"
    ) {
      const groupId = item.occurrenceGroupId;
      if (!transferGroupMap.has(groupId)) {
        transferGroupMap.set(groupId, []);
      }
      transferGroupMap.get(groupId)!.push(item);
    }
  }

  return transferGroupMap;
}

function getIncomeId(items: RawLaunchApiItem[]): string | undefined {
  return items.find((item) => item.type?.toLowerCase() === "income")?.id;
}

export async function getLaunches(
  filter?: GetTransactionsFilter,
): Promise<LaunchRow[]> {
  const { data } = await api.get<RawLaunchApiItem[]>("/transactions", {
    params: filter,
  });
  const normalized = data.map((item) => normalizeLaunchFromAPI(item));
  return detectAndConvertTransfers(normalized, data);
}

/**
 * Detecta pares de transferências (mesmo occurrenceGroupId) e as converte em registros únicos
 * Se há um Income e um Expense com o mesmo occurrenceGroupId (tipo Single),
 * eles representam uma única transferência
 */
function detectAndConvertTransfers(
  normalized: LaunchRow[],
  rawData: RawLaunchApiItem[],
): LaunchRow[] {
  const transferGroupMap = groupTransfersByOccurrence(rawData);
  const processedIds = new Set<string>();
  const result: LaunchRow[] = [];

  // Processa cada grupo
  for (const [groupId, items] of transferGroupMap.entries()) {
    const transfer = toTransferLaunch(groupId, items);

    if (transfer) {
      result.push(transfer);
      processedIds.add(transfer.id);

      const incomeId = getIncomeId(items);
      if (incomeId) {
        processedIds.add(incomeId);
      }
    }
  }

  // Adiciona os lançamentos que não são parte de uma transferência
  for (const item of normalized) {
    if (!processedIds.has(item.id)) {
      result.push(item);
    }
  }

  return result;
}

function normalizeLaunchFromAPI(item: RawLaunchApiItem | null | undefined): LaunchRow {
  try {
    if (!item || typeof item !== "object") {
      throw new Error("Resposta vazia ou inválida.");
    }

    const base: LaunchRow = {
      id: item.id ?? "",
      date: item.date ?? "",
      description: item.description ?? "",
      type: normalizeLaunchType(item.type?.toLowerCase()),
      value: item.value ?? 0,
      occurrenceType: normalizeOccurrenceType(item.occurrenceType?.toLowerCase()),
      groupId: item.occurrenceGroupId,
    };

    // Converte accountId em account reference
    if (item.accountId) {
      base.account = { id: item.accountId };
    }

    // Converte categoryId em category reference
    if (item.categoryId) {
      base.category = { id: item.categoryId };
    }

    // Converte fromAccountId em fromAccount reference
    if (item.fromAccountId) {
      base.fromAccount = { id: item.fromAccountId };
    }

    // Converte toAccountId em toAccount reference
    if (item.toAccountId) {
      base.toAccount = { id: item.toAccountId };
    }

    return base;
  } catch (err) {
    console.error("Erro ao normalizar lançamento:", item, err);
    throw new Error(
      `Erro ao processar lançamento: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

function buildLaunchFromPayload(
  id: string,
  payload: LaunchPayloadShape,
): LaunchRow {
  const type = normalizeLaunchType(payload.type?.toLowerCase());
  const fallback: LaunchRow = {
    id,
    date: payload.startDate ?? payload.date ?? "",
    description: payload.description ?? "",
    type,
    value: payload.value ?? 0,
    occurrenceType: normalizeOccurrenceType(payload.occurrenceType?.toLowerCase()),
  };

  if (type === "transfer") {
    if (payload.fromAccountId) {
      fallback.fromAccount = { id: payload.fromAccountId };
    }

    if (payload.toAccountId) {
      fallback.toAccount = { id: payload.toAccountId };
    }

    return fallback;
  }

  if (payload.accountId) {
    fallback.account = { id: payload.accountId };
  }

  if (payload.categoryId) {
    fallback.category = { id: payload.categoryId };
  }

  return fallback;
}

export async function createTransaction(payload: CreateTransactionPayload) {
  try {
    const { data } = await api.post<RawLaunchApiItem | null | undefined>("/transactions", payload);
    console.log("Resposta do servidor (create):", data);

    if (!data || typeof data !== "object") {
      return buildLaunchFromPayload(buildFallbackLaunchId(), payload);
    }

    if (!data.id) {
      return normalizeLaunchFromAPI({
        ...buildLaunchFromPayload(buildFallbackLaunchId(), payload),
        ...data,
      });
    }

    return normalizeLaunchFromAPI(data);
  } catch (err) {
    console.error("Erro ao criar transação:", err);
    throw err;
  }
}

export async function updateLaunch(
  id: string,
  payload: Partial<CreateTransactionPayload>,
) {
  try {
    const { data } = await api.put<RawLaunchApiItem | null>(`/transactions/${id}`, payload);
    console.log("Resposta do servidor (update):", data);

    if (!data || typeof data !== "object") {
      return buildLaunchFromPayload(id, payload);
    }

    if (!data.id) {
      return normalizeLaunchFromAPI({ ...buildLaunchFromPayload(id, payload), ...data });
    }

    return normalizeLaunchFromAPI(data);
  } catch (err) {
    console.error("Erro ao atualizar lançamento:", err);
    throw err;
  }
}

export type DeleteLaunchScope = "OnlyThis" | "FromFirst" | "FromThis";

export async function deleteLaunch(
  id: string,
  scope: DeleteLaunchScope = "OnlyThis",
) {
  await api.delete(`/transactions/${id}`, {
    params: { scope },
  });
}

export type GetBalanceResponse = {
  balance: number;
  referenceDate: string;
};

export async function getOpeningBalance(
  year: number,
  month: number,
  day: number,
  accountIds?: string[],
): Promise<number> {
  try {
    const params: {
      year: number;
      month: number;
      day: number;
      accountIds?: string[];
    } = { year, month, day };
    if (accountIds && accountIds.length > 0) {
      params.accountIds = accountIds;
    }
    const { data } = await api.get<GetBalanceResponse>(
      "/transactions/GetBalance",
      {
        params,
      },
    );
    return data.balance;
  } catch (err) {
    console.error("Erro ao buscar saldo inicial:", err);
    return 0;
  }
}
