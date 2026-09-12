/**
 * LE JOURNAL D'UN DOSSIER, CÔTÉ PATIENT — dérivation pure, sans accès base.
 *
 * « Depuis votre dernière visite » ne consigne rien : `lib/portail-visite.ts`
 * le dit lui-même, « purement local et présentationnel ». Un instantané
 * `localStorage` comparé au suivant, puis écrasé ; il ne voit que les
 * assignations, ne suit pas la personne d'un appareil à l'autre, et il est vide
 * à la première visite par construction. La vie du portail n'était donc pas
 * consignée : elle était devinée, localement, et jetée.
 *
 * CE MODULE DÉRIVE, IL NE STOCKE RIEN. La vie du dossier est déjà en base —
 * assignations, réponses, synthèses publiées, ratifications, amendements,
 * demandes de correction, entrées « ce qui compte », bilans transmis. Un
 * journal recopié divergerait de ce qu'il prétend refléter, et personne ne
 * saurait lequel des deux croire. C'est la discipline de `D-170` (« un statut
 * se coche sans rien faire ») : aucune migration ici, et aucune n'est due.
 *
 * ── LES QUATRE ARBITRAGES DU 2026-09-12, ET OÙ ILS VIVENT ──────────────────
 *
 *  1. LES GESTES DU PRATICIEN QUI REMETTENT QUELQUE CHOSE y entrent — synthèse
 *     publiée, bilan transmis, questionnaire proposé, objectif proposé ou
 *     reformulé. Les gestes internes, non : un protocole relu, une biologie
 *     arbitrée, une décision de palier ne sont pas remis au patient. La ligne
 *     de partage est le DESTINATAIRE du geste, pas sa nature — le patient voit
 *     ce qui lui arrive, jamais ce qu'on fait de lui.
 *  2. LE JOURNAL REMONTE À L'ENTRÉE DU DOSSIER, sans borne. Aucune fenêtre,
 *     donc aucun seuil à inventer (`DC-19`/`DC-20`).
 *  3. (L'affichage replié/déplié appartient au LOT-03 — rien ici.)
 *  4. L'ENTRÉE DANS L'ACCOMPAGNEMENT EST ELLE-MÊME UN ÉVÉNEMENT. Le journal
 *     n'est donc JAMAIS vide, et il n'y a aucun état vide à écrire ni aucune
 *     phrase d'accueil à inventer : le premier fait consigné est le premier
 *     fait (`DC-24` satisfait sans habillage).
 *
 * ── CE QUE CE MODULE NE FAIT PAS ───────────────────────────────────────────
 *
 * AUCUN DÉCOMPTE, aucune série, aucun score d'assiduité (`DC-19`/`DC-20`). Le
 * nombre de fois qu'un patient a rempli quelque chose n'est pas une mesure de
 * lui. Le journal énumère, il n'agrège pas.
 *
 * AUCUN TEXTE LIBRE n'est recopié — ni la parole du patient, ni celle du
 * praticien. Le journal dit qu'un fait a eu lieu ; le fait se lit sur son
 * propre écran, avec ce qui l'entoure. Le titre d'un questionnaire fait
 * exception : c'est un libellé de catalogue, pas une parole.
 */

/** Les espèces d'événement, liste FERMÉE. En ajouter une est un arbitrage. */
export type EspeceEvenementJournal =
  | 'entree_accompagnement'
  | 'questionnaire_propose'
  | 'questionnaire_transmis'
  | 'synthese_publiee'
  | 'bilan_transmis'
  | 'objectif_propose'
  | 'objectif_reformule'
  | 'objectif_confirme'
  | 'objectif_conteste'
  | 'objectif_dit_autrement'
  | 'correction_demandee'
  | 'ce_qui_compte_depose'
  | 'etape_dite';

/**
 * QUI A FAIT LE GESTE. Ce n'est pas de la décoration : le dossier à deux voix
 * existe pour que le patient distingue sa parole de celle de son praticien, et
 * un journal qui mélangerait les deux défferait ce travail.
 *
 * `dossier` est la troisième voix, et elle n'a qu'un membre : l'entrée dans
 * l'accompagnement, que personne n'a « faite ».
 */
