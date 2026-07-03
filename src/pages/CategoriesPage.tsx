import { useState } from "react";
import "./CategoriesPage.css";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "../services/categoryService";
import { getErrorMessage } from "../services/api";
import CategoryModal from "../features/categories/CategoryModal";
import CategoryTable from "../features/categories/CategoryTable";
import type { Category } from "../features/categories/types";
import { useCategories } from "../contexts/categories/useCategories";
import { useTags } from "../contexts/tags/useTags";
import CategoryTagManagerModal from "../features/tags/CategoryTagManagerModal";
import SearchableSelect from "../components/ui/SearchableSelect/SearchableSelect";
import type { Tag } from "../features/tags/types";

export default function CategoriesPage() {
  const { categories, addCategory, editCategory, removeCategory, reloadCategories } = useCategories();
  const { tags, getTagsForCategory } = useTags();

  const [editing, setEditing] = useState<Category | null>(null);
  const [managingTagsFor, setManagingTagsFor] = useState<Category | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  const visibleCategories = selectedTagFilter
    ? categories.filter((category) =>
        getTagsForCategory(category.id).some((tag) => tag.id === selectedTagFilter),
      )
    : categories;

  async function handleSave(data: { name: string; parentId?: string | null }) {
    try {
      if (editing) {
        const updated = await updateCategory(editing.id, data);
        editCategory(updated);
      } else {
        const created = await createCategory(data);
        addCategory(created);
      }

      await reloadCategories();
      setShowModal(false);
      setEditing(null);
    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error, "Erro ao salvar categoria."));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja excluir esta categoria?")) return;

    try {
      await deleteCategory(id);
      removeCategory(id);
    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error, "Erro ao excluir categoria."));
    }
  }

  return (
    <div className="categories-page">
      <div className="page-header">
        <h2>Categorias</h2>

        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
        >
          + Nova Categoria
        </button>
      </div>

      <div className="categories-tag-filter">
        <SearchableSelect<Tag>
          items={tags}
          selectedValue={selectedTagFilter}
          onSelect={setSelectedTagFilter}
          getLabel={(tag) => tag.name}
          getId={(tag) => tag.id}
          label="Filtrar categorias por tag"
          placeholder="Selecione uma tag"
        />
      </div>

      <CategoryTable
        categories={visibleCategories}
        getTagsForCategory={getTagsForCategory}
        onManageTags={setManagingTagsFor}
        onEdit={(c) => {
          setEditing(c);
          setShowModal(true);
        }}
        onDelete={handleDelete}
      />

      {showModal && (
        <CategoryModal
          category={editing}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      <CategoryTagManagerModal
        isOpen={!!managingTagsFor}
        category={managingTagsFor}
        onClose={() => setManagingTagsFor(null)}
      />
    </div>
  );
}
