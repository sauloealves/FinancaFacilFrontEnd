import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../services/authService";
import { getErrorMessage } from "../../services/api";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import "./ResetPassword.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!showSuccess) return;

    const timeoutId = globalThis.setTimeout(() => {
      navigate("/login");
    }, 5000);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [navigate, showSuccess]);

  async function handleSubmit() {
    setErrorMessage("");

    if (!token) {
      setErrorMessage("Token invalido ou ausente. Solicite um novo link de recuperacao.");
      return;
    }

    if (!password || !confirmPassword) {
      setErrorMessage("Preencha senha e confirmacao de senha.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("As senhas nao conferem.");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(token, password);
      setShowSuccess(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Nao foi possivel redefinir a senha. Tente novamente."));
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
              <p className="auth-subtitle">Defina uma nova senha para continuar com acesso seguro ao sistema.</p>
            </div>
          </div>

          <div className="auth-form-header">
            <h2 className="auth-form-title">Redefinir senha</h2>
            <p className="auth-form-description">Escolha uma nova senha e confirme para concluir a recuperacao.</p>
          </div>

          {errorMessage && (
            <p className="auth-feedback auth-feedback-error">{errorMessage}</p>
          )}

          {showSuccess && (
            <p className="auth-feedback auth-feedback-success">
              Senha redefinida com sucesso! Voce sera redirecionado para o login em alguns segundos.
            </p>
          )}

          <Input
            label="Nova senha"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={isSubmitting || showSuccess}
          />

          <Input
            label="Confirmar nova senha"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            disabled={isSubmitting || showSuccess}
          />

          <Button type="submit" disabled={isSubmitting || showSuccess}>
            {isSubmitting ? "Salvando..." : "Redefinir senha"}
          </Button>

          <p className="reset-password-footer auth-footer-link">
            Lembrou a senha? <Link to="/login">Voltar para login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
