# plataforma-metas

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_eYmjORDWd3Q5Biu0yATnZuuGfZOV)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase and Hotmart

Apply the migrations in `supabase/migrations` before deploying the application. Copy `.env.example` to your local
environment and configure the public Supabase URL/anon key plus the server-only values
`SUPABASE_SERVICE_ROLE_KEY`, `HOTMART_HOTTOK`, and `SITE_URL`.

Disable public sign-ups in Supabase Auth. Invitations created by the server-side Admin API continue to work, while
the database trigger always creates new profiles as `student` and never trusts role metadata from the browser.

In Hotmart, configure Webhook 2.0.0 to send purchase events to:

```text
https://your-domain.example/api/webhooks/hotmart
```

Products are mapped to courses under **Admin → Cursos → Configurações → Integração Hotmart**. The webhook accepts
approved, delayed, canceled, expired, refunded, and chargeback events. Run the idempotency and multi-course tests
with:

```bash
pnpm test
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
