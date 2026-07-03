import { createContext } from "react";
import type { Tag, TagDetail } from "../../features/tags/types";

export type TagsContextType = {
  tags: Tag[];
  tagsByCategory: Record<string, Tag[]>;
  isLoadingTags: boolean;
  reloadTags: () => Promise<void>;
  reloadTagDetail: (tagId: string) => Promise<TagDetail | null>;
  getTagsForCategory: (categoryId: string) => Tag[];
};

export const TagsContext = createContext<TagsContextType | undefined>(undefined);