export type VoixEvenement = 'patient' | 'praticien' | 'dossier';

export type EvenementJournal = {
  /** Stable et unique — l'espèce et la ligne d'origine. */
  cle: string;
  espece: EspeceEvenementJournal;
  voix: VoixEvenement;
  /** Phrase complète, en français, adressée au patient. Jamais un champ brut. */
  libelle: string;
  /** ISO 8601. Jamais nulle : un événement sans date n'entre pas au journal. */
  date: string;
};

type LigneDatee = { id: string; creeLe: Date };

/**
 * LES SOURCES, telles que la route les lit. Chaque champ `| null` porte une
 * SURFACE FERMÉE PAR DRAPEAU — et `null` n'est pas un tableau vide : il dit
 * « cette surface n'existe pas pour ce patient », là où `[]` dirait « elle
 * existe et il ne s'y est rien passé » (`DC-24`).
 *
 * Une surface fermée ne produit aucune ligne, et c'est correct : le patient ne
 * l'a jamais vue non plus. La limite est réelle et nommée — le journal d'un
 * dossier dont une surface s'ouvrirait plus tard ferait apparaître d'un coup
 * des faits anciens. Ils seront vrais, et datés de leur jour.
 */
export type SourcesJournal = {
  /** L'entrée dans l'accompagnement — `patients.created_at`. */
  entreeLe: Date;
  assignations: {
    idAssignation: string;
    titre: string;
    dateAssignation: Date;
    statutReponses: string;
    dateDerniereModification: Date | null;
  }[];
  /** Les bilans réellement ENVOYÉS (règle `whereEnvoiVisible`), jamais rédigés. */
  bilansTransmis: { id: string; envoyeLe: Date }[];
  synthesesPubliees: { id: string; publieeLe: Date }[] | null;
  objectifs: ({ supersedesObjectifId: string | null } & LigneDatee)[] | null;
  ratifications: ({ sens: string } & LigneDatee)[] | null;
  amendements: LigneDatee[] | null;
  demandesCorrection: LigneDatee[] | null;
  reponsesJalon: ({ jalon: string } & LigneDatee)[] | null;
  entreesCeQuiCompte: LigneDatee[] | null;
};

/**
 * UN QUESTIONNAIRE EST TRANSMIS QUAND IL EST VERROUILLÉ, et pas avant. Les
 * quatre autres états disent autre chose : `non_rempli` et `a_completer` qu'il
 * reste à faire, `modification_demandee` et `deverrouille` qu'il est rouvert.
 * Compter un questionnaire rouvert comme transmis dirait au patient qu'il a
 * fini une chose qu'on lui a rendue.
 */
const STATUT_TRANSMIS = 'verrouille';

function libelleJalon(jalon: string): string {
  const propre = jalon.trim();
  return propre === '' ? 'une étape' : `l’étape ${propre}`;
}

/**
 * ASSEMBLE LE JOURNAL — du plus RÉCENT au plus ancien.
 *
 * L'ordre anti-chronologique est celui d'une nouvelle : ce qui vient d'arriver
 * se lit en premier. L'entrée dans l'accompagnement se retrouve donc en bas,
 * ce qui est sa place — c'est le plus ancien fait du dossier.
 *
 * À DATE ÉGALE, L'ORDRE EST CELUI DE LA CLÉ, et non celui du hasard : deux
 * gestes de la même seconde (un questionnaire proposé et transmis par une
 * reprise, deux entrées déposées d'affilée) ne doivent pas changer de place
 * d'un chargement à l'autre.
 *
 * LA DATE RETENUE EST CELLE DE L'ENREGISTREMENT (`cree_le`), jamais la date
 * DÉCLARÉE par le client (`saisi_le`, `geste_le`, `exprime_le`). Ces dernières
 * disent ce que le patient a voulu dire d'un jour ; sans fuseau, un jour civil
 * sérialisé en UTC peut basculer d'une journée. Un journal de ce qui s'est
 * passé se date sur ce que le dossier a constaté.
 */
