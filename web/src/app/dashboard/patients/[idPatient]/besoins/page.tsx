import { DetailBesoinsPanel } from '@/components/DetailBesoinsPanel';

export default function DetailBesoinsPage({ params }: { params: { idPatient: string } }) {
  return <DetailBesoinsPanel idPatient={params.idPatient} />;
}
