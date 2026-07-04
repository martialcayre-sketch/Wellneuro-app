import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NavBar } from '@/components/NavBar';
import type { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  return (
    <div data-theme="praticien" className="min-h-screen bg-background text-foreground">
      <NavBar email={session.user?.email ?? ''} />
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
