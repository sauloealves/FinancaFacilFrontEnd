import { useState } from "react";
import {
  createAccount,
  updateAccount,
  deleteAccount
} from "../services/accountService";
import { getErrorMessage } from "../services/api";
import AccountModal from "../features/accounts/components/AccountModal";
import AccountTable from "../features/accounts/components/AccountTable";
import type { Account } from "../features/accounts/types";
import { useAccounts } from "../contexts/accounts/useAccounts";
import "./AccountsPage.css";

export default function AccountsPage() {

  const {
  accounts,
  addAccount,
  editAccount,
  removeAccount,
  reloadAccounts
} = useAccounts();

  const [editing, setEditing] =
    useState<Account | null>(null);

  const [showModal, setShowModal] =
    useState(false);

  const enabledAccounts = accounts.filter((account) => account.isEnabled);
  const disabledAccounts = accounts.filter((account) => !account.isEnabled);

  async function handleSave(data: {
    name: string;
    initialBalance: number;
  }) {
    try {
      if (editing) {
        const updated = await updateAccount(
          editing.id,
          {
            ...data,
            isEnabled: editing.isEnabled,
          }
        );

        editAccount(updated);

      } else {
        const created =
          await createAccount(data);

        addAccount(created);
      }

      await reloadAccounts();
      setShowModal(false);
      setEditing(null);
    }
    catch (error) {
      console.log(error);
      alert(getErrorMessage(error, "Ocorreu um erro ao salvar a conta."));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja excluir esta conta?")) return;

    try {
      await deleteAccount(id);
      removeAccount(id);
    } catch (error) {
      alert(getErrorMessage(error, "Erro ao excluir conta."));
    }
  }

  async function handleToggleEnabled(account: Account) {
    const nextIsEnabled = !account.isEnabled;
    const confirmationMessage = nextIsEnabled
      ? `Deseja habilitar a conta ${account.name}?`
      : `Deseja desabilitar a conta ${account.name}?`;

    if (!confirm(confirmationMessage)) return;

    try {
      const updated = await updateAccount(account.id, {
        name: account.name,
        initialBalance: account.initialBalance,
        isEnabled: nextIsEnabled,
      });

      editAccount(updated);
      await reloadAccounts();
    } catch (error) {
      alert(getErrorMessage(error, "Erro ao atualizar o status da conta."));
    }
  }

  return (
    <div className="accounts-page">
      <div className="page-header">
        <h2>Contas</h2>

        <button className="btn-primary"
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
        >
          + Nova Conta
        </button>
      </div>

      <section className="accounts-section">
        <div className="accounts-section-header">
          <h3>Contas habilitadas</h3>
          <span>{enabledAccounts.length} conta(s)</span>
        </div>

        <AccountTable
          accounts={enabledAccounts}
          emptyMessage="Nenhuma conta habilitada encontrada."
          onEdit={(account) => {
            setEditing(account);
            setShowModal(true);
          }}
          onDelete={handleDelete}
          onToggleEnabled={handleToggleEnabled}
        />
      </section>

      <section className="accounts-section">
        <div className="accounts-section-header">
          <h3>Contas desabilitadas</h3>
          <span>{disabledAccounts.length} conta(s)</span>
        </div>

        <AccountTable
          accounts={disabledAccounts}
          emptyMessage="Nenhuma conta desabilitada encontrada."
          onEdit={(account) => {
            setEditing(account);
            setShowModal(true);
          }}
          onDelete={handleDelete}
          onToggleEnabled={handleToggleEnabled}
        />
      </section>

      {showModal && (
        <AccountModal
          account={editing}
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