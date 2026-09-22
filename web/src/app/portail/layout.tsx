import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ReadingComfortControl } from '@/components/patient/ReadingComfortControl';
import { BoutonDeconnexion } from '@/components/patient/BoutonDeconnexion';
import { PiedDePageInformations } from '@/components/patient/trust/PiedDePageInformations';
import { PORTAIL_COOKIE_NAME, verifyPatientSession } from '@/lib/patient-session';

export const metadata: Metadata = {
  title: 'Wellneuro — Espace patient',
};

// Lire le cookie rend tout `/portail/*` dynamique, et c'est sans coût ici :
// `connexion` était déjà `force-dynamic`, `[token]` est un composant client qui
// va chercher son état au montage, et aucune page du portail n'est la même pour
// deux personnes. Rien à pré-rendre, donc rien de perdu.
export const dynamic = 'force-dynamic';

export default async function PortailLayout({ children }: { children: ReactNode }) {
  // SIGNATURE SEULE, AUCUNE LECTURE EN BASE. Ce booléen ne décide d'aucun accès
  // — il décide d'afficher un bouton. Les gardes qui comptent (`actif`,
  // `accessTokenRevoked`, `sessionsInvalidesAvant`) sont relues en base par
  // chaque route, à chaque requête, et ne sont pas contournées par ce rendu.
  // Un cookie révoqué afficherait donc « Se déconnecter » sur un portail qui
  // refuse tout le reste : c'est inoffensif, et le geste proposé est justement
  // celui qui nettoie.
  const jar = await cookies();
  const sessionOuverte = verifyPatientSession(jar.get(PORTAIL_COOKIE_NAME)?.value ?? '') !== null;
  return (
    // Canvas sable PLAT (maquette cible : les cartes crème flottent sur le
    // sable, pas de dégradé).
    <div className="min-h-screen bg-background flex flex-col">
      {/* À l'impression, le chrome de l'application disparaît : seule la page
          sort. « Mon bilan » se montre au médecin traitant, et une capture
          d'écran de logiciel n'est pas un document. Le contrôle de confort de
          lecture est en outre interactif — il n'a aucun sens sur papier. */}
      {/* `flex-wrap` : le troisième élément est arrivé avec la déconnexion, et
          « Wellneuro » + « Confort de lecture » + « Se déconnecter » dépassent
          390 px — la largeur de l'iPhone 13, sur lequel tournent les E2E. Sans
          lui, l'en-tête déborde ou comprime ses libellés ; avec lui, le groupe
          de droite passe à la ligne et les cibles tactiles gardent leurs 44 px. */}
      <header className="py-4 px-6 border-b border-border bg-surface/80 backdrop-blur flex flex-wrap items-center justify-between gap-3 print:hidden">
        <span className="font-display text-xl font-bold text-primary">Wellneuro</span>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <ReadingComfortControl />
          {sessionOuverte && <BoutonDeconnexion />}
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        {children}
      </main>
      <footer className="py-4 px-4 text-center text-xs text-muted-foreground/70 space-y-1 print:hidden">
        <p>
          Cet espace ne constitue pas un diagnostic médical. Vos informations sont transmises à votre praticien.
        </p>
        <p>
          <PiedDePageInformations />
        </p>
      </footer>
    </div>
  );
}
