import GithubSignInForm from "@/components/auth/github-sign-in-form";

export default async function SignInPage({
    searchParams,
}: {
    searchParams: Promise<{ callbackUrl?: string }>;
}) {
    const { callbackUrl } = await searchParams;

    return (
        <main>
            <h1>Sign In</h1>
            <GithubSignInForm callbackUrl={callbackUrl} />
        </main>
    );
}
