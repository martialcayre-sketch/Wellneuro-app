import Link from 'next/link';
import { PatientFoodObservationPanel } from '@/components/food-observation/PatientFoodObservationPanel';

export default function PortailAlimentationPage({ params }: { params: { token: string } }) {
  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link href={`/portail/${params.token}/questionnaires`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        ← Mes questionnaires
      </Link>
      <PatientFoodObservationPanel token={params.token} />
    </div>
  );
}
