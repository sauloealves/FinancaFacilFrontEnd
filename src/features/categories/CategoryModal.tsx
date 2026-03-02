import { useState, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import type { Category } from "./types";
import SearchableSelect from "../../components/ui/SearchableSelect/SearchableSelect";
import { sortCategoriesHierarchically } from "../../utils/sortUtils";
import "./CategoryModal.css";

type Props = {
  readonly category?: Category | null;
  readonly categories: Category[];
  readonly onClose: () => void;
  readonly onSave: (data: { name: string; parentId?: string | null }) => void;
};

export default function CategoryModal({
  category,
  categories,
  onClose,
  onSave,
}: Readonly<Props>) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const initialRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    flushSync(() => {
      setName(category?.name ?? "");
      setParentId(category?.parentId ?? null);
    });

    const frame = requestAnimationFrame(() => {
      initialRef.current?.focus();
      initialRef.current?.select();
    });

    return () => cancelAnimationFrame(frame);
  }, [category]);

  // Função para obter todos os descendentes de uma categoria
  function getDescendants(categoryId: string): Set<string> {
    const descendants = new Set<string>();

    function addDescendants(id: string) {
      const children = categories.filter((c) => c.parentId === id);
      children.forEach((child) => {
        descendants.add(child.id);
        addDescendants(child.id);
      });
    }

    addDescendants(categoryId);
    return descendants;
  }

  // Filtra categorias que podem ser pais (exclui a atual e seus descendentes)
  const availableParents = sortCategoriesHierarchically(
    categories.filter((c) => {
      if (category?.id === c.id) return false;
      if (category) {
        const descendants = getDescendants(category.id);
        return !descendants.has(c.id);
      }
      return true;
    })
  );

  const valid = name.trim().length > 0;

  return (
    <dialog
      className="modal-overlay-dialog"
      open
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="modal">
        <h3>{category ? "Editar Categoria" : "Nova Categoria"}</h3>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="category-name">Nome</label>
            <input
              id="category-name"
              ref={initialRef}
              type="text"
              placeholder="Nome da categoria"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <SearchableSelect<Category>
              label="Categoria Pai (opcional)"
              items={availableParents}
              selectedValue={parentId}
              onSelect={setParentId}
              getLabel={(c) => c.name}
              getId={(c) => c.id}
              placeholder="Buscar categoria pai..."
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onClose}>
            Cancelar
          </button>

          <button
            className="btn-salvar"
            disabled={!valid}
            onClick={() => onSave({ name: name.trim(), parentId })}
          >
            Salvar
          </button>
        </div>
      </div>
    </dialog>
  );
}
