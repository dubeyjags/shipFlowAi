# Better-Auth Setup in a Turborepo Monorepo

## Architecture Overview

```
shipFlowAi/
├── packages/
│   ├── db/              ← Step 1 · Prisma + database client
│   └── auth/            ← Step 2 · better-auth server config
└── apps/
    └── web/             ← Step 3 · Next.js wiring (API route, actions, client, pages)
```

**Data flow:**
```
Browser → Next.js API Route (/api/auth/[...all])
                │
                ▼
        @monorepo/auth  (better-auth instance)
                │
                ▼
        @monorepo/db    (Prisma → PostgreSQL)
```

---

## Step 1 — Database Package (`packages/db`)

This package owns the Prisma schema, the generated client, and the singleton `db` export that every other package uses.

---

### `packages/db/package.json`

```json
{
  "name": "@monorepo/db",       // workspace package name — imported as @monorepo/db
  "type": "module",             // ESM — required for Prisma 7 + Node adapter
  "main": "src/index.ts",       // entry point consumed by other packages at dev time
  "exports": {
    ".": "./src/index.ts"       // what gets resolved when you write: import { db } from "@monorepo/db"
  },
  "scripts": {
    "db:generate": "prisma generate",   // regenerate the Prisma client after schema changes
    "db:push":     "prisma db push",    // sync schema → database (no migration files, good for dev)
    "db:migrate":  "prisma migrate dev",// create migration files (use in production workflow)
    "db:studio":   "prisma studio"      // open Prisma Studio GUI
  },
  "dependencies": {
    "@prisma/adapter-pg": "^7.0.0",     // pg adapter required by Prisma 7 (driver adapters model)
    "@prisma/client":     "^7.0.0",     // the generated client base
    "pg":                 "^8.13.3",    // low-level PostgreSQL driver
    "dotenv":             "^16.6.1"     // load .env at runtime (Prisma CLI also needs it)
  }
}
```

---

### `packages/db/prisma.config.ts`

> **Why this file exists:** Prisma 7 removed `url` from the `datasource` block in `schema.prisma`.
> Connection details for Migrate/Push now live here instead.

```ts
import { config }       from "dotenv";
import { defineConfig } from "prisma/config";

// The root .env is two directories above packages/db.
// Prisma CLI does not automatically walk up, so we load it manually.
config({ path: "../../.env" });

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL is not set in .env");

export default defineConfig({
  schema: "prisma/schema.prisma",   // where the schema file lives (relative to this file)
  migrations: {
    path: "prisma/migrations",      // where migration files are stored
  },
  datasource: {
    url: databaseUrl,               // the connection string used by Migrate / db push
  },
});
```

---

### `packages/db/prisma/schema.prisma`

> **Why no `url` in datasource:** Prisma 7 — connection URL moved to `prisma.config.ts` above.
> The `output` path tells Prisma where to write the generated client.

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"  // generated client lands next to src/index.ts
}

datasource db {
  provider = "postgresql"               // no url here in Prisma 7 — see prisma.config.ts
}

// ── Core models (required by better-auth, always needed) ─────────────────────

model User {
  id            String    @id           // better-auth generates its own string IDs (not cuid/uuid)
  name          String
  email         String    @unique
  emailVerified Boolean
  image         String?
  createdAt     DateTime
  updatedAt     DateTime

  // ── plugin: admin ──────────────────────────────────────────────────────────
  // Enable with: import { admin } from "better-auth/plugins"
  role       String?    // "admin" | "user" | custom
  banned     Boolean?
  banReason  String?
  banExpires DateTime?

  // ── plugin: username ────────────────────────────────────────────────────────
  // Enable with: import { username } from "better-auth/plugins"
  username        String? @unique
  displayUsername String?

  // ── plugin: anonymous ───────────────────────────────────────────────────────
  // Enable with: import { anonymous } from "better-auth/plugins"
  isAnonymous Boolean?

  // ── plugin: phone-number ────────────────────────────────────────────────────
  // Enable with: import { phoneNumber } from "better-auth/plugins"
  phoneNumber         String? @unique
  phoneNumberVerified Boolean?

  // ── plugin: two-factor ──────────────────────────────────────────────────────
  // Enable with: import { twoFactor } from "better-auth/plugins"
  twoFactorEnabled Boolean?

  // Relations — Prisma needs these for type-safe joins
  sessions    Session[]
  accounts    Account[]
  twoFactors  TwoFactor[]
  members     Member[]
  invitations Invitation[]

  @@map("user")   // actual table name in PostgreSQL (lowercase, snake_case)
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique    // the session token stored in the cookie
  createdAt DateTime
  updatedAt DateTime
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // ── plugin: admin ──────────────────────────────────────────────────────────
  impersonatedBy String?         // set when an admin impersonates another user

  // ── plugin: organization ────────────────────────────────────────────────────
  activeOrganizationId String?   // tracks which org the user is currently acting as

  @@index([userId])   // index FK for fast lookups
  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String    // provider-specific user ID (e.g. GitHub user ID)
  providerId            String    // "github" | "google" | "credential" etc.
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?   @db.Text   // @db.Text for long OAuth tokens
  refreshToken          String?   @db.Text
  idToken               String?   @db.Text
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?   // hashed, only used for email+password provider
  createdAt             DateTime
  updatedAt             DateTime

  @@index([userId])
  @@map("account")
}

