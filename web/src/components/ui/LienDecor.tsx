/*
 * Décor Lien ([[D-481]] §1 bis et §1 quater ; micro-lot COM-1) : la seule
 * porte par laquelle un écran pose un fond ou un ornement du kit
 * `web/public/wellneuro-lien/`.
 *
 * Règles appliquées ici une fois pour toutes :
 * - décoratif seulement : `aria-hidden`, aucun contenu, aucun rôle ; rien
 *   n'entre dans l'arbre d'accessibilité ;
 * - aucune interception du pointeur (`pointer-events-none`), rien de
 *   sélectionnable ;
 * - absent à l'impression (`print:hidden`) ;
 * - statique : aucune classe d'animation ni de transition, y compris sans
 *   `prefers-reduced-motion` ; les classes de mouvement passées par l'appelant
 *   sont retirées ;
 * - seuls les éléments nommés aux emplacements retenus sont acceptés
 *   (`LIEN_DECOR`) ; tout autre couple emplacement/élément ne rend rien.
 *
 * Deux natures :
 * - un fond (`connexion-praticien`, `entree-patient`) remplit le plus proche
 *   parent positionné, sous le contenu (`-z-10`). Le parent porte
 *   `relative isolate` ; le contenu posé dessus est une carte opaque, jamais
 *   un champ, une grille ou un texte clinique à même le fond. Les SVG du kit
 *   laissent le centre libre ;
 * - un ornement (`deux-voix`, `entete-fiche`, `etat-vide`) prend sa place
 *   dans le flux, aux proportions de son SVG ; l'appelant en fixe la largeur.
 *
 * Choix inscrits au lot (responsable, 2026-11-25) : l'en-tête de fiche
 * accepte les deux motifs d'alliance, le prototype PRA-3a choisit ; les
 * états vides acceptent les deux ornements nommés ; le hub patient (U10) et
 * l'ornement neuf du §1 ter n'entrent pas, faute d'élément nommé ou validé.
 * Aucun motif (`patterns/`) n'est retenu par [[D-481]].
 */

const KIT = '/wellneuro-lien';

type Ornement = { fichier: string; largeur: number; hauteur: number };

const ORNEMENTS = {
  'divider-two-voices': { fichier: `${KIT}/ornaments/divider-two-voices.svg`, largeur: 960, hauteur: 120 },
  'alliance-arcs': { fichier: `${KIT}/ornaments/alliance-arcs.svg`, largeur: 480, hauteur: 200 },
  'linked-loops-muted': { fichier: `${KIT}/ornaments/linked-loops-muted.svg`, largeur: 320, hauteur: 240 },
  'nutrition-sprout': { fichier: `${KIT}/ornaments/nutrition-sprout.svg`, largeur: 480, hauteur: 220 },
  'neural-branches': { fichier: `${KIT}/ornaments/neural-branches.svg`, largeur: 320, hauteur: 260 },
} as const satisfies Record<string, Ornement>;

/**
 * Les emplacements du §1 bis et les éléments que chacun accepte. Un fond
 * nomme ses fichiers par largeur : `etroit` sous 768 px (point `md`),
 * `large` au-delà.
 */
export const LIEN_DECOR = {
  /** Connexion praticien (X01), lot PRA-2. */
  'connexion-praticien': {
    nature: 'fond',
    etroit: `${KIT}/backgrounds/login-calm.svg`,
    large: `${KIT}/backgrounds/login-calm.svg`,
  },
  /** Entrée du parcours patient (U01–U09), lot PAT-2 ; pas d'anneaux. */
  'entree-patient': {
    nature: 'fond',
    etroit: `${KIT}/backgrounds/screen-mobile.svg`,
    large: `${KIT}/backgrounds/screen-desktop.svg`,
  },
  /** Dossier à deux voix (U25, objectif négocié), lots PAT-5 et PRA-3b. */
  'deux-voix': { nature: 'ornement', elements: ['divider-two-voices'] },
  /** En-tête de fiche praticien (P04), lot PRA-3a ; choix au prototype. */
  'entete-fiche': { nature: 'ornement', elements: ['alliance-arcs', 'linked-loops-muted'] },
  /** États vides réels (X03), chaque lot ; jamais une erreur ni un chargement. */
  'etat-vide': { nature: 'ornement', elements: ['nutrition-sprout', 'neural-branches'] },
} as const;

