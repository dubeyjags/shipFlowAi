import { procedure, router } from "./trpc.js";
import { createUserSchema } from "@monorepo/utils";
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
            // console.log("register", input);
            return {
                message: "User Registered Successfully"
            }
        }),
});

export type AppRouter = typeof appRouter;