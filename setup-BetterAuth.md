# BetterAuth Setup — Turborepo Monorepo

Complete reference from scratch to running auth: every file, what it does, why it exists, and how they connect.

---

## Architecture Diagram

```
shipFlowAi/
├── .env                              ← secrets (DATABASE_URL, BETTER_AUTH_SECRET, OAuth keys)
│
├── packages/
│   ├── db/                           ← Step 1 · Prisma schema + singleton client
│   │   ├── prisma/
│   │   │   └── schema.prisma         ·  table definitions for User, Session, Account, …
│   │   ├── prisma.config.ts          ·  Prisma 7 datasource config (connection URL)
│   │   └── src/
│   │       ├── index.ts              ·  exports `db` (the PrismaClient singleton)
│   │       └── generated/prisma/     ·  auto-generated client (never edit manually)
│   │
│   ├── auth/                         ← Step 2 · BetterAuth server instance
│   │   ├── lib/
│   │   │   └── auth.ts               ·  betterAuth({ database, providers, plugins })
│   │   └── index.ts                  ·  re-exports auth from lib/auth.ts
│   │
│   └── trpc/                         ← tRPC router (separate from auth, not covered here)
│
└── apps/
    └── web/                          ← Step 3 · Next.js 15 App Router wiring
        ├── proxy.ts                  ·  middleware: session check → redirect or pass through
        ├── next.config.ts            ·  transpilePackages for workspace ESM packages
        ├── app/
        │   ├── layout.tsx            ·  root layout (fonts, providers)
        │   ├── api/
        │   │   └── auth/
        │   │       └── [...all]/
        │   │           └── route.ts  ·  catch-all handler for all /api/auth/* requests
        │   ├── (auth)/               ·  route group — public only (redirects if signed in)
        │   │   ├── layout.tsx        ·    calls requireUnauth() → redirect if session exists
        │   │   └── sign-in/
        │   │       └── page.tsx      ·    renders <GithubSignInForm>
        │   └── (protected)/          ·  route group — private only (redirects if signed out)
        │       ├── layout.tsx        ·    calls getServerSession() → redirect if no session
        │       └── dashboard/
        │           ├── page.tsx      ·    server component reads session, renders UI
        │           └── _components/
        │               └── session-logger.tsx  · client component, logs session to browser console
        ├── lib/
        │   ├── auth-routes.ts        ·  path constants + getSafeCallbackPath()
        │   ├── auth-session.ts       ·  getServerSession, requireAuth, requireUnauth
        │   ├── auth-actions.ts       ·  server actions: signInWithGithub, signOut
        │   └── auth-client.ts        ·  createAuthClient for use in client components
        └── components/
            └── auth/
                ├── github-sign-in-form.tsx  · form with pending state
                ├── sign-out-button.tsx      · form that calls signOut action
                └── user-avatar.tsx          · image or initial fallback
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SIGN-IN FLOW                                │
│                                                                     │
│  Browser            Next.js App           BetterAuth        GitHub  │
│    │                    │                     │               │     │
│    │  GET /sign-in      │                     │               │     │
│    │ ─────────────────► │                     │               │     │
│    │                    │  requireUnauth()     │               │     │
│    │                    │ ────────────────────►│               │     │
│    │                    │  no session → OK     │               │     │
│    │  renders page      │ ◄────────────────────│               │     │
│    │ ◄─────────────────┤│                     │               │     │
│    │                    │                     │               │     │
│    │  submit form       │                     │               │     │
│    │ ─────────────────► │                     │               │     │
│    │                    │  signInWithGithub()  │               │     │
│    │                    │  auth.api.signInSocial()             │     │
│    │                    │ ────────────────────►│               │     │
│    │                    │  { url: github.com/… }               │     │
│    │                    │ ◄────────────────────│               │     │
│    │  redirect(url)     │                     │               │     │
│    │ ◄─────────────────┤│                     │               │     │
│    │                    │                     │               │     │
│    │  GET github.com/login/oauth/authorize     │               │     │
│    │ ──────────────────────────────────────────────────────────►    │
│    │  redirects to /api/auth/callback/github                   │    │
│    │ ◄──────────────────────────────────────────────────────────    │
│    │                    │                     │               │     │
│    │  GET /api/auth/callback/github           │               │     │
│    │ ─────────────────► │  route.ts handler   │               │     │
│    │                    │ ────────────────────►│               │     │
│    │                    │  validates code,    │               │     │
│    │                    │  writes User +      │               │     │
│    │                    │  Session + Account  │               │     │
│    │                    │  rows to PostgreSQL │               │     │
│    │                    │  sets session cookie│               │     │
│    │  redirect /dashboard                     │               │     │
│    │ ◄─────────────────┤│                     │               │     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    PROTECTED ROUTE ACCESS                           │
│                                                                     │
│  Browser            proxy.ts          (protected)/layout   DB      │
│    │                    │                     │             │       │
│    │  GET /dashboard    │                     │             │       │
│    │ ─────────────────► │                     │             │       │
│    │                    │  auth.api.getSession()            │       │
│    │                    │ ──────────────────────────────────►       │
│    │                    │  session (or null)  │             │       │
│    │                    │ ◄──────────────────────────────────       │
│    │                    │                     │             │       │
│    │  [no session] redirect /sign-in?callbackUrl=/dashboard │       │
│    │ ◄─────────────────┤│                     │             │       │
│    │                    │                     │             │       │
│    │  [has session] sets x-pathname header, passes through  │       │
│    │                    │ ────────────────────►│             │       │
│    │                    │                     │  getServerSession() │
│    │                    │                     │ ─────────────►      │
│    │                    │                     │  session    │       │
│    │                    │                     │ ◄─────────────      │
│    │                    │  renders layout + page             │       │
│    │ ◄──────────────────────────────────────────             │       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 1 — Database Package (`packages/db`)

Owns the Prisma schema, generated client, and the `db` singleton exported to all packages.

---

### `packages/db/package.json`

```json
{
  "name": "@monorepo/db",
  "type": "module",
  "main": "src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "db:generate": "prisma generate",
    "db:push":     "prisma db push",
    "db:migrate":  "prisma migrate dev",
    "db:studio":   "prisma studio"
  },
  "dependencies": {
    "@prisma/adapter-pg": "^7.0.0",
    "@prisma/client":     "^7.0.0",
    "pg":                 "^8.13.3",
    "dotenv":             "^16.6.1"
  }
}
```

- `"type": "module"` — required by Prisma 7's driver-adapter model (ESM only)
- `@prisma/adapter-pg` — Prisma 7 dropped built-in connectors; you must pass a driver adapter
- `dotenv` — loaded explicitly because the CLI doesn't auto-walk up to the root `.env`

---

### `packages/db/prisma.config.ts`

> **Why this file exists:** Prisma 7 moved the database connection URL out of `schema.prisma`
> and into a separate config file. `schema.prisma` no longer has a `url` in its datasource block.

```ts
import { config }       from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: "../../.env" });   // walk up two levels to the repo root .env

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL is not set in .env");

