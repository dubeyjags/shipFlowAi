import { getInstallationOctokit } from './installation';
import type { GithubRepo, GithubReposPage } from '@/lib/type';

const PER_PAGE = 100;

export async function getInstallationReposPage(
  installationId: number,
  page: number
): Promise<GithubReposPage> {
  const octokit = await getInstallationOctokit(installationId);

  const response = await octokit.request('GET /installation/repositories', {
    per_page: PER_PAGE,
    page,
  });

  const repos: GithubRepo[] = response.data.repositories.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    visibility: repo.visibility ?? (repo.private ? 'private' : 'public'),
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at ?? new Date().toISOString(),
    language: repo.language ?? null,
    stars: repo.stargazers_count ?? 0,
  }));

  const totalCount = response.data.total_count;
  const hasMore = page * PER_PAGE < totalCount;

  return { repos, totalCount, page, hasMore };
}
