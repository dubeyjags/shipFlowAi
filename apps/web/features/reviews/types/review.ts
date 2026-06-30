export interface PullRequestWebhookPayload {
  action: string;
  installation: { id: number };
  repository: { full_name: string };
  pull_request: {
    number: number;
    title: string;
    user: { login: string } | null;
    head: { sha: string };
    base: { ref: string };
  };
}

export function getAuthorLogin(payload: PullRequestWebhookPayload): string | null {
  return payload.pull_request.user?.login ?? null;
}
