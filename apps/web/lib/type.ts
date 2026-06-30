export type RepoSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type RepoVisibility = 'public' | 'private';

export interface DashboardRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  visibility: RepoVisibility;
  defaultBranch: string;
  syncStatus: RepoSyncStatus;
  lastSyncedAt: Date | null;
  installationId: number;
  htmlUrl: string;
  language: string | null;
  updatedAt: Date;
}

export interface GithubInstallationStatus {
  installationId: number;
  accountLogin: string;
  accountType: 'User' | 'Organization';
  accountAvatarUrl: string | null;
  repositorySelection: 'all' | 'selected';
  suspended: boolean;
  createdAt: Date;
}

export type UserSubscription = 'free' | 'pro' | 'enterprise';

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  visibility: string;
  defaultBranch: string;
  updatedAt: string;
  language: string | null;
  stars: number;
}

export interface GithubReposPage {
  repos: GithubRepo[];
  totalCount: number;
  page: number;
  hasMore: boolean;
}
