# Vale Cashback - Pacote de Deploy

Este é o pacote completo do Vale Cashback para deploy no Netlify, incluindo banco de dados integrado.

## Instruções de Deploy

### 1. Faça upload deste repositório para o GitHub

```
git init
git add .
git commit -m "Primeiro commit"
git remote add origin seu-repositorio-no-github
git push -u origin main
```

### 2. Configure o Deploy no Netlify

1. Crie uma conta no Netlify (se ainda não tiver)
2. Clique em "New site from Git"
3. Selecione o GitHub como provedor Git
4. Selecione o repositório onde você fez o upload
5. Configure as opções de build:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Defina as variáveis de ambiente:
   - DATABASE_URL: URL do seu banco de dados PostgreSQL (opcional)
   - SESSION_SECRET: Uma string secreta para as sessões

### 3. Banco de Dados

O aplicativo funciona com dois modos:
- Modo com banco de dados completo se você configurar a variável DATABASE_URL
- Modo de banco de dados local via IndexedDB (padrão)

## Credenciais de Teste

Você pode usar estas credenciais para testar o aplicativo:

- **Administrador**:
  - Email: admin@valecashback.com
  - Senha: senha123

- **Cliente**:
  - Email: cliente@valecashback.com
  - Senha: senha123

- **Lojista**:
  - Email: lojista@valecashback.com
  - Senha: senha123

## Recursos Adicionais

- O aplicativo inclui suporte a PWA (Progressive Web App) e pode ser instalado em dispositivos móveis
- Dados são sincronizados automaticamente quando online
- Suporte a operações offline via IndexedDB
