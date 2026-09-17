/**
 * LA FORMULATION DES CHOIX FACULTATIFS — définie ICI, et plus dans l'écran.
 *
 * LE TROU QUE CE MODULE FERME ([[D-222]] §3). L'événement de choix
 * n'enregistrait que `getDocumentCourant('droits_patient').version`. Or ce
 * n'est pas ce document que le patient lit au moment de choisir : il lit les
 * libellés ci-dessous, qui vivaient en dur dans `MesChoix.tsx` et n'étaient
 * couverts par AUCUNE version. Deux consentements donnés sur deux formulations
 * différentes étaient donc indiscernables au registre — et la correction du
 * 2026-09-17 les aurait rendus indiscernables une fois de plus.
 *
 * POURQUOI UN MODULE PARTAGÉ, ET PAS UNE CONSTANTE DANS L'ÉCRAN. La route qui
 * enregistre le choix doit écrire la MÊME version que celle qui a été servie.
 * Une constante côté client, recopiée côté serveur, diverge à la première
 * retouche — c'est exactement la « copie morte » que `gouvernance.ts` a payée.
 *
 * LA VERSION NE SE GARDE PAS TOUTE SEULE : `FORMULATION_CHOIX_SHA256` est
 * recalculée à l'import depuis le contenu réel, et le banc exige la
 * concordance avec `SHA_ATTENDU_PAR_VERSION`. Retoucher un libellé sans
 * monter la version fait rougir le banc — le patron est celui des tables
 * cliniques signées.
 */
export type FinaliteChoixDefinition = {
  finalite: string;
  libelle: string;
  finaliteDetail: string;
  donnees: string;
  destinataire: string;
  effetRefus: string;
};

export const FINALITES: readonly FinaliteChoixDefinition[] = Object.freeze([
  {
    finalite: 'partage_medecin_traitant',
    libelle: 'Partage avec le médecin traitant',
    // CE TEXTE ÉTAIT FAUX, ET C'EST CELUI SUR LEQUEL LE PATIENT CONSENT
    // ([[D-222]]). Il annonçait que le partage « arrivera dans une prochaine
    // version » : le fil de correspondance médecin est en service depuis le
    // 2026-07-22. Un consentement recueilli sur une description fausse est un
    // consentement mal éclairé, et c'est le seul endroit du produit où le
    // patient lit ce que son choix engage.
    finaliteDetail:
      'Permettre à votre praticien de transmettre à votre médecin traitant des documents vous concernant. La transmission se fait par les moyens habituels de votre praticien — courrier remis ou envoyé par ses soins : l’application elle-même n’envoie rien à votre médecin.',
    donnees: 'Documents validés par votre praticien uniquement.',
    destinataire: 'Votre médecin traitant.',
    // L'EFFET DU REFUS DIT CE QUE LE LOGICIEL FAIT, et il le peut depuis le
    // 2026-09-17 seulement. Avant la garde, « aucun document ne sera partagé »
    // décrivait une garantie que rien ne tenait : le praticien pouvait produire
    // et consigner un courrier sur un dossier en refus. La garde existe
    // désormais, et l'exception d'adressage est nommée — la taire re-créerait
    // l'écart que cette campagne ferme.
    effetRefus:
      'Votre praticien ne pourra pas préparer de courrier pour votre médecin depuis Wellneuro, ni y consigner un échange. Une seule situation s’en écarte : lorsqu’un signe repéré dans votre suivi impose d’écrire à un médecin pour votre sécurité — il vous en informe alors. Votre accompagnement continue normalement.',
  },
  {
    finalite: 'communications_non_essentielles',
    libelle: 'Communications non essentielles',
    finaliteDetail:
      'Recevoir des emails non indispensables au suivi (informations générales, nouveautés de votre espace).',
    donnees: 'Votre adresse email uniquement.',
    destinataire: 'Vous-même.',
    effetRefus: 'Vous ne recevez que les emails nécessaires au suivi (questionnaires, accusés, bilans).',
  },
]);

/**
 * La version de la formulation SERVIE au patient.
 *
 * `v1` — la formulation d'origine, en service du 2026-07-16 au 2026-09-17.
 * Elle promettait « Aucun document ne sera partagé » sans qu'aucune garde ne le
 * tienne, et annonçait un partage « à venir » déjà en service.
 * `v2` — 2026-09-17 : l'effet du refus dit ce que la garde fait, exception
 * d'adressage comprise ([[D-222]] amendé).
 */
export const FORMULATION_CHOIX_VERSION = 'v2';

/**
 * L'empreinte ATTENDUE pour chaque version publiée.
 *
 * Le piège que cette table ferme est celui du verrou biologie, repris tel quel :
 * comparer l'empreinte vivante à elle-même serait tautologique. C'est un
 * littéral figé, relu, qui fait foi — et le banc compare les deux.
 *
 * L'EMPREINTE VIVANTE N'EST PAS CALCULÉE ICI, et c'est une contrainte de
 * bundle, pas un choix d'esthétique : ce module est importé par `MesChoix.tsx`,
 * qui porte `'use client'`. Y appeler `canonicalSha256` ferait entrer
 * `node:crypto` dans le bundle client — le build webpack casse net
 * (`UnhandledSchemeError`), et il l'a fait. Le calcul vit dans
 * `finalitesChoixEmpreinte.ts`, que seuls le serveur et les bancs importent.
 */
export const SHA_ATTENDU_PAR_VERSION: Readonly<Record<string, string>> = Object.freeze({
  v2: '3fafc55420e43f78708907bd6b002282f0c3dd12effa364e90079c1b051bed8d',
});

/**
 * Drapeau de l'écriture de la version de formulation ([[D-222]] §3 fermé).
 *
 * POURQUOI UN DRAPEAU POUR UNE SIMPLE COLONNE. Le code se déploie AVANT que la
 * migration soit approuvée — `release-db` est une porte humaine ([[D-087]]), et
 * entre le merge et l'approbation, la colonne n'existe pas. Un `create` qui la
 * nommerait ferait échouer l'enregistrement du choix du patient : le geste le
 * plus sensible du portail, cassé par une colonne absente.
 *
 * C'est la règle du dépôt, écrite dans `docs/DEPLOIEMENT_RELEASE_DB.md` : « un
 * ADD se protège par drapeau éteint ». Précédent : `WN_EI_INTERRUPTION`.
 *
 * ORDRE DE POSE — et il ne se raccourcit pas : migration appliquée, CONSTATÉE
 * par conteneur, puis seulement `WN_TRACE_FORMULATION_CHOIX=true`.
 *
 * Fail-closed : seule la chaîne exacte « true » ouvre.
 */
export function traceFormulationActive(
  value = process.env.WN_TRACE_FORMULATION_CHOIX,
): boolean {
  return value === 'true';
}
