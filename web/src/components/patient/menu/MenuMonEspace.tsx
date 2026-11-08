'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { PanneauSuperpose } from '@/components/ui/PanneauSuperpose';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { entreesServies, groupesServis, hrefEntree, useEtatsSondes, type EtatsSondes } from '@/components/patient/autres-espaces/entreesAutresEspaces';
import { SondesAutresEspaces, SondesPartageesContexte } from '@/components/patient/autres-espaces/SondesAutresEspaces';
import { REQUETE_RAIL, railSurLeChemin } from '@/components/patient/rail/cheminRail';
import { elementActif } from './activationMenu';
import { IconeMonEspace } from './iconesMonEspace';
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

export type EtatMenu = {
  token: string | null;
  segment: string | null;
  /** Murs franchis : le mot-symbole devient un lien vers le hub (§5). */
  mursFranchis: boolean;
  /** Le bouton « Menu » paraît (§1). */
  actif: boolean;
  /** Groupes et icônes de l'organisation praticien ([[D-460]]). */
  icones: boolean;
  /** La première lecture des murs n'a pas répondu : le rail réserve sa place ([[D-447]] §6). */
  gardeEnLecture: boolean;
  bilanConsultable: boolean;
  etats: EtatsSondes;
};

const MenuContexte = createContext<EtatMenu | null>(null);

/** L'état du menu, pour la barre basse ([[D-444]] §1) : même garde, mêmes sondes. */
export function useEtatMenuPortail(): EtatMenu | null {
  return useContext(MenuContexte);
}

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

