import axios from "axios";
import api, { getErrorMessage } from "./api";
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

export type BatchCreateTransactionItem = {
  clientId: string;
  payload: CreateTransactionPayload;
};

export type BatchCreateTransactionsResult = {
  successClientIds: string[];
  failedByClientId: Map<string, string>;
};

type IndexedBatchError = {
  index: number;
  message: string;
};

const DEFAULT_TRANSACTIONS_BATCH_ENDPOINT = (
  (import.meta.env.VITE_TRANSACTIONS_BATCH_ENDPOINT as string | undefined)?.trim() ||
  "/transactions/batch"
).replace(/\/+$/, "");

const MAX_BATCH_ITEMS = 250;
const MAX_BATCH_PAYLOAD_BYTES = 900 * 1024;

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

function estimatePayloadSizeInBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

function splitBatchItems(
  items: BatchCreateTransactionItem[],
): { chunks: BatchCreateTransactionItem[][]; oversizedItems: BatchCreateTransactionItem[] } {
  const chunks: BatchCreateTransactionItem[][] = [];
  const oversizedItems: BatchCreateTransactionItem[] = [];
  let currentChunk: BatchCreateTransactionItem[] = [];
  let currentChunkSize = 2;

  for (const item of items) {
    const itemSize = estimatePayloadSizeInBytes(item.payload);

    if (itemSize > MAX_BATCH_PAYLOAD_BYTES) {
      oversizedItems.push(item);
      continue;
    }

    const separatorSize = currentChunk.length > 0 ? 1 : 0;
    const nextChunkSize = currentChunkSize + separatorSize + itemSize;

    if (
      currentChunk.length >= MAX_BATCH_ITEMS ||
      nextChunkSize > MAX_BATCH_PAYLOAD_BYTES
    ) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      currentChunk = [item];
      currentChunkSize = 2 + itemSize;
      continue;
    }

    currentChunk.push(item);
    currentChunkSize = nextChunkSize;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return { chunks, oversizedItems };
}

function extractBatchErrorsFromObject(payload: Record<string, unknown>): IndexedBatchError[] {
  const indexedErrors: IndexedBatchError[] = [];

  const results = payload.results;
  if (Array.isArray(results)) {
    results.forEach((result, index) => {
      if (!result || typeof result !== "object") {
        return;
      }

      const success = (result as { success?: unknown }).success;
      const message =
        (result as { error?: unknown }).error ??
        (result as { message?: unknown }).message;

      if (success === false) {
        indexedErrors.push({
          index,
          message:
            typeof message === "string" && message.trim()
              ? message
              : "Falha ao processar o registro no lote.",
        });
      }
    });
  }

  const failureCollections = [payload.errors, payload.failed, payload.failures];
  for (const collection of failureCollections) {
    if (!Array.isArray(collection)) {
      continue;
    }

    collection.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }

      const rawIndex = (entry as { index?: unknown }).index;
      const message =
        (entry as { message?: unknown }).message ??
        (entry as { error?: unknown }).error;

      if (typeof rawIndex !== "number" || rawIndex < 0) {
        return;
      }

      indexedErrors.push({
        index: rawIndex,
        message:
          typeof message === "string" && message.trim()
            ? message
            : "Falha ao processar o registro no lote.",
      });
    });
  }

  return indexedErrors;
}

function extractIndexedBatchErrors(responseData: unknown): IndexedBatchError[] {
  if (!responseData || typeof responseData !== "object" || Array.isArray(responseData)) {
    return [];
  }

  return extractBatchErrorsFromObject(responseData as Record<string, unknown>);
}

function shouldSplitBatchAfterError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  return status === 400 || status === 409 || status === 413 || status === 422;
}

async function importBatchChunk(
  items: BatchCreateTransactionItem[],
): Promise<BatchCreateTransactionsResult> {
  try {
    const { data } = await api.post<unknown>(
      DEFAULT_TRANSACTIONS_BATCH_ENDPOINT,
      items.map((item) => item.payload),
    );

    const failedByClientId = new Map<string, string>();
    const indexedErrors = extractIndexedBatchErrors(data);

    for (const error of indexedErrors) {
      const item = items[error.index];
      if (!item) {
        continue;
      }

      failedByClientId.set(item.clientId, error.message);
    }

    return {
      successClientIds: items
        .filter((item) => !failedByClientId.has(item.clientId))
        .map((item) => item.clientId),
      failedByClientId,
    };
  } catch (error) {
    if (items.length > 1 && shouldSplitBatchAfterError(error)) {
      const middleIndex = Math.ceil(items.length / 2);
      const [leftChunk, rightChunk] = [
        items.slice(0, middleIndex),
        items.slice(middleIndex),
      ];
      const leftResult = await importBatchChunk(leftChunk);
      const rightResult = await importBatchChunk(rightChunk);

      return {
        successClientIds: [
          ...leftResult.successClientIds,
          ...rightResult.successClientIds,
        ],
        failedByClientId: new Map([
          ...leftResult.failedByClientId,
          ...rightResult.failedByClientId,
        ]),
      };
    }

    const message = getErrorMessage(error, "Falha ao importar o lote de lançamentos.");

    return {
      successClientIds: [],
      failedByClientId: new Map(
        items.map((item) => [item.clientId, message]),
      ),
    };
  }
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

export async function importTransactionsBatch(
  items: BatchCreateTransactionItem[],
): Promise<BatchCreateTransactionsResult> {
  if (items.length === 0) {
    return {
      successClientIds: [],
      failedByClientId: new Map(),
    };
  }

  const { chunks, oversizedItems } = splitBatchItems(items);
  const failedByClientId = new Map<string, string>();
  const successClientIds: string[] = [];

  for (const item of oversizedItems) {
    failedByClientId.set(
      item.clientId,
      "O registro excede o limite de payload JSON permitido para importação. Reduza a descrição ou divida a importação.",
    );
  }

  for (const chunk of chunks) {
    const result = await importBatchChunk(chunk);
    successClientIds.push(...result.successClientIds);

    result.failedByClientId.forEach((message, clientId) => {
      failedByClientId.set(clientId, message);
    });
  }

  return {
    successClientIds,
    failedByClientId,
  };
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
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      day: String(day),
    });

    if (accountIds && accountIds.length > 0) {
      for (const accountId of accountIds) {
        params.append("accountIds", accountId);
      }
    }

    const { data } = await api.get<GetBalanceResponse>(
      `/transactions/GetBalance?${params.toString()}`,
    );
    return data.balance;
  } catch (err) {
    console.error("Erro ao buscar saldo inicial:", err);
    return 0;
  }
}