export default defineConfig({
  schema:     "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: databaseUrl },
});
```

---

### `packages/db/prisma/schema.prisma`

All models required by BetterAuth core + optional plugin fields (already present so you can
enable plugins without a schema migration later).

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"   // generated client lands at packages/db/src/generated/
}

datasource db {
  provider = "postgresql"                // no url here in Prisma 7 — see prisma.config.ts
}

// ── Core models (always required) ────────────────────────────────────────────

model User {
  id            String   @id
  name          String
  email         String   @unique
  emailVerified Boolean
  image         String?
  createdAt     DateTime
  updatedAt     DateTime

  // plugin: admin
  role       String?
  banned     Boolean?
  banReason  String?
  banExpires DateTime?

  // plugin: username
  username        String? @unique
  displayUsername String?

  // plugin: anonymous
  isAnonymous Boolean?

  // plugin: phone-number
  phoneNumber         String? @unique
  phoneNumberVerified Boolean?

  // plugin: two-factor
  twoFactorEnabled Boolean?

  sessions    Session[]
  accounts    Account[]
  twoFactors  TwoFactor[]
  members     Member[]
  invitations Invitation[]

  @@map("user")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique    // stored in the browser cookie
  createdAt DateTime
  updatedAt DateTime
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // plugin: admin
  impersonatedBy String?

  // plugin: organization
  activeOrganizationId String?

  @@index([userId])
  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String    // provider's own user ID
  providerId            String    // "github" | "google" | "credential" …
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?   @db.Text
  refreshToken          String?   @db.Text
  idToken               String?   @db.Text
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?   // hashed; only set for email+password provider
  createdAt             DateTime
  updatedAt             DateTime

  @@index([userId])
  @@map("account")
}

model Verification {
  id         String    @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime?
  updatedAt  DateTime?

  @@index([identifier])
  @@map("verification")
}

// ── Plugin models ─────────────────────────────────────────────────────────────

model TwoFactor {
  id          String  @id
  secret      String
  backupCodes String
  userId      String
  verified    Boolean @default(true)
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("twoFactor")
}

model Organization {
  id          String       @id
  name        String
  slug        String       @unique
  logo        String?
  createdAt   DateTime
  metadata    String?
  members     Member[]
  invitations Invitation[]

  @@map("organization")
}

model Member {
  id             String       @id
  organizationId String
  userId         String
  role           String
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
  email          String
  role           String?
  status         String       // "pending" | "accepted" | "rejected" | "canceled"
  expiresAt      DateTime
  inviterId      String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [inviterId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@map("invitation")
}
```

