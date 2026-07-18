import { notFound } from 'next/navigation';
import { ValidationJaHarness } from '@/components/patient-food-observation/ValidationJaHarness';
import { isValidationJaHarnessAvailable } from '@/components/patient-food-observation/validationJaGuard';

export const dynamic = 'force-dynamic';

export default function ValidationJaPage() {
  if (!isValidationJaHarnessAvailable(process.env.NODE_ENV)) {
    notFound();
  }

  return <ValidationJaHarness />;
}

