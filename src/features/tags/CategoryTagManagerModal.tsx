import { useMemo, useState } from "react";
import { Button, Modal } from "../../components/ui";
import SearchableSelect from "../../components/ui/SearchableSelect/SearchableSelect";
import { useTags } from "../../contexts/tags/useTags";
import type { Category } from "../categories/types";
import type { Tag } from "./types";
import { getErrorMessage } from "../../services/api";
import { associateTagToCategory, disassociateTagFromCategory } from "../../services/tagService";
import TagBadge from "./TagBadge";
import "./CategoryTagManagerModal.css";

type CategoryTagManagerModalProps = {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
};

export default function CategoryTagManagerModal({
  isOpen,
  category,
  onClose,
}: Readonly<CategoryTagManagerModalProps>) {
  const { tags, getTagsForCategory, reloadTags } = useTags();
  const [selectedTagId, setSelectedTagId] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const associatedTags = category ? getTagsForCategory(category.id) : [];

  const availableTags = useMemo(() => {
    const associatedIds = new Set(associatedTags.map((tag) => tag.id));
    return tags.filter((tag) => !associatedIds.has(tag.id));
  }, [tags, associatedTags]);

  async function handleAssociate() {
    if (!category?.id || !selectedTagId) {
      return;
    }

    setIsBusy(true);
    setError("");

    try {
      await associateTagToCategory({
        categoryId: category.id,
        tagId: selectedTagId,
      });
      setSelectedTagId("");
      await reloadTags();
    } catch (associateError) {
      setError(getErrorMessage(associateError, "Não foi possível associar a tag."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDisassociate(tag: Tag) {
    if (!category?.id) {
      return;
    }

    setIsBusy(true);
    setError("");

    try {
      await disassociateTagFromCategory({
        categoryId: category.id,
        tagId: tag.id,
      });
      await reloadTags();
    } catch (disassociateError) {
      setError(getErrorMessage(disassociateError, "Não foi possível remover a tag desta categoria."));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={category ? `Gerenciar Tags de ${category.name}` : "Gerenciar Tags"}
      onClose={onClose}
      size="lg"
      footer={(
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      )}
    >
      <section className="category-tag-manager">
        <h4>Tags associadas</h4>
        {associatedTags.length === 0 ? (
          <p className="category-tag-manager-empty">Nenhuma tag associada.</p>
        ) : (
          <ul className="category-tag-manager-list">
            {associatedTags.map((tag) => (
              <li key={tag.id}>
                <TagBadge tag={tag} />
                <button
                  type="button"
                  className="btn-action delete"
                  disabled={isBusy}
                  onClick={() => void handleDisassociate(tag)}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}

        <h4>Adicionar nova tag</h4>
        <div className="category-tag-manager-associate-row">
          <SearchableSelect<Tag>
            items={availableTags}
            selectedValue={selectedTagId}
            onSelect={setSelectedTagId}
            getLabel={(tag) => tag.name}
            getId={(tag) => tag.id}
            placeholder="Buscar tags"
          />

          <Button onClick={() => void handleAssociate()} disabled={!selectedTagId || isBusy}>
            Associar
          </Button>
        </div>

        {error && <p className="category-tag-manager-error">{error}</p>}
      </section>
    </Modal>
  );
}
