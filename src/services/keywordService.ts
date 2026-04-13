import api from "./api";

export type KeywordEntry = {
  keyword: string;
  categoryId: string;
  categoryName: string;
  accountId: string;
  accountName: string;
};

export type KeywordUpsertPayload = {
  keyword: string;
  categoryId: string;
  categoryName?: string;
  accountId: string;
  accountName?: string;
};

export type KeywordBatchUpsertPayload = KeywordUpsertPayload[];

type KeywordPayload = {
  keyword?: string;
  categoryId?: string;
  categoryName?: string;
  accountId?: string;
  accountName?: string;
};

const DEFAULT_KEYWORDS_ENDPOINT = (
  (import.meta.env.VITE_KEYWORDS_ENDPOINT as string | undefined)?.trim() ||
  "/keywords"
).replace(/\/+$/, "");

function isKeywordPayload(value: unknown): value is KeywordPayload {
  return typeof value === "object" && value !== null;
}

function normalizeKeywordEntry(
  payload: KeywordPayload | null | undefined,
  fallback?: Partial<KeywordEntry>,
): KeywordEntry {
  return {
    keyword: payload?.keyword?.trim() ?? fallback?.keyword?.trim() ?? "",
    categoryId: payload?.categoryId ?? fallback?.categoryId ?? "",
    categoryName: payload?.categoryName ?? fallback?.categoryName ?? "",
    accountId: payload?.accountId ?? fallback?.accountId ?? "",
    accountName: payload?.accountName ?? fallback?.accountName ?? "",
  };
}

export async function getKeywords(): Promise<KeywordEntry[]> {
  const { data } = await api.get<unknown[]>(DEFAULT_KEYWORDS_ENDPOINT);

  return data
    .filter(isKeywordPayload)
    .map((keyword) => normalizeKeywordEntry(keyword))
    .filter((keyword) => keyword.keyword && keyword.categoryId && keyword.accountId);
}

export async function saveKeyword(payload: KeywordUpsertPayload): Promise<KeywordEntry> {
  const requestPayload = {
    keyword: payload.keyword.trim(),
    categoryId: payload.categoryId,
    accountId: payload.accountId,
  };

  const { data } = await api.post<KeywordPayload | null>(DEFAULT_KEYWORDS_ENDPOINT, requestPayload);

  return normalizeKeywordEntry(data, payload);
}

export async function saveKeywordsBatch(payload: KeywordBatchUpsertPayload): Promise<KeywordEntry[]> {
  const requestPayload = payload
    .map((item) => ({
      keyword: item.keyword.trim(),
      categoryId: item.categoryId,
      accountId: item.accountId,
    }))
    .filter((item) => item.keyword && item.categoryId && item.accountId);

  if (requestPayload.length === 0) {
    return [];
  }

  const { data } = await api.post<unknown[]>(`${DEFAULT_KEYWORDS_ENDPOINT}/batch`, requestPayload);

  return data
    .filter(isKeywordPayload)
    .map((keyword, index) => normalizeKeywordEntry(keyword, payload[index]));
}