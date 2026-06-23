# ShipFlowAI

## tRPC Monorepo ☑️
`pnpm dev`
`pnpm build`

## Postgress DB & Prisma
```
New: packages/db/ — the DB package

File	Purpose
packages/db/package.json	@monorepo/db — deps: @prisma/client, @prisma/adapter-pg, pg
packages/db/tsconfig.json	nodenext/esnext, strict, matching monorepo convention
packages/db/prisma/schema.prisma	User model (id, name, email, password, timestamps)
packages/db/src/index.ts	Singleton db export via PrismaPg adapter
Modified existing files:

File	Change
packages/trpc/src/router.ts	register mutation now calls db.user.create()
packages/trpc/package.json	Added @monorepo/db: workspace:* dep
apps/api/src/index.ts	Added import "dotenv/config" as first line
apps/api/package.json	Added dotenv + @monorepo/db deps
turbo.json	Added db:generate and db:migrate tasks
.gitignore	Added src/generated/ (Prisma output)
package.json	Added pnpm.onlyBuiltDependencies for Prisma
.env.example	Created with DATABASE_URL template
```

>packages/db
`npx prisma migrate dev`
`npx prisma generate`

## BetterAuth 
## ShadCN UI
- For UI and Frontend
## Octokit (GitHub Integration)
- Connect repositories
- Receive webhook events
- Track pull requests
- Fetch changed files
- Analyze diffs
- Generate AI reviews
- Post review comments
- Track review status
## AI SDK 
- Requirement clarification
- PRD generation
- Task generation
- Repository analysis
- Code review
- QA validation
- Release readiness checks
## Inngest (Async Workflows)
PRD generation
Task creation
Repository analysis
Pull request processing
AI reviews
Re-review workflows
Release readiness checks
## Razorpay
- Free vs paid plans
- Usage limits
- AI review credits
- Repository limits
- Premium workflow features