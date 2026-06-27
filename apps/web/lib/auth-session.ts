import { cache } from "react";
import { auth } from "@monorepo/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SIGN_IN_PATH, DEFAULT_AUTH_CALLBACK } from "@/lib/auth-routes";

export const getServerSession = cache(async () => {
    return auth.api.getSession({ headers: await headers() });
});

export async function requireAuth() {
    const session = await getServerSession();
    if (!session?.user) {
        redirect(SIGN_IN_PATH);
    }
    return session!;
}

export async function requireUnauth() {
    const session = await getServerSession();
    if (session?.user) {
        redirect(DEFAULT_AUTH_CALLBACK);
    }
}
