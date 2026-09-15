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
 * IL A ÉTÉ ATTESTÉ LE 2026-09-15, PUIS L'ATTESTATION A ÉTÉ RETIRÉE LE MÊME
 * JOUR — et le mécanisme a fonctionné exactement comme prévu.
 *
 * Le responsable avait relu et signé `da1ba306c0551d7b`. Une contre-expertise a
 * ensuite montré que la PORTÉE de l'attestation — fidélité descriptive
 * seulement, sans validation de la primauté de la plainte dominante — vivait
 * dans un commentaire et non dans la donnée hachée : rien ne la rendait
 * opposable. La corriger a fait entrer `PORTEE_ATTESTATION` dans le périmètre,
 * donc déplacé l'empreinte, donc **PÉRIMÉ la signature**.
 *
 * C'est la règle, et elle s'est appliquée à son auteur : on n'élargit pas après
 * coup ce qui a été relu. L'attestation a été reposée à `relu: false`, puis
 * REDEMANDÉE et RENDUE le 2026-09-16 sur `9792c12e72db93d8` — le contenu relu
 * n'avait pas changé ; ce qui s'y est ajouté est la portée explicite de la
 * signature, c'est-à-dire ce qu'elle NE couvre pas.
 *
 * CE QU'ELLE COUVRIRA, ET CE QU'ELLE NE COUVRIRA PAS, est désormais DANS
 * `PORTEE_ATTESTATION`, donc haché : le praticien atteste une fidélité
 * DESCRIPTIVE, jamais la légitimité clinique du classement lui-même.
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
 * L'ARBITRAGE DE LA PRIMAUTÉ — rendu le 2026-09-16, après être resté ouvert.
 *
 * LA QUESTION. Le premier terme fait passer une règle de priorité intrinsèque 1
 * DERRIÈRE une priorité 2 dès que le patient cote l'autre domaine plus haut.
 * L'intensité RESSENTIE n'est pas la gravité CLINIQUE : le dépôt l'a écrit
 * pendant deux jours comme une question ouverte, et `PORTEE_ATTESTATION`
 * l'excluait explicitement de ce qui était signé.
 *
 * CE QUI A ÉTÉ ÉCARTÉ, ET POURQUOI — c'est la partie utile. Mettre la priorité
 * intrinsèque en premier, la plainte ne départageant qu'à priorité égale,
 * paraissait le choix prudent. **Il rendait la plainte dominante définitivement
 * inopérante** : les quatre règles portent quatre priorités DISTINCTES (1, 2, 3,
 * 4), donc l'égalité qui lui donnerait la parole ne se produit jamais. Le
 * classement serait devenu un ordre fixe, identique pour tout patient, et
 * `PRIO-DIG-01` aurait été proposée à chaque déclenchement quoi que le patient
 * ait coté. Un terme déclaré actif mais inatteignable est une SUR-PROMESSE
 * ([[DC-34]], [[DC-35]]) — le dépôt en porte déjà un, le troisième, et il le
 * dit.
 *
 * LA RÉPONSE EST DONC LE COMPORTEMENT ACTUEL, mais elle n'est plus un
 * non-choix : le praticien reçoit le patient là où celui-ci se plaint, en
 * connaissance du coût. La priorité intrinsèque garde le dernier mot partout où
 * la plainte ne dit rien — c'est-à-dire chaque fois qu'aucune règle ne porte le
 * domaine dominant.
 *
 * CE QUE CET OBJET N'EST PAS : une validation de la table des priorités. Elle a
 * sa propre signature ([[D-061]], 2026-08-15), et ses valeurs ne sont pas
 * relues ici.
 */
export const ARBITRAGE_PRIMAUTE_PLAINTE = {
  rendu: true,
  date: '2026-09-16',
  /**
   * Le terme retenu en tête, NOMMÉ — et un banc exige qu'il soit celui que
   * `TERMES_DE_CLASSEMENT` place au rang 1. Sans cette liaison, l'arbitrage
   * serait une déclaration que rien n'oblige, c'est-à-dire le défaut exact que
   * [[D-185]] puis [[D-197]] ont eu à corriger sur ce même module.
   */
  termeRetenu: 'plainte dominante',
  ecarte: 'La priorité intrinsèque en tête, la plainte ne départageant qu’à priorité égale.',
  /**
   * Le motif du rejet est FACTUEL et vérifiable, pas une préférence : un banc
   * relit la table et rougit le jour où deux règles partagent une priorité —
   * l’égalité rendrait alors la plainte opérante, et cette justification
   * deviendrait fausse sans que personne ne l’ait touchée.
   */
  motifDuRejet: 'Les quatre règles portent quatre priorités distinctes : l’égalité qui donnerait la parole à la plainte ne se produit jamais, et le terme serait déclaré actif tout en étant inatteignable.',
} as const;

