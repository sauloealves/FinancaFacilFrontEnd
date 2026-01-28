import { useState } from "react";
import { register } from "../services/authService";

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
    <form onSubmit={handleSubmit}>
      <h2>Criar conta</h2>
      <input
        placeholder="Nome"
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
      />
      <input
        placeholder="E-mail"
        value={form.email}
        onChange={e => setForm({ ...form, email: e.target.value })}
      />
      <input
        type="password"
        placeholder="Senha"
        value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })}
      />
      <button type="submit">Cadastrar</button>
    </form>
  );
}
