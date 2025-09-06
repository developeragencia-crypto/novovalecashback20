# Changelog - Vale Cashback

## Versão ALEXDEVELOPER3 (12 de maio de 2025)

### Corrigido
- Exibição automática de usuários referidos no painel de indicações
- Interface de usuário para incluir campo `invitation_code` no sistema de autenticação
- Correção na junção de tabelas para consultas de referência

### Melhorado
- Otimizado consultas SQL para mostrar todos os usuários referidos 
- Melhorado a condição de junção com a tabela de lojistas usando tipo de usuário
- Verificado processamento correto das taxas e comissões

### Confirmado
- Funcionamento correto do sistema de bônus para indicações
- Correta aplicação das taxas:
  - Taxa de plataforma: 2%
  - Comissão do lojista: 1%
  - Cashback do cliente: 2%
  - Bônus de indicação: 1%

## Versão ALEXDEVELOPER2 (Anterior)

### Adicionado
- Sistema inicial de referências
- Páginas de convite para cliente e lojista
- Painéis administrativos para cliente, lojista e admin

### Implementado
- Geração automática de códigos de convite
- Processamento de transações com cashback
- Sistema de carteira e solicitações de saque