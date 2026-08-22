// Registre des gabarits de messages sortants vers le patient (Socle LOT-03).
//
// DC-26 : les règles vivent dans le registre, jamais seulement dans le code.
// Avant ce fichier, huit gabarits étaient dispersés — cinq inline dans des
// handlers de route — sans version, sans date, sans contrainte opposable. Le
// registre les ACCUEILLE tels quels : il n'a réécrit aucun contenu (DC-19,
// DC-20) — le déménagement est fidèle au caractère près, prouvé par les bancs
// d'email existants restés verts sans modification.
//
// ── LE PATRON, ET SES DEUX ÉCARTS ASSUMÉS ───────────────────────────────────
// Patron : `trust/contenus/registre.ts` — version immuable, hash canonique
// (`canonicalSha256`), `Object.freeze`, garde structurelle par test
// (`registreGabarits.test.ts` : hash-lock, liste figée, déclarations).
// Deux écarts au patron, décidés au cadrage (CAMPAGNE.md, état réel) :
//   • DEUX dates au lieu d'une — `redigeLe` (mesurée : dernier commit
//     touchant le sujet du gabarit, `git log -S`) et `valideLe`, qui vaut
//     `null` tant que le responsable n'a pas validé formellement le texte.
//     Aucun des huit n'a jamais été validé : le registre le DIT au lieu de
//     l'inventer.
//   • PAS de chaîne cryptographique — comme le trust : append-only par
//     convention + liste figée par test, chaque hash couvre sa seule version.
//
// ── LA CONTRAINTE DE CONTENU — DÉCLARÉE, PAS IMPOSÉE ────────────────────────
// Référence : le banc de `agenda-sommeil/relanceEmail.ts` — « aucune donnée
// de santé dans un e-mail : ni titre d'instrument, ni domaine, ni chiffre ».
// Quatre gabarits N'Y SONT PAS conformes aujourd'hui (titres d'instruments,
// note libre du praticien) : leur écart est DÉCLARÉ ci-dessous, gabarit par
// gabarit. Le corriger changerait le contenu servi aux patients — décision
// praticien, hors campagne (précédent : l'audit HDS du 2026-07-24 a retiré le
// motif de consultation de l'e-mail portail).
//
// ── ÉVOLUTION D'UN GABARIT ──────────────────────────────────────────────────
// Une version publiée est IMMUABLE : toute évolution du texte = NOUVEL objet
// version ajouté ici (version + 1), l'ancien reste. Modifier un `corps` sans
// changer de version casse la CI (hash-lock). La validation formelle d'un
// texte existant, elle, ne touche pas le hash : `valideLe` est hors empreinte,
// c'est un acte du responsable, pas une réécriture.
//
// Ce module n'importe PAS `canonicalSha256` (node:crypto) : il est atteint par
// un composant client via `relanceEmail` → le recalcul d'empreinte vit dans le
// banc, comme dans le patron trust — les hashs sont des littéraux ici.

export type ConformiteDonneesSante =
  | { statut: 'conforme' }
  | { statut: 'ecart'; ecart: string };

export type VersionGabaritPatient = {
  /** Clé stable du gabarit (alignée sur `TYPES_CORRESPONDANCE_PATIENT` quand le type existe). */
  key: string;
  version: number;
  titre: string;
  /** Sujet EXACT de l'e-mail. */
  sujet: string;
  /** Corps EXACT, variables en `{{nom}}` — rendu par `rendreGabarit`. */
  corps: string;
  /** Variables attendues (toutes obligatoires au rendu). */
  variables: readonly string[];
  donneesSante: ConformiteDonneesSante;
  /** Dernier remaniement du texte, mesuré (`git log -S` sur le sujet). */
  redigeLe: string;
  /** Validation formelle du responsable — `null` tant qu'elle n'a pas eu lieu. */
  valideLe: string | null;
  /** `canonicalSha256({ key, version, sujet, corps, variables })`. */
  hash: string;
};

