"use server";

import { auth } from "@monorepo/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signInWithGithub(formData: FormData) {
    const callbackUrl = (formData.get("callbackUrl") as string | null) ?? "/dashboard";

    const result = await auth.api.signInSocial({
        body: {
            provider: "github",
            callbackURL: callbackUrl,
        },
        headers: await headers(),
    });

    console.log("[signInWithGithub] result:", result);

    if (!result?.url) {
        throw new Error("GitHub sign-in failed: no redirect URL returned");
    }

    redirect(result.url);
}
