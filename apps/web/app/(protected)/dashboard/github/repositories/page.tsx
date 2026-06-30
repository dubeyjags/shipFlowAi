import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { requireAuth } from '@/lib/auth-session';
import { getInstallationStatus } from '@/lib/server/installation';
import { getGithubAppInstallUrl } from '@/lib/github';
import ReposList from '@/components/dashboard/repos-list';
import Link from 'next/link';

export default async function GithubRepositoriesPage() {
  const session = await requireAuth();
  const status = await getInstallationStatus(session.user.id);

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <span className="text-sm font-medium">GitHub / Repositories</span>
      </header>
      <div className="p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Repositories</h1>
          <p className="text-muted-foreground">Manage repositories connected to ShipFlow.</p>
        </div>

        {!status ? (
          <div className="flex flex-col gap-3 max-w-md">
            <p className="text-sm text-muted-foreground">
              No GitHub App installation found. Install the app to access your repositories.
            </p>
            <Link
              href={getGithubAppInstallUrl(session.user.id)}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors w-fit"
            >
              Install GitHub App
            </Link>
          </div>
        ) : (
          <ReposList />
        )}
      </div>
    </>
  );
}
