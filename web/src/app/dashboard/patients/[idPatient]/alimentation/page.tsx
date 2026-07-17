import { PractitionerFoodObservationPanel } from '@/components/food-observation/PractitionerFoodObservationPanel';

export default function PatientAlimentationPage({ params }: { params: { idPatient: string } }) {
  return <PractitionerFoodObservationPanel idPatient={params.idPatient} />;
}
