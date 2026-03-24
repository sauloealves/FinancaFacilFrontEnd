import { useState } from "react";
import "./Login.css";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import { useLocation, useNavigate } from "react-router";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/auth/AuthContext";
import { login as loginApi } from "../../services/authService";
import { getErrorMessage } from "../../services/api";

export default function Login() {
  const { login, message } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from =
    (location.state)?.from?.pathname || "/dashboard";

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    try {
      const response = await loginApi({
        email,
        password,
      });

      login(response.token, response.user);

      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao tentar autenticar."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="login-form"
        >
          <h2 className="login-title">Login</h2>
          {message && (
            <div className="auth-message">
              {message}
            </div>
          )}

          {/* ❌ Erro login */}
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="Digite seu email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <Button
            type="submit">
            {loading ? "Entrando..." : "Entrar"}
          </Button>

          <p className="login-register-message">
            Ainda não tem conta?{" "}
            <Link to="/register" className="login-register-link">
              Cadastre-se
            </Link>
          </p>
          <p className="login-register-message">
            Esqueceu a senha?{" "}
            <Link to="/forgot-password" className="login-register-link">
              Redefinir senha
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}