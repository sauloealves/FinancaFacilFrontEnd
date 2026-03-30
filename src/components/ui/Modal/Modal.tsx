import { useEffect } from "react";
import "./Modal.css";

type ModalProps = {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "fullscreen";
  titleTone?: "default" | "revenue" | "expense" | "transfer";
  className?: string;
};

export default function Modal({
  isOpen,
  title,
  children,
  footer,
  onClose,
  size = "md",
  titleTone = "default",
  className,
}: Readonly<ModalProps>) {
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <button
        type="button"
        className="modal-backdrop"
        onClick={onClose}
        aria-label="Fechar modal"
      />
      <dialog
        open
        className={className ? `modal modal-${size} ${className}` : `modal modal-${size}`}
      >
        {/* HEADER */}
        <div className="modal-header">
          <h3 className={`modal-title modal-title-${titleTone}`}>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          {children}
        </div>

        {/* FOOTER */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </dialog>
    </div>
  );
}
