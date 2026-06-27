"use server";

import { auth } from "@monorepo/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSafeCallbackPath } from "@/lib/auth-routes";

export async function signInWithGithub(formData: FormData) {
    const rawCallbackUrl = formData.get("callbackUrl") as string | null;
    const callbackUrl = getSafeCallbackPath(rawCallbackUrl);

    const result = await auth.api.signInSocial({
        body: {
            provider: "github",
            callbackURL: callbackUrl,
        },
        headers: await headers(),
    });

    if (!result?.url) {
        throw new Error("GitHub sign-in failed: no redirect URL returned");
    }

    redirect(result.url);
}

export async function signOut() {
    await auth.api.signOut({
        headers: await headers(),
    });

    redirect("/sign-in");
}