---

### `packages/db/src/index.ts`

Only export of `@monorepo/db`. Every package that needs the database imports `db` from here.

```ts
import { config }       from "dotenv";
import { PrismaPg }     from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/index.js";  // .js required for ESM

config({ path: "../../.env" });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

// Singleton: reuse on hot reload in dev, single instance in production.
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") globalForPrisma.prisma = db;
```

---

### CLI commands

```bash
# After editing schema.prisma — push schema to DB (dev only, no migration file)
pnpm --filter @monorepo/db db:push

# Regenerate TypeScript types after schema changes
pnpm --filter @monorepo/db db:generate

# Production — create a SQL migration file you can review and commit
pnpm --filter @monorepo/db db:migrate
```

---

## Step 2 — Auth Package (`packages/auth`)

Creates the single `auth` instance used across the entire monorepo.
All BetterAuth server config lives here — never in `apps/`.

---

### `packages/auth/package.json`

```json
{
  "name": "@monorepo/auth",
  "type": "module",
  "main": "index.ts",
  "exports": { ".": "./index.ts" },
  "dependencies": {
    "@monorepo/db": "workspace:*",
    "better-auth":  "^1.6.20"
  }
}
```

`workspace:*` resolves to the local `packages/db` at build time.

---

### `packages/auth/lib/auth.ts`

The heart of BetterAuth. One instance, shared everywhere.

```ts
import { betterAuth }    from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies }   from "better-auth/next-js";
import { db }            from "@monorepo/db";

export const auth = betterAuth({
  secret:  process.env.BETTER_AUTH_SECRET,  // signs session tokens — min 32 chars
  baseURL: process.env.BETTER_AUTH_URL,     // e.g. http://localhost:3000

  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  socialProviders: {
    github: {
      clientId:     process.env.GITHUB_CLIENT_ID     as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      // Callback URL registered on GitHub: <BETTER_AUTH_URL>/api/auth/callback/github
    },
  },

  plugins: [
    // nextCookies() MUST be the last plugin.
    // It intercepts the response to set cookies in server actions (App Router requirement).
    nextCookies(),

    // Uncomment to enable (schema fields are already present):
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
export * from "./lib/auth";
// consumers: import { auth } from "@monorepo/auth"
```

---

## Step 3 — Next.js App (`apps/web`)

---

### `apps/web/next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESM workspace packages must be transpiled by Next.js — without this you get
  // "SyntaxError: Cannot use import statement in a CommonJS module"
  transpilePackages: ["@monorepo/auth", "@monorepo/db"],
};

export default nextConfig;
```

---

### `apps/web/.env.local`

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"

# Session signing secret — generate: openssl rand -base64 32
BETTER_AUTH_SECRET=your-random-secret-here

# Full app URL — used for OAuth redirects
BETTER_AUTH_URL=http://localhost:3000

# GitHub OAuth app
# Create at: https://github.com/settings/applications/new
# Callback URL: http://localhost:3000/api/auth/callback/github
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Exposed to the browser (NEXT_PUBLIC_ prefix required)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### `apps/web/app/api/auth/[...all]/route.ts`

The **catch-all API route** for BetterAuth. Handles every auth HTTP request:
`/api/auth/sign-in`, `/api/auth/callback/github`, `/api/auth/sign-out`, etc.
You never call these URLs manually — BetterAuth's client calls them for you.

```ts
import { auth }            from "@monorepo/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(auth);
```

---

### `apps/web/proxy.ts` (middleware)

Runs on every request matched by `config.matcher`. Checks session before the route renders.
Named `proxy.ts` instead of `middleware.ts` — Next.js still picks it up automatically.

```
Request
   │
   ▼