export function construireJournalDossier(sources: SourcesJournal): EvenementJournal[] {
  const evenements: EvenementJournal[] = [];

  const pousser = (
    cle: string,
    espece: EspeceEvenementJournal,
    voix: VoixEvenement,
    libelle: string,
    date: Date | null,
  ) => {
    if (date === null || Number.isNaN(date.getTime())) return;
    evenements.push({ cle, espece, voix, libelle, date: date.toISOString() });
  };

  pousser(
    'entree_accompagnement',
    'entree_accompagnement',
    'dossier',
    'Vous êtes entré dans votre accompagnement.',
    sources.entreeLe,
  );

  for (const a of sources.assignations) {
    pousser(
      `questionnaire_propose:${a.idAssignation}`,
      'questionnaire_propose',
      'praticien',
      `Un questionnaire vous a été proposé : « ${a.titre} ».`,
      a.dateAssignation,
    );
    if (a.statutReponses === STATUT_TRANSMIS) {
      pousser(
        `questionnaire_transmis:${a.idAssignation}`,
        'questionnaire_transmis',
        'patient',
        `Vous avez transmis vos réponses : « ${a.titre} ».`,
        a.dateDerniereModification,
      );
    }
  }

  for (const b of sources.bilansTransmis) {
    pousser(`bilan_transmis:${b.id}`, 'bilan_transmis', 'praticien', 'Votre bilan vous a été transmis.', b.envoyeLe);
  }

  for (const s of sources.synthesesPubliees ?? []) {
    pousser(
      `synthese_publiee:${s.id}`,
      'synthese_publiee',
      'praticien',
      'Votre praticien a publié ce qu’il a compris de vous.',
      s.publieeLe,
    );
  }

  // UNE PREMIÈRE VERSION N'EST PAS UNE REFORMULATION, et le dire serait faux du
  // dossier : `supersedes_objectif_id` distingue la proposition initiale de la
  // révision qui la remplace.
  for (const o of sources.objectifs ?? []) {
    const revision = o.supersedesObjectifId !== null;
    pousser(
      `${revision ? 'objectif_reformule' : 'objectif_propose'}:${o.id}`,
      revision ? 'objectif_reformule' : 'objectif_propose',
      'praticien',
      revision
        ? 'Votre praticien a reformulé votre objectif.'
        : 'Votre praticien vous a proposé un objectif.',
      o.creeLe,
    );
  }

  // LES MOTS DE L'ÉCRAN DU PATIENT, jamais ceux de la base : il a cliqué
  // « c'est bien ça », il n'a jamais vu « ratifie ».
  for (const r of sources.ratifications ?? []) {
    const confirme = r.sens === 'ratifie';
    pousser(
      `${confirme ? 'objectif_confirme' : 'objectif_conteste'}:${r.id}`,
      confirme ? 'objectif_confirme' : 'objectif_conteste',
      'patient',
      confirme
        ? 'Vous avez répondu que c’était bien ça.'
        : 'Vous avez répondu que ce n’était pas exactement ça.',
      r.creeLe,
    );
  }

  for (const a of sources.amendements ?? []) {
    pousser(
      `objectif_dit_autrement:${a.id}`,
      'objectif_dit_autrement',
      'patient',
      'Vous avez proposé votre propre formulation de l’objectif.',
      a.creeLe,
    );
  }

  for (const d of sources.demandesCorrection ?? []) {
    pousser(
      `correction_demandee:${d.id}`,
      'correction_demandee',
      'patient',
      'Vous avez demandé une correction de votre objectif.',
      d.creeLe,
    );
  }

  for (const e of sources.entreesCeQuiCompte ?? []) {
    pousser(
      `ce_qui_compte_depose:${e.id}`,
      'ce_qui_compte_depose',
      'patient',
      'Vous avez dit ce qui compte pour vous.',
      e.creeLe,
    );
  }

  for (const j of sources.reponsesJalon ?? []) {
    pousser(
      `etape_dite:${j.id}`,
      'etape_dite',
      'patient',
      `Vous avez dit où vous en étiez, à ${libelleJalon(j.jalon)}.`,
      j.creeLe,
    );
  }

  return evenements.sort((a, b) => {
    const ecart = b.date.localeCompare(a.date);
    return ecart !== 0 ? ecart : a.cle.localeCompare(b.cle);
  });
}
