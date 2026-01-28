import { useState } from "react";
import { forgotPassword } from "../services/authService";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await forgotPassword(email);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Recuperar senha</h2>
      <input
        placeholder="E-mail"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <button type="submit">Enviar</button>
    </form>
  );
}