proxy.ts
   ├─ pathname === /sign-in ?
   │     ├─ has session → redirect to callbackUrl (or /dashboard)
   │     └─ no session  → allow through
   │
   └─ all other matched paths
         ├─ has session → set x-pathname header, allow through
         └─ no session  → redirect to /sign-in?callbackUrl=<original path>
```

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@monorepo/auth";
import { SIGN_IN_PATH, getSafeCallbackPath } from "@/lib/auth-routes";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await auth.api.getSession({ headers: request.headers });

  if (pathname === SIGN_IN_PATH) {
    if (session?.user) {
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
      return NextResponse.redirect(
        new URL(getSafeCallbackPath(callbackUrl), request.url)
      );
    }
    return NextResponse.next();
  }

  if (!session?.user) {
    const callbackUrl = pathname + request.nextUrl.search;
    return NextResponse.redirect(
      new URL(
        `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        request.url
      )
    );
  }

  // Pass x-pathname downstream so layout.tsx knows the current path for redirects.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/sign-in", "/dashboard", "/dashboard/:path*"],
};
```

---

### `apps/web/lib/auth-routes.ts`

Centralises path strings and the open-redirect guard. Import path constants from here —
never hardcode `/sign-in` or `/dashboard` in multiple files.

```ts
export const SIGN_IN_PATH         = "/sign-in";
export const DEFAULT_AUTH_CALLBACK = "/dashboard";

// Prevents open-redirect attacks: only allow same-origin relative paths.
export function getSafeCallbackPath(callbackUrl: string | null | undefined): string {
  if (!callbackUrl) return DEFAULT_AUTH_CALLBACK;
  if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }
  return DEFAULT_AUTH_CALLBACK;
}
```

---

### `apps/web/lib/auth-session.ts`

Server-side session utilities. Import these in Server Components and layouts.
Never import `auth` from `@monorepo/auth` directly in multiple components — centralise it here.

```ts
import { cache }    from "react";
import { auth }     from "@monorepo/auth";
import { headers }  from "next/headers";
import { redirect } from "next/navigation";
import { SIGN_IN_PATH, DEFAULT_AUTH_CALLBACK } from "@/lib/auth-routes";

// cache() ensures a single DB round-trip per request even if called from multiple components.
export const getServerSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

// Call in a Server Component or layout that requires the user to be logged in.
// Redirects to /sign-in if no session exists.
export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user) redirect(SIGN_IN_PATH);
  return session!;
}

// Call in auth pages (sign-in, sign-up) to redirect away if already logged in.
export async function requireUnauth() {
  const session = await getServerSession();
  if (session?.user) redirect(DEFAULT_AUTH_CALLBACK);
}
```

---

### `apps/web/lib/auth-actions.ts`

Server Actions — run on the server, called directly from `<form action={…}>`.
The only file in `apps/web` that imports `auth` from `@monorepo/auth`.

```ts
"use server";

import { auth }     from "@monorepo/auth";
import { headers }  from "next/headers";
import { redirect } from "next/navigation";
import { getSafeCallbackPath } from "@/lib/auth-routes";

export async function signInWithGithub(formData: FormData) {
  const rawCallbackUrl = formData.get("callbackUrl") as string | null;
  const callbackUrl = getSafeCallbackPath(rawCallbackUrl);

  const result = await auth.api.signInSocial({
    body: {
      provider: "github",
      callbackURL: callbackUrl,   // where BetterAuth sends the user after GitHub auth
    },
    headers: await headers(),     // required by nextCookies() plugin
  });

  if (!result?.url) {
    throw new Error("GitHub sign-in failed: no redirect URL returned");
  }

  redirect(result.url);           // must be outside try/catch
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
```

---

### `apps/web/lib/auth-client.ts`

Client-side auth helper. Use only in `"use client"` components.
Provides `authClient.useSession()` and `authClient.signOut()`.

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

// Usage in a Client Component:
//   const { data: session } = authClient.useSession()
//   await authClient.signOut()
```

---

### Route Groups

Next.js **Route Groups** (folders wrapped in parentheses) let you share a layout without
adding a URL segment. `(auth)` and `(protected)` don't appear in the URL.

```
URL /sign-in    → app/(auth)/sign-in/page.tsx       ← uses (auth) layout
URL /dashboard  → app/(protected)/dashboard/page.tsx ← uses (protected) layout
```

---

### `apps/web/app/(auth)/layout.tsx`

Wraps all public auth pages. Redirects already-logged-in users away before rendering.

```tsx
import { requireUnauth } from "@/lib/auth-session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await requireUnauth();  // ← redirects to /dashboard if session exists
  return <>{children}</>;
}
```

---

### `apps/web/app/(auth)/sign-in/page.tsx`

Reads `callbackUrl` from the query string and passes it to the form component.

```tsx
import GithubSignInForm from "@/components/auth/github-sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return (
    <main>
      <h1>Sign In</h1>
      <GithubSignInForm callbackUrl={callbackUrl} />
    </main>
  );
}
```

---

### `apps/web/app/(protected)/layout.tsx`

Wraps all private routes. Redirects to `/sign-in` if there's no session.
Reads `x-pathname` header (set by `proxy.ts`) to build the `callbackUrl` redirect.
Also renders the sidebar shell that all dashboard pages share.

```tsx
import { headers }          from "next/headers";
import { redirect }         from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { SIGN_IN_PATH }     from "@/lib/auth-routes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar           from "@/components/app-sidebar";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session?.user) {
    const headersList = await headers();
    const pathname    = headersList.get("x-pathname");
    const redirectUrl = pathname
      ? `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(pathname)}`
      : SIGN_IN_PATH;
    redirect(redirectUrl);
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session!.user} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
```

