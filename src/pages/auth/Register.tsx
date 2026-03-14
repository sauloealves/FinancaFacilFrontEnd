import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await register(form);
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
      <div className="auth-card">
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="auth-form"
        >
          <h2>Criar conta</h2>

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
        </form>
      </div>
    </div>
  );
}
