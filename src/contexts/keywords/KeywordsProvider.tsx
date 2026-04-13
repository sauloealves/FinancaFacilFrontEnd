import { useEffect, useMemo, useState, type ReactNode } from "react";
import { KeywordsContext } from "./KeywordsContext";
import {
  getKeywords,
  saveKeyword,
  saveKeywordsBatch,
  type KeywordEntry,
  type KeywordUpsertPayload,
} from "../../services/keywordService";
import { normalizeKeywordSearchValue } from "../../features/launches/keywordMatcher";

type Props = Readonly<{
  children: ReactNode;
}>;

function mergeKeywordEntry(current: KeywordEntry[], nextEntry: KeywordEntry): KeywordEntry[] {
  const normalizedKeyword = normalizeKeywordSearchValue(nextEntry.keyword);
  const nextEntries = current.filter(
    (entry) => normalizeKeywordSearchValue(entry.keyword) !== normalizedKeyword,
  );

  return [nextEntry, ...nextEntries];
}

function mergeKeywordEntries(current: KeywordEntry[], nextEntries: KeywordEntry[]): KeywordEntry[] {
  return nextEntries.reduce((result, entry) => mergeKeywordEntry(result, entry), current);
}

export function KeywordsProvider({ children }: Props) {
  const [keywords, setKeywords] = useState<KeywordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function loadKeywords() {
    setIsLoading(true);

    try {
      const data = await getKeywords();
      setKeywords(data);
    } catch (error) {
      console.error("Erro ao carregar keywords:", error);
      setKeywords([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function upsertKeyword(payload: KeywordUpsertPayload) {
    const normalizedPayload = {
      ...payload,
      keyword: payload.keyword.trim(),
    };

    if (!normalizedPayload.keyword || !normalizedPayload.categoryId || !normalizedPayload.accountId) {
      return;
    }

    const savedKeyword = await saveKeyword(normalizedPayload);
    setKeywords((current) => mergeKeywordEntry(current, savedKeyword));
  }

  async function upsertKeywordsBatch(payloads: KeywordUpsertPayload[]) {
    const normalizedPayloads = payloads
      .map((payload) => ({
        ...payload,
        keyword: payload.keyword.trim(),
      }))
      .filter((payload) => payload.keyword && payload.categoryId && payload.accountId);

    if (normalizedPayloads.length === 0) {
      return;
    }

    const savedKeywords = await saveKeywordsBatch(normalizedPayloads);
    setKeywords((current) => mergeKeywordEntries(current, savedKeywords));
  }

  useEffect(() => {
    void loadKeywords();
  }, []);

  const value = useMemo(
    () => ({
      keywords,
      isLoading,
      reloadKeywords: loadKeywords,
      upsertKeyword,
      upsertKeywordsBatch,
    }),
    [isLoading, keywords],
  );

  return <KeywordsContext.Provider value={value}>{children}</KeywordsContext.Provider>;
}