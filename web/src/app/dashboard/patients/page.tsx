import { PatientsPanel } from '@/components/PatientsPanel';

export default function DashboardPatientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Patients & assignations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gestion patients et assignations via PostgreSQL (Prisma)
        </p>
      </div>
      <PatientsPanel />
    </div>
  );
}
