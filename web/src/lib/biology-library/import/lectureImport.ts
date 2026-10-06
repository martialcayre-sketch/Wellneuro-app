// L'ACTE DE LECTURE D'UN IMPORT BIOLOGIQUE VALIDÉ ([[D-268]], BIO-PARCOURS
// BP-10) — domaine PUR, aucun accès base. Partagé par la route de l'acte, la
// carte du Fil et l'écran du cockpit biologie : MODULE SANS DÉPENDANCE
// SERVEUR, parce qu'un composant client l'importe (codes et libellés).
//
// CE QUE CE MODULE NE FAIT PAS : lire une valeur. Il compte des lignes par
// statut et lit des actes ; il ne sait pas ce qu'un résultat dit, et ne juge
// pas de ce qui est préoccupant (§1 : le déclencheur est l'import validé, pas
// le marquage).

/**
 * Les trois codes de révocation, liste FERMÉE ([[D-268]] §5, précision du
 * 2026-10-06). Ils décrivent le GESTE, jamais le patient ni son résultat. La
 * base porte la même liste (CHECK `code_revocation_check`) : un code neuf
 * passe par une décision, puis une migration.
 */
export const CODES_REVOCATION = ['acte_pose_par_erreur', 'mauvais_import', 'lecture_a_refaire'] as const;
export type CodeRevocation = (typeof CODES_REVOCATION)[number];

export const LIBELLES_CODE_REVOCATION: Record<CodeRevocation, string> = {
  acte_pose_par_erreur: 'Acte posé par erreur',
  mauvais_import: 'Mauvais import',
  lecture_a_refaire: 'Lecture à refaire',
};

export function estCodeRevocation(valeur: unknown): valeur is CodeRevocation {
  return typeof valeur === 'string' && (CODES_REVOCATION as readonly string[]).includes(valeur);
}

/** Un acte tel que la table le porte, sans rien d'autre. */
export type ActeLectureRow = {
  id: string;
  acte: string;
  idLectureRevoquee: string | null;
  codeRevocation: string | null;
  praticienEmail: string;
  acteLe: Date;
};

export type EtatLecture = {
  /** La lecture qu'aucune révocation ne vise — au plus une, la base le tient. */
  active: { id: string; praticienEmail: string; acteLe: Date } | null;
  /**
   * La révocation la plus récente, quand aucune lecture n'est active : c'est
   * elle qui a ROUVERT le signalement, et la carte le dit.
   */
  derniereRevocation: { acteLe: Date; codeRevocation: string | null } | null;
};

/**
 * L'état de lecture d'UN import. Une lecture posée par un ancien praticien du
 * dossier reste active (précision du 2026-10-06) : l'auteur ne compte pas ici.
 */
export function etatLecture(actes: ActeLectureRow[]): EtatLecture {
  const revoquees = new Set(
    actes
      .filter(a => a.acte === 'revocation' && a.idLectureRevoquee !== null)
      .map(a => a.idLectureRevoquee as string),
  );
  const parDate = [...actes].sort((a, b) => b.acteLe.getTime() - a.acteLe.getTime());
  const active = parDate.find(a => a.acte === 'lecture' && !revoquees.has(a.id)) ?? null;
  if (active) {
    return { active: { id: active.id, praticienEmail: active.praticienEmail, acteLe: active.acteLe }, derniereRevocation: null };
  }
  const revocation = parDate.find(a => a.acte === 'revocation') ?? null;
  return {
    active: null,
    derniereRevocation: revocation ? { acteLe: revocation.acteLe, codeRevocation: revocation.codeRevocation } : null,
  };
}

/** Un import qui porte au moins une ligne validée, tel que le Fil le lit. */
export type ImportValideRow = {
  idImport: string;
  idPatient: string;
  nbValidees: number;
  nbProposees: number;
  /** Date de la dernière ligne validée (sa décision) — la date de la carte. */
  valideLe: Date;
  actes: ActeLectureRow[];
};

/** Ce que la carte du Fil a besoin de savoir d'un import qui appelle une lecture. */
export type ImportALireRow = {
  idImport: string;
  idPatient: string;
  valideLe: Date;
  /** > 0 : des lignes restent à décider, la lecture ne se consigne pas encore. */
  nbProposees: number;
  derniereRevocation: EtatLecture['derniereRevocation'];
};

/**
 * Les imports qui appellent un acte de lecture ([[D-268]] §1, §5, §8).
 *
 * - au moins une ligne validée : c'est le déclencheur, tous imports confondus,
 *   antérieurs compris ;
 * - aucune lecture active : une révocation ROUVRE (§2) ;
 * - DOSSIER AU SUIVI CLÔTURÉ : la carte seulement si elle est ACTIONNABLE.
 *   Un import qui garde des lignes à décider n'en a pas tant que le suivi est
 *   clos — la route des décisions les refuse (`accepteNouvelEnvoi`). Un import
 *   entièrement décidé garde la sienne : l'acte se pose même sur un dossier
 *   clos (précision du 2026-10-06, constat de la revue du lot de migration).
 *
 * `suiviOuvert` dit, par dossier, si des décisions peuvent encore s'y poser.
 */
export function importsALire(imports: ImportValideRow[], suiviOuvert: (idPatient: string) => boolean): ImportALireRow[] {
  const resultat: ImportALireRow[] = [];
  for (const imp of imports) {
    if (imp.nbValidees < 1) continue;
    const etat = etatLecture(imp.actes);
    if (etat.active) continue;
    if (imp.nbProposees > 0 && !suiviOuvert(imp.idPatient)) continue;
    resultat.push({
      idImport: imp.idImport,
      idPatient: imp.idPatient,
      valideLe: imp.valideLe,
      nbProposees: imp.nbProposees,
      derniereRevocation: etat.derniereRevocation,
    });
  }
  return resultat;
}

/**
 * LA PHRASE QUE PORTENT LA CARTE ET L'ÉCRAN ([[D-268]] §9) : la surface dit ce
 * qu'elle n'est pas. Une seule source, pour que les deux ne divergent pas.
 */
export const MENTION_PAS_UN_FILET =
  'Wellneuro ne lit aucune valeur et ne surveille rien en continu : ce signalement n’est pas un filet de sécurité.';
