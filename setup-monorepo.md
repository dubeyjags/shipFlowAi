# Monorepo Setup

## Base Setup

### Step 1 — Create the workspace

`mkdir my-trpc-monorepo && cd my-trpc-monorepo`
`npm init -y`

> package.json

```json
{
  "name": "my-trpc-monorepo",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@10.34.4"
}
```

> pnpm-workspace.yaml  

the line that makes it a workspace. Any folder under **apps/** or **packages/** is now a linkable package:

```json
packages:
  - 'apps/*'
  - 'packages/*'
```

### Step 2 — Add Turborepo

Turborepo orders and caches your tasks (we went deep on this already — this is the config that drives it):

`pnpm add -D -w turbo typescript`

> turbo.json:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

```json
"scripts": {
  "dev": "turbo run dev",
  "build": "turbo run build",
  "typecheck": "turbo run typecheck"
}
```

### Step 3 — Shared TypeScript base

One base config every package extends, so settings stay consistent

> tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Package Setup

### Step 4 — The shared package `packages/api` (the heart)

Everything else consumes this. Four small files.

> packages/api/package.json   

 note main/types point at source, so consumers get live types with no build step:

```json
{
  "name": "@my-monorepo/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": { "typecheck": "tsc --noEmit" },
  "dependencies": {
    "@trpc/server": "^11.0.0",
    "superjson": "^2.2.1",
    "zod": "^3.24.0"
  },
  "devDependencies": { "typescript": "^5.6.0" }
}
```

> packages/src/trpc.ts
> initialize tRPC once and export the reusable building blocks. You import **router/publicProcedure** everywhere instead of touching t directly:

```ts
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson, // lets you send Dates/Maps, not just plain JSON
});

export const router = t.router;
export const publicProcedure = t.procedure;
```

> packages/src/context.ts

context is rebuilt per request; it's where the db client and logged-in user live. Here it's a fake in-memory store so the example runs with zero setup:

```ts
export interface User {
  id: string;
  name: string;
  email: string;
}

const users: User[] = [
  { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
];

export function createContext() {
  return {
    db: {
      users,
      addUser(u: User) {
        users.push(u);
        return u;
      },
    },
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

> packages/src/router.ts

your actual API. .query reads, .mutation writes, .input(zodSchema) validates. The last line is the one that makes the whole monorepo worthwhile:

```ts
import { z } from "zod";
import { router, publicProcedure } from "./trpc";

export const appRouter = router({
  greeting: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(({ input }) => `Hello, ${input.name}! 👋`),

  listUsers: publicProcedure.query(({ ctx }) => ctx.db.users),

  createUser: publicProcedure
    .input(z.object({ name: z.string().min(1), email: z.string().email() }))
    .mutation(({ ctx, input }) =>
      ctx.db.addUser({
        id: String(ctx.db.users.length + 1),
        name: input.name,
        email: input.email,
      }),
    ),
});

// 🔑 Export the TYPE. The client imports this — and nothing else from here.
export type AppRouter = typeof appRouter;
```

> src/index.ts

the public surface of the package:

```ts
export { appRouter } from "./router";
export type { AppRouter } from "./router";
export { createContext } from "./context";
export type { Context, User } from "./context";
```

## Backend for API

### Step 5 — The backend `apps/server`

It imports the actual appRouter (a value, used at runtime) and serves it over HTTP.

> apps/server/package.json

the **workspace:\*** line is the monorepo link to your shared package:

```json
{
  "name": "server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@my-monorepo/api": "workspace:*",
    "@trpc/server": "^11.0.0",
    "superjson": "^2.2.1"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0"
  }
}
```

> apps/server/src/index.ts

the standalone adapter is the simplest way to host a router. The CORS middleware just lets the browser dev server call it:

```ts
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { appRouter, createContext } from "@my-monorepo/api";

const server = createHTTPServer({
  router: appRouter,
  createContext,
  middleware: (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    next();
  },
});

server.listen(3000);
console.log("✅ tRPC server on http://localhost:3000");
```


## Frontend UI Setup

### Step 6 — The frontend `apps/web`

A Vite + React app. It imports only the type and turns it into typed hooks.

> apps/web/package.json:

```json
{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@my-monorepo/api": "workspace:*",
    "@tanstack/react-query": "^5.59.0",
    "@trpc/client": "^11.0.0",
    "@trpc/tanstack-react-query": "^11.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "superjson": "^2.2.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

> apps/web/src/trpc.tsx

this single call converts your server's AppRouter type into fully typed React helpers:

```tsx
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@my-monorepo/api"; // TYPE ONLY — erased at build

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();
```

> apps/web/src/main.tsx

wire up React Query, the tRPC client (pointed at your server, same transformer), and the providers:

```tsx
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@my-monorepo/api";
import { TRPCProvider } from "./trpc";
import { App } from "./App";

function Root() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({ url: "http://localhost:3000", transformer: superjson }),
      ],
    }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <App />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
```

> apps/web/src/App.tsx

the payoff. `trpc.<procedure>.queryOptions()` and `.mutationOptions()` are fully typed and autocompleted:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "./trpc";

export function App() {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const greeting = useQuery(trpc.greeting.queryOptions({ name: "World" }));
  const users = useQuery(trpc.listUsers.queryOptions());
  const createUser = useMutation(
    trpc.createUser.mutationOptions({
      onSuccess: () =>
        qc.invalidateQueries({ queryKey: trpc.listUsers.queryKey() }),
    }),
  );

  return (
    <main>
      <h1>{greeting.data ?? "Loading…"}</h1>
      <ul>
        {users.data?.map((u) => (
          <li key={u.id}>
            {u.name} — {u.email}
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          createUser.mutate({
            name: "Grace Hopper",
            email: "grace@example.com",
          })
        }
      >
        Add user
      </button>
    </main>
  );
}
```

> apps/web/vite.config.ts 

defalt code

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

> apps/web/index.html

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

## CMDs

`pnpm install`                  # links workspace packages together  
`pnpm --filter server dev `     # terminal 1 → http://localhost:3000  
`pnpm --filter web dev`         # terminal 2 → http://localhost:5173


# Multi-repo VS Monorepo
- Multirepo - react-frontend, express backend, postgress-db, redis server
- Monorepo - sigle repo > one repo can contain frontent, backend, shared utils and types etc
example
project
- apps
    -- web (fully deployed app)
    -- api // fully deployed backend
- packages
    -- shared // common utils, db connection, schema

**Benefits => code sharing, atomic commits, better team collab, unified cicd & tooling**

**PNPM => Performant NPM ,like npm,yarn or bun** // popular in monorepo
 - Fast
 - Disk space efficient
 - insted of duplicate is store in central place and each time take refrence symlinks

PNPM vs NPM

pnpm-workspaces > depened on each other, import each other, share efficiently, install and run packages together

# Monorepo Project setup

`npm i pnpm`
`mkdir monorepo && cd monorepo`
`pnpm init` // update with required things
> package.json
```json
{
  "name": "projectName",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.33.4",
}
```

## folder setup
`mkdir apps packages apps/api apps/web packages/utils`

> pnpm-workspace.yaml   

the line that makes it a workspace. Any folder under **apps/ or packages/** is now a linkable package:


```yml
packages:
  - "apps/*"
  - "packages/*"
allowBuilds:
  esbuild: true
```

## shared package setup

> packages/utils

`pnpm init`  
`pnpm add -D typescript`  
`pnpm add zod`  
`tsc --init`  

>packages/utils/package.json
```json
{
  "name": "@peer-class/utils",
  "main": "index.js",
  "private": true, // update this
  "scripts": { // update this
    "dev": "tsc --watch", 
    "build": "tsc"
  },
  "type": "module", // update this
  "devDependencies": {
    "typescript": "^6.0.3"
  },
  "dependencies": {
    "zod": "^4.4.3"
  }
}
```

> packages/utils/tsconfig.json
update rootDir (ts) and outDir (js) path

> packages/utils/src/index.ts

Create Zod schema // for frontend and backend validation
```ts
import { z } from 'zod';
export const createUserSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters long"),
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long")
})

export type CreateUserSchema = z.infer<typeof createUserSchema>; // zod will create schema like this
```
> packages/utils/package.json
export the index file
```json
"exports":{
    ".":"./src/index.ts"
}
```

> packages/utils
`pnpm build`

## Backend setup

>apps/api
Backend setup for API

`pnpm init`  
`pnpm add express @types/express -D typescript tsx @types/node`  
`tsc --init`  

**update .tsconfig.json**
- rootDir
- outDir
- lib
- types

>apps/api/package.json
update with
```json
{
"name":"@projectName/api" // update name "@repo/api"
"private":true
"main":"./dist/index.js"
"type":"module"
"script":{
    "dev":"tsx watch src/index.ts",
    "build":"tsc",
    "dev":"node dist/index.js",
}
"dependencies":{
  "@projectName/utils":"workspace:*" // "@repo/utils" // import utils
}
```
>apps/api/src/index.ts 
Basic get req
```ts
import express  from "express";
import cors from "cors";
const app = express();
const PORT = 5000;
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    return res.json({ message: "Hello from API" });
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
```

### Now import ZOD schema to the backend api
>apps/api
`pnpm i` // insalled and symlinks created

>apps/api/src/index.ts
Import Zod from symlinks or shared folder
```ts
import { createUserSchema } from "@projectName/utils";
app.post("/users", (req, res) => {
    const result = createUserSchema.safeParse(req.body);
    if(!result.success) {
        const message = result.error.issues.map((issue) => issue.message).join(", ")
        return res.status(400).json({success:false, message:message });
    }
    console.log(result.data);
    return res.json({success:true, message: "User created" });
});
```

## Frontend setup
>apps/web
`pnpm create-next-app@latest .`
remove **pnpm-workspace.yaml** its confilict
remove **public** folder

>package/web/package.json
update the dependencies
name:"@projectName/web" // "@repo/utils"
`pnpm i`

>package/web/app/page.tsx
```ts
import createUserSchema from "@projectname/utisl"
usestate (name,email,password)
asynch function handleSubmit(){

}
form>input(name,email,password)
```
>package/web
`pnpm i axios`
and update
>package/web/app/page.tsx 
post requiest on submit ""
```ts
const res = await axios.post("http://localhost:5000/users", result.data)
```

**check for cors error and make form submit**

## all in one setup for all
for all run and build from one place 
>package.json
```json
"dev":"pnpm -r --parrallel dev"
"build":"pnpm -r build"
```



# TurboRepo setup => package is depandend on each other (dependcy graph) 
Build in Right order
## Turbo repo // turborepo.dev 
- Build order manage
- caching
- task orchestration
- parrlel excuation

## add turbo in project
`pnpm add -D turbo -w` // -w is for do it now
>turbo.json
```json
{
    "$schema":"https://turbo.build/schema.json",
    "ui":"tui", // terminal ui to looks good the console the logs for each server
    "tasks":{
        "build": {
            "dependsOn": ["^build"], // check for dependent other build (resolve dependecy graph)
            "outputs": ["dist/**", "next/**", "!dist/**/node_modules/**", "!next/**/node_modules/**", "!.next/cache/**"] //caching
        },
        "dev":{
            "cache": false, // no need to cache
            "persistent": true // long running
        },
        "prettier":{
            "cache": false,
            "persistent": true
        },
        "lint":{
            "cache": false,
            "persistent": true
        }
    }
}
```
>package.json
```json
"script":{
    "dev":"turbo dev",
    "build":"turbo build",
}
```
at Root folder
`pnpm dev`
`pnpm build`


# tRPC (Remote procedure calls)
clinet will call the remote server 
RPC concept call without "stings" call the direct methods
impelentation (gRPC and tRPC)

## Packages or share utils

>packages/trpc
`pnpm init`
`pnpm add -D typescript`
`pnpm add @trpc/server`
`tsc --init`
>packages/trpc/package.json
```json
"name":"@projectName/trpc"
private:true
export:{
  ".":""
}
scripts:{
    "dev":"tsc --watch",
    "build":"tsc"
}

```
>packages/trpc/src/trpc.ts
```ts
import { initTRPC } from '@trpc/server';
const t = initTRPC.create();
export const router = t.router; // rotuer > function declare
export const procedure = t.procedure; // functions
```
>packages/trpc/src/router.ts
```ts
import { procedure, router } from "./trpc.js";
import { createUserSchema } from "@peer-class/utils";
export const appRouter = router({
    health: procedure.query(() => {
        return {
            message: "healthy"
        }
    }),
    register: procedure
        .input(createUserSchema)
        .mutation(({ input }) => {
            // TODO: persist user to DB
            console.log("register", input);
            return {
                message: "User Registered Successfully"
            }
        }),
});

export type AppRouter = typeof appRouter;
```
>packages/trpc/src/index.ts
```ts
export { appRouter } from './router.js';
export type { AppRouter } from './router.js';
```


## backend
>apps/api/
`pnpm add @trpc/server`

add trpc package at package.json
`pnpm i`

>apps/api/src/index.ts
```ts
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "@peer-class/trpc";
// remove app.get (no need of rest api)
app.use(
    "/trpc",
    createExpressMiddleware({
        router: appRouter
    })
);

```

## Frontend

>apps/web
`pnpm add @trpc/client @tanstack/react-query @trpc/react-query`
>app/web/trpc/trpc.ts
```ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@peer-class/trpc";
export const trpc = createTRPCReact<AppRouter>();
```
>app/web/trpc/Provider.tsx
```tsx
'use client';
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./trpc";

export function Provider({ children }: { children: React.ReactNode }) {
    // React Query client — manages server state caching, background refetching, etc.
    const [queryClient] = useState(() => new QueryClient());

    // tRPC client — batches multiple procedure calls into a single HTTP request to /trpc
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: "http://localhost:5000/trpc",
                }),
            ],
        })
    );

    // trpc.Provider bridges tRPC with React Query so tRPC hooks use the shared queryClient
    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
    );
}

/*
 * What this file does:
 * ---------------------
 * Sets up the tRPC + React Query context for the entire Next.js app.
 *
 * - QueryClient      → React Query's cache store. Holds all server-state (queries/mutations).
 * - trpcClient       → HTTP client that sends batched requests to the Express backend at
 *                      http://localhost:5000/trpc using tRPC's httpBatchLink.
 * - trpc.Provider    → Makes tRPC hooks (trpc.*.useQuery / useMutation) available in the tree.
 * - QueryClientProvider → Makes React Query hooks (useQuery, useMutation) available in the tree.
 *
 * Both providers share the same queryClient so tRPC and React Query stay in sync.
 * Wrap the root layout (layout.tsx) with this Provider to enable tRPC across the whole app.
 */
```

>apps/web/app/layout.tsx

```tsx
import { Provider } from "../trpc/Provider";
<Provider>{children}</Provider> // get everywhere for query and mutations
```
>apps/web/app/health/page.tsx
```tsx
'use client';
import { trpc } from "@/trpc/trpc"
export default function Health(){
    const health = trpc.health.useQuery();
    console.log(health.data);
    return (
        <div>
            <h1>Healthy</h1>
        </div>
    )
}
```
at Root folder
`pnpm dev`
`pnpm build`



