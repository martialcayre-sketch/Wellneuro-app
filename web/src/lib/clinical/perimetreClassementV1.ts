/**
 * LE PÉRIMÈTRE DU CLASSEMENT — ce que [[D-162]] §5 exige qu'on relise avant
 * toute généralisation qui se réclamerait d'une provenance certifiée.
 *
 * CE QUI MANQUE AUJOURD'HUI, DIT PAR LE DÉPÔT LUI-MÊME. `priorityRulesV1.ts`
 * déclare sa dette en toutes lettres : « Le producteur de candidats, le
 * CLASSEMENT (plainte dominante, puis priorité intrinsèque, puis identifiant)
 * et les textes `LIMITATION_*` servis avec chaque candidat vivent dans
 * `lib/clinical-engine/chaineC1.ts` et relèvent des bancs ordinaires : aucune
 * ligne signée ne les décrit. L'ordre d'évaluation des deux motifs
 * d'abstention est dans le même cas. » `PRIORITY_RULES_SHA256` couvre
 * `PRIORITY_RULES_V1` et `ABSTENTION_PROCEDURE_V1`, pas ceci.
 *
 * CE QUE CE MODULE FAIT, ET CE QU'IL NE FAIT PAS. Il rassemble ces quatre
 * objets en DONNÉES relisables et hachables, et `chaineC1.ts` les lit désormais
 * d'ici — sans quoi le périmètre serait une COPIE de ce que le moteur applique,
 * c'est-à-dire la duplication silencieuse que [[DC-26]] interdit, et la
 * signature couvrirait un texte que rien n'exécute.
 *
 * IL NE SIGNE RIEN. `ATTESTATION_CLASSEMENT` porte `relu: false` et
 * `shaRelu: null` : aucune relecture clinique n'a eu lieu, et aucun verrou ne
 * consulte encore cet objet. Le périmètre est POSÉ ET INERTE, en attente de
 * l'attestation du praticien — c'est l'ordre que [[D-182]] a suivi sur les
 * dix-sept grilles, et le seul qui ne fabrique pas une provenance.
 *
 * MODULE-FEUILLE, ET IL DOIT LE RESTER : il n'importe rien. `chaineC1.ts` le lit
 * pour exécuter, le banc le lit pour hacher. Lui faire importer l'un ou l'autre
 * fermerait un cycle — même contrainte que `bandesPsqi.ts`.
 */

/** Un terme de départage, et ce qu'il est — clinique ou technique. */
export type TermeDeClassement = {
  rang: 1 | 2 | 3;
  nom: string;
  /**
   * `clinique` : le terme traduit un jugement soignant, et son déplacement est
   * un arbitrage. `technique` : il n'existe que pour rendre l'ordre STABLE, et
   * le présenter comme clinique serait une sur-promesse.
   */
  nature: 'clinique' | 'technique';
  effet: string;
};

/**
 * LES TROIS TERMES, DANS L'ORDRE OÙ ILS S'APPLIQUENT.
 *
 * Le troisième n'est pas décoratif : sans lui, deux règles de même priorité
 * s'ordonneraient selon l'ordre du tableau, qu'une édition future déplacerait
 * en silence.
 *
 * AUCUN DES TROIS NE MESURE LA GRAVITÉ. C'est ce que dit déjà
 * `LIMITATION_CLASSEMENT` au praticien. Les deux premiers termes sont
 * CLINIQUES — ils traduisent un jugement soignant, et les déplacer est un
 * arbitrage ; le troisième est TECHNIQUE, et n'existe que pour rendre l'ordre
 * stable. (Une première rédaction disait « deux termes sur trois sont
 * techniques » : faux, et contredit par la table qui suit — relevé en revue.
 * Une description fausse DANS un périmètre destiné à la relecture est le pire
 * endroit où se tromper.)
 */
