import { useState } from "react";
import {
  createAccount,
  updateAccount,
  deleteAccount
} from "../services/accountService";
import AccountModal from "../features/accounts/components/AccountModal";
import AccountTable from "../features/accounts/components/AccountTable";
import type { Account } from "../features/accounts/types";
import { calculateAccountCurrentBalance } from "../utils/calculateAccountCurrentBalance";
import { useAccounts } from "../contexts/accounts/useAccounts";
import { useLaunches } from "../contexts/launches/useLaunches";
import "./AccountsPage.css";

export default function AccountsPage() {

  const {
  accounts,
  addAccount,
  editAccount,
  removeAccount,
  reloadAccounts
} = useAccounts();

  const { launches } = useLaunches();

  const [editing, setEditing] =
    useState<Account | null>(null);

  const [showModal, setShowModal] =
    useState(false);

  const balances = Object.fromEntries(
    accounts.map((a) => [
      a.id,
      calculateAccountCurrentBalance(a, launches),
    ])
  );

  async function handleSave(data: {
    name: string;
    initialBalance: number;
  }) {
    try {
      if (editing) {
        const updated = await updateAccount(
          editing.id,
          data
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
      alert("Ocorreu um erro ao salvar a conta.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja excluir esta conta?")) return;

    try {
      await deleteAccount(id);
      removeAccount(id);
    } catch {
      alert("Erro ao excluir conta.");
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

      <AccountTable
        accounts={accounts}
        balances={balances}
        onEdit={(account) => {
          setEditing(account);
          setShowModal(true);
        }}
        onDelete={handleDelete}
      />

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