// Segments optionnels partagés par trois gabarits (assignation, pack, file
// d'envoi). C'est ici que vivent la date limite et la NOTE LIBRE du praticien
// — l'écart « données de santé » le plus ouvert du registre : un texte libre
// part tel quel dans l'e-mail.
export const SEGMENTS_GABARITS = Object.freeze({
  dateLimite: '\nÀ compléter avant le : {{dateLimite}}',
  notePraticien: '\nNote de votre praticien : {{notes}}',
} as const);

export const REGISTRE_GABARITS_PATIENT: readonly VersionGabaritPatient[] = Object.freeze([
  {
    key: 'lien_magique',
    version: 1,
    titre: "Lien temporaire d'accès à l'espace patient",
    sujet: 'Votre lien d’accès — Wellneuro',
    corps:
      'Bonjour {{prenom}},\n\n' +
      "Voici votre lien d'accès à votre espace patient Wellneuro :\n{{lien}}\n\n" +
      "Ce lien est valable 24 heures et ne s'ouvre qu'une fois. " +
      "Passé ce délai, ou si vous l'avez déjà utilisé, vous pourrez en redemander " +
      'un nouveau depuis la page qui s\'affichera — sans passer par votre praticien.\n\n' +
      "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message : " +
      'sans clic de votre part, ce lien expirera seul.\n\n' +
      "L'équipe Wellneuro",
    variables: ['prenom', 'lien'],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-07-20',
    valideLe: null,
    hash: '20542552ef304ba7906c997402838f31bf40b7d2e92306706c903b9c222fc03d',
  },
  {
    key: 'acces_portail',
    version: 1,
    titre: "Ouverture de l'accès à l'espace patient",
    sujet: 'Accès à votre espace patient — Wellneuro',
    corps:
      'Bonjour {{prenom}},\n\n' +
      "Votre praticien vous ouvre l'accès à votre espace patient Wellneuro.\n\n" +
      "Rendez-vous sur votre page d'accès :\n{{connexion}}\n\n" +
      "Vous pourrez vous connecter avec Google, ou recevoir un lien d'accès " +
      'par e-mail à l\'adresse enregistrée par votre praticien.\n\n' +
      'Lors de votre première connexion, il vous sera demandé de donner votre consentement, ' +
      "de remplir une courte fiche de renseignements puis un questionnaire d'anamnèse. " +
      'Vos questionnaires de suivi seront ensuite mis à votre disposition.\n\n' +
      "L'équipe Wellneuro",
    variables: ['prenom', 'connexion'],
    // L'audit HDS du 2026-07-24 a retiré le motif de consultation de ce
    // gabarit — le texte ne porte plus aucune donnée propre au patient.
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-07-08',
    valideLe: null,
    hash: '895273177cabdc3f74f6fe381dd8408bee769e469781d923367aa3d38b118bf7',
  },
  {
    key: 'relance_agenda_sommeil',
    version: 1,
    titre: 'Relance du recueil agenda du sommeil',
    sujet: 'Un recueil en cours dans votre espace — Wellneuro',
    // La salutation est calculée par l'appelant (`relanceEmail.ts` — prénom
    // vide → « Bonjour, ») : le gabarit la reçoit rendue.
    corps:
      '{{salutation}}\n\n' +
      "Votre praticien vous signale qu'un recueil est à votre disposition dans votre\n" +
      'espace patient Wellneuro. Il se remplit en une minute par jour, au moment qui\n' +
      'vous convient.\n\n' +
      'Accéder à votre espace :\n{{lien}}\n\n' +
      "Il n'y a rien à rattraper : commencez ou reprenez simplement au prochain matin.\n\n" +
      "L'équipe Wellneuro",
    variables: ['salutation', 'lien'],
    // Le SEUL gabarit dont la conformité est tenue par un banc dédié
    // (`relanceEmail.test.ts`) : ni instrument, ni « sommeil », ni chiffre.
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-07-30',
    valideLe: null,
    hash: '3626875e5045effb6a2b85c865dda391d8ba30c717c568f413893c50db265250',
  },
  {
    key: 'assignation_questionnaire',
    version: 1,
    titre: "Invitation à compléter un questionnaire",
    sujet: 'Questionnaire à compléter avant votre consultation — Wellneuro',
    corps:
      'Bonjour,\n\n' +
      'Votre praticien vous invite à compléter le questionnaire suivant avant votre consultation :\n' +
      '« {{titre}} »{{dateInfo}}{{noteInfo}}\n\n' +
      'Accédez à votre espace patient ici :\n{{portalUrl}}\n\n' +
      "L'équipe Wellneuro",
    variables: ['titre', 'dateInfo', 'noteInfo', 'portalUrl'],
    donneesSante: {
      statut: 'ecart',
      ecart:
        "Porte le titre de l'instrument assigné (révèle le domaine exploré) et, " +
        'via le segment note, un texte libre du praticien envoyé tel quel.',
    },
    redigeLe: '2026-06-30',
    valideLe: null,
    hash: 'fd98f9d154fefb1d1f0c28cc7caf2d2a88b9d374474e71370205df9d3e49677f',
  },
  {
    key: 'assignation_pack',
    version: 1,
    titre: "Invitation à compléter les questionnaires d'un pack",
    sujet: 'Questionnaires à compléter avant votre consultation — Wellneuro',
    // `liste` : préformatée par l'appelant, une ligne « • titre » par
    // questionnaire.
    corps:
      'Bonjour,\n\n' +
      'Votre praticien vous invite à compléter les questionnaires du pack « {{packNom}} » avant votre consultation :\n' +
      '{{liste}}{{dateInfo}}{{noteInfo}}\n\n' +
      "Un seul lien suffit : après confirmation de votre email, vous pourrez accéder à tous les questionnaires en attente du pack et les remplir dans l'ordre de votre choix.\n\n" +
      'Accéder à vos questionnaires :\n{{portalUrl}}\n\n' +
      "L'équipe Wellneuro",
    variables: ['packNom', 'liste', 'dateInfo', 'noteInfo', 'portalUrl'],
    donneesSante: {
      statut: 'ecart',
      ecart:
        'Porte le nom du pack et les titres de tous ses instruments, et, via le ' +
        'segment note, un texte libre du praticien envoyé tel quel.',
    },
    redigeLe: '2026-07-07',
    valideLe: null,
    hash: 'f09e03dab17c5cab5360724f5520d1dd18ff4d25bb398a9fa5ac705cfcf79188',
  },
  {
    key: 'file_envoi',
    version: 1,
    titre: "Invitation à compléter une sélection de questionnaires",
    sujet: 'Questionnaires à compléter avant votre consultation — Wellneuro',
    corps:
      'Bonjour,\n\n' +
      'Votre praticien vous invite à compléter les questionnaires suivants :\n' +
      '{{liste}}{{dateInfo}}{{noteInfo}}\n\n' +
      "Un seul lien suffit : après confirmation de votre email, vous pourrez accéder à tous les questionnaires en attente et les remplir dans l'ordre de votre choix.\n\n" +
      'Accéder à vos questionnaires :\n{{portalUrl}}\n\n' +
      "L'équipe Wellneuro",
    variables: ['liste', 'dateInfo', 'noteInfo', 'portalUrl'],
    donneesSante: {
      statut: 'ecart',
      ecart:
        'Porte les titres des instruments sélectionnés et, via le segment note, ' +
        'un texte libre du praticien envoyé tel quel.',
    },
    redigeLe: '2026-07-23',
    valideLe: null,
    hash: '46bd71ed3af24c1db5d5b491e6bfacfb63b5520bd04a60ab5e7b28693cabf2e7',
  },
  {
    key: 'accuse_reception',
    version: 1,
    titre: "Accusé de réception d'un questionnaire",
    sujet: 'Vos réponses ont bien été reçues — Wellneuro',
    corps:
      'Bonjour,\n\n' +
      'Nous confirmons la bonne réception de vos réponses au questionnaire :\n' +
      '« {{titre}} »\n\n' +
      'Votre praticien Wellneuro en prendra connaissance prochainement.\n\n' +
      "L'équipe Wellneuro",
    variables: ['titre'],
    donneesSante: {
      statut: 'ecart',
      ecart: "Porte le titre de l'instrument complété (révèle le domaine exploré).",
    },
    redigeLe: '2026-06-30',
    valideLe: null,
    hash: '67b5239b0337d734a6b60c27e4f2a74bcdb9303375da8d501282d8f45e51e7d3',
  },
  {
    key: 'envoi_bilan',
    version: 1,
    titre: 'Transmission du bilan (booklet)',
    sujet: 'Votre bilan neuronutritionnel validé — Wellneuro',
    // Seul gabarit à double corps : ce texte est le corps `text`, le corps
    // `html` est le booklet rendu (`buildBookletHTML`), gardé ailleurs
    // (carte des chemins sortants, `documents/vocabulaire.ts`).
    corps:
      'Bonjour,\n\n' +
      'Votre praticien vous transmet votre bilan neuronutritionnel Wellneuro.\n' +
      'Ce document a été préparé après validation humaine et ne constitue pas un diagnostic médical.\n\n' +
      'Bien cordialement,\n' +
      "L'équipe Wellneuro",
    variables: [],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-06-30',
    valideLe: null,
    hash: 'c67f70beb29b025c6cb93eb8397bf35e32d85a556d6142439f2da93b1fd74780',
  },
]);

