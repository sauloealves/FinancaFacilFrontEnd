
import { useState } from "react";
import { Card, Modal, Button } from "../components/ui";

import "./Dashboard.css";

export default function DashboardPage() {
  
  const [open, setOpen] = useState(false);

  return (

    <>
      {/* <Button onClick={() => setOpen(true)}>
        Abrir modal
      </Button> */}

      <Modal
        isOpen={open}
        title="Teste de Modal"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button>
              Salvar
            </Button>
          </>
        }
      >
        Conteúdo do modal aqui
      </Modal>
    <div className="dashboard">      

      {/* KPI CARDS */}
      <div className="dashboard-kpis">
        <Card title="Saldo Atual">
          <span className="kpi-value">R$ 2.450,00</span>
        </Card>

        <Card title="Entradas do mês">
          <span className="kpi-value positive">R$ 5.000,00</span>
        </Card>

        <Card title="Saídas do mês">
          <span className="kpi-value negative">R$ 2.550,00</span>
        </Card>

        <Card title="Resultado">
          <span className="kpi-value positive">R$ 2.450,00</span>
        </Card>
      </div>

      {/* SEÇÃO INFERIOR */}
      <div className="dashboard-grid">
        <Card title="Últimos lançamentos">
          <ul className="list">
            <li>Mercado — R$ 120,00</li>
            <li>Internet — R$ 99,90</li>
            <li>Salário — R$ 5.000,00</li>
          </ul>
        </Card>

        <Card title="Próximos compromissos">
          <ul className="list">
            <li>Cartão — 05/02</li>
            <li>Aluguel — 10/02</li>
            <li>Academia — 12/02</li>
          </ul>
        </Card>
      </div>
    </div>

    </>
  );
}
