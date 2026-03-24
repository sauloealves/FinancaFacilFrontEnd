import { useEffect, useState } from "react";
import { Button, Input, Modal } from "../../components/ui";
import { changePassword } from "../../services/authService";
import { getErrorMessage } from "../../services/api";
import "./ChangePasswordModal.css";

type ChangePasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ChangePasswordModal({
  isOpen,
  onClose,
}: Readonly<ChangePasswordModalProps>) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [isOpen]);

  async function handleSubmit() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Preencha todos os campos da senha.");
      setSuccessMessage("");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("A nova senha deve ter pelo menos 6 caracteres.");
      setSuccessMessage("");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("A confirmação da senha não confere.");
      setSuccessMessage("");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await changePassword({ currentPassword, newPassword });
      setSuccessMessage("Senha alterada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      globalThis.setTimeout(onClose, 900);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Não foi possível alterar a senha."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Trocar Senha"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </>
      }
    >
      <div className="change-password-modal">
        {errorMessage && <div className="change-password-feedback error">{errorMessage}</div>}
        {successMessage && <div className="change-password-feedback success">{successMessage}</div>}

        <Input
          label="Senha atual"
          autoFocus={true}
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          disabled={isSubmitting}
        />
        <Input
          label="Nova senha"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          disabled={isSubmitting}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={isSubmitting}
        />
      </div>
    </Modal>
  );
}