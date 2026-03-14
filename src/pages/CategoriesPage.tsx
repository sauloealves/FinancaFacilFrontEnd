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

export default function CategoriesPage() {
  const { categories, addCategory, editCategory, removeCategory, reloadCategories } = useCategories();

  const [editing, setEditing] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);

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

      <CategoryTable
        categories={categories}
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
    </div>
  );
}
