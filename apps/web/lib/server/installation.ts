import { db } from '@monorepo/db';
import { getGithubApp } from '@/lib/github';
import type { GithubInstallationStatus } from '@/lib/type';

// Returns the GitHub OAuth account linked for this user, or null if they never
// signed in with GitHub.
export async function getLinkedGithubAccount(userId: string) {
  return db.account.findFirst({
    where: { userId, providerId: 'github' },
    select: { accountId: true, accessToken: true },
  });
}

// Returns the GitHub login (username) for a user.
// Prefers the login recorded on the installation (most reliable); falls back to
// the Better-Auth username field which may be set to the GitHub login on sign-in.
export async function getGithubLogin(userId: string): Promise<string | null> {
  const installation = await db.githubInstallation.findFirst({
    where: { userId, accountType: 'User' },
    select: { accountLogin: true },
  });
  if (installation) return installation.accountLogin;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  return user?.username ?? null;
}

// Returns the installation status for a user.
// Returns null when the user has no linked GitHub account OR has not installed
// the GitHub App yet.
export async function getInstallationStatus(
  userId: string
): Promise<GithubInstallationStatus | null> {
  const githubAccount = await getLinkedGithubAccount(userId);
  if (!githubAccount) return null;

  const installation = await db.githubInstallation.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!installation) return null;

  return {
    installationId: installation.installationId,
    accountLogin: installation.accountLogin,
    accountType: installation.accountType as 'User' | 'Organization',
    accountAvatarUrl: installation.accountAvatarUrl,
    repositorySelection: installation.repositorySelection as 'all' | 'selected',
    suspended: installation.suspended,
    createdAt: installation.createdAt,
  };
}

// Upserts a GitHub App installation — called from the webhook handler when an
// installation is created or updated.
export async function upsertInstallation(
  userId: string,
  data: {
    installationId: number;
    accountLogin: string;
    accountType: string;
    accountAvatarUrl?: string | null;
    appId: number;
    repositorySelection: string;
    targetId: number;
    targetType: string;
    htmlUrl?: string | null;
  }
) {
  return db.githubInstallation.upsert({
    where: { installationId: data.installationId },
    create: { userId, ...data },
    update: { ...data },
  });
}

// Removes an installation record — called when the user uninstalls the app.
export async function removeInstallation(installationId: number) {
  return db.githubInstallation.deleteMany({ where: { installationId } });
}

// Returns an authenticated Octokit client scoped to a specific installation.
export async function getInstallationOctokit(installationId: number) {
  const app = getGithubApp();
  return app.getInstallationOctokit(installationId);
}
