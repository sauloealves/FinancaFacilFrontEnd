import { Card } from "../../components/ui";
import type { BudgetMonthDetail, BudgetTransaction } from "./types";
import BudgetStatusBadge from "./BudgetStatusBadge";
import { formatCurrency } from "./utils";

type BudgetMonthDetailPanelProps = {
  month: BudgetMonthDetail | null;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  transactions: BudgetTransaction[];
  isTransactionsLoading: boolean;
};

export default function BudgetMonthDetailPanel({
  month,
  selectedCategoryId,
  onSelectCategory,
  transactions,
  isTransactionsLoading,
}: Readonly<BudgetMonthDetailPanelProps>) {
  if (!month) {
    return (
      <Card title="Detalhe do mês">
        <div className="budget-empty-inline">Selecione um mês para ver os detalhes.</div>
      </Card>
    );
  }

  return (
    <div className="budget-month-grid">
      <Card title={`Categorias de ${month.label}`}>
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
              {month.categories.map((category) => (
                <tr
                  key={category.categoryId}
                  className={selectedCategoryId === category.categoryId ? "budget-table-row-active" : undefined}
                  onClick={() => onSelectCategory(category.categoryId)}
                >
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
      </Card>

      <Card title="Lançamentos do mês">
        {isTransactionsLoading ? (
          <div className="budget-skeleton-list">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={`transaction-skeleton-${index}`} className="budget-skeleton-row" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="budget-empty-inline">Nenhum lançamento encontrado para o filtro selecionado.</div>
        ) : (
          <div className="budget-category-table-wrapper">
            <table className="budget-table budget-table-compact">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Categoria</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td>
                    <td>{transaction.description}</td>
                    <td>{formatCurrency(transaction.value)}</td>
                    <td>{transaction.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}