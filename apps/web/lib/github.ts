import { App } from 'octokit';

let _app: App | null = null;

// Singleton — private key is read once from env; subsequent calls reuse the cached instance.
export function getGithubApp(): App {
  if (!_app) {
    _app = new App({
      appId: Number(process.env.GITHUB_APP_ID!),
      // Handle PEM keys stored with literal \n in .env files
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      webhooks: {
        secret: process.env.GITHUB_WEBHOOK_SECRET!,
      },
    });
  }
  return _app;
}

// URL to redirect users who need to install (or re-install) the GitHub App.
// The state param encodes the userId so the callback can link the installation to the right user.
export function getGithubAppInstallUrl(userId: string): string {
  return `https://github.com/apps/${process.env.GITHUB_APP_NAME}/installations/new?state=${userId}`;
}
