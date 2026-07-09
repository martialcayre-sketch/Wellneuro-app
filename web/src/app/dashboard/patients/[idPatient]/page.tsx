import { FichePatientPanel } from '@/components/FichePatientPanel';

export default function FichePatientPage({ params }: { params: { idPatient: string } }) {
  return <FichePatientPanel idPatient={params.idPatient} />;
}