export const TERMES_DE_CLASSEMENT: readonly TermeDeClassement[] = [
  {
    rang: 1,
    nom: 'plainte dominante',
    nature: 'clinique',
    effet: 'Une règle dont le domaine de plainte est celui que le patient a coté le plus haut passe devant les autres.',
  },
  {
    rang: 2,
    nom: 'priorité intrinsèque de la règle',
    nature: 'clinique',
    effet: 'À égalité sur le premier terme, la priorité portée par la table signée départage.',
  },
  {
    rang: 3,
    nom: 'identifiant de règle',
    nature: 'technique',
    effet: 'À égalité sur les deux premiers, l’ordre alphabétique de l’identifiant départage — pour que l’ordre ne dépende pas de la position dans le tableau.',
  },
] as const;

/**
 * LE DÉPARTAGE DE LA PLAINTE DOMINANTE ELLE-MÊME, à valeur égale.
 *
 * Déclaré TECHNIQUE par [[D-054]] arbitrage 8, et l'écran le dit : les ex aequo
 * sont nommés, précisément pour que l'ordre de publication du catalogue ne se
 * lise pas comme une hiérarchie clinique. Un départage clinique — quelle
 * plainte prime à intensité égale — reste un arbitrage praticien NON RENDU, et
 * l'inscrire ici serait le fabriquer.
 */
export const DEPARTAGE_PLAINTE_EX_AEQUO = {
  nature: 'technique' as const,
  regle: 'Le premier domaine dans l’ordre où le catalogue les publie l’emporte ; les ex aequo sont nommés à l’écran.',
  arbitrageCliniqueRendu: false,
};

/**
 * LES QUATRE TEXTES QUI PEUVENT ÊTRE SERVIS AVEC UN CANDIDAT — et leurs
 * conditions, parce que deux d'entre eux sont CONDITIONNELS.
 *
 * Une première rédaction disait « les quatre textes servis avec chaque
 * candidat » : faux, et relevé en revue. Une carte réelle en porte deux, trois
 * ou quatre selon le dossier :
 *
 *   · `proposition` et `classement` — TOUJOURS, sur chaque candidat ;
 *   · `objectif` — seulement si le patient a déclaré un objectif prioritaire ;
 *   · `etatInconnu` — seulement si AUCUN état de population n'est déclaré.
 *
 * La distinction compte pour la relecture : attester « ce texte est servi » et
 * attester « ce texte peut l'être, à cette condition » ne sont pas le même acte.
 *
 * Ils arrivent au praticien sous l'intitulé « Ajoutées par le moteur (hors
 * périmètre signé) » — l'intitulé exact que cette relecture rendrait faux, et
 * qui devra changer le jour où l'attestation tombe. C'est la conséquence la
 * plus visible d'une signature, et elle est dite ici pour ne pas être découverte
 * après coup.
 */
export const LIMITATIONS_CANDIDAT = {
  proposition:
    'Une priorité candidate est une proposition hiérarchisée soumise au praticien : elle n’est ni un diagnostic, ni une prescription.',
  classement:
    'Le classement est déterministe et sert la lisibilité : il ne mesure ni la gravité, ni l’urgence.',
  objectif:
    'L’objectif prioritaire déclaré par le patient est affiché au praticien ; il n’entre pas dans le déclenchement de cette règle.',
  etatInconnu:
    'Aucun état de population n’a été déclaré sur ce dossier (grossesse, allaitement, pathologie rénale ou hépatique, chirurgie digestive, maladie cœliaque, exclusion alimentaire) : la gate de population n’avait rien à vérifier.',
} as const;

/**
 * L'ORDRE D'ÉVALUATION DES DEUX MOTIFS `required`.
 *
 * Il DÉCIDE : le premier motif atteint compose le texte servi au praticien, et
 * les deux appellent des gestes opposés — un signal d'alerte déclaré appelle un
 * adressage médical, un canal de plainte non mesurable appelle une passation.
 * Permuter ces deux lignes change ce que le praticien lit sous une abstention,
 * sans qu'aucun sha ne bouge aujourd'hui.
 *
 * Les identifiants sont ceux de la table signée : la liaison se fait par
 * IDENTITÉ, jamais par position (finding M1 de la revue du 2026-08-16).
 */
export const MOTIF_ABSTENTION = {
  securite: 'ABST-SEC-01',
  canal: 'ABST-CAN-01',
} as const;

