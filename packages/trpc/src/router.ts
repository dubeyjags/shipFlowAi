import { procedure, router } from "./trpc.js";
import { createUserSchema, createTestSchema } from "@monorepo/utils";
import { db } from "@monorepo/db";

export const appRouter = router({
    health: procedure.query(() => {
        return {
            message: "healthy"
        }
    }),
    register: procedure
        .input(createUserSchema)
        .mutation(async ({ input }) => {
            const user = await db.user.create({
                data: {
                    name: input.name,
                    email: input.email,
                    password: input.password,
                },
                select: { id: true, email: true, name: true },
            });
            return {
                message: "User Registered Successfully",
                userId: user.id,
            };
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