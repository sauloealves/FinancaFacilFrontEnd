import { Link } from "react-router-dom";
import "./HomePage.css";

const quickProofs = [
  "Veja seu saldo real considerando contas futuras",
  "Controle entradas e saídas em um só lugar",
  "Planeje seu mês antes dos problemas aparecerem",
];

const benefits = [
  {
    title: "Veja seu saldo real, não só o saldo do banco",
    description: "Entenda quanto dinheiro realmente está disponível depois de considerar compromissos e contas que ainda vão vencer.",
  },
  {
    title: "Saiba se pode gastar antes de gastar",
    description: "Decida com mais segurança porque o sistema mostra impacto no fluxo, não apenas números soltos no extrato.",
  },
  {
    title: "Entenda para onde seu dinheiro está indo",
    description: "Receitas, despesas, transferências e metas ficam organizadas para leitura rápida e ação imediata.",
  },
  {
    title: "Organize sua vida financeira sem planilhas",
    description: "Tudo centralizado em uma experiência simples, visual e preparada para rotina real, não para trabalho manual.",
  },
];

const trustItems = [
  "Sem conexão com banco — seus dados são seguros",
  "Comece grátis, sem cartão de crédito",
  "Espaço pronto para depoimentos e crescimento da base de usuários",
];

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="home-background" aria-hidden="true" />

      <header className="home-topbar">
        <Link to="/" className="home-brand" aria-label="Finança Fácil">
          <img src="/financa-facil-logo.svg" alt="Logotipo do Finança Fácil" className="home-brand-logo" />
          <span>Finança Fácil</span>
        </Link>

        <Link to="/login" className="home-topbar-link">
          Ir para login
        </Link>
      </header>

      <main className="home-main">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-kicker">Previsibilidade financeira para decisões do dia a dia</span>
            <h1>Saiba exatamente quanto você pode gastar hoje</h1>
            <p>
              Sem planilhas. Sem surpresas no fim do mês. O Finança Fácil mostra o dinheiro realmente disponível com base no saldo atual e nas contas que ainda vão chegar.
            </p>

            <div className="home-hero-actions">
              <Link to="/register" className="home-button home-button-primary">
                Começar grátis
              </Link>
              <Link to="/login" className="home-button home-button-secondary">
                Já tenho conta
              </Link>
            </div>
          </div>

          <div className="home-preview-card" aria-label="Visualização ilustrativa do sistema">
            <span className="home-preview-label">Visualização do sistema</span>

            <div className="home-preview-metrics">
              <article>
                <span>Saldo consolidado</span>
                <strong>R$ 8.420,00</strong>
                <small>Exemplo ilustrativo</small>
              </article>
              <article>
                <span>Meta do mês</span>
                <strong>76%</strong>
                <small>Planejamento em andamento</small>
              </article>
            </div>

            <div className="home-preview-chart" aria-hidden="true">
              <div className="home-preview-chart-header">
                <span>Disponível para gastar</span>
                <strong>R$ 2.180,00</strong>
              </div>
              <div className="home-preview-bars">
                <span style={{ height: "34%" }} />
                <span style={{ height: "58%" }} />
                <span style={{ height: "49%" }} />
                <span style={{ height: "82%" }} />
                <span style={{ height: "68%" }} />
                <span style={{ height: "91%" }} />
              </div>
            </div>
          </div>
        </section>

        <section className="home-proof-strip" aria-label="Principais benefícios rápidos">
          {quickProofs.map((item) => (
            <div key={item} className="home-proof-item">
              <span className="home-proof-dot" aria-hidden="true" />
              <p>{item}</p>
            </div>
          ))}
        </section>

        <section className="home-benefits">
          <div className="home-section-heading">
            <span className="home-kicker">Benefícios práticos</span>
            <h2>Clareza para agir antes que o aperto apareça</h2>
          </div>

          <div className="home-benefit-grid">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="home-benefit-card">
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-explainer">
          <div className="home-section-heading">
            <span className="home-kicker">Como o produto pensa</span>
            <h2>Um sistema financeiro feito para a vida real</h2>
          </div>

          <div className="home-explainer-layout">
            <p>
              O Finança Fácil centraliza contas, cartões, despesas, receitas e planejamento em um único lugar para responder o que realmente importa: quanto você ainda pode gastar sem comprometer o que vem pela frente. A proposta é simples, direta e orientada à decisão rápida.
            </p>

            <div className="home-explainer-callout">
              <strong>Menos adivinhação.</strong>
              <span>Mais contexto para decidir com segurança todos os dias.</span>
            </div>
          </div>
        </section>

        <section className="home-trust">
          <div className="home-section-heading">
            <span className="home-kicker">Confiança</span>
            <h2>Uma base sólida para começar agora</h2>
          </div>

          <div className="home-trust-grid">
            {trustItems.map((item) => (
              <article key={item} className="home-trust-card">
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-final-cta">
          <div>
            <span className="home-kicker">Pronto para começar</span>
            <h2>Comece agora — leve menos de 1 minuto</h2>
          </div>

          <Link to="/register" className="home-button home-button-primary home-button-large">
            Criar conta grátis
          </Link>
        </section>
      </main>
    </div>
  );
}