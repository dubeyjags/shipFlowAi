import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { SIGN_IN_PATH } from "@/lib/auth-routes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession();

    if (!session?.user) {
        const headersList = await headers();
        const pathname = headersList.get("x-pathname");
        const redirectUrl = pathname
            ? `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(pathname)}`
            : SIGN_IN_PATH;
        redirect(redirectUrl);
    }

    return (
        <SidebarProvider>
            <AppSidebar user={session!.user} />
            <SidebarInset>
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}
