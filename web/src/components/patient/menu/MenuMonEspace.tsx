'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { PanneauSuperpose } from '@/components/ui/PanneauSuperpose';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { entreesServies, groupesServis, hrefEntree, useEtatsSondes, type EtatsSondes } from '@/components/patient/autres-espaces/entreesAutresEspaces';
import { SondesAutresEspaces, SondesPartageesContexte } from '@/components/patient/autres-espaces/SondesAutresEspaces';
import { elementActif } from './activationMenu';
import { DESCRIPTION_MENU, LIBELLE_BOUTON_MENU, TITRE_MENU } from './textesMenu';

/*
 * MENU PATIENT « MON ESPACE » ([[D-442]], lot L3 de l'audit « rails et menus »).
 *
 * Monté par `portail/layout.tsx` sous `WN_PORTAIL_MENU` seulement : drapeau
 * fermé, rien de ce fichier n'est rendu.
 *
 * QUAND LE BOUTON PARAÎT (§1). Sur une page de session sous `/portail/{token}/`
 * — jamais la connexion, `lien/indisponible` ni les écrans de
 * `[token]/page.tsx` —, une fois les murs d'entrée franchis, au seul dossier
 * majeur ([[D-283]] §5 ; l'âge, pas la clôture). Deux lectures existantes,
 * celles du hub, le disent : `trust/etat` (« Avant de commencer ») et
 * `assignations` (date de naissance et âge). Fail-closed : une lecture en vol
 * ou en échec ne rend pas de bouton. Ce n'est pas une autorisation : chaque
 * route garde ses refus.
 *
 * CE QU'IL OUVRE (§2 à §4). La liste du hub, même source, même ordre ; les dix
 * sondes montées ici une fois, partagées avec le hub ; un seul
 * `aria-current="page"` ; liens `next/link`. Fermé au changement de page et
 * avant l'impression.
 */

type LectureMurs = { mursFranchis: boolean; majeur: boolean; bilanConsultable: boolean };

type EtatMenu = {
  token: string | null;
  segment: string | null;
  /** Murs franchis : le mot-symbole devient un lien vers le hub (§5). */
  mursFranchis: boolean;
  /** Le bouton « Menu » paraît (§1). */
  actif: boolean;
  bilanConsultable: boolean;
  etats: EtatsSondes;
};

const MenuContexte = createContext<EtatMenu | null>(null);

/** Le segment qui suit `/portail/{token}/`, ou `null` (écrans d'entrée, pages sans jeton). */
export function segmentDeSession(pathname: string, token: string | null): string | null {
  if (!token) return null;
  const prefixe = `/portail/${token}/`;
  if (!pathname.startsWith(prefixe)) return null;
  return pathname.slice(prefixe.length).split('/')[0] || null;
}

async function lireMurs(): Promise<LectureMurs | null> {
  const [reponseTrust, reponseAssignations] = await Promise.all([
    fetch('/api/portail/trust/etat'),
    fetch('/api/portail/assignations'),
  ]);
  if (!reponseTrust.ok || !reponseAssignations.ok) return null;
  const trust = (await reponseTrust.json()) as { ok?: boolean; avantDeCommencerRequis?: boolean };
  const assignations = (await reponseAssignations.json()) as {
    ok?: boolean;
    statutAge?: string;
    parcours?: { bilanConsultable?: boolean };
  };
  if (trust.ok !== true || assignations.ok !== true) return null;
  // `=== false` et une date lisible : une clé absente ne franchit aucun mur.
  const mursFranchis =
    trust.avantDeCommencerRequis === false &&
    (assignations.statutAge === 'majeur' || assignations.statutAge === 'mineur');
  return {
    mursFranchis,
    majeur: assignations.statutAge === 'majeur',
    bilanConsultable: assignations.parcours?.bilanConsultable === true,
  };
}

