import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../../services/authService";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!showSuccess) return;

    const timeoutId = globalThis.setTimeout(() => {
      navigate("/login");
    }, 3000);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [navigate, showSuccess]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await forgotPassword(email);
      setShowSuccess(true);
    } catch {
      setErrorMessage("Nao foi possivel enviar a recuperacao de senha. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
        <div className="auth-card">
          <form
            onSubmit={e => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="auth-form"
          >
            <h2>Recuperar senha</h2>

            {errorMessage && (
              <p className="auth-feedback auth-feedback-error">{errorMessage}</p>
            )}

            {showSuccess && (
              <p className="auth-feedback auth-feedback-success">
                Solicitação enviada com sucesso! Voltando para o login...
              </p>
            )}

            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isSubmitting || showSuccess}
            >
            </Input>
            <Button type="submit" disabled={isSubmitting || showSuccess}>
              {isSubmitting ? "Enviando..." : "Enviar"}
            </Button>
            
          </form>
      </div>
    </div>
  );
}
