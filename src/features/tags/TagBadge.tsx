import type { Tag } from "./types";
import "./TagBadge.css";

type TagBadgeProps = {
  tag: Pick<Tag, "name" | "color">;
  size?: "sm" | "md";
};

function normalizeHexColor(color: string): string {
  const normalized = color.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized : "#64748B";
}

export default function TagBadge({ tag, size = "md" }: Readonly<TagBadgeProps>) {
  return (
    <span
      className={`tag-badge tag-badge-${size}`}
      style={{
        backgroundColor: `${normalizeHexColor(tag.color)}1A`,
        color: normalizeHexColor(tag.color),
        borderColor: `${normalizeHexColor(tag.color)}66`,
      }}
      title={tag.name}
    >
      {tag.name}
    </span>
  );
}
