import type { Category } from "../categories/types";
import type { Tag } from "./types";

export type ParentByCategoryId = Record<string, string | undefined>;
export type ExplicitTagIdsByCategory = Record<string, Set<string>>;

export function buildParentByCategoryId(categories: Category[]): ParentByCategoryId {
  return categories.reduce<ParentByCategoryId>((acc, category) => {
    acc[category.id] = category.parentId ?? undefined;
    return acc;
  }, {});
}

export function buildExplicitTagIdsByCategory(tagsByCategory: Record<string, Tag[]>): ExplicitTagIdsByCategory {
  const result: ExplicitTagIdsByCategory = {};

  for (const [categoryId, tags] of Object.entries(tagsByCategory)) {
    result[categoryId] = new Set(tags.map((tag) => tag.id));
  }

  return result;
}

export function categoryMatchesTagFilter(
  categoryId: string | undefined,
  selectedTagIds: Set<string>,
  parentByCategoryId: ParentByCategoryId,
  explicitTagIdsByCategory: ExplicitTagIdsByCategory,
): boolean {
  if (selectedTagIds.size === 0) {
    return true;
  }

  if (!categoryId) {
    return false;
  }

  const seen = new Set<string>();
  let currentId: string | undefined = categoryId;

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);

    const currentCategoryTagIds = explicitTagIdsByCategory[currentId];
    if (currentCategoryTagIds) {
      for (const selectedTagId of selectedTagIds) {
        if (currentCategoryTagIds.has(selectedTagId)) {
          return true;
        }
      }
    }

    currentId = parentByCategoryId[currentId];
  }

  return false;
}
