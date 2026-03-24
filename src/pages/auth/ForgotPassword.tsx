import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../../services/authService";
import { getErrorMessage } from "../../services/api";
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
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Nao foi possivel enviar a recuperacao de senha. Tente novamente."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-background" aria-hidden="true" />
      <div className="auth-card">
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="auth-form"
        >
          <div className="auth-brand">
            <img
              src="/financa-facil-logo.svg"
              alt="Logotipo do Financa Facil"
              className="auth-brand-logo"
            />
            <div className="auth-brand-copy">
              <span className="auth-brand-kicker">Seu controle financeiro diario</span>
              <h1 className="auth-title">Financa Facil</h1>
              <p className="auth-subtitle">Recupere o acesso com seguranca e volte a acompanhar suas financas.</p>
            </div>
          </div>

          <div className="auth-form-header">
            <h2 className="auth-form-title">Recuperar senha</h2>
            <p className="auth-form-description">Informe seu e-mail para receber o link de redefinicao.</p>
          </div>

          {errorMessage && (
            <p className="auth-feedback auth-feedback-error">{errorMessage}</p>
          )}

          {showSuccess && (
            <p className="auth-feedback auth-feedback-success">
              Solicitacao enviada com sucesso. Voltando para o login...
            </p>
          )}

          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isSubmitting || showSuccess}
          />

          <Button type="submit" disabled={isSubmitting || showSuccess}>
            {isSubmitting ? "Enviando..." : "Enviar"}
          </Button>

          <p className="auth-footer-link">
            Lembrou a senha? <Link to="/login">Voltar para login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
