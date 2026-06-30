"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    IconDashboard,
    IconFlask,
    IconLogout,
    IconLayoutGrid,
    IconDatabase,
    IconGitPullRequest,
    IconApps,
    IconSettings,
} from "@tabler/icons-react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from "@/components/ui/sidebar"
import { signOut } from "@/lib/auth-actions"
import UserAvatar from "@/components/auth/user-avatar"

type User = {
    name?: string | null
    email: string
    image?: string | null
}

const navItems = [
    { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
    { title: "Test", url: "/test", icon: IconFlask },
]

const githubNavItems = [
    { title: "Overview",     url: "/dashboard/github",               icon: IconLayoutGrid },
    { title: "Repositories", url: "/dashboard/github/repositories",  icon: IconDatabase },
    { title: "Pull Requests", url: "/dashboard/github/pull-requests", icon: IconGitPullRequest },
    { title: "GitHub App",   url: "/dashboard/github/app",           icon: IconApps },
    { title: "Settings",     url: "/dashboard/github/settings",      icon: IconSettings },
]

export default function AppSidebar({ user }: { user: User }) {
    const pathname = usePathname()

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold shrink-0">
                                SF
                            </div>
                            <span className="font-semibold">ShipFlow</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Platform</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.url}>
                                    <SidebarMenuButton
                                        render={<Link href={item.url} />}
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                    >
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>GitHub</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {githubNavItems.map((item) => (
                                <SidebarMenuItem key={item.url}>
                                    <SidebarMenuButton
                                        render={<Link href={item.url} />}
                                        isActive={
                                            item.url === "/dashboard/github"
                                                ? pathname === item.url
                                                : pathname.startsWith(item.url)
                                        }
                                        tooltip={item.title}
                                    >
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarSeparator />
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" tooltip={user.email ?? "Account"}>
                            <UserAvatar
                                name={user.name}
                                email={user.email}
                                image={user.image}
                            />
                            <div className="flex flex-col flex-1 text-left min-w-0">
                                <span className="text-sm font-medium truncate">
                                    {user.name ?? user.email}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <form action={signOut} className="w-full">
                            <SidebarMenuButton
                                render={<button type="submit" />}
                                tooltip="Sign out"
                            >
                                <IconLogout />
                                <span>Sign out</span>
                            </SidebarMenuButton>
                        </form>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
