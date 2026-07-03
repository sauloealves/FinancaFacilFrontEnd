import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TagsContext } from "./TagsContext";
import type { Tag, TagDetail } from "../../features/tags/types";
import { getTagById, getTags } from "../../services/tagService";

type TagsProviderProps = Readonly<{
  children: ReactNode;
}>;

function buildTagsByCategory(tags: Tag[], detailsById: Record<string, TagDetail>): Record<string, Tag[]> {
  const mapping: Record<string, Tag[]> = {};

  for (const tag of tags) {
    const detail = detailsById[tag.id];

    if (!detail) {
      continue;
    }

    for (const category of detail.categories) {
      if (!mapping[category.id]) {
        mapping[category.id] = [];
      }

      mapping[category.id].push(tag);
    }
  }

  return mapping;
}

export function TagsProvider({ children }: TagsProviderProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [detailsById, setDetailsById] = useState<Record<string, TagDetail>>({});
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  async function reloadTagDetail(tagId: string): Promise<TagDetail | null> {
    try {
      const detail = await getTagById(tagId);
      setDetailsById((current) => ({
        ...current,
        [tagId]: detail,
      }));
      return detail;
    } catch {
      return null;
    }
  }

  async function reloadTags() {
    setIsLoadingTags(true);

    try {
      const list = await getTags();
      setTags(list);

      if (list.length === 0) {
        setDetailsById({});
        return;
      }

      const detailEntries = await Promise.all(
        list.map(async (tag) => {
          try {
            const detail = await getTagById(tag.id);
            return [tag.id, detail] as const;
          } catch {
            return null;
          }
        }),
      );

      const nextDetails: Record<string, TagDetail> = {};

      for (const entry of detailEntries) {
        if (!entry) {
          continue;
        }

        const [tagId, detail] = entry;
        nextDetails[tagId] = detail;
      }

      setDetailsById(nextDetails);
    } finally {
      setIsLoadingTags(false);
    }
  }

  useEffect(() => {
    void reloadTags();
  }, []);

  const tagsByCategory = useMemo(() => buildTagsByCategory(tags, detailsById), [tags, detailsById]);

  function getTagsForCategory(categoryId: string): Tag[] {
    return tagsByCategory[categoryId] ?? [];
  }

  const value = useMemo(
    () => ({
      tags,
      tagsByCategory,
      isLoadingTags,
      reloadTags,
      reloadTagDetail,
      getTagsForCategory,
    }),
    [tags, tagsByCategory, isLoadingTags],
  );

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
}
