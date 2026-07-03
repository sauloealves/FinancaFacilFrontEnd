import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SearchableSelect from "../components/ui/SearchableSelect/SearchableSelect";
import { useCategories } from "../contexts/categories/useCategories";
import { useTags } from "../contexts/tags/useTags";
import TagBadge from "../features/tags/TagBadge";
import TagFormModal from "../features/tags/TagFormModal";
import type { Category } from "../features/categories/types";
import type { Tag, TagDetail } from "../features/tags/types";
import { getErrorMessage } from "../services/api";
import {
  associateTagToCategory,
  disassociateTagFromCategory,
  updateTag,
} from "../services/tagService";
import { formatDateBR } from "../utils/date";
import "./TagDetailPage.css";

export default function TagDetailPage() {
  const { id = "" } = useParams();
  const { categories } = useCategories();
  const { tags, reloadTagDetail, reloadTags } = useTags();

  const [detail, setDetail] = useState<TagDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  const baseTag = useMemo(() => tags.find((tag) => tag.id === id) ?? null, [tags, id]);

  async function loadTagDetail() {
    if (!id) {
      setError("Tag não encontrada.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const tag = await reloadTagDetail(id);

      if (!tag) {
        setError("Tag não encontrada.");
        setDetail(null);
        return;
      }

      setDetail(tag);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Não foi possível carregar a tag."));
      setDetail(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTagDetail();
  }, [id]);

  const associatedCategoryIds = new Set(detail?.categories.map((category) => category.id) ?? []);
  const availableCategories = categories.filter((category) => !associatedCategoryIds.has(category.id));

  async function handleAssociateCategory() {
    if (!detail?.id || !selectedCategoryId) {
      return;
    }

    try {
      await associateTagToCategory({
        tagId: detail.id,
        categoryId: selectedCategoryId,
      });
      setSelectedCategoryId("");
      await Promise.all([loadTagDetail(), reloadTags()]);
    } catch (associateError) {
      alert(getErrorMessage(associateError, "Não foi possível associar a categoria."));
    }
  }

  async function handleDisassociateCategory(categoryId: string) {
    if (!detail?.id) {
      return;
    }

    try {
      await disassociateTagFromCategory({
        tagId: detail.id,
        categoryId,
      });
      await Promise.all([loadTagDetail(), reloadTags()]);
    } catch (disassociateError) {
      alert(getErrorMessage(disassociateError, "Não foi possível remover a associação."));
    }
  }

  async function handleUpdateTag(payload: { name: string; color: string }) {
    if (!detail?.id) {
      return;
    }

    try {
      await updateTag(detail.id, payload);
      await Promise.all([loadTagDetail(), reloadTags()]);
    } catch (updateError) {
      throw new Error(getErrorMessage(updateError, "Não foi possível atualizar a tag."));
    }
  }

  if (isLoading) {
    return <section className="tag-detail-page">Carregando tag...</section>;
  }

  if (error || !detail) {
    return (
      <section className="tag-detail-page">
        <p className="tag-detail-error">{error || "Tag não encontrada."}</p>
        <Link to="/tags" className="tag-detail-back-link">
          Voltar para tags
        </Link>
      </section>
    );
  }

  const editableTag: Tag = baseTag ?? {
    id: detail.id,
    name: detail.name,
    color: detail.color,
    createdAt: detail.createdAt,
    categoryCount: detail.categories.length,
  };

  return (
    <section className="tag-detail-page">
      <header className="tag-detail-header">
        <div>
          <Link to="/tags" className="tag-detail-back-link">
            ← Voltar para tags
          </Link>
          <h2>{detail.name}</h2>
          <div className="tag-detail-header-meta">
            <TagBadge tag={detail} />
            <span>{detail.categories.length} categorias associadas</span>
            <span>Criada em {formatDateBR(detail.createdAt)}</span>
          </div>
        </div>

        <button type="button" className="btn-primary" onClick={() => setIsTagModalOpen(true)}>
          Editar Tag
        </button>
      </header>

      <div className="tag-detail-content-grid">
        <section className="tag-detail-card">
          <h3>Categorias associadas</h3>

          {detail.categories.length === 0 ? (
            <p className="tag-detail-empty">Nenhuma categoria associada.</p>
          ) : (
            <ul className="tag-detail-list">
              {detail.categories.map((category) => (
                <li key={category.id}>
                  <div>
                    <strong>{category.name}</strong>
                    <p>Associada em {formatDateBR(category.associatedAt)}</p>
                  </div>

                  <button
                    type="button"
                    className="btn-action delete"
                    onClick={() => void handleDisassociateCategory(category.id)}
                  >
                    Remover associação
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tag-detail-card">
          <h3>Adicionar categorias</h3>
          <p>Selecione uma categoria ainda não associada para vincular à tag.</p>

          <div className="tag-detail-associate-row">
            <SearchableSelect<Category>
              items={availableCategories}
              selectedValue={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              getLabel={(item) => item.name}
              getId={(item) => item.id}
              placeholder="Buscar categoria"
              clearable
            />

            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleAssociateCategory()}
              disabled={!selectedCategoryId}
            >
              Associar
            </button>
          </div>
        </section>
      </div>

      <TagFormModal
        isOpen={isTagModalOpen}
        tag={editableTag}
        allTags={tags}
        onClose={() => setIsTagModalOpen(false)}
        onSave={handleUpdateTag}
      />
    </section>
  );
}
