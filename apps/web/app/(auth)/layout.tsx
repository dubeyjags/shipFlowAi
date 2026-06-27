import { requireUnauth } from "@/lib/auth-session";

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireUnauth();
    return <>{children}</>;
}
