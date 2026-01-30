import { useState } from "react";
import { login } from "../../services/authService";
import "./Login.css";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import { useNavigate } from "react-router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  
  async function handleSubmit(e: React.FormEvent) {    
    e.preventDefault();
    
    const response = await login({ email, password });
    localStorage.setItem("token", response.data.token);
    navigate("/");    
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <form onSubmit={handleSubmit} className="login-form">
          <h2 className="login-title">Login</h2>

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
            type="submit">Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}