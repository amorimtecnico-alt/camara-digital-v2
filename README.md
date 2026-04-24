# Camara Admin

Sistema administrativo web construído com:

- Next.js 16
- TypeScript estrito
- Tailwind CSS 4
- Prisma
- PostgreSQL

## Escopo da primeira versão

- Autenticação simples com email e senha
- Layout administrativo com menu lateral
- Dashboard inicial
- CRUD de setores
- CRUD de usuários
- CRUD de fornecedores
- Rotas autenticadas com proteção por cookie HTTP-only
- Base inicial para expansão futura com `Protocol` e `Contract`

## Estrutura

- `src/app`: rotas do App Router
- `src/components`: componentes de layout e UI
- `src/lib`: autenticação, Prisma, utilitários e env
- `src/modules`: módulos organizados por domínio
- `prisma`: schema e seed

## Como rodar

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo `.env` com base no `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/camara_admin?schema=public"
AUTH_SECRET="troque-esta-chave-por-uma-chave-segura-com-32-caracteres-ou-mais"
```

3. Gere o client do Prisma:

```bash
npm run prisma:generate
```

4. Aplique a estrutura no banco:

```bash
npm run prisma:migrate -- --name init
```

5. Popule o usuário inicial:

```bash
npm run prisma:seed
```

6. Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

7. Acesse:

```text
http://localhost:3000
```

## Usuário inicial

- Email: `admin@camara.local`
- Senha: `admin123`

## Comandos principais

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:push
npm run prisma:seed
```

## Observações

- O projeto foi validado com `npm run lint` e `npm run build`.
- Para funcionamento completo da aplicação, o PostgreSQL precisa estar disponível na `DATABASE_URL`.
