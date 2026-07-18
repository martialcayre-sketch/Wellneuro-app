import Link from 'next/link';
import { PatientFoodObservationPanel } from '@/components/food-observation/PatientFoodObservationPanel';
import { PatientFoodCompassProtocolSection } from '@/components/patient-food-compass/PatientFoodCompassProtocolSection';

export default function PortailAlimentationPage({ params }: { params: { token: string } }) {
  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link href={`/portail/${params.token}/questionnaires`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        ← Mes questionnaires
      </Link>
      <PatientFoodCompassProtocolSection token={params.token} />
      <PatientFoodObservationPanel token={params.token} />
    </div>
  );
}
