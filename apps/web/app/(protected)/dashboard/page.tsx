import { getServerSession } from "@/lib/auth-session";
import SessionLogger from "./_components/session-logger";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function DashboardPage() {
    const session = await getServerSession();

    return (
        <>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm font-medium">Dashboard</span>
            </header>
            <div className="p-6">
                <SessionLogger session={session} />
                <h1 className="text-2xl font-semibold mb-1">Overview</h1>
                <p className="text-muted-foreground">
                    Welcome back, {session!.user.name ?? session!.user.email}
                </p>
            </div>
        </>
    );
}
