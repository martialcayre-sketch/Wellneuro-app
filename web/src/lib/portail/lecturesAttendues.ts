// LES LECTURES QUI ATTENDENT LE PATIENT (domaine PUR, client-safe).
//
// Ce que le praticien lui a REMIS et qu'il n'a pas encore ouvert : un bilan
// transmis, une synthèse de compréhension publiée, une fiche d'assiette remise
// au clic « Valider pour diffusion » ([[D-251]] §8). Elles entrent au fil du jour
// comme des tâches, et elles en sortent DÈS QU'ELLES SONT LUES — c'est la règle
// unique du fil (`filDuJour.ts`), et c'est pour la tenir sur ces deux objets-là
// qu'une table a été ouverte (`portail_lectures_patient`, LOT-08).
//
// ── CE QUE « LU » VEUT DIRE ICI, ET CE QU'IL NE VEUT PAS DIRE ──────────────
//
// « Lu » = une ligne existe dans `portail_lectures_patient` pour (ce patient,
// cette espèce, CETTE VERSION). Elle est posée à l'ouverture de l'écran qui
// porte le document.
//
// Ce n'est PAS une mesure de lecture. Un patient qui ouvre son bilan trente
// secondes sans le lire l'a « fait » aux yeux du portail. Personne ne sait
// mesurer une lecture réelle, et ce module n'essaie pas de la deviner : il
// constate une ouverture et l'appelle par son nom. La contrepartie est nommée et
// acceptée — le document reste atteignable par « Consulter mon bilan », dans les
// accès secondaires, indéfiniment. Ce qui disparaît est la TÂCHE, jamais le
// document.
//
// ── L'IDENTIFIANT EST CELUI DE LA VERSION ──────────────────────────────────
//
// Une synthèse republiée est une LIGNE NEUVE (`supersedes_synthese_id`), un
// bilan renvoyé est un nouvel envoi. L'accusé porte donc sur la version, et une
// version neuve reparaît au fil même si la précédente avait été lue. C'est la
// prémisse de la migration du LOT-08, gardée par
// `portailLecturesPatient.guard.test.ts` — si elle tombait, ce module ferait
// disparaître un texte que le patient n'a jamais vu.

export type EspeceLecture = 'bilan' | 'synthese' | 'fiche_assiette' | 'lettre_adressage';

export type LectureAttendue = {
  espece: EspeceLecture;
  /**
   * L'identifiant de la VERSION : `BookletEnvoi.id`, `SyntheseComprehension.id`,
   * `FicheAssietteRemise.id` ou `LettreAdressageRemise.id` — une remise est
   * append-only, et une version neuve de fiche ou de lettre est une remise
   * neuve ([[D-251]] §8, [[D-262]]).
   */
  idObjet: string;
  /** Quand le praticien l'a remise. Sert à ORDONNER, jamais à compter. */
  remiseLe: string;
  /**
   * Fiches d'assiette seulement : le libellé de l'assiette au catalogue. Jusqu'à
   * trois fiches peuvent attendre ensemble, sous le même geste : c'est lui qui
   * les distingue au fil. Jamais un texte de fiche.
   */
  libelle?: string;
};

