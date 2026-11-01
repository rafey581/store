# Store

E-commerce store for physical products in Pakistan (PKR). Next.js + Supabase Postgres + Prisma, with an Android admin app (Expo).

**Status:** pre-Phase 1. Database schema and folder structure are ready for review. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Check the schema

```bash
npm install
DIRECT_URL="postgresql://u:p@localhost:5432/db" npx prisma validate
```
