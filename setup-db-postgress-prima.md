# PostgreSQL + Prisma with TypeScript

A starter project demonstrating how to use Prisma ORM with a PostgreSQL database using the `node-postgres` (`pg`) driver adapter.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v10+
- A running PostgreSQL instance (local or hosted)

## Setup

### 1. Install dependencies

```bash
pnpm add prisma @types/pg typescript @types/node tsx --save-dev
pnpm add @prisma/client @prisma/adapter-pg pg dotenv
```

What each package does:

| Package | Role |
|---|---|
| `prisma` | Prisma CLI — `prisma init`, `prisma migrate`, `prisma generate`, etc. |
| `@prisma/client` | Prisma Client library for querying your database |
| `@prisma/adapter-pg` | node-postgres driver adapter that connects Prisma Client to PostgreSQL |
| `pg` | node-postgres database driver |
| `dotenv` | Loads environment variables from `.env` |
| `@types/pg` | TypeScript type definitions for node-postgres |
| `tsx` | TypeScript executor — run `.ts` files directly without compiling |
| `typescript` / `@types/node` | TypeScript compiler and Node.js type definitions |

### 2. Initialize Prisma

```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` — your schema file
- `.env` — with a `DATABASE_URL` placeholder

### 3. Configure environment

Edit `.env` with your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Example for a local database:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/mydb"
```

> Never commit `.env` to version control. Add it to `.gitignore`.

### 4. Define your schema

Edit `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  author    User    @relation(fields: [authorId], references: [id])
  authorId  Int
}
```

> The `output` path in the `generator` block controls where the generated Prisma Client is written. Here it outputs to `lib/generated/prisma`, which is why the import path is `./generated/prisma/client`.

### 5. Run migrations

```bash
npx prisma migrate dev
```

This creates the tables in your database and generates the Prisma Client automatically.

To regenerate the client without creating a new migration (e.g. after a manual schema edit):

```bash
npx prisma generate
```

### 6. Open Prisma Studio (optional)

A visual browser-based editor for your database:

```bash
npx prisma studio
```

## Database client

Create `lib/db.ts` to set up a singleton Prisma Client instance:

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not defined");
  }
  const adapter = new PrismaPg({ connectionString: url });
  const client = new PrismaClient({ adapter });
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

> The global singleton pattern prevents creating multiple Prisma Client instances during hot reloads in development (e.g. Next.js).

## Test the connection

Create `script.ts` at the project root:

```ts
import { prisma } from "./lib/db";

async function main() {
  // Create a user with a post
  const user = await prisma.user.create({
    data: {
      name: "Alice",
      email: "alice@prisma.io",
      posts: {
        create: {
          title: "Hello World",
          content: "This is my first post!",
          published: true,
        },
      },
    },
    include: { posts: true },
  });
  console.log("Created user:", user);

  // Fetch all users with their posts
  const allUsers = await prisma.user.findMany({
    include: { posts: true },
  });
  console.log("All users:", JSON.stringify(allUsers, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

Run it:

```bash
pnpm dlx tsx script.ts
```

## Project structure

```
.
├── lib/
│   ├── db.ts                    # Prisma Client singleton
│   └── generated/prisma/        # Auto-generated Prisma Client (do not edit)
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Migration history
├── prisma.config.ts             # Prisma CLI configuration
├── script.ts                    # Test / seed script
├── .env                         # Environment variables (not committed)
└── tsconfig.json
```

## Common commands

| Command | Description |
|---|---|
| `npx prisma init` | Initialize Prisma in a new project |
| `npx prisma migrate dev` | Create a migration and apply it (dev only) |
| `npx prisma migrate deploy` | Apply pending migrations (production) |
| `npx prisma generate` | Regenerate Prisma Client from schema |
| `npx prisma studio` | Open the visual database browser |
| `npx prisma db push` | Push schema changes without a migration file |
| `npx prisma db seed` | Run the seed script defined in `package.json` |
| `pnpm dlx tsx script.ts` | Run a TypeScript file directly |
