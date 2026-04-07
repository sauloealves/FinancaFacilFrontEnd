import { useState } from "react";
import { Button, Input, Modal } from "../../components/ui";
import { useAuth } from "../../contexts/auth/AuthContext";
import { getErrorMessage } from "../../services/api";
import { exportUserBackup } from "../../services/exportService";
import "./ProfileSettingsModal.css";

type ProfileSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type FormState = {
  name: string;
  phone: string;
  notificationsEnabled: boolean;
  notifyWhatsapp: boolean;
  notifyEmail: boolean;
};

function createFormState(user: NonNullable<ReturnType<typeof useAuth>["user"]>): FormState {
  return {
    name: user.name,
    phone: user.phone,
    notificationsEnabled: user.notificationsEnabled,
    notifyWhatsapp: user.notificationChannels.whatsapp,
    notifyEmail: user.notificationChannels.email,
  };
}

export default function ProfileSettingsModal({
  isOpen,
  onClose,
}: Readonly<ProfileSettingsModalProps>) {
  const { user, updateUserProfile } = useAuth();
  const safeUser = user ?? {
    id: "",
    name: "",
    email: "",
    phone: "",
    notificationsEnabled: false,
    notificationChannels: {
      whatsapp: false,
      email: false,
    },
  };
  const [form, setForm] = useState<FormState>(() => createFormState(safeUser));
  const [errorMessage, setErrorMessage] = useState("");
  const [backupErrorMessage, setBackupErrorMessage] = useState("");
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

  if (!user) {
    return null;
  }

  function handleSave() {
    if (!form.name.trim()) {
      setErrorMessage("Informe o nome.");
      return;
    }

    if (form.notificationsEnabled && !form.notifyWhatsapp && !form.notifyEmail) {
      setErrorMessage("Selecione ao menos um canal de notificação.");
      return;
    }

    updateUserProfile({
      name: form.name.trim(),
      phone: form.phone.trim(),
      notificationsEnabled: form.notificationsEnabled,
      notificationChannels: {
        whatsapp: form.notificationsEnabled ? form.notifyWhatsapp : false,
        email: form.notificationsEnabled ? form.notifyEmail : false,
      },
    });
    onClose();
  }

  async function handleDownloadBackup() {
    setBackupErrorMessage("");
    setIsDownloadingBackup(true);

    try {
      const { fileBlob, fileName } = await exportUserBackup();
      const downloadUrl = URL.createObjectURL(fileBlob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setBackupErrorMessage(getErrorMessage(error, "Nao foi possivel baixar o backup agora."));
    } finally {
      setIsDownloadingBackup(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Editar Perfil"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar alterações</Button>
        </>
      }
    >
      <div className="profile-settings-modal">
        {errorMessage && (
          <div className="profile-settings-feedback error">{errorMessage}</div>
        )}

        <section className="profile-settings-section">
          <div className="profile-settings-section-header">
            <h4>Pessoal</h4>
            <p>Atualize seus dados pessoais visíveis na conta.</p>
          </div>

          <div className="profile-settings-grid">
            <Input
              label="Nome"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              label="Telefone"
              type="tel"
              value={form.phone}
              placeholder="(00) 00000-0000"
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
            <Input
              label="E-mail"
              type="email"
              value={user.email}
              disabled
              onChange={() => undefined}
            />
          </div>
        </section>

        <section className="profile-settings-section">
          <div className="profile-settings-section-header">
            <h4>Notificações</h4>
            <p>Defina se deseja receber notificações e por quais canais.</p>
          </div>

          <div className="profile-settings-choice-group" role="radiogroup" aria-label="Permitir notificações">
            <label className="profile-settings-choice">
              <input
                type="radio"
                name="notifications-enabled"
                checked={form.notificationsEnabled}
                onChange={() =>
                  setForm((current) => ({
                    ...current,
                    notificationsEnabled: true,
                    notifyEmail: current.notifyEmail,
                    notifyWhatsapp: current.notifyWhatsapp,
                  }))
                }
              />
              <span>Sim</span>
            </label>
            <label className="profile-settings-choice">
              <input
                type="radio"
                name="notifications-enabled"
                checked={!form.notificationsEnabled}
                onChange={() =>
                  setForm((current) => ({
                    ...current,
                    notificationsEnabled: false,
                    notifyEmail: false,
                    notifyWhatsapp: false,
                  }))
                }
              />
              <span>Não</span>
            </label>
          </div>

          {form.notificationsEnabled && (
            <div className="profile-settings-channel-group">
              <label className="profile-settings-channel">
                <input
                  type="checkbox"
                  checked={form.notifyWhatsapp}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notifyWhatsapp: event.target.checked }))
                  }
                />
                <span>Whatsapp</span>
              </label>
              <label className="profile-settings-channel">
                <input
                  type="checkbox"
                  checked={form.notifyEmail}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notifyEmail: event.target.checked }))
                  }
                />
                <span>Email</span>
              </label>
            </div>
          )}
        </section>

        <section className="profile-settings-section">
          <div className="profile-settings-section-header">
            <h4>Backup dos dados</h4>
            <p>Baixe um arquivo Excel com toda a base de dados da sua conta.</p>
          </div>

          <div className="profile-settings-backup-actions">
            <Button
              variant="secondary"
              onClick={handleDownloadBackup}
              disabled={isDownloadingBackup}
            >
              {isDownloadingBackup ? "Baixando backup..." : "Baixar backup (.xlsx)"}
            </Button>
            <span className="profile-settings-backup-hint">
              O arquivo sera gerado pelo servidor e baixado em formato XLSX.
            </span>
          </div>

          {backupErrorMessage && (
            <div className="profile-settings-feedback error">{backupErrorMessage}</div>
          )}
        </section>
      </div>
    </Modal>
  );
}