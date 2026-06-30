import { db } from '@monorepo/db';
import { type PullRequestWebhookPayload, getAuthorLogin } from '../types/review';

export async function savePullRequest(payload: PullRequestWebhookPayload) {
  const repoFullName = payload.repository.full_name;
  const prNumber = payload.pull_request.number;

  return db.pullRequest.upsert({
    where: { repoFullName_prNumber: { repoFullName, prNumber } },
    create: {
      installationId: payload.installation.id,
      repoFullName,
      prNumber,
      title: payload.pull_request.title,
      authorLogin: getAuthorLogin(payload),
      headSha: payload.pull_request.head.sha,
      baseBranch: payload.pull_request.base.ref,
    },
    update: {
      title: payload.pull_request.title,
      headSha: payload.pull_request.head.sha,
      status: 'pending',
    },
  });
}
