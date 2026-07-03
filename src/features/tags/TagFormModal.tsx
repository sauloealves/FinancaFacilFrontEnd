import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "../../components/ui";
import type { Tag, UpsertTagPayload } from "./types";
import "./TagFormModal.css";

type TagFormModalProps = {
  isOpen: boolean;
  tag?: Tag | null;
  allTags: Tag[];
  onClose: () => void;
  onSave: (payload: UpsertTagPayload) => Promise<void>;
};

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function normalizeColor(value: string) {
  const normalized = value.trim().toUpperCase();
  return HEX_COLOR_PATTERN.test(normalized) ? normalized : "#2563EB";
}

export default function TagFormModal({
  isOpen,
  tag,
  allTags,
  onClose,
  onSave,
}: Readonly<TagFormModalProps>) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563EB");
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(tag?.name ?? "");
    setColor(normalizeColor(tag?.color ?? "#2563EB"));
    setSubmitError("");
    setIsSaving(false);
  }, [tag, isOpen]);

  const normalizedName = name.trim();
  const normalizedColor = useMemo(() => normalizeColor(color), [color]);

  const duplicatedName = allTags.some((item) => {
    if (tag?.id && item.id === tag.id) {
      return false;
    }

    return item.name.trim().toLocaleLowerCase("pt-BR") === normalizedName.toLocaleLowerCase("pt-BR");
  });

  let nameError = "";
  if (normalizedName.length === 0) {
    nameError = "Nome da tag é obrigatório.";
  } else if (normalizedName.length > 50) {
    nameError = "Nome da tag deve ter no máximo 50 caracteres.";
  } else if (duplicatedName) {
    nameError = `Já existe uma tag com o nome "${normalizedName}".`;
  }

  const colorError = HEX_COLOR_PATTERN.test(color.trim())
    ? ""
    : "A cor deve estar no formato #RRGGBB.";

  const isValid = !nameError && !colorError;

  async function handleSubmit() {
    if (!isValid || isSaving) {
      return;
    }

    setIsSaving(true);
    setSubmitError("");

    try {
      await onSave({
        name: normalizedName,
        color: normalizedColor,
      });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Não foi possível salvar a tag.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={tag ? "Editar Tag" : "Nova Tag"}
      onClose={onClose}
      size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!isValid || isSaving}>
            Salvar
          </Button>
        </>
      )}
    >
      <div className="tag-form-modal-fields">
        <label htmlFor="tag-name">Nome da tag</label>
        <input
          id="tag-name"
          type="text"
          value={name}
          maxLength={50}
          placeholder="Ex: Essencial"
          onChange={(event) => setName(event.target.value)}
        />
        {nameError && <p className="tag-form-modal-error">{nameError}</p>}

        <label htmlFor="tag-color">Cor</label>
        <div className="tag-form-modal-color-row">
          <input
            id="tag-color"
            type="color"
            value={HEX_COLOR_PATTERN.test(color) ? color : normalizedColor}
            onChange={(event) => setColor(normalizeColor(event.target.value))}
            aria-label="Selecionar cor da tag"
          />
          <input
            type="text"
            value={color}
            placeholder="#FF5733"
            onChange={(event) => setColor(event.target.value.toUpperCase())}
          />
        </div>
        {colorError && <p className="tag-form-modal-error">{colorError}</p>}

        {submitError && <p className="tag-form-modal-error">{submitError}</p>}
      </div>
    </Modal>
  );
}
