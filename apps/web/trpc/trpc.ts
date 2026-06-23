import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@monorepo/trpc";
export const trpc = createTRPCReact<AppRouter>();