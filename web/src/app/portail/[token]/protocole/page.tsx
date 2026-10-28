import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MonProtocoleImprimable } from '@/components/patient-companion/MonProtocoleImprimable';
import { protocoleImprimableOuvert } from '@/lib/portail/protocoleImprimable';

// L'imprimable du protocole servi ([[D-392]], lettre bh). Drapeau fermé : 404.
// La session est portée par le cookie portail ; le composant lit
// /api/portail/protocole, qui seule dit si le dossier y a droit (majeur, §3) —
// le segment `[token]` n'est qu'un chemin de routage.
export default async function PortailProtocolePage({ params }: { params: Promise<{ token: string }> }) {
  if (!protocoleImprimableOuvert()) notFound();
  const { token } = await params;
  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline print:hidden"
      >
        ← Mon parcours
      </Link>
      <MonProtocoleImprimable token={token} />
    </div>
  );
}
