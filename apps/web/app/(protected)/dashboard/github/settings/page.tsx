import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function GithubSettingsPage() {
    return (
        <>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm font-medium">GitHub / Settings</span>
            </header>
            <div className="p-6">
                <h1 className="text-2xl font-semibold mb-1">Settings</h1>
                <p className="text-muted-foreground">Configure your GitHub integration preferences.</p>
            </div>
        </>
    )
}
