import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { getGithubApp } from '@/lib/github';
import { upsertInstallation } from '@/lib/server/installation';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  const installationId = request.nextUrl.searchParams.get('installation_id');
  if (!installationId) {
    return NextResponse.redirect(new URL('/dashboard/github/app', request.url));
  }

  const app = getGithubApp();

  const { data: installation } = await app.octokit.request(
    'GET /app/installations/{installation_id}',
    { installation_id: Number(installationId) }
  );

  await upsertInstallation(session.user.id, {
    installationId: installation.id,
    accountLogin: installation.account?.login ?? '',
    accountType: installation.account?.type ?? 'User',
    accountAvatarUrl: (installation.account as { avatar_url?: string } | null)?.avatar_url ?? null,
    appId: installation.app_id,
    repositorySelection: installation.repository_selection,
    targetId: installation.target_id,
    targetType: installation.target_type,
    htmlUrl: installation.html_url ?? null,
  });

  return NextResponse.redirect(new URL('/dashboard/github/app', request.url));
}
