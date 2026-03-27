import { useMemo, useState } from "react";
import { Button, Modal } from "../../components/ui";
import { useLaunches } from "../../contexts/launches/useLaunches";
import { completeFailedTransaction } from "../../services/launchService";
import type { FailedTransactionRow } from "./types";
import ResolveFailedTransactionModal from "./ResolveFailedTransactionModal";
import "./FailedTransactionsModal.css";

type FailedTransactionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function FailedTransactionsModal({
  isOpen,
  onClose,
}: Readonly<FailedTransactionsModalProps>) {
  const {
    failedTransactions,
    reloadFailedTransactions,
    removeFailedTransaction,
  } = useLaunches();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<FailedTransactionRow | null>(null);

  const pendingCount = failedTransactions.length;
  const modalTitle = useMemo(() => {
    if (pendingCount === 1) {
      return "1 lançamento pendente do WhatsApp";
    }

    return `${pendingCount} lançamentos pendentes do WhatsApp`;
  }, [pendingCount]);

  async function handleRefresh() {
    setActionError("");
    setIsRefreshing(true);

    try {
      await reloadFailedTransactions();
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleResolved(id: string) {
    removeFailedTransaction(id);
    setSelectedTransaction(null);
  }

  async function handleDiscard(id: string) {
    setActionError("");
    setProcessingIds((current) => [...current, id]);

    try {
      await completeFailedTransaction(id);
      removeFailedTransaction(id);
      if (selectedTransaction?.id === id) {
        setSelectedTransaction(null);
      }
    } catch (error) {
      console.error("Erro ao descartar lançamento pendente:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o lançamento da lista de pendentes.",
      );
    } finally {
      setProcessingIds((current) => current.filter((itemId) => itemId !== id));
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        title={modalTitle}
        onClose={onClose}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={() => void handleRefresh()} disabled={isRefreshing}>
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </Button>
          </>
        }
      >
        <div className="failed-transactions-panel">
          {actionError && (
            <div className="failed-transactions-error-banner">
              <strong>Erro:</strong> {actionError}
            </div>
          )}

          <div className="failed-transactions-summary">
            <strong>{pendingCount}</strong>
            <span>
              Revise conta, categoria, data e descrição antes de salvar cada lançamento.
            </span>
          </div>

          {pendingCount === 0 ? (
            <div className="failed-transactions-empty-state">
              <h4>Nenhum lançamento pendente</h4>
              <p>Quando uma mensagem do WhatsApp não puder ser conciliada automaticamente, ela aparecerá aqui.</p>
            </div>
          ) : (
            <>
              <div className="failed-transactions-table-wrapper">
                <table className="failed-transactions-table">
                  <thead>
                    <tr>
                      <th>Mensagem</th>
                      <th>Tipo</th>
                      <th>Conta</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                      <th aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {failedTransactions.map((transaction) => {
                      const isProcessing = processingIds.includes(transaction.id);

                      return (
                      <tr key={transaction.id}>
                        <td className="failed-transactions-message-cell">{transaction.rawMessage}</td>
                        <td>
                          <span className={`failed-transaction-type-pill ${transaction.type}`}>
                            {transaction.type === "expense" ? "Despesa" : "Receita"}
                          </span>
                        </td>
                        <td>{transaction.account?.name ?? "Não identificada"}</td>
                        <td>{transaction.category?.name ?? "Não identificada"}</td>
                        <td>{formatCurrency(transaction.value)}</td>
                        <td className="failed-transactions-actions-cell">
                          <button
                            type="button"
                            className="failed-transactions-action"
                            disabled={isProcessing}
                            onClick={() => setSelectedTransaction(transaction)}
                          >
                            Revisar
                          </button>
                          <button
                            type="button"
                            className="failed-transactions-action failed-transactions-action-secondary"
                            disabled={isProcessing}
                            onClick={() => void handleDiscard(transaction.id)}
                          >
                            {isProcessing ? "Processando..." : "Descartar"}
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              <div className="failed-transactions-mobile-list">
                {failedTransactions.map((transaction) => {
                  const isProcessing = processingIds.includes(transaction.id);

                  return (
                  <article key={transaction.id} className="failed-transactions-mobile-card">
                    <div className="failed-transactions-mobile-card-header">
                      <span className={`failed-transaction-type-pill ${transaction.type}`}>
                        {transaction.type === "expense" ? "Despesa" : "Receita"}
                      </span>
                      <strong>{formatCurrency(transaction.value)}</strong>
                    </div>
                    <p>{transaction.rawMessage}</p>
                    <dl>
                      <div>
                        <dt>Conta</dt>
                        <dd>{transaction.account?.name ?? "Não identificada"}</dd>
                      </div>
                      <div>
                        <dt>Categoria</dt>
                        <dd>{transaction.category?.name ?? "Não identificada"}</dd>
                      </div>
                    </dl>
                    <div className="failed-transactions-mobile-actions">
                      <button
                        type="button"
                        className="failed-transactions-action"
                        disabled={isProcessing}
                        onClick={() => setSelectedTransaction(transaction)}
                      >
                        Revisar lançamento
                      </button>
                      <button
                        type="button"
                        className="failed-transactions-action failed-transactions-action-secondary"
                        disabled={isProcessing}
                        onClick={() => void handleDiscard(transaction.id)}
                      >
                        {isProcessing ? "Processando..." : "Descartar"}
                      </button>
                    </div>
                  </article>
                )})}
              </div>
            </>
          )}
        </div>
      </Modal>

      {selectedTransaction && (
        <ResolveFailedTransactionModal
          failedTransaction={selectedTransaction}
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onResolved={handleResolved}
        />
      )}
    </>
  );
}