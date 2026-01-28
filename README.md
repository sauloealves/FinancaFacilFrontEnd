Esta aplicação representa o **frontend web do Finança Fácil**, um sistema de controle financeiro pessoal desenvolvido no modelo **SaaS (Software as a Service)**.

O objetivo do Finança Fácil é oferecer aos usuários uma forma simples, organizada e confiável de gerenciar sua vida financeira, permitindo o controle de receitas, despesas, lançamentos futuros e recorrentes, conciliação com extratos bancários, acompanhamento de orçamento e visualização de relatórios financeiros.

Este frontend é responsável por toda a **experiência de interação do usuário**, incluindo:
- Tela inicial (landing page)
- Cadastro de usuários
- Autenticação e gerenciamento de sessão via JWT
- Recuperação e redefinição de senha
- Consumo seguro da API backend
- Exibição e manipulação das informações financeiras

A aplicação foi construída utilizando **React com TypeScript**, adotando uma arquitetura organizada e escalável, preparada para evolução contínua do produto, integração com novos módulos e adaptação para diferentes dispositivos.

O frontend consome uma **API REST desenvolvida em .NET**, mantendo uma separação clara de responsabilidades entre interface e regras de negócio, o que permite deploys independentes, maior manutenibilidade e facilidade de expansão futura, incluindo versões mobile e integrações conversacionais.
