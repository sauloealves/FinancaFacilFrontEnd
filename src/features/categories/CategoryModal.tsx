import { useState, useEffect, useRef } from "react";
import type { Category } from "./types";

type Props = {
  category?: Category | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: { name: string; parentId?: string | null }) => void;
};

export default function CategoryModal({
  category,
  categories,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const initialRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      initialRef.current?.focus();
      initialRef.current?.select();
    });
  }, []);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setParentId(category.parentId ?? null);
    }
  }, [category]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const valid = name.trim().length > 0;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h3>{category ? "Editar Categoria" : "Nova Categoria"}</h3>

        <div className="form-row">
          <div className="form-field">
            <label>Nome</label>
            <input
              ref={initialRef}
              type="text"
              placeholder="Nome da categoria"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>Categoria Pai (opcional)</label>
            <select
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value || null)}
            >
              <option value="">Nenhuma</option>
              {categories
                .filter((c) => c.id !== category?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
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
    </div>
  );
}