export type EmplacementDecor = keyof typeof LIEN_DECOR;

type EmplacementFond = {
  [E in EmplacementDecor]: (typeof LIEN_DECOR)[E]['nature'] extends 'fond' ? E : never;
}[EmplacementDecor];

type ElementsDe<E extends EmplacementDecor> = (typeof LIEN_DECOR)[E] extends { elements: readonly (infer X)[] }
  ? X
  : never;

export type LienDecorProps =
  | { emplacement: EmplacementFond; element?: never; className?: never }
  | { emplacement: 'deux-voix'; element?: ElementsDe<'deux-voix'>; className?: string }
  | { emplacement: 'entete-fiche'; element: ElementsDe<'entete-fiche'>; className?: string }
  | { emplacement: 'etat-vide'; element: ElementsDe<'etat-vide'>; className?: string };

const SOCLE = 'pointer-events-none select-none print:hidden';

/**
 * Retire des classes de l'appelant ce qui défait une règle du décor :
 * mouvement, pointeur, impression, empilement.
 */
const UTILITAIRE_INTERDIT = /^!?-?(?:animate-|transition|duration-|ease-|delay-|will-change-|pointer-events-|select-|z-)/;
const VARIANTES_INTERDITES = new Set(['print', 'motion-safe', 'motion-reduce']);

function classeAdmise(classe: string): boolean {
  const parties = classe.split(':');
  const utilitaire = parties.pop() ?? '';
  return !parties.some((v) => VARIANTES_INTERDITES.has(v)) && !UTILITAIRE_INTERDIT.test(utilitaire);
}

export function classesAdmises(className: string | undefined): string {
  if (!className) return '';
  return className
    .split(/\s+/)
    .filter((c) => c && classeAdmise(c))
    .join(' ');
}

export function LienDecor(props: LienDecorProps) {
  // `Object.hasOwn` : une clé héritée (`toString`…) n'est pas un emplacement.
  if (!Object.hasOwn(LIEN_DECOR, props.emplacement)) return null;
  const entree: (typeof LIEN_DECOR)[EmplacementDecor] = LIEN_DECOR[props.emplacement];

  if (entree.nature === 'fond') {
    if (props.element !== undefined) return null;
    const fond = 'absolute inset-0 bg-cover bg-center bg-no-repeat';
    return (
      <span
        aria-hidden="true"
        data-lien-decor={props.emplacement}
        className={`${SOCLE} absolute inset-0 -z-10 overflow-hidden`}
      >
        <span className={`${fond} md:hidden`} style={{ backgroundImage: `url('${entree.etroit}')` }} />
        <span className={`${fond} hidden md:block`} style={{ backgroundImage: `url('${entree.large}')` }} />
      </span>
    );
  }

  const element = props.element ?? (entree.elements.length === 1 ? entree.elements[0] : undefined);
  if (!element || !(entree.elements as readonly string[]).includes(element)) return null;
  const ornement: Ornement = ORNEMENTS[element as keyof typeof ORNEMENTS];

  return (
    <span
      aria-hidden="true"
      data-lien-decor={props.emplacement}
      data-element={element}
      className={`${SOCLE} block bg-contain bg-center bg-no-repeat ${classesAdmises(props.className)}`.trim()}
      style={{
        backgroundImage: `url('${ornement.fichier}')`,
        aspectRatio: `${ornement.largeur} / ${ornement.hauteur}`,
      }}
    />
  );
}
