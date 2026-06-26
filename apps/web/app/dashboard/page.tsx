import { auth } from "@monorepo/auth";
import { headers } from "next/headers";
import SessionLogger from "./_session-logger";

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    console.log("[Dashboard] Login details:", JSON.stringify(session, null, 2));

    return (
        <main>
            <h1>Dashboard</h1>
            <SessionLogger session={session} />
            {session?.user ? (
                <p>Welcome, {session.user.name ?? session.user.email}</p>
            ) : (
                <p>Not signed in.</p>
            )}
        </main>
    );
}