model Verification {
  id         String    @id
  identifier String              // email address or phone being verified
  value      String              // the OTP / magic-link token
  expiresAt  DateTime
  createdAt  DateTime?
  updatedAt  DateTime?

  @@index([identifier])   // fast lookups by email/phone during verification
  @@map("verification")
}

// ── Plugin: two-factor ───────────────────────────────────────────────────────

model TwoFactor {
  id          String  @id
  secret      String              // TOTP secret (never returned to client)
  backupCodes String              // JSON array of hashed backup codes
  userId      String
  verified    Boolean @default(true)
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("twoFactor")
}

// ── Plugin: organization ─────────────────────────────────────────────────────

model Organization {
  id          String       @id
  name        String
  slug        String       @unique   // URL-safe identifier e.g. "acme-corp"
  logo        String?
  createdAt   DateTime
  metadata    String?                // JSON blob for custom fields
  members     Member[]
  invitations Invitation[]

  @@map("organization")
}

model Member {
  id             String       @id
  organizationId String
  userId         String
  role           String       // "owner" | "admin" | "member"
  createdAt      DateTime
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([userId])
  @@map("member")
}

model Invitation {
  id             String       @id
  organizationId String
  email          String       // who is being invited
  role           String?
  status         String       // "pending" | "accepted" | "rejected" | "canceled"
  expiresAt      DateTime
  inviterId      String       // the user who sent the invite
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [inviterId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@map("invitation")
}
```

---

### `packages/db/src/index.ts`

> This file is the **only export** of `@monorepo/db`. Everything else imports `db` from here.

```ts
import { config }     from "dotenv";
import { PrismaPg }   from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/index.js"; // .js extension required for ESM

// Load root .env at runtime (needed when this code runs inside Next.js dev server)
config({ path: "../../.env" });

// Singleton pattern: prevents creating a new PrismaClient on every hot reload in dev.
// In production there is only one instance, so this is a no-op there.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL environment variable is not set");

  // Prisma 7 requires a driver adapter instead of a built-in connector.
  // PrismaPg wraps the `pg` package and handles the connection pool.
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

// Reuse existing instance in development, create fresh one in production
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") globalForPrisma.prisma = db;
```

---

### CLI commands (run from repo root)

```bash
# After changing schema.prisma — push changes to the database (dev only, no migration files)
pnpm --filter @monorepo/db db:push

# After pushing — regenerate the TypeScript client so your IDE sees the new types
pnpm --filter @monorepo/db db:generate

# Production workflow — creates a SQL migration file you can review and commit
pnpm --filter @monorepo/db db:migrate
```

---

## Step 2 — Auth Package (`packages/auth`)

This package creates the single `auth` instance that is imported everywhere.
Keep all better-auth server config here, never in `apps/`.

---

### `packages/auth/package.json`

```json
{
  "name": "@monorepo/auth",         // workspace package name
  "type": "module",
  "main": "index.ts",
  "exports": {
    ".": "./index.ts"               // import { auth } from "@monorepo/auth"
  },
  "dependencies": {
    "@monorepo/db": "workspace:*",  // workspace:* resolves to the local packages/db
    "better-auth":  "^1.6.20"
  }
}
```

---

### `packages/auth/lib/auth.ts`

> **This is the heart of better-auth.** One instance, shared across the whole monorepo.

```ts
import { betterAuth }     from "better-auth";
import { prismaAdapter }  from "better-auth/adapters/prisma";
import { nextCookies }    from "better-auth/next-js";
import { db }             from "@monorepo/db";  // the singleton Prisma client

export const auth = betterAuth({
  // ── Security ──────────────────────────────────────────────────────────────
  secret:  process.env.BETTER_AUTH_SECRET,  // random string, min 32 chars — signs sessions
  baseURL: process.env.BETTER_AUTH_URL,     // e.g. http://localhost:3000 — used for redirects & CORS

  // ── Database ───────────────────────────────────────────────────────────────
  database: prismaAdapter(db, {
    provider: "postgresql",   // tells better-auth how to generate queries
  }),

  // ── Social Providers ───────────────────────────────────────────────────────
  // Each provider needs an OAuth app created on the provider's developer console.
  // GitHub: https://github.com/settings/applications/new
  //   · Homepage URL:      http://localhost:3000
  //   · Callback URL:      http://localhost:3000/api/auth/callback/github
  socialProviders: {
    github: {
      clientId:     process.env.GITHUB_CLIENT_ID     as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    // Add more providers here: google, discord, twitter, etc.
  },

  // ── Plugins ────────────────────────────────────────────────────────────────
  plugins: [
    nextCookies(),  // Required for Next.js App Router: auto-sets cookies in server actions.
                    // Must be the LAST plugin in the array.

    // Uncomment to enable additional plugins (schema fields already added):
    // twoFactor(),
    // organization(),
    // admin(),
    // username(),
  ],
});
```

---

### `packages/auth/index.ts`

```ts
// Re-export everything from lib/auth.ts.
// Consumers write:  import { auth } from "@monorepo/auth"
export * from "./lib/auth";
```

---

## Step 3 — Next.js App (`apps/web`)

---

### `apps/web/next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js to transpile these workspace packages with its own compiler.
  // Without this, importing ESM workspace packages causes build errors.
  transpilePackages: ["@monorepo/auth", "@monorepo/db"],
};

export default nextConfig;
```

---

### `apps/web/.env.local`

> Copy these to `.env.local` for local development.
> Never commit real secrets — use a secrets manager in production.

```bash
# PostgreSQL connection string (Neon, Supabase, Railway, or local)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"

# Random secret for signing sessions — generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=your-random-secret-here

# Full URL of your app — used by better-auth for OAuth redirects
BETTER_AUTH_URL=http://localhost:3000

# GitHub OAuth app credentials
# Create at: https://github.com/settings/applications/new
# Callback URL must be: http://localhost:3000/api/auth/callback/github
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Used by the auth client (browser-side) to know where to send requests
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### `apps/web/app/api/auth/[...all]/route.ts`

> This is the **catch-all API route** that handles every better-auth HTTP request:
> `/api/auth/signin`, `/api/auth/callback/github`, `/api/auth/signout`, etc.
> You never call these URLs manually — better-auth's client handles it.

```ts
import { auth }             from "@monorepo/auth";
import { toNextJsHandler }  from "better-auth/next-js";

// toNextJsHandler converts the better-auth fetch handler into Next.js route handlers.
// The spread gives Next.js named exports for each HTTP method.
export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(auth);
```

---

### `apps/web/lib/auth-actions.ts`

> **Server Actions** — run on the server, can be called directly from forms.
> Import these in Client or Server Components; never import `auth` from `@monorepo/auth` in client components.

```ts
"use server";   // marks this file as server-only (Next.js App Router)

import { auth }     from "@monorepo/auth";
import { headers }  from "next/headers";
import { redirect } from "next/navigation";

export async function signInWithGithub(formData: FormData) {
  // Read optional callbackUrl from the form (useful for post-login redirects)
  const callbackUrl = (formData.get("callbackUrl") as string | null) ?? "/dashboard";

  // auth.api.signInSocial tells better-auth to start the OAuth flow.
  // It returns the GitHub authorization URL that we must redirect the user to.
  // headers() is required by nextCookies() plugin to read/write cookies server-side.
  const result = await auth.api.signInSocial({
    body: {
      provider: "github",
      callbackURL: callbackUrl,   // where better-auth redirects the user after GitHub auth
    },
    headers: await headers(),
  });

  console.log("[signInWithGithub] result:", result);  // debug: remove in production

  // If something went wrong (bad env vars, provider error), result.url will be falsy.
  // Throwing here surfaces the error instead of silently doing nothing.
  if (!result?.url) {
    throw new Error("GitHub sign-in failed: no redirect URL returned");
  }

  // redirect() is a Next.js function that throws a special error caught by the framework.
  // It must be called OUTSIDE try/catch blocks.
  redirect(result.url);
}
```

---

### `apps/web/lib/auth-client.ts`

> **Client-side auth helper** — use in Client Components (`"use client"`) only.
> Provides hooks like `authClient.useSession()` and methods like `authClient.signOut()`.

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // The base URL where your API route is mounted.
  // NEXT_PUBLIC_ prefix makes this env var available in the browser bundle.
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

// Usage in a Client Component:
//
//   import { authClient } from "@/lib/auth-client"
//
//   const { data: session } = authClient.useSession()
//   await authClient.signOut()
```

---

### `apps/web/app/(auth)/sign-in/page.tsx`

> The `(auth)` folder is a **Route Group** — it doesn't appear in the URL.
> Sign-in page lives at `/sign-in`, not `/auth/sign-in`.

```tsx
import { signInWithGithub } from "@/lib/auth-actions";

type GithubSignInFormProps = {
  callbackUrl?: string;
};

function GithubSignInForm({ callbackUrl }: GithubSignInFormProps) {
  return (
    // The `action` prop on a <form> accepts a Server Action directly.
    // On submit, Next.js calls signInWithGithub(formData) on the server.
    <form action={signInWithGithub}>
      {/* Hidden input passes the desired post-login destination to the server action */}
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}
      <button type="submit">Continue with GitHub</button>
    </form>
  );
}