---

### `apps/web/app/(protected)/dashboard/page.tsx`

Server Component — reads the cached session and renders the dashboard.

```tsx
import { getServerSession }    from "@/lib/auth-session";
import SessionLogger           from "./_components/session-logger";
import { SidebarTrigger }      from "@/components/ui/sidebar";
import { Separator }           from "@/components/ui/separator";

export default async function DashboardPage() {
  const session = await getServerSession();

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <span className="text-sm font-medium">Dashboard</span>
      </header>
      <div className="p-6">
        <SessionLogger session={session} />
        <h1 className="text-2xl font-semibold mb-1">Overview</h1>
        <p className="text-muted-foreground">
          Welcome back, {session!.user.name ?? session!.user.email}
        </p>
      </div>
    </>
  );
}
```

---

### `apps/web/app/(protected)/dashboard/_components/session-logger.tsx`

Client Component that logs the session to browser DevTools on mount. The `_components/`
prefix keeps it co-located with the route without exposing it as a page.

```tsx
"use client";
import { useEffect } from "react";

export default function SessionLogger({ session }: { session: unknown }) {
  useEffect(() => {
    console.log("[Login] Session details:", session);
  }, [session]);
  return null;
}
```

---

### `apps/web/components/auth/github-sign-in-form.tsx`

Client Component. Uses `useFormStatus` to disable the button while the server action runs.

```tsx
"use client";
import { useFormStatus }    from "react-dom";
import { signInWithGithub } from "@/lib/auth-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Redirecting…" : "Continue with GitHub"}
    </button>
  );
}

export default function GithubSignInForm({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <form action={signInWithGithub}>
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <SubmitButton />
    </form>
  );
}
```

---

### `apps/web/components/auth/sign-out-button.tsx`

```tsx
import { signOut } from "@/lib/auth-actions";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit">Sign Out</button>
    </form>
  );
}
```

---

### `apps/web/components/auth/user-avatar.tsx`

Shows the user's profile image if available, otherwise falls back to their initial.

```tsx
type Props = { name?: string | null; email?: string | null; image?: string | null };

function getInitial(name?: string | null, email?: string | null) {
  return (name ?? email ?? "?")[0]!.toUpperCase();
}

export default function UserAvatar({ name, email, image }: Props) {
  if (image) {
    return (
      <img src={image} alt={name ?? email ?? "User"} width={32} height={32}
           className="rounded-full" />
    );
  }
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full
                     bg-gray-200 text-sm font-medium text-gray-600">
      {getInitial(name, email)}
    </span>
  );
}
```

---

## Complete Request Flow (Step by Step)

