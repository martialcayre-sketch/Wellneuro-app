import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PatientFoodCompassZoom } from '@/components/patient-food-compass/PatientFoodCompassZoom';
import { isC5Enabled } from '@/lib/food-compass/featureFlag';

export default function PatientFoodCompassPage({
  params,
}: {
  params: { token: string; foodRef: string };
}) {
  if (!isC5Enabled(process.env.WN_C5_ENABLED)) notFound();
  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link href={`/portail/${params.token}/alimentation`} className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">
        ← Ma spirale alimentaire
      </Link>
      <PatientFoodCompassZoom foodRef={params.foodRef} />
    </div>
  );
}
