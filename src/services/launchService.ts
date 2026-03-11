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
  const { data } = await api.get<any[]>("/transactions", { params: filter });
  const normalized = data.map(item => normalizeLaunchFromAPI(item));
  return detectAndConvertTransfers(normalized, data);
}

/**
 * Detecta pares de transferências (mesmo occurrenceGroupId) e as converte em registros únicos
 * Se há um Income e um Expense com o mesmo occurrenceGroupId (tipo Single),
 * eles representam uma única transferência
 */
function detectAndConvertTransfers(normalized: LaunchRow[], rawData: any[]): LaunchRow[] {
  const transferGroupMap = new Map<string, any[]>();
  const processedIds = new Set<string>();
  const result: LaunchRow[] = [];

  // Agrupa dados brutos por occurrenceGroupId
  for (const item of rawData) {
    if (item.occurrenceGroupId && item.occurrenceType?.toLowerCase() === "single") {
      const groupId = item.occurrenceGroupId;
      if (!transferGroupMap.has(groupId)) {
        transferGroupMap.set(groupId, []);
      }
      transferGroupMap.get(groupId)!.push(item);
    }
  }

  // Processa cada grupo
  for (const [groupId, items] of transferGroupMap.entries()) {
    // Se há exatamente 2 itens: um Income e um Expense = transferência
    if (items.length === 2) {
      const income = items.find((i: any) => i.type?.toLowerCase() === "income");
      const expense = items.find((i: any) => i.type?.toLowerCase() === "expense");

      if (income && expense) {
        // É uma transferência!
        const transfer: LaunchRow = {
          id: expense.id, // Usa o ID do expense como principal
          date: expense.date,
          description: expense.description || "Transferência",
          type: "transfer",
          value: expense.value,
          occurrenceType: "single",
          groupId: groupId,
          fromAccount: { id: expense.accountId },
          toAccount: { id: income.accountId },
        };

        result.push(transfer);
        processedIds.add(income.id);
        processedIds.add(expense.id);
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

function normalizeLaunchFromAPI(item: any): LaunchRow {
  try {
    const base: LaunchRow = {
      id: item.id,
      date: item.date,
      description: item.description ?? "",
      type: (item.type?.toLowerCase() ?? "expense") as any,
      value: item.value ?? 0,
      occurrenceType: (item.occurrenceType?.toLowerCase() ?? "single") as any,
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
    throw new Error(`Erro ao processar lançamento: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

export async function createTransaction(payload: CreateTransactionPayload) {
  try {
    const { data } = await api.post<any>("/transactions", payload);
    console.log("Resposta do servidor (create):", data);
    return normalizeLaunchFromAPI(data);
  } catch (err) {
    console.error("Erro ao criar transação:", err);
    throw err;
  }
}

export async function updateLaunch(id: string, payload: Partial<CreateTransactionPayload>) {
  try {
    const { data } = await api.put<any>(`/transactions/${id}`, payload);
    console.log("Resposta do servidor (update):", data);
    return normalizeLaunchFromAPI(data);
  } catch (err) {
    console.error("Erro ao atualizar lançamento:", err);
    throw err;
  }
}

export type DeleteLaunchScope = "OnlyThis" | "FromFirst" | "FromThis";

export async function deleteLaunch(id: string, scope: DeleteLaunchScope = "OnlyThis") {
  await api.delete(`/transactions/${id}`, {
    params: { scope },
  });
}

export type GetBalanceResponse = {
  balance: number;
  referenceDate: string;
};

export async function getOpeningBalance(year: number, month: number, day: number, accountIds?: string[]): Promise<number> {
  try {
    const params: any = { year, month, day };
    if (accountIds && accountIds.length > 0) {
      params.accountIds = accountIds;
    }
    const { data } = await api.get<GetBalanceResponse>("/transactions/GetBalance", {
      params,
    });
    return data.balance;
  } catch (err) {
    console.error("Erro ao buscar saldo inicial:", err);
    return 0;
  }
}