```
1.  User visits /sign-in
    → proxy.ts runs: no session → allow through
    → (auth)/layout.tsx: requireUnauth() → no session → allow through
    → sign-in/page.tsx renders <GithubSignInForm>

2.  User clicks "Continue with GitHub"
    → browser submits <form> to signInWithGithub() server action

3.  signInWithGithub() (server)
    → auth.api.signInSocial({ provider: "github", callbackURL: "/dashboard" })
    → BetterAuth returns { url: "https://github.com/login/oauth/authorize?…" }
    → redirect(result.url) — browser is sent to GitHub

4.  GitHub OAuth
    → user approves on github.com
    → GitHub redirects browser to /api/auth/callback/github?code=…

5.  /api/auth/callback/github (route.ts)
    → toNextJsHandler passes to BetterAuth
    → BetterAuth exchanges code for access token
    → creates/updates User + Account rows in PostgreSQL
    → creates Session row, sets session cookie (via nextCookies() plugin)
    → redirects browser to /dashboard

6.  User visits /dashboard
    → proxy.ts runs: session found → sets x-pathname header → allow through
    → (protected)/layout.tsx: getServerSession() → session found → render layout
    → dashboard/page.tsx: getServerSession() [cached, no extra DB call] → render page

7.  User clicks Sign Out
    → SignOutButton form submits signOut() server action
    → auth.api.signOut() clears the session cookie
    → redirect("/sign-in")
```

---

## Protection Strategy — Two Layers

Both layers check independently. The middleware is fast but runs before the React tree;
the layout catches anything the middleware matcher misses.

```
Layer 1 — proxy.ts (middleware)
  ├─ Runs before the page renders
  ├─ matcher: ["/sign-in", "/dashboard", "/dashboard/:path*"]
  ├─ Fast: one DB call, then redirect or pass
  └─ Sets x-pathname header so the layout knows the real path

Layer 2 — (protected)/layout.tsx
  ├─ Runs inside the React tree (after middleware)
  ├─ Covers every route under (protected)/ automatically
  ├─ Reads x-pathname header to build callbackUrl for redirect
  └─ getServerSession() is cached — no duplicate DB query
```

---

## Adding a New Social Provider (e.g. Google)

**1. Create OAuth credentials** — [Google Cloud Console](https://console.cloud.google.com/)
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

**2. Add to `.env.local`**
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**3. Add to `packages/auth/lib/auth.ts`**
```ts
socialProviders: {
  github: { … },
  google: {
    clientId:     process.env.GOOGLE_CLIENT_ID     as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  },
},
```

**4. Add a server action in `apps/web/lib/auth-actions.ts`**
```ts
export async function signInWithGoogle(formData: FormData) {
  const callbackUrl = getSafeCallbackPath(formData.get("callbackUrl") as string | null);
  const result = await auth.api.signInSocial({
    body: { provider: "google", callbackURL: callbackUrl },
    headers: await headers(),
  });
  if (!result?.url) throw new Error("Google sign-in failed");
  redirect(result.url);
}
```

**5. Add a form component in `apps/web/components/auth/`**

No schema changes needed. The existing `Account` model handles all providers.

---

## Enabling a Plugin (e.g. Two-Factor)

The Prisma schema already has the `TwoFactor` model — no schema migration needed.

**1. Update `packages/auth/lib/auth.ts`**
```ts
import { twoFactor } from "better-auth/plugins";

plugins: [
  twoFactor(),   // add before nextCookies()
  nextCookies(), // must always be last
],
```

**2. Update `apps/web/lib/auth-client.ts`**
```ts
import { createAuthClient }  from "better-auth/react";
import { twoFactorClient }   from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  plugins: [twoFactorClient()],
});
```

---

## Key Relationships at a Glance

```
packages/db/src/index.ts
  └─ exports `db` (PrismaClient singleton)
       └─ consumed by packages/auth/lib/auth.ts
            └─ exports `auth` (BetterAuth instance)
                 ├─ consumed by apps/web/app/api/auth/[...all]/route.ts  (HTTP handler)
                 ├─ consumed by apps/web/lib/auth-actions.ts              (server actions)
                 ├─ consumed by apps/web/lib/auth-session.ts              (session helpers)
                 └─ consumed by apps/web/proxy.ts                         (middleware)

apps/web/lib/auth-routes.ts
  └─ exports SIGN_IN_PATH, DEFAULT_AUTH_CALLBACK, getSafeCallbackPath
       ├─ consumed by auth-session.ts
       ├─ consumed by auth-actions.ts
       └─ consumed by proxy.ts

apps/web/lib/auth-session.ts
  └─ exports getServerSession, requireAuth, requireUnauth
       ├─ consumed by (auth)/layout.tsx      (requireUnauth)
       ├─ consumed by (protected)/layout.tsx  (getServerSession)
       └─ consumed by (protected)/dashboard/page.tsx (getServerSession)

apps/web/lib/auth-client.ts
  └─ exports authClient (browser-only)
       └─ consumed by any "use client" component that needs session/signOut
```
