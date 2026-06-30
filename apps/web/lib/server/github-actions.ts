'use server';

import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth-session';
import { removeInstallation } from './installation';

export async function disconnectGithubApp(installationId: number) {
  await requireAuth();
  await removeInstallation(installationId);
  redirect('/dashboard/github/app');
}
