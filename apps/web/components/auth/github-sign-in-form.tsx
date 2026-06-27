"use client";

import { useFormStatus } from "react-dom";
import { signInWithGithub } from "@/lib/auth-actions";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending}>
            {pending ? "Redirecting…" : "Continue with GitHub"}
        </button>
    );
}

type Props = {
    callbackUrl?: string;
};

export default function GithubSignInForm({ callbackUrl }: Props) {
    return (
        <form action={signInWithGithub}>
            {callbackUrl && (
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
            )}
            <SubmitButton />
        </form>
    );
}
