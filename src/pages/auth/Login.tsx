import { useState } from "react";
import "./Login.css";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../contexts/auth/AuthContext";
import { login as loginApi } from "../../services/authService";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await loginApi({
        email,
        password,
      });

      login(response.data.token);

      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("E-mail ou senha inválidos.");
      } else {
        setError("Erro ao tentar autenticar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <form onSubmit={handleSubmit} className="login-form">
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
        </form>
      </div>
    </div>
  );
}