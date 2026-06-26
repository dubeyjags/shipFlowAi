import { signInWithGithub } from "@/lib/auth-actions";

type GithubSignInFormProps = {
    callbackUrl?: string;
};

function GithubSignInForm({ callbackUrl }: GithubSignInFormProps) {
    return (
        <form action={signInWithGithub}>
            {callbackUrl ? (
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
            ) : null}
            <button type="submit">Continue with GitHub</button>
        </form>
    );
}

export default function SignInPage() {
    return (
        <main>
            <h1>Sign In</h1>
            <GithubSignInForm />
        </main>
    );
}
