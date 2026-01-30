import { useState } from "react";
import { register } from "../../services/authService";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";
import "./Register.css";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await register(form);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Criar conta</h2>

          <Input
            label="Nome"
            value={form.name}
            onChange={e =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={e =>
              setForm({ ...form, email: e.target.value })
            }
          />

          <Input
            label="Senha"
            type="password"
            value={form.password}
            onChange={e =>
              setForm({ ...form, password: e.target.value })
            }
          />

          <Button type="submit">
            Cadastrar
          </Button>
        </form>
      </div>
    </div>
  );
}
