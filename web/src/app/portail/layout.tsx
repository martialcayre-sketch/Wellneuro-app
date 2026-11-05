import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { ReadingComfortControl } from '@/components/patient/ReadingComfortControl';
import { BoutonDeconnexion } from '@/components/patient/BoutonDeconnexion';
import { PiedDePageInformations } from '@/components/patient/trust/PiedDePageInformations';
import { PiedDePageUrgence } from '@/components/patient/PiedDePageUrgence';
import { PORTAIL_COOKIE_NAME, verifyPatientSession } from '@/lib/patient-session';
import { menuPortailOuvert } from '@/components/patient/menu/menuDrapeau';
import { BoutonMenuMonEspace, FournisseurMenuPortail, MotSymbole } from '@/components/patient/menu/MenuMonEspace';
import { LIEN_EVITEMENT } from '@/components/patient/menu/textesMenu';
import { barreBasseOuverte } from '@/components/patient/barre-basse/barreBasseDrapeau';
import { BarreBasse } from '@/components/patient/barre-basse/BarreBasse';

export const metadata: Metadata = {
  title: 'Wellneuro — Espace patient',
};

// Lire le cookie rend tout `/portail/*` dynamique, et c'est sans coût ici :
// `connexion` était déjà `force-dynamic`, `[token]` est un composant client qui
// va chercher son état au montage, et aucune page du portail n'est la même pour
// deux personnes. Rien à pré-rendre, donc rien de perdu.
export const dynamic = 'force-dynamic';

/** La barre basse ([[D-444]]) n'a d'effet que menu ouvert. */
function barreServie(): boolean {
  return menuPortailOuvert() && barreBasseOuverte();
}

// Zone sûre de la barre basse ([[D-444]] §4) : `viewport-fit=cover` donne sa
// valeur à `env(safe-area-inset-*)`. Posé ici seulement, drapeau ouvert
// seulement ; fermé, le viewport par défaut de Next est inchangé.
export function generateViewport(): Viewport {
  return barreServie() ? { viewportFit: 'cover' } : {};
}

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
  // Menu « Mon espace » ([[D-442]]) : drapeau serveur, lu à chaque requête.
  // Fermé, le portail est exactement celui d'avant — ni lien d'évitement, ni
  // lien d'accueil, ni bouton, et aucun composant du menu monté.
  const menu = menuPortailOuvert();
  const barre = barreServie();
  const portail = (
    // Canvas sable PLAT (maquette cible : les cartes crème flottent sur le
    // sable, pas de dégradé).
    // Barre ouverte, `viewport-fit=cover` étend la page sous l'encoche et
    // l'indicateur d'accueil : le conteneur rend les zones sûres latérales et
    // basse ([[D-444]] §4), que la barre paraisse ou non — sans elle (mineur,
    // murs, questionnaire en cours), le pied ne passe pas sous l'indicateur.
    <div
      className={`min-h-screen bg-background flex flex-col${
        barre
          ? ' pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]'
          : ''
      }`}
    >
      {/* Lien d'évitement ([[D-442]] §6) : premier arrêt de tabulation,
          visible au focus seulement. */}
      {menu && (
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-primary print:hidden"
        >
          {LIEN_EVITEMENT}
        </a>
      )}
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
        {menu ? (
          // Mot-symbole en lien d'accueil, puis le bouton « Menu » ([[D-442]] §1, §5).
          <div className="flex flex-wrap items-center gap-3">
            <MotSymbole />
            <BoutonMenuMonEspace />
          </div>
        ) : (
          <span className="font-display text-xl font-bold text-primary">Wellneuro</span>
        )}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <ReadingComfortControl />
          {sessionOuverte && <BoutonDeconnexion />}
        </div>
      </header>
      <main
        id={menu ? 'contenu' : undefined}
        tabIndex={menu ? -1 : undefined}
        className={`flex-1 flex flex-col items-center px-4 py-8${menu ? ' focus:outline-none' : ''}`}
      >
        {children}
      </main>
      <footer className="py-4 px-4 text-center text-xs text-muted-foreground/70 space-y-1 print:hidden">
        <p>
          Cet espace ne constitue pas un diagnostic médical. Vos informations sont transmises à votre praticien,
          qui ne les lit pas en temps réel.
        </p>
        {/* Les numéros d'urgence, sur toutes les pages ([[D-293]] §3,
            amendement du 2026-10-21). */}
        <PiedDePageUrgence />
        <p>
          <PiedDePageInformations />
        </p>
      </footer>
      {/* Barre basse ([[D-444]]) : après le pied, dont elle réserve la place. */}
      {barre && <BarreBasse />}
    </div>
  );
  return menu ? <FournisseurMenuPortail sessionOuverte={sessionOuverte}>{portail}</FournisseurMenuPortail> : portail;
}