/** Le gabarit courant d'une clé : version la plus haute (les versions
 * coexistent, l'ancienne ne se supprime jamais). */
export function getGabarit(key: string): VersionGabaritPatient {
  const versions = REGISTRE_GABARITS_PATIENT.filter(g => g.key === key);
  if (versions.length === 0) throw new Error(`Gabarit inconnu au registre : ${key}`);
  return versions.reduce((a, b) => (b.version >= a.version ? b : a));
}

/**
 * Rendu d'un gabarit : substitue chaque `{{nom}}`. Fail-loud dans les deux
 * sens — variable manquante ou placeholder résiduel lèvent : un e-mail
 * partiellement rendu ne doit jamais partir.
 */
export function rendreGabarit(
  gabarit: VersionGabaritPatient,
  vars: Record<string, string>,
): { sujet: string; corps: string } {
  let corps = gabarit.corps;
  for (const nom of gabarit.variables) {
    if (!(nom in vars)) throw new Error(`Gabarit ${gabarit.key}@${gabarit.version} : variable manquante « ${nom} »`);
    corps = corps.replaceAll(`{{${nom}}}`, vars[nom]);
  }
  const residu = corps.match(/\{\{[a-zA-Z]+\}\}/);
  if (residu) throw new Error(`Gabarit ${gabarit.key}@${gabarit.version} : placeholder non rendu ${residu[0]}`);
  return { sujet: gabarit.sujet, corps };
}

/** Rendu d'un segment optionnel — chaîne vide si la donnée est falsy, comme
 * les ternaires historiques des appelants (`dateLimite ? … : ''`) : pas de
 * `trim`, la fidélité au caractère près prime sur l'élégance. */
export function rendreSegment(
  segment: keyof typeof SEGMENTS_GABARITS,
  valeur: string | null | undefined,
): string {
  if (!valeur) return '';
  return SEGMENTS_GABARITS[segment].replaceAll(
    segment === 'dateLimite' ? '{{dateLimite}}' : '{{notes}}',
    valeur,
  );
}