export type SourcesLectures = {
  /** Les envois de bilan VISIBLES (règle `whereEnvoiVisible`, pas « rédigé »). */
  bilansTransmis: { id: string; envoyeLe: Date }[];
  /**
   * Les synthèses PUBLIÉES, et seulement la tête publiée.
   *
   * `null` = surface fermée par son drapeau. Aucune lecture n'en sort — le fil
   * ne peut pas devenir la porte dérobée par laquelle une synthèse atteint un
   * patient dont l'écran est clos. Même invariant que celui écrit pour le
   * journal (`D-172`), et il vaut ici mot pour mot.
   */
  synthesesPubliees: { id: string; publieeLe: Date }[] | null;
  /**
   * Les fiches d'assiette SERVIES — la remise en cours de chaque fiche, quand
   * son texte part ([[D-251]] lot 9). Une fiche retirée ou indisponible n'a
   * rien à lire, donc rien à annoncer.
   *
   * `null` = surface fermée par `WN_FICHES_ASSIETTE_LECTURE`, ou lecture en
   * échec : aucune lecture n'en sort. Même invariant que les synthèses.
   */
  fichesServies: { id: string; remiseLe: Date; libelle: string }[] | null;
  /**
   * Le courrier pour le médecin SERVI ([[D-262]], LOT-03a) — la remise en
   * cours, quand son texte part. Retiré ou indisponible : rien à annoncer.
   *
   * `null` ou absent = surface fermée par `WN_LETTRE_ADRESSAGE_PATIENT`, ou
   * lecture en échec : aucune lecture n'en sort.
   */
  lettresServies?: { id: string; remiseLe: Date }[] | null;
  /** Ce que `portail_lectures_patient` porte déjà pour ce dossier. */
  dejaLues: { espece: string; idObjet: string }[];
};

/**
 * DE LA PLUS ANCIENNE À LA PLUS RÉCENTE.
 *
 * Un dossier se lit dans le sens où il s'est écrit : une synthèse ouverte après
 * le bilan qu'elle commente arriverait à contretemps. À date égale — deux objets
 * remis dans la même milliseconde, ce qu'un renvoi automatique peut produire —
 * l'identifiant départage, pour que l'ordre soit STABLE d'un chargement à
 * l'autre. Sans ce second critère, deux tâches pourraient permuter sous les yeux
 * du patient sans que rien n'ait changé.
 */
export function lecturesAttendues(sources: SourcesLectures): LectureAttendue[] {
  const faites = new Set(sources.dejaLues.map(l => `${l.espece} ${l.idObjet}`));
  const toutes: LectureAttendue[] = [];

  for (const bilan of sources.bilansTransmis) {
    toutes.push({ espece: 'bilan', idObjet: bilan.id, remiseLe: bilan.envoyeLe.toISOString() });
  }
  for (const fiche of sources.fichesServies ?? []) {
    toutes.push({
      espece: 'fiche_assiette',
      idObjet: fiche.id,
      remiseLe: fiche.remiseLe.toISOString(),
      libelle: fiche.libelle,
    });
  }
  for (const lettre of sources.lettresServies ?? []) {
    toutes.push({ espece: 'lettre_adressage', idObjet: lettre.id, remiseLe: lettre.remiseLe.toISOString() });
  }
  for (const synthese of sources.synthesesPubliees ?? []) {
    toutes.push({
      espece: 'synthese',
      idObjet: synthese.id,
      remiseLe: synthese.publieeLe.toISOString(),
    });
  }

  return toutes
    .filter(l => !faites.has(`${l.espece} ${l.idObjet}`))
    .sort((a, b) =>
      a.remiseLe === b.remiseLe ? comparer(a.idObjet, b.idObjet) : comparer(a.remiseLe, b.remiseLe),
    );
}

function comparer(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Le libellé du geste. Jamais un compte, jamais une date — c'est une tâche. */
export function ctaLecture(espece: EspeceLecture): string {
  if (espece === 'fiche_assiette') return 'Lire la fiche remise par mon praticien';
  if (espece === 'lettre_adressage') return 'Lire le courrier pour mon médecin';
  return espece === 'bilan' ? 'Lire mon bilan' : 'Lire ce que mon praticien a compris';
}

/**
 * Où le document se lit. Le token vient de l'écran, jamais du serveur. Une
 * fiche d'assiette se lit sur SA page : c'est l'ouvrir qui acquitte SA lecture.
 */
export function lienLecture(token: string, lecture: Pick<LectureAttendue, 'espece' | 'idObjet'>): string {
  if (lecture.espece === 'fiche_assiette') return `/portail/${token}/fiches/${encodeURIComponent(lecture.idObjet)}`;
  if (lecture.espece === 'lettre_adressage') return `/portail/${token}/courrier-medecin`;
  return `/portail/${token}/${lecture.espece === 'bilan' ? 'bilan' : 'comprehension'}`;
}
