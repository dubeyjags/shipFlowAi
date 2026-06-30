import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { requireAuth } from '@/lib/auth-session';
import { getInstallationStatus } from '@/lib/server/installation';
import { getGithubAppInstallUrl } from '@/lib/github';
import { disconnectGithubApp } from '@/lib/server/github-actions';
import GithubConnectCard from '@/components/dashboard/github-connect-card';

export default async function GithubAppPage() {
  const session = await requireAuth();
  const status = await getInstallationStatus(session.user.id);
  const installUrl = getGithubAppInstallUrl(session.user.id);

  const disconnectAction = status
    ? disconnectGithubApp.bind(null, status.installationId)
    : async () => {};

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <span className="text-sm font-medium">GitHub / GitHub App</span>
      </header>
      <div className="p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">GitHub App</h1>
          <p className="text-muted-foreground">Manage your ShipFlow GitHub App installation.</p>
        </div>
        <GithubConnectCard
          status={status}
          installUrl={installUrl}
          disconnectAction={disconnectAction}
        />
      </div>
    </>
  );
}
