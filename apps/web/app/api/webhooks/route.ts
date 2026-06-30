import { type NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '@monorepo/db';
import { upsertInstallation, removeInstallation } from '@/lib/server/installation';

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function findUserId(githubSenderId: number): Promise<string | null> {
  const account = await db.account.findFirst({
    where: { providerId: 'github', accountId: String(githubSenderId) },
    select: { userId: true },
  });
  return account?.userId ?? null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256') ?? '';
  const event = request.headers.get('x-github-event') ?? '';

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);

  if (event === 'installation') {
    const { action, installation, sender } = payload;

    if (action === 'created') {
      const userId = await findUserId(sender.id);
      if (userId) {
        await upsertInstallation(userId, {
          installationId: installation.id,
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          accountAvatarUrl: installation.account.avatar_url ?? null,
          appId: installation.app_id,
          repositorySelection: installation.repository_selection,
          targetId: installation.target_id,
          targetType: installation.target_type,
          htmlUrl: installation.html_url ?? null,
        });
      }
    } else if (action === 'deleted') {
      await removeInstallation(installation.id);
    } else if (action === 'suspend') {
      await db.githubInstallation.updateMany({
        where: { installationId: installation.id },
        data: { suspended: true, suspendedAt: new Date() },
      });
    } else if (action === 'unsuspend') {
      await db.githubInstallation.updateMany({
        where: { installationId: installation.id },
        data: { suspended: false, suspendedAt: null },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
