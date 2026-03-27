import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../../services/authService";
import { getErrorMessage } from "../../services/api";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!showSuccess) return;

    const intervalId = globalThis.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          globalThis.clearInterval(intervalId);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    const timeoutId = globalThis.setTimeout(() => {
      navigate("/login");
    }, 5000);

    return () => {
      globalThis.clearInterval(intervalId);
      globalThis.clearTimeout(timeoutId);
    };
  }, [navigate, showSuccess]);

  async function handleSubmit() {
    if (!form.phone.trim()) {
      setErrorMessage("Informe seu telefone para concluir o cadastro.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await register({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setShowSuccess(true);
      setCountdown(5);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Não foi possível concluir o cadastro. Tente novamente."));
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
              <p className="auth-subtitle">Organize receitas, despesas e contas em um unico lugar.</p>
            </div>
          </div>

          <div className="auth-form-header">
            <h2 className="auth-form-title">Criar conta</h2>
            <p className="auth-form-description">Comece com uma visao simples e clara da sua rotina financeira.</p>
          </div>

          {errorMessage && (
            <p className="auth-feedback auth-feedback-error">{errorMessage}</p>
          )}

          {showSuccess && (
            <p className="auth-feedback auth-feedback-success">
              Cadastro concluído com sucesso! Você será redirecionado para a página de login em {countdown} segundos.
            </p>
          )}

          <Input
            label="Nome"
            value={form.name}
            onChange={e =>
              setForm({ ...form, name: e.target.value })
            }
            disabled={isSubmitting || showSuccess}
          />

          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={e =>
              setForm({ ...form, email: e.target.value })
            }
            disabled={isSubmitting || showSuccess}
          />

          <Input
            label="Telefone"
            type="tel"
            value={form.phone}
            placeholder="(00) 00000-0000"
            onChange={e =>
              setForm({ ...form, phone: e.target.value })
            }
            disabled={isSubmitting || showSuccess}
          />

          <Input
            label="Senha"
            type="password"
            value={form.password}
            onChange={e =>
              setForm({ ...form, password: e.target.value })
            }
            disabled={isSubmitting || showSuccess}
          />

          <Button type="submit" disabled={isSubmitting || showSuccess}>
            {isSubmitting ? "Cadastrando..." : "Cadastrar"}
          </Button>

          <p className="auth-footer-link">
            Ja tem conta? <Link to="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