/**
 * LES QUATRE TEXTES QUI PEUVENT ÊTRE SERVIS AVEC UN CANDIDAT — et leurs
 * conditions, parce que deux d'entre eux sont CONDITIONNELS.
 *
 * Une première rédaction disait « les quatre textes servis avec chaque
 * candidat » : faux, une carte réelle en porte deux, trois ou quatre. Relevé en
 * revue — puis relevé DEUX FOIS, parce que la correction laissait les conditions
 * dans ce commentaire, hors empreinte : passer « si objectif déclaré » à
 * « TOUJOURS » ne faisait pas bouger le sha. Chaque texte porte donc désormais sa
 * `condition` DANS LA DONNÉE, et un banc de comportement vérifie que le moteur
 * la respecte.
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
  proposition: {
    condition: 'toujours',
    texte:
      'Une priorité candidate est une proposition hiérarchisée soumise au praticien : elle n’est ni un diagnostic, ni une prescription.',
  },
  classement: {
    condition: 'toujours',
    texte:
      'Le classement est déterministe et sert la lisibilité : il ne mesure ni la gravité, ni l’urgence.',
  },
  objectif: {
    condition: 'objectif prioritaire déclaré par le patient',
    texte:
      'L’objectif prioritaire déclaré par le patient est affiché au praticien ; il n’entre pas dans le déclenchement de cette règle.',
  },
  etatInconnu: {
    condition: 'aucun état de population déclaré',
    texte:
      'Aucun état de population n’a été déclaré sur ce dossier (grossesse, allaitement, pathologie rénale ou hépatique, chirurgie digestive, maladie cœliaque, exclusion alimentaire) : la gate de population n’avait rien à vérifier.',
  },
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

/**
 * LA PORTÉE DE L'ATTESTATION — CE QU'ELLE COUVRE, ET CE QU'ELLE NE COUVRE PAS.
 *
 * ELLE EST DANS LA DONNÉE HACHÉE, ET C'EST LE POINT. Une première rédaction la
 * laissait dans un COMMENTAIRE et dans la décision : `ATTESTATION_CLASSEMENT` ne
 * portait que `relu`, une date et un sha, si bien qu'aucune restriction n'était
 * opposable ni hachée. Deux conséquences, relevées en contre-expertise : le
 * praticien pouvait lire à l'écran une VALIDATION CLINIQUE du classement alors
 * que cet arbitrage est explicitement ouvert, et tout futur consommateur du
 * booléen pouvait faire la même extension sans qu'aucune garde ne l'arrête.
 *
 * Étant hachée, une réécriture de cette portée déplace l'empreinte et PÉRIME
 * l'attestation : on ne peut pas élargir après coup ce qui a été relu.
 */
export const PORTEE_ATTESTATION = {
  /**
   * CE QUI EST ATTESTÉ : que ce module DÉCRIT FIDÈLEMENT ce que le moteur fait.
   * Rien de plus — une exactitude descriptive, pas un jugement.
   */
  couvre: 'La fidélité descriptive : ces données disent ce que le moteur applique réellement.',
  /**
   * CE QUI NE L'EST PAS, nommé pour que personne ne l'étende.
   *
   * LA PRIMAUTÉ DE LA PLAINTE DOMINANTE N'EST PLUS DANS CETTE LISTE : elle a été
   * ARBITRÉE le 2026-09-16 et vit dans `ARBITRAGE_PRIMAUTE_PLAINTE`, haché comme
   * le reste. Ce qui suit est ce qui reste réellement dehors — et la liste est
   * plus courte, pas vide : la rendre vide serait la sur-promesse que cette
   * relecture existe pour éviter.
   */
  neCouvrePas: 'La table des priorités elle-même, qui porte sa propre signature, et le départage de deux plaintes cotées À ÉGALITÉ, qui reste technique : arbitrage clinique NON rendu.',
  /**
   * L'INTITULÉ SERVI À L'ÉCRAN, et il est borné exprès. « Périmètre du
   * classement (relu) » se lisait comme une validation du classement ; ce qui
   * est relu, ce sont les TEXTES qui le décrivent.
   */
  intituleEcran: 'Textes descriptifs du classement, relus',
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
  porteeAttestation: PORTEE_ATTESTATION,
  arbitragePrimautePlainte: ARBITRAGE_PRIMAUTE_PLAINTE,
} as const;