/**
 * L'ordre déclaré, composé DEPUIS LES NOMS ci-dessus.
 *
 * LE MOTEUR LIE PAR NOM, JAMAIS PAR POSITION, et cette distinction a déjà été
 * payée une fois : le finding M1 de la revue du 2026-08-16 a montré qu'une
 * lecture positionnelle servait le texte SÉCURITÉ sur la branche canal dès
 * qu'on permutait deux lignes. Une première rédaction de ce module
 * déstructurait `ORDRE_EVALUATION_ABSTENTION` par position dans `chaineC1.ts`
 * — c'est-à-dire qu'elle ROUVRAIT ce défaut exact. Relevé en revue.
 *
 * Ce tableau ne sert donc qu'à DÉCLARER l'ordre pour la relecture, et un banc
 * exige qu'il corresponde à l'ordre que le moteur code réellement : le
 * permuter ici sans déplacer le `if` de `chaineC1.ts` fait rougir.
 */
export const ORDRE_EVALUATION_ABSTENTION = [
  MOTIF_ABSTENTION.securite,
  MOTIF_ABSTENTION.canal,
] as const;

/**
 * CE QUE LE PRODUCTEUR DE CANDIDATS GARANTIT, quelles que soient les règles.
 *
 * Trois invariants, et chacun a une raison qui n'est pas cosmétique :
 * le rang est SÉQUENTIEL et non la priorité de la table (`buildDecisionCard`
 * exige des rangs uniques et jetterait sur deux priorités égales) ; la confiance
 * est FIXE à la plus réservée des quatre valeurs (une règle déterministe ne
 * produit aucune gradation, [[D-041]]) ; et une règle écartée ne produit AUCUN
 * candidat.
 */
export const INVARIANTS_PRODUCTEUR = {
  rangSequentielDepuis: 1,
  confianceUnique: 'à_documenter',
  regleEcarteeProduitUnCandidat: false,
} as const;

/** L'objet relisable dans son entier — c'est LUI que l'attestation portera. */
export const PERIMETRE_CLASSEMENT_V1 = {
  version: 'perimetre-classement-v1',
  termesDeClassement: TERMES_DE_CLASSEMENT,
  departagePlainteExAequo: DEPARTAGE_PLAINTE_EX_AEQUO,
  limitationsCandidat: LIMITATIONS_CANDIDAT,
  motifsAbstention: MOTIF_ABSTENTION,
  ordreEvaluationAbstention: ORDRE_EVALUATION_ABSTENTION,
  invariantsProducteur: INVARIANTS_PRODUCTEUR,
} as const;

/**
 * L'ATTESTATION — VIDE, ET C'EST L'ÉTAT JUSTE AUJOURD'HUI.
 *
 * `relu: false` dit qu'aucune relecture clinique n'a eu lieu. Aucun verrou ne
 * consulte cet objet : le poser rempli sans attestation fabriquerait exactement
 * la provenance que [[D-162]] §5 interdit de se réclamer.
 *
 * CE QUE L'ATTESTATION COÛTERA, quand elle tombera, pour que personne ne le
 * découvre après : déplacer un terme de classement, réécrire un des quatre
 * textes, ou permuter les deux motifs d'abstention refermera le verrou jusqu'à
 * re-signature. Et l'intitulé « Ajoutées par le moteur (hors périmètre signé) »
 * servi par `DecisionSummaryCard` deviendra faux pour les quatre limitations :
 * il devra bouger dans le même lot que l'attestation, sinon l'écran
 * SOUS-promettra sur du relu — l'inverse du défaut habituel, mais un écart
 * quand même.
 */
export const ATTESTATION_CLASSEMENT = {
  relu: false,
  dateRelecture: null as string | null,
  /**
   * SHA du périmètre effectivement relu. LITTÉRAL FIGÉ obligatoire le jour où
   * il sera posé, jamais la constante calculée : la comparaison serait
   * tautologique et la péremption invisible (patron [[D-063]]).
   */
  shaRelu: null as string | null,
};
