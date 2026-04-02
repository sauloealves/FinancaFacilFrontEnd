import { Card } from "../../components/ui";
import type { BudgetCategorySummary } from "./types";
import BudgetStatusBadge from "./BudgetStatusBadge";
import { formatCurrency } from "./utils";

type BudgetCategoryStatusListProps = {
  categories: BudgetCategorySummary[];
};

export default function BudgetCategoryStatusList({ categories }: Readonly<BudgetCategoryStatusListProps>) {
  return (
    <Card title="Categorias">
      {categories.length === 0 ? (
        <div className="budget-empty-inline">
          Nenhuma categoria encontrada para este orçamento.
        </div>
      ) : (
        <div className="budget-category-table-wrapper">
          <table className="budget-table budget-table-compact">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Planejado</th>
                <th>Realizado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.categoryId}>
                  <td>{category.categoryName}</td>
                  <td>{formatCurrency(category.planned)}</td>
                  <td>{formatCurrency(category.realized)}</td>
                  <td>
                    <BudgetStatusBadge health={category.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}