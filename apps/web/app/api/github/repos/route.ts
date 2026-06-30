import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { getInstallationStatus } from '@/lib/server/installation';
import { getInstallationReposPage } from '@/lib/server/repos';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = await getInstallationStatus(session.user.id);
  if (!status) {
    return NextResponse.json({ error: 'No GitHub App installation found' }, { status: 400 });
  }

  const page = Number(request.nextUrl.searchParams.get('page') ?? '1');
  const result = await getInstallationReposPage(status.installationId, page);

  return NextResponse.json(result);
}
