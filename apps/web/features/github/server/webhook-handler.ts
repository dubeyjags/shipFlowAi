import { type NextRequest, NextResponse } from 'next/server';
import { getGithubApp } from '@/lib/github';
import { savePullRequest } from '@/features/reviews/server/save-pull-request';
import type { PullRequestWebhookPayload } from '@/features/reviews/types/review';

const REVIEWABLE_ACTIONS = ['opened', 'synchronize', 'reopened'];

export async function handleGithubWebhook(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('x-hub-signature-256') ?? '';
  const event = request.headers.get('x-github-event') ?? '';

  const isValid = await getGithubApp().webhooks.verify(payload, signature);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (event !== 'pull_request') {
    return NextResponse.json({ received: true });
  }

  const data = JSON.parse(payload) as PullRequestWebhookPayload;

  if (!REVIEWABLE_ACTIONS.includes(data.action)) {
    return NextResponse.json({ received: true });
  }

  await savePullRequest(data);

  return NextResponse.json({ received: true });
}