export default function SignInPage() {
  return (
    <main>
      <h1>Sign In</h1>
      <GithubSignInForm />
    </main>
  );
}
```

---

### `apps/web/app/dashboard/page.tsx`

> A **Server Component** that reads the session server-side after login.
> `auth.api.getSession` reads the session cookie set by `nextCookies()`.

```tsx
import { auth }          from "@monorepo/auth";
import { headers }       from "next/headers";
import SessionLogger     from "./_session-logger";

export default async function DashboardPage() {
  // Read the session from the cookie on the server.
  // headers() is needed so better-auth can read the Cookie header.
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Server-side log — visible in your terminal, not the browser.
  console.log("[Dashboard] Login details:", JSON.stringify(session, null, 2));

  return (
    <main>
      <h1>Dashboard</h1>

      {/* Client component logs the session to the browser console too */}
      <SessionLogger session={session} />

      {session?.user ? (
        <p>Welcome, {session.user.name ?? session.user.email}</p>
      ) : (
        <p>Not signed in.</p>
      )}
    </main>
  );
}
```

---

### `apps/web/app/dashboard/_session-logger.tsx`

> Underscore prefix (`_`) is a Next.js convention to co-locate a file in a route folder
> without making it a page. This is a **Client Component** that logs to browser devtools.

```tsx
"use client";   // this file runs in the browser