export function FournisseurMenuPortail({ sessionOuverte, children }: { sessionOuverte: boolean; children: ReactNode }) {
  const params = useParams<{ token?: string }>();
  const token = typeof params?.token === 'string' ? params.token : null;
  const pathname = usePathname() ?? '';
  const segment = segmentDeSession(pathname, token);
  const pageDeSession = sessionOuverte && segment !== null;

  const [lecture, setLecture] = useState<LectureMurs | null>(null);
  // Relue au changement de page tant que les murs ne sont pas franchis ; une
  // fois franchis, la lecture vaut pour la visite.
  const cleLecture = lecture?.mursFranchis ? token : `${token}|${pathname}`;
  useEffect(() => {
    if (!pageDeSession) return;
    let vivant = true;
    lireMurs()
      .then(resultat => {
        if (vivant) setLecture(resultat);
      })
      .catch(() => {
        if (vivant) setLecture(null);
      });
    return () => {
      vivant = false;
    };
  }, [pageDeSession, cleLecture]);

  const mursFranchis = pageDeSession && lecture?.mursFranchis === true;
  const actif = mursFranchis && lecture?.majeur === true;
  const { etats, rapporteurs } = useEtatsSondes();
  // LES SONDES SONT PARTAGÉES DÈS LE PREMIER RENDU d'une page de session : le
  // hub sait tout de suite qu'il ne doit pas les monter lui-même, sans quoi il
  // les lancerait, puis les perdrait au moment où le menu deviendrait actif.
  // Montées sur le hub dès l'arrivée, comme le hub le faisait, et ailleurs
  // seulement quand le menu est servi.
  const surLeHub = token !== null && pathname === `/portail/${token}/questionnaires`;
  const sondesMontees = pageDeSession && (actif || surLeHub);

  const valeur: EtatMenu = {
    token,
    segment,
    mursFranchis,
    actif,
    bilanConsultable: lecture?.bilanConsultable === true,
    etats,
  };

  return (
    <MenuContexte.Provider value={valeur}>
      <SondesPartageesContexte.Provider value={pageDeSession ? etats : null}>
        {sondesMontees && token && <SondesAutresEspaces token={token} rapporteurs={rapporteurs} />}
        {children}
      </SondesPartageesContexte.Provider>
    </MenuContexte.Provider>
  );
}

/** « Wellneuro », lien d'accueil (§5) ; texte seul sur les murs et la connexion. */
export function MotSymbole() {
  const etat = useContext(MenuContexte);
  const pathname = usePathname() ?? '';
  const classe = 'font-display text-xl font-bold text-primary';
  if (etat?.token && etat.mursFranchis) {
    return (
      <Link href={`/portail/${etat.token}/questionnaires`} className={`${classe} inline-flex min-h-11 items-center`}>
        Wellneuro
      </Link>
    );
  }
  if (etat && !etat.token && pathname !== '/portail/connexion') {
    return (
      <Link href="/portail/connexion" className={`${classe} inline-flex min-h-11 items-center`}>
        Wellneuro
      </Link>
    );
  }
  return <span className={classe}>Wellneuro</span>;
}

const CLASSE_LIEN = 'flex min-h-11 items-center text-primary underline-offset-4 hover:underline';
const CLASSE_LIEN_ACTIF = 'flex min-h-11 items-center border-l-[3px] border-primary pl-3 font-semibold text-foreground';

export function BoutonMenuMonEspace() {
  const etat = useContext(MenuContexte);
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);

  // Fermé au changement de page (§4) : un lien suivi referme le panneau.
  useEffect(() => {
    setOuvert(false);
  }, [pathname]);

  // Fermé avant l'impression (§4) : le voile et le tiroir ne s'impriment pas.
  useEffect(() => {
    const fermer = () => setOuvert(false);
    window.addEventListener('beforeprint', fermer);
    return () => window.removeEventListener('beforeprint', fermer);
  }, []);

  if (!etat?.actif || !etat.token) return null;
  const { token } = etat;
  const signaux = { bilanConsultable: etat.bilanConsultable };
  const groupes = groupesServis(etat.etats, signaux);
  const actif = elementActif(etat.segment, entreesServies(etat.etats, signaux));

  return (
    <PanneauSuperpose
      declencheur={
        <button type="button" className={`${patientButtonClassName('neutral')} print:hidden`}>
          {LIBELLE_BOUTON_MENU}
        </button>
      }
      titre={TITRE_MENU}
      description={DESCRIPTION_MENU}
      descriptionMasquee
      variante="tiroir"
      largeur="standard"
      theme="patient"
      open={ouvert}
      onOpenChange={setOuvert}
    >
      <nav aria-label={TITRE_MENU} className="space-y-4">
        <Link
          href={`/portail/${token}/questionnaires`}
          aria-current={actif === 'parcours' ? 'page' : undefined}
          className={actif === 'parcours' ? CLASSE_LIEN_ACTIF : CLASSE_LIEN}
        >
          <span>Mon parcours</span>
        </Link>
        {groupes.map(groupe => (
          <div key={groupe.id}>
            <h3 id={`mon-espace-${groupe.id}`} className="text-sm font-semibold text-muted-foreground">
              {groupe.libelle}
            </h3>
            <ul aria-labelledby={`mon-espace-${groupe.id}`} className="mt-1">
              {groupe.entrees.map(entree => (
                <li key={entree.cle}>
                  <Link
                    href={hrefEntree(token, entree)}
                    aria-current={actif === entree.cle ? 'page' : undefined}
                    className={actif === entree.cle ? CLASSE_LIEN_ACTIF : CLASSE_LIEN}
                  >
                    <span className="break-words">{entree.libelle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </PanneauSuperpose>
  );
}
