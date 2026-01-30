import Button from "../../ui/Button/Button";
import "./Header.css";

type HeaderProps = {
  title?: string;
};

export default function Header({ title = "Dashboard" }: HeaderProps) {
  return (
    <header className="header">
      {/* LEFT */}
      <div className="header-left">
        <h2 className="header-title">{title}</h2>
      </div>

      {/* CENTER */}
      <div className="header-center">
        <select className="header-select">
          <option>Janeiro / 2026</option>
          <option>Fevereiro / 2026</option>
        </select>
      </div>

      {/* RIGHT */}
      <div className="header-right">
        <Button>+ Receita</Button>
        <Button variant="secondary">+ Despesa</Button>

        <div className="header-user">
          <span className="user-avatar">SA</span>
        </div>
      </div>
    </header>
  );
}