import { useEffect } from "react";

export default function SessionLogger({ session }: { session: unknown }) {
  useEffect(() => {
    // Browser console log — open DevTools → Console to see the full session object
    console.log("[Login] Session details:", session);
  }, [session]);   // runs once after mount (and again if session changes)

  return null;     // renders nothing — purely for debugging
}
```

---

## Request Flow Summary

```
1.  User visits /sign-in
2.  User clicks "Continue with GitHub"
3.  Browser submits the <form> → calls signInWithGithub() server action
4.  Server action calls auth.api.signInSocial() → better-auth returns GitHub OAuth URL
5.  Next.js redirect(result.url) → browser goes to github.com/login/oauth/authorize
6.  User approves → GitHub redirects to /api/auth/callback/github
7.  Route handler (route.ts) → better-auth validates code, creates User+Account+Session rows
8.  better-auth redirects browser to /dashboard (the callbackURL)
9.  dashboard/page.tsx runs on server → auth.api.getSession() reads the session cookie
10. Page renders welcome message; SessionLogger logs session to browser console
```

---

## Adding a New Social Provider (e.g. Google)

**1. Create OAuth credentials** at `https://console.cloud.google.com/`
   - Callback URL: `http://localhost:3000/api/auth/callback/google`

**2. Add to `.env.local`:**
```bash
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
```

**3. Add to `packages/auth/lib/auth.ts`:**
```ts
socialProviders: {
  github: { ... },
  google: {
    clientId:     process.env.GOOGLE_CLIENT_ID     as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  },
},
```

**4. Add a button in `apps/web/lib/auth-actions.ts`:**
```ts
export async function signInWithGoogle(formData: FormData) {
  const callbackUrl = (formData.get("callbackUrl") as string | null) ?? "/dashboard";
  const result = await auth.api.signInSocial({
    body: { provider: "google", callbackURL: callbackUrl },
    headers: await headers(),
  });
  if (!result?.url) throw new Error("Google sign-in failed");
  redirect(result.url);
}
```

No schema changes needed — the existing `Account` model handles all providers.

---

## Adding a Plugin (e.g. Two-Factor)

**1. The schema fields are already in `schema.prisma`** (added in the all-models step).
   Run `db:push` only if you add a NEW model/field.

**2. Update `packages/auth/lib/auth.ts`:**
```ts
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  ...
  plugins: [
    twoFactor(),    // add before nextCookies()
    nextCookies(),  // nextCookies() must always be last
  ],
});
```

**3. Update the auth client `apps/web/lib/auth-client.ts`:**
```ts
import { createAuthClient } from "better-auth/react";
import { twoFactorClient }  from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  plugins: [twoFactorClient()],
});
```
