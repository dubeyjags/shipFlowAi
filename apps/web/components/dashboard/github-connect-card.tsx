'use client';

import type { GithubInstallationStatus } from '@/lib/type';

type Props = {
  status: GithubInstallationStatus | null;
  installUrl: string;
  disconnectAction: () => Promise<void>;
};

export default function GithubConnectCard({ status, installUrl, disconnectAction }: Props) {
  if (!status) {
    return (
      <div className="rounded-lg border bg-card p-6 flex flex-col gap-4 max-w-md">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-lg">Connect GitHub App</h2>
          <p className="text-sm text-muted-foreground">
            Install the ShipFlow GitHub App to allow access to your repositories.
          </p>
        </div>
        <a
          href={installUrl}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors w-fit"
        >
          Install GitHub App
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg">GitHub App</h2>
        <p className="text-sm text-muted-foreground">
          Your GitHub App is connected and active.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {status.accountAvatarUrl && (
          <img
            src={status.accountAvatarUrl}
            alt={status.accountLogin}
            className="size-8 rounded-full"
          />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium">@{status.accountLogin}</span>
          <span className="text-xs text-muted-foreground capitalize">{status.accountType}</span>
        </div>
        <span className="ml-auto text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
          Connected
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Repositories:</span>
        <span className="capitalize font-medium text-foreground">{status.repositorySelection}</span>
      </div>

      <form action={disconnectAction}>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md border border-destructive text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          Disconnect
        </button>
      </form>
    </div>
  );
}
