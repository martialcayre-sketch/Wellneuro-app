import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PORTAIL_COOKIE_NAME, verifyPatientSession } from '@/lib/patient-session';
import { segmentEstLeDossier } from '@/lib/portail/dossierPage';

// LE SEGMENT CANONIQUE ([[D-481]], complément DOC-12, Q9 a). Le segment
// `[token]` n'authentifie rien (LOT-04) : le dossier servi est celui de la
// session. Mais les envois d'une page portent son segment, et la garde des
// routes d'écriture refuse celui qui n'est pas l'`idPatient` de la session.
// Une page ouverte sous un autre segment — ancien favori d'avant la purge du
// 2026-08-22, adresse retapée — renvoie donc, quand une session valide existe,
// à l'entrée de SON dossier, sans texte ; le patient navigue ensuite sous son
// `idPatient` et ses envois passent la garde.
//
// SIGNATURE ET EXPIRATION SEULES, AUCUNE LECTURE EN BASE (patron de
// `portail/layout.tsx`) : ce renvoi ne décide d'aucun accès. L'`idPatient` vient
// du cookie signé du navigateur lui-même ; chaque route relit en base compte
// actif, révocation et `sessionsInvalidesAvant`. Sans session, rien ne change :
// chaque page garde son comportement.
//
// Ne vaut qu'au rendu serveur du segment : une navigation client sous le même
// segment ne le rejoue pas — d'où la garde des routes, qui seule refuse.
export default async function DossierDeLaPageLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const jar = await cookies();
  const session = verifyPatientSession(jar.get(PORTAIL_COOKIE_NAME)?.value ?? '');
  if (session && !segmentEstLeDossier(token, session.idPatient)) {
    redirect(`/portail/${encodeURIComponent(session.idPatient)}`);
  }
  return children;
}
