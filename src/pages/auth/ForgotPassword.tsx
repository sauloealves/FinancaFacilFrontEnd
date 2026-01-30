import { useState } from "react";
import { forgotPassword } from "../../services/authService";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await forgotPassword(email);
  }

  return (
    <div className="auth-container">
        <div className="auth-card">
          <form onSubmit={handleSubmit} className="auth-form">
            <h2>Recuperar senha</h2>
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            >
            </Input>
            <Button type="submit">Enviar</Button>
            
          </form>
      </div>
    </div>
  );
}
