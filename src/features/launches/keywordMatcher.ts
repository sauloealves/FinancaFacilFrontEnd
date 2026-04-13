import type { KeywordEntry } from "../../services/keywordService";

export function normalizeKeywordSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function findKeywordMatch(
  keywords: KeywordEntry[],
  description: string,
): KeywordEntry | null {
  const normalizedDescription = normalizeKeywordSearchValue(description);

  if (!normalizedDescription) {
    return null;
  }

  const matches = keywords.filter((keyword) => {
    const normalizedKeyword = normalizeKeywordSearchValue(keyword.keyword);
    return normalizedKeyword.length > 0 && normalizedDescription.includes(normalizedKeyword);
  });

  if (matches.length === 0) {
    return null;
  }

  return matches.sort(
    (first, second) =>
      normalizeKeywordSearchValue(second.keyword).length -
      normalizeKeywordSearchValue(first.keyword).length,
  )[0] ?? null;
}