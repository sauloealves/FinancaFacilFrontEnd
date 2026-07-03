import { useState } from "react";
import type { JSX } from "react";
import type { Category } from "./types";
import type { Tag } from "../tags/types";
import TagBadge from "../tags/TagBadge";

type Props = {
  readonly categories: Category[];
  readonly getTagsForCategory: (categoryId: string) => Tag[];
  readonly onManageTags: (category: Category) => void;
  readonly onEdit: (c: Category) => void;
  readonly onDelete: (id: string) => void;
};

export default function CategoryTable({
  categories,
  getTagsForCategory,
  onManageTags,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  }

  function getParentName(parentId?: string | null) {
    if (!parentId) return "-";
    const parent = categories.find((c) => c.id === parentId);
    return parent?.name ?? "-";
  }

  // Obter filhos diretos de uma categoria
  function getChildren(parentId: string) {
    return categories.filter((c) => c.parentId === parentId);
  }

  // Renderizar recursivamente categorias e seus filhos
  function renderCategory(cat: Category, level: number): JSX.Element[] {
    const children = getChildren(cat.id);
    const isExpanded = expandedIds.has(cat.id);
    const elements: JSX.Element[] = [];

    // Renderizar a própria categoria
    const categoryTags = getTagsForCategory(cat.id);

    elements.push(
      <tr key={cat.id}>
        <td data-label="Nome">
          <div style={{ paddingLeft: `${level * 24}px`, display: "flex", alignItems: "center", gap: "8px" }}>
            {children.length > 0 ? (
              <button
                className="expand-btn"
                onClick={() => toggleExpand(cat.id)}
                title={isExpanded ? "Retrair" : "Expandir"}
              >
                {isExpanded ? "▼" : "▶"}
              </button>
            ) : (
              <div style={{ width: "16px" }} />
            )}
            <span>{cat.name}</span>
          </div>
        </td>
        <td data-label="Categoria Pai">{getParentName(cat.parentId)}</td>
        <td data-label="Tags">
          {categoryTags.length === 0 ? (
            <span style={{ color: "var(--gray-500)" }}>Sem tags</span>
          ) : (
            <div className="category-tags-list">
              {categoryTags.map((tag) => (
                <TagBadge key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
          )}
        </td>
        <td data-label="Ações">
          <div className="category-actions">
            <button className="btn-action edit" onClick={() => onEdit(cat)}>
              ✏ Editar
            </button>
            <button className="btn-action" onClick={() => onManageTags(cat)}>
              🏷 Gerenciar Tags
            </button>
            <button className="btn-action delete" onClick={() => onDelete(cat.id)}>
              🗑 Excluir
            </button>
          </div>
        </td>
      </tr>
    );

    // Se expandido e tem filhos, renderizar filhos
    if (isExpanded && children.length > 0) {
      children.forEach((child) => {
        elements.push(...renderCategory(child, level + 1));
      });
    }

    return elements;
  }

  // Mostrar apenas categorias raiz (sem pai)
  const rootCategories = categories.filter((c) => !c.parentId);

  return (
    <table className="categories-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Categoria Pai</th>
          <th>Tags</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {rootCategories.length > 0 ? (
          rootCategories.flatMap((cat) => renderCategory(cat, 0))
        ) : (
          <tr>
            <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>
              Nenhuma categoria cadastrada
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
