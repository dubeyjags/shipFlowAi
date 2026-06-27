import { procedure, router } from "./trpc.js";
import { createTestSchema } from "@monorepo/utils";
import { db } from "@monorepo/db";

export const appRouter = router({
    health: procedure.query(() => {
        return {
            message: "healthy"
        }
    }),
    createTest: procedure
        .input(createTestSchema)
        .mutation(async ({ input }) => {
            const test = await db.test.create({
                data: { name: input.name },
                select: { id: true, name: true },
            });
            return test;
        }),
    getTests: procedure.query(async () => {
        return db.test.findMany({ orderBy: { id: "desc" } });
    }),
});

export type AppRouter = typeof appRouter;