export function FournisseurMenuPortail({
  sessionOuverte,
  icones = false,
  children,
}: {
  sessionOuverte: boolean;
  icones?: boolean;
  children: ReactNode;
}) {
  const params = useParams<{ token?: string }>();
  const token = typeof params?.token === 'string' ? params.token : null;
  const pathname = usePathname() ?? '';
  const segment = segmentDeSession(pathname, token);
  const pageDeSession = sessionOuverte && segment !== null;

  const [lecture, setLecture] = useState<LectureMurs | null>(null);
  const [lectureRendue, setLectureRendue] = useState(false);
  // Relue au changement de page tant que les murs ne sont pas franchis ; une
  // fois franchis, la lecture vaut pour la visite.
  const cleLecture = lecture?.mursFranchis ? token : `${token}|${pathname}`;
  useEffect(() => {
    if (!pageDeSession) return;
    let vivant = true;
    lireMurs()
      .then(resultat => {
        if (vivant) {
          setLecture(resultat);
          setLectureRendue(true);
        }
      })
      .catch(() => {
        if (vivant) {
          setLecture(null);
          setLectureRendue(true);
        }
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
    icones,
    gardeEnLecture: pageDeSession && !lectureRendue,
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

export type FormeListe = {
  /** Classes de la `<nav>` qui porte la liste. */
  classe: string;
  /** Préfixe des `id` d'intertitres : distinct pour le panneau et le rail. */
  prefixeId: string;
  classeLien: string;
  classeLienActif: string;
  classeIntertitre: string;
};

const FORME_PANNEAU: FormeListe = {
  classe: 'space-y-4',
  prefixeId: 'mon-espace',
  classeLien: CLASSE_LIEN,
  classeLienActif: CLASSE_LIEN_ACTIF,
  classeIntertitre: 'text-sm font-semibold text-muted-foreground',
};

/**
 * La liste « Mon espace » (§2, §3), déclarée une fois : le panneau la sert, et
 * le rail latéral ([[D-447]] §2) la reprend avec sa propre forme.
 */
export function ListeMonEspace({ etat, forme }: { etat: EtatMenu & { token: string }; forme: FormeListe }) {
  const { token } = etat;
  const signaux = { bilanConsultable: etat.bilanConsultable };
  const groupes = groupesServis(etat.etats, signaux);
  const actif = elementActif(etat.segment, entreesServies(etat.etats, signaux));
  // Drapeau fermé, ces trois formes rendent exactement les classes d'avant.
  const classeLien = etat.icones ? `${forme.classeLien} gap-3` : forme.classeLien;
  const classeLienActif = etat.icones ? `${forme.classeLienActif} gap-3 rounded-md bg-primary/10` : forme.classeLienActif;
  const classeIntertitre = etat.icones
    ? `${forme.classeIntertitre.replace('text-sm', 'text-xs')} uppercase tracking-wider`
    : forme.classeIntertitre;

  return (
    <nav aria-label={TITRE_MENU} className={forme.classe}>
      <Link
        href={`/portail/${token}/questionnaires`}
        aria-current={actif === 'parcours' ? 'page' : undefined}
        className={actif === 'parcours' ? classeLienActif : classeLien}
      >
        {etat.icones && <IconeMonEspace cle="parcours" />}
        <span>Mon parcours</span>
      </Link>
      {groupes.map(groupe => (
        <div key={groupe.id}>
          <h3 id={`${forme.prefixeId}-${groupe.id}`} className={classeIntertitre}>
            {groupe.libelle}
          </h3>
          <ul aria-labelledby={`${forme.prefixeId}-${groupe.id}`} className="mt-1">
            {groupe.entrees.map(entree => (
              <li key={entree.cle}>
                <Link
                  href={hrefEntree(token, entree)}
                  aria-current={actif === entree.cle ? 'page' : undefined}
                  className={actif === entree.cle ? classeLienActif : classeLien}
                >
                  {etat.icones && <IconeMonEspace cle={entree.cle} />}
                  <span className={etat.icones ? 'min-w-0 break-words' : 'break-words'}>{entree.libelle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * `railServi` : le rail latéral est servi ([[D-447]], drapeau ouvert). Sur ses
 * pages, à partir de 1 024 px, il remplace le bouton (§1 amendé le
 * 2026-11-05) : le bouton s'efface, et un panneau ouvert se ferme au seuil.
 */
export function BoutonMenuMonEspace({ railServi = false }: { railServi?: boolean }) {
  const etat = useContext(MenuContexte);
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const remplaceParRail = railServi && !!etat?.token && railSurLeChemin(pathname ?? '', etat.token);

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

  // Fermé au seuil du rail ([[D-447]] §4) : une page n'a jamais qu'une
  // navigation « Mon espace » visible.
  useEffect(() => {
    if (!remplaceParRail || typeof window.matchMedia !== 'function') return;
    const requete = window.matchMedia(REQUETE_RAIL);
    const fermer = () => {
      if (requete.matches) setOuvert(false);
    };
    fermer();
    requete.addEventListener('change', fermer);
    return () => requete.removeEventListener('change', fermer);
  }, [remplaceParRail]);

  if (!etat?.actif || !etat.token) return null;

  // Fermé au seuil du rail, le bouton n'est plus affiché : Radix lui rendrait
  // un focus qui tomberait sur `body`. Le focus passe alors à la même liste,
  // dans le rail — son entrée active, sinon sa première —, sous l'anneau de
  // focus global ; à défaut de rail, au contenu. Partout ailleurs, il revient
  // au bouton.
  const rendreFocus = (evenement: Event) => {
    if (!remplaceParRail || typeof window.matchMedia !== 'function' || !window.matchMedia(REQUETE_RAIL).matches) return;
    evenement.preventDefault();
    const rail = [...document.querySelectorAll<HTMLElement>(`nav[aria-label="${TITRE_MENU}"]`)].find(
      navigation => !navigation.closest('[role="dialog"]'),
    );
    const cible =
      rail?.querySelector<HTMLElement>('[aria-current="page"]') ??
      rail?.querySelector<HTMLElement>('a') ??
      document.getElementById('contenu');
    cible?.focus();
  };

  return (
    <PanneauSuperpose
      declencheur={
        <button
          type="button"
          className={`${patientButtonClassName('neutral')} print:hidden${remplaceParRail ? ' lg:hidden' : ''}`}
        >
          {LIBELLE_BOUTON_MENU}
        </button>
      }
      titre={TITRE_MENU}
      description={DESCRIPTION_MENU}
      descriptionMasquee
      variante="tiroir"
      // Drapeau `WN_PORTAIL_MENU_ICONES` ouvert, le panneau sort à gauche, du
      // côté du bouton et du rail, à la largeur du tiroir praticien ([[D-460]]
      // §4, Q62) ; fermé, il garde son côté et sa largeur d'avant.
      largeur={etat.icones ? 'navigation' : 'standard'}
      cote={etat.icones ? 'gauche' : 'droite'}
      theme="patient"
      open={ouvert}
      onOpenChange={setOuvert}
      onCloseAutoFocus={rendreFocus}
    >
      <ListeMonEspace etat={{ ...etat, token: etat.token }} forme={FORME_PANNEAU} />
    </PanneauSuperpose>
  );
}
