import type { Category } from "./types";

type Props = {
  categories: Category[];
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
};

export default function CategoryTable({ categories, onEdit, onDelete }: Props) {
  function getParentName(parentId?: string | null) {
    if (!parentId) return "-";
    const parent = categories.find((c) => c.id === parentId);
    return parent ? parent.name : "-";
  }

  return (
    <table className="categories-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Categoria Pai</th>
          <th>Ações</th>
        </tr>
      </thead>

      <tbody>
        {categories.map((c) => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td>{getParentName(c.parentId)}</td>
            <td>
              <div className="category-actions">
                <button className="btn-action edit" onClick={() => onEdit(c)}>
                  ✏ Editar
                </button>

                <button className="btn-action delete" onClick={() => onDelete(c.id)}>
                  🗑 Excluir
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
