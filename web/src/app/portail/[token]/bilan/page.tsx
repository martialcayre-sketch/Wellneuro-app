import Link from 'next/link';
import { MonBilan } from '@/components/patient/MonBilan';

// Le bilan transmis par le praticien, lu dans l'espace patient. La session est
// portée par le cookie portail ; le composant résout l'état via
// /api/portail/bilan — le segment `[token]` n'est qu'un chemin de routage.
export default function PortailBilanPage({ params }: { params: { token: string } }) {
  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${params.token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline print:hidden"
      >
        ← Mon parcours
      </Link>
      <MonBilan token={params.token} />
    </div>
  );
}