/**
 * L'ATTESTATION — RENDUE LE 2026-09-16 par le responsable, sur `9792c12e72db93d8`.
 *
 * Elle n'a pas été déduite d'un « relu » : la question a été posée en toutes
 * lettres, et elle l'avait déjà été deux fois avant — la première a rendu
 * « j'ai lu, et j'ai des réserves », et la réserve était fondée ([[D-197]]).
 * Une signature clinique se DÉCIDE ; aucun outil ne la pose à la place du
 * responsable.
 *
 * CE QU'ELLE COÛTE, MAINTENANT QU'ELLE EST TOMBÉE : déplacer un terme de
 * classement, réécrire un des quatre textes, ou permuter les deux motifs
 * d'abstention déplace l'empreinte, que `shaRelu` ne suit pas — le verrou se
 * referme jusqu'à re-signature. Réancrer l'empreinte NE SUFFIT PAS à le faire
 * taire : c'est le seul gain qui compte, et il a été vérifié par mutation.
 *
 * ET L'ÉCRAN A BOUGÉ DANS LE MÊME LOT, comme [[D-185]] l'avait annoncé : les
 * quatre `LIMITATION_*` ne peuvent plus être servies sous « Ajoutées par le
 * moteur (hors périmètre signé) », qui SOUS-promettrait sur du relu. Elles
 * passent sous `PORTEE_ATTESTATION.intituleEcran`, borné exprès.
 *
 * `attestationValide` est la seule bonne façon de consulter cet objet : les
 * trois champs valent ENSEMBLE, et lire le seul `relu` était un défaut réel
 * ([[D-202]]).
 */
/**
 * L'EMPREINTE ATTENDUE DU PÉRIMÈTRE — littéral figé, et il vit ICI et non dans
 * le banc pour une raison précise : **l'écran doit pouvoir vérifier la validité
 * d'une attestation**, et il tourne dans le navigateur, où aucun hachage n'est
 * disponible.
 *
 * LE COUPLE N'EST PAS TAUTOLOGIQUE, et c'est tout l'enjeu ([[D-063]]). Ce
 * littéral ne se calcule pas : c'est `perimetreClassement.guard.test.ts` qui
 * prouve qu'il vaut le hash RÉEL de `PERIMETRE_CLASSEMENT_V1`. Une édition du
 * périmètre déplace le hash, le littéral ne suit pas, le banc rougit. À
 * l'exécution, l'écran ne compare donc que deux chaînes — ce qui est bon marché
 * et sûr — pendant que le lien avec le contenu réel est tenu au CI.
 */
export const EMPREINTE_PERIMETRE_ATTENDUE = '9f17a4a658e4fca6';

/**
 * UNE ATTESTATION EST-ELLE VALIDE — la seule question que doit poser un
 * consommateur, écran compris.
 *
 * CE QUE CETTE FONCTION FERME, TROUVÉ EN CONTRE-EXPERTISE. `DecisionSummaryCard`
 * ne lisait que `relu`. Un `shaRelu` PÉRIMÉ — celui d'un périmètre antérieur,
 * gardé par oubli — ou une `dateRelecture` nulle présentaient donc les
 * limitations comme relues. Le banc de l'écran en administrait lui-même la
 * preuve : il injectait `shaRelu: 'simulé'`, une valeur qui ne peut correspondre
 * à aucun périmètre, et attendait « relus ».
 *
 * LES TROIS CHAMPS VALENT ENSEMBLE, ou l'attestation ne vaut pas. C'est déjà ce
 * que le banc de garde exige dans les deux sens ; il manquait qu'un consommateur
 * puisse poser la même question sans le réécrire — et deux rédactions de la même
 * règle finissent toujours par diverger ([[DC-26]]).
 *
 * L'ATTESTATION EST PASSÉE EN PARAMÈTRE, jamais lue depuis la portée du module :
 * sinon un banc qui double `ATTESTATION_CLASSEMENT` verrait la fonction
 * continuer de lire la vraie constante, et prouverait le contraire de ce qu'il
 * croit prouver.
 */
export function attestationValide(attestation: {
  relu: boolean;
  dateRelecture: string | null;
  shaRelu: string | null;
}): boolean {
  if (!attestation.relu) return false;
  if (typeof attestation.dateRelecture !== 'string' || attestation.dateRelecture.length === 0) return false;
  return attestation.shaRelu === EMPREINTE_PERIMETRE_ATTENDUE;
}

export const ATTESTATION_CLASSEMENT = {
  relu: false,
  dateRelecture: null as string | null,
  /**
   * SHA du périmètre effectivement relu. LITTÉRAL FIGÉ, jamais la constante
   * calculée : la comparaison serait tautologique et la péremption invisible
   * (patron [[D-063]]). C'est ce littéral qui rend l'attestation périssable —
   * le jour où le périmètre bouge, l'empreinte bouge, celui-ci ne suit pas, et
   * le banc réclame une re-signature.
   *
   * CE N'EST PAS THÉORIQUE : c'est arrivé le 2026-09-15. La portée de
   * l'attestation est entrée dans la donnée hachée, l'empreinte est passée de
   * `da1ba306c0551d7b` à celle-ci, et le verrou a refusé la signature de celui
   * qui l'avait écrit. L'attestation ci-dessous est la SECONDE, posée sur le
   * contenu borné.
   */
  shaRelu: null as string | null,
};
