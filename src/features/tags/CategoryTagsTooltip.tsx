import type { ReactNode } from "react";
import { useTags } from "../../contexts/tags/useTags";
import TagBadge from "./TagBadge";
import "./CategoryTagsTooltip.css";

type CategoryTagsTooltipProps = {
  categoryId?: string;
  children: ReactNode;
};

export default function CategoryTagsTooltip({ categoryId, children }: Readonly<CategoryTagsTooltipProps>) {
  const { getTagsForCategory } = useTags();
  const tags = categoryId ? getTagsForCategory(categoryId) : [];

  if (!categoryId || tags.length === 0) {
    return <>{children}</>;
  }

  return (
    <span className="category-tags-tooltip-root">
      <span className="category-tags-tooltip-trigger">{children}</span>
      <span className="category-tags-tooltip-content" role="tooltip">
        <span className="category-tags-tooltip-title">Tags da categoria</span>
        <span className="category-tags-tooltip-list">
          {tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} size="sm" />
          ))}
        </span>
      </span>
    </span>
  );
}
