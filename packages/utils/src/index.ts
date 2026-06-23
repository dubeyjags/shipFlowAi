import { z } from 'zod';
export const createUserSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters long"),
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long")
})

export type CreateUserSchema = z.infer<typeof createUserSchema>; // zod will create schema like this
