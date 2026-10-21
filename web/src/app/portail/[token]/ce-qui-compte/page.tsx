import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { CeQuiCompteForm } from '@/components/patient-companion/CeQuiCompteForm';
import { isCeQuiCompteEnabled } from '@/lib/patient/featureFlag';
import { PORTAIL_COOKIE_NAME, verifyPatientSession } from '@/lib/patient-session';

// « Ce qui compte pour moi aujourd'hui » (Alliance 6.0-A, LOT-03) — page mince,
// patron de `suivi/page.tsx` : lien de retour + composant client. La session
// est portée par le cookie portail ; le formulaire dépose via
// /api/portail/ce-qui-compte, qui garde l'accès.
//
// Le drapeau garde l'écran ET la route. Ici `notFound()` plutôt qu'un message :
// tant que la surface n'est pas ouverte, elle n'existe pas pour le patient.
//
// L'identité de la session, lue du cookie signé comme pour le Journal
// Alimentaire, ne sert qu'à NOMMER le brouillon local (t06) : la route de
// dépôt relit la session elle-même et n'accepte aucun identifiant du corps.
export default async function PortailCeQuiComptePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isCeQuiCompteEnabled()) notFound();
  const session = verifyPatientSession((await cookies()).get(PORTAIL_COOKIE_NAME)?.value);

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        ← Mon parcours
      </Link>
      <CeQuiCompteForm idPatient={session?.idPatient ?? null} />
    </div>
  );
}
