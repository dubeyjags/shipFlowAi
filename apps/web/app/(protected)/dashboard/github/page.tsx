import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function GithubOverviewPage() {
    return (
        <>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm font-medium">GitHub / Overview</span>
            </header>
            <div className="p-6">
                <h1 className="text-2xl font-semibold mb-1">Overview</h1>
                <p className="text-muted-foreground">Your GitHub activity and summary.</p>
            </div>
        </>
    )
}
