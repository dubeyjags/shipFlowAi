'use client';

import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { IconGitPullRequest, IconExternalLink, IconStar } from '@tabler/icons-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GithubRepo, GithubReposPage } from '@/lib/type';

async function fetchReposPage(page: number): Promise<GithubReposPage> {
  const res = await fetch(`/api/github/repos?page=${page}`);
  if (!res.ok) throw new Error('Failed to fetch repositories');
  return res.json();
}

function RepoCard({ repo }: { repo: GithubRepo }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 gap-4">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium truncate">{repo.fullName}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {repo.language && <span>{repo.language}</span>}
          {repo.language && <span>·</span>}
          <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            repo.visibility === 'private'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}
        >
          {repo.visibility}
        </span>
        {repo.stars > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <IconStar size={12} />
            {repo.stars}
          </span>
        )}
        <div className="flex items-center gap-1 ml-1">
          <Link
            href={`/dashboard/github/pull-requests?repo=${encodeURIComponent(repo.fullName)}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <IconGitPullRequest size={14} />
            PRs
          </Link>
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
            title="Open on GitHub"
          >
            <IconExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ReposList() {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: ['github-repos'],
      queryFn: ({ pageParam }) => fetchReposPage(pageParam as number),
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
      initialPageParam: 1,
    });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg border bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">Failed to load repositories. Please try again.</p>
    );
  }

  const allRepos = data?.pages.flatMap((p) => p.repos) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  if (allRepos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No repositories found for this installation.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Showing {allRepos.length} of {totalCount} repositories
      </p>
      <div className="flex flex-col gap-2">
        {allRepos.map((repo) => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
