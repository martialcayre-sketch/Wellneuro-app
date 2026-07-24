import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NavBar } from '@/components/NavBar';
import { releaseSha } from '@/lib/observability/deploymentEnv';
import type { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const buildLabel = `build ${releaseSha().slice(0, 7)}`;

  if (!session) {
    redirect('/login');
  }
  return (
    <div data-theme="praticien">
      <NavBar email={session.user?.email ?? ''} buildLabel={buildLabel}>
        {children}
      </NavBar>
    </div>
  );
}
