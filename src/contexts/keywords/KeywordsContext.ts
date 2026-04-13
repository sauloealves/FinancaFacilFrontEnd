import { createContext } from "react";
import type { KeywordEntry, KeywordUpsertPayload } from "../../services/keywordService";

export type KeywordsContextType = {
  keywords: KeywordEntry[];
  isLoading: boolean;
  reloadKeywords: () => Promise<void>;
  upsertKeyword: (payload: KeywordUpsertPayload) => Promise<void>;
  upsertKeywordsBatch: (payloads: KeywordUpsertPayload[]) => Promise<void>;
};

export const KeywordsContext = createContext<KeywordsContextType | undefined>(undefined);