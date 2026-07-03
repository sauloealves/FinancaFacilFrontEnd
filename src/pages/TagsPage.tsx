import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../services/api";
import { createTag, deleteTag, updateTag } from "../services/tagService";
import { useTags } from "../contexts/tags/useTags";
import type { Tag } from "../features/tags/types";
import TagBadge from "../features/tags/TagBadge";
import TagFormModal from "../features/tags/TagFormModal";
import { formatDateBR } from "../utils/date";
import "./TagsPage.css";

type SortField = "name" | "createdAt";

function sortTags(tags: Tag[], sortField: SortField) {
  return [...tags].sort((first, second) => {
    if (sortField === "name") {
      return first.name.localeCompare(second.name, "pt-BR", {
        sensitivity: "base",
      });
    }

    return second.createdAt.localeCompare(first.createdAt);
  });
}

export default function TagsPage() {
  const { tags, isLoadingTags, reloadTags } = useTags();

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const visibleTags = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    const filtered = normalizedSearch.length === 0
      ? tags
      : tags.filter((tag) => tag.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch));

    return sortTags(filtered, sortField);
  }, [tags, search, sortField]);

  async function handleCreateTag(payload: { name: string; color: string }) {
    try {
      await createTag(payload);
      await reloadTags();
    } catch (error) {
      throw new Error(getErrorMessage(error, "Não foi possível criar a tag."));
    }
  }

  async function handleUpdateTag(payload: { name: string; color: string }) {
    if (!editingTag) {
      return;
    }

    try {
      await updateTag(editingTag.id, payload);
      await reloadTags();
    } catch (error) {
      throw new Error(getErrorMessage(error, "Não foi possível atualizar a tag."));
    }
  }

  async function handleDeleteTag(tagId: string) {
    const hasConfirmed = confirm("Deseja excluir esta tag? A exclusão é lógica e a tag deixará de aparecer nas listagens.");

    if (!hasConfirmed) {
      return;
    }

    try {
      await deleteTag(tagId);
      await reloadTags();
    } catch (error) {
      alert(getErrorMessage(error, "Não foi possível excluir a tag."));
    }
  }

  return (
    <section className="tags-page">
      <header className="tags-page-header">
        <div>
          <h2>Tags</h2>
          <p>Crie e organize tags para classificar categorias.</p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingTag(null);
            setIsModalOpen(true);
          }}
        >
          + Nova Tag
        </button>
      </header>

      <div className="tags-page-filters">
        <input
          type="text"
          placeholder="Buscar tag por nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select value={sortField} onChange={(event) => setSortField(event.target.value as SortField)}>
          <option value="name">Ordenar por nome</option>
          <option value="createdAt">Ordenar por data</option>
        </select>
      </div>

      <div className="tags-table-shell">
        <table className="tags-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Cor</th>
              <th>Categorias</th>
              <th>Criada em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {!isLoadingTags && visibleTags.length === 0 && (
              <tr>
                <td colSpan={5} className="tags-empty">
                  Nenhuma tag encontrada.
                </td>
              </tr>
            )}

            {visibleTags.map((tag) => (
              <tr key={tag.id}>
                <td>
                  <Link to={`/tags/${tag.id}`} className="tags-table-link">
                    {tag.name}
                  </Link>
                </td>
                <td>
                  <TagBadge tag={tag} />
                </td>
                <td>{tag.categoryCount}</td>
                <td>{formatDateBR(tag.createdAt)}</td>
                <td>
                  <div className="tags-row-actions">
                    <button
                      type="button"
                      className="btn-action edit"
                      onClick={() => {
                        setEditingTag(tag);
                        setIsModalOpen(true);
                      }}
                    >
                      ✏ Editar
                    </button>
                    <button
                      type="button"
                      className="btn-action delete"
                      onClick={() => void handleDeleteTag(tag.id)}
                    >
                      🗑 Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TagFormModal
        isOpen={isModalOpen}
        tag={editingTag}
        allTags={tags}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTag(null);
        }}
        onSave={editingTag ? handleUpdateTag : handleCreateTag}
      />
    </section>
  );
}
