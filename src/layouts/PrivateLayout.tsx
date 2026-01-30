import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  children: ReactNode;
};

export default function PrivateLayout({ children }: Props) {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div> 
      <header>
        <h1>Finança Fácil</h1>
        <button onClick={logout}>Sair</button>
      </header>

      <main>{children}</main>
    </div>
  );
}