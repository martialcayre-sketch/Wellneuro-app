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
// Quatre gabarits n'y étaient pas conformes en v1 (titres d'instruments,
// note libre du praticien) : leur écart reste DÉCLARÉ sur chaque v1. Le
// praticien l'a corrigé le 2026-10-23 : leurs v2, servies, ne portent plus
// ni titre ni note (précédent : l'audit HDS du 2026-07-24 avait retiré le
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

import { SIGNATURE_PRATICIEN } from './signature';

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
    // VALIDÉ le 2026-10-23, en session, sur le texte servi relu par le
    // responsable (D/39 du plan) ; l'empreinte ne bouge pas.
    valideLe: '2026-10-23',
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
    // VALIDÉ le 2026-10-23, en session, sur le texte servi relu par le
    // responsable (D/39 du plan) ; l'empreinte ne bouge pas.
    valideLe: '2026-10-23',
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
    //
    // LA DÉCLARATION `donneesSante` CI-DESSOUS NE COUVRE PAS LE `html`, et il
    // faut le lire ainsi. Elle porte sur le `corps` — ce texte-ci, qui est bien
    // exempt de donnée de santé. Le second corps, lui, transporte le narratif
    // patient et la note praticien hors de l'hébergement HDS : il est assumé
    // par [[D-136]], daté, et décrit à la carte des chemins sortants. Passer ce
    // champ à `ecart` serait déclarer un écart sur un texte qui n'en a pas.
    corps:
      'Bonjour,\n\n' +
      'Votre praticien vous transmet votre bilan neuronutritionnel Wellneuro.\n' +
      'Ce document a été préparé après validation humaine et ne constitue pas un diagnostic médical.\n\n' +
      'Bien cordialement,\n' +
      "L'équipe Wellneuro",
    variables: [],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-06-30',
    // VALIDÉ le 2026-10-23, en session, sur le texte servi relu par le
    // responsable (D/39 du plan) ; l'empreinte ne bouge pas.
    valideLe: '2026-10-23',
    hash: 'c67f70beb29b025c6cb93eb8397bf35e32d85a556d6142439f2da93b1fd74780',
  },
  // Ajoutée en fin de liste, comme le veut l'append-only : la v1 ci-dessus ne
  // bouge pas d'un caractère, elle cesse simplement d'être servie
  // (`getGabarit` rend la version la plus haute).
  //
  // POURQUOI UNE V2. Le texte v1 ouvrait un accès sans jamais dire QUI
  // l'ouvre : « Votre praticien » à la troisième personne, signé « L'équipe
  // Wellneuro » — une entreprise que le patient n'a jamais rencontrée, sur un
  // domaine qu'il ne connaît pas, à propos d'un service dont le prix n'était
  // pas dit. Cinq dossiers ouverts entre le 2026-08-20 et le 2026-09-04 ont
  // reçu ce message : aucun n'a ouvert son espace. C'est la seule lecture
  // qu'on ait, et elle ne prouve rien à elle seule — mais le texte, lui, était
  // bel et bien ambigu.
  //
  // PREMIER GABARIT DU REGISTRE PORTANT UNE VALIDATION FORMELLE : `valideLe`
  // valait `null` sur les huit versions publiées. Le champ existait pour cet
  // acte-là, il n'avait encore jamais servi.
  //
  // LE NOM DU PRATICIEN EST EN DUR, décision assumée (arbitrage praticien du
  // 2026-09-04) : un gabarit qui dirait « {{praticien}} » ne dirait plus
  // « c'est moi », et c'est tout l'objet de cette version. Le dépôt tient
  // l'hypothèse mono-praticien ; le jour où un second compte praticien
  // s'ouvre, ce texte devra passer par une variable — alimentée par un nom
  // d'affichage qui n'existe pas encore en base, les dossiers ne portant que
  // `praticienEmail`. C'est la dette, elle est connue.
  //
  // LA QUALITÉ DU PRATICIEN EST ÉCRITE DANS LES TERMES DE CELUI QUI LA
  // DÉLIVRE, vérifiés sur le site de l'Institut SIIN le 2026-09-04
  // (`siin-nutrition.com/fr/institut-siin/neuro-nutrition/`) :
  //
  //   • « Neuro-Nutrition® » PREND UN TRAIT D'UNION. La page déclare que
  //     « toute utilisation du terme : Neuro-Nutrition® NeuroNutrition ou
  //     toute déclinaison susceptible de créer une confusion est strictement
  //     encadrée ». Une première rédaction écrivait « NeuroNutrition® » : sur
  //     une marque déposée, l'orthographe n'est pas une préférence.
  //   • L'INSTITUT SIIN DÉLIVRE le label, il n'EST pas le label. Une première
  //     rédaction disait « label S.I.I.N. », inversant les deux. Le nom exact
  //     est « Label Neuro-Nutrition® (NN®) », et l'institut s'écrit « Institut
  //     SIIN » (Scientific Institute for Intelligent Nutrition®), sans points.
  //   • « praticien labellisé » est le terme de la page elle-même.
  //
  // CE QUE LE TEXTE NE DIT PAS, ET NE DOIT PAS DIRE : aucune reconnaissance
  // par l'État, les autorités de santé ou un ordre professionnel. Le site n'en
  // revendique aucune — sa seule certification est Qualiopi, « au titre de la
  // catégorie Actions de formation », qui porte sur le PROCESSUS de formation.
  // Le gabarit énonce un diplôme et un label, et s'arrête là.
  //
  // DEUX PHRASES ONT ÉTÉ RETIRÉES EN REVUE (2026-09-04), toutes deux fausses
  // sans qu'aucun banc puisse le dire — un gabarit se relit seul, et ce qu'il
  // PROMET vit ailleurs dans le dépôt :
  //
  //   • « taper app.wellneuro.fr : c'est la même page ». La racine redirige
  //     hors session vers `/login`, l'écran PRATICIEN, dont le seul bouton
  //     passe par `ALLOWED_DOMAINS = ['wellneuro.fr']` (`lib/auth.ts`) et
  //     refuse tout compte Google personnel. La phrase existait pour rassurer
  //     contre l'hameçonnage : elle envoyait donc au mur le patient le PLUS
  //     méfiant, celui qui tape plutôt que de cliquer. Le texte pointe
  //     désormais l'URL rendue par `{{connexion}}`, qui est bien la sienne.
  //   • « sans échéance ». `SEGMENTS_GABARITS.dateLimite` est servi par les
  //     trois gabarits d'assignation : la promesse portait nommément sur ce
  //     qui peut porter une date limite. Le pack de base, lui, part sans date
  //     (`api/portail/valider` n'en passe aucune) — mais pas le reste.
  //
  // L'ADRESSE DE RÉPONSE EST ÉCRITE DANS LE CORPS, et l'en-tête `Reply-To` la
  // double depuis le même jour (`sendPortailLinkEmail`, alimenté par
  // `patients.praticien_email`) : l'expéditeur reste `noreply@wellneuro.fr`,
  // donc sans cet en-tête le bouton « Répondre » du client viserait une boîte
  // morte. Les deux se justifient — l'en-tête sert le geste réflexe, le corps
  // reste lisible là où le client masque l'adresse de réponse.
  {
    key: 'acces_portail',
    version: 2,
    titre: "Ouverture de l'accès à l'espace patient",
    sujet: 'Votre espace de suivi — Martial Cayre (Wellneuro)',
    corps:
      'Bonjour {{prenom}},\n\n' +
      'Je vous ouvre l’accès à votre espace de suivi.\n\n' +
      'Wellneuro est l’outil que j’utilise pour le suivi de mes patients, et ' +
      'wellneuro.fr est mon site : ce message, et ceux qui suivront depuis ' +
      'noreply@wellneuro.fr, viennent de mon cabinet. L’accès à cet espace et le ' +
      'suivi qui s’y fait sont gratuits — il n’y a rien à payer, ni maintenant ni ' +
      'plus tard.\n\n' +
      'Votre page d’accès :\n{{connexion}}\n\n' +
      'Vous pouvez taper cette adresse vous-même dans votre navigateur plutôt que de ' +
      'cliquer : elle mène au même endroit. Vous vous y connecterez avec Google, ou ' +
      'en demandant un lien d’accès par e-mail, à l’adresse à laquelle vous recevez ' +
      'ce message.\n\n' +
      'À la première connexion : votre consentement, une courte fiche de ' +
      'renseignements, puis quelques questions sur ce qui vous amène. Vos ' +
      'questionnaires sont mis à disposition ensuite, et vous avancez à votre ' +
      'rythme ; si l’un d’eux porte une date limite, elle vous sera indiquée.\n\n' +
      'On ne vous demandera jamais de coordonnées bancaires, de numéro de carte ni ' +
      'de mot de passe. Une question, un doute sur un message reçu : écrivez-moi à ' +
      'martialcayre@wellneuro.fr.\n\n' +
      SIGNATURE_PRATICIEN,
    variables: ['prenom', 'connexion'],
    // Ni instrument, ni domaine clinique, ni chiffre : « ce qui vous amène »
    // ne nomme rien du dossier. La qualité du praticien n'est pas une donnée
    // du patient.
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-09-04',
    valideLe: '2026-09-04',
    hash: '565610165965e90f611d6f315e07a6392956cdcf0e48547c1b4391fb6a8153eb',
  },
  // Le MÊME texte que `acces_portail@2`, augmenté du lien qui ouvre. Clé
  // DISTINCTE et non version 3 : `getGabarit` rend la version la plus haute
  // d'une clé, et une v3 serait servie aussi au chemin SANS lien, où le rendu
  // lèverait sur `{{lien}}` manquant. Le type de correspondance journalisé
  // reste `acces_portail` — c'est lui que lit l'encart des dossiers neufs.
  {
    key: 'acces_portail_lien',
    version: 1,
    titre: "Ouverture de l'accès à l'espace patient, avec lien direct",
    sujet: 'Votre espace de suivi — Martial Cayre (Wellneuro)',
    corps:
      'Bonjour {{prenom}},\n\n' +
      'Je vous ouvre l’accès à votre espace de suivi.\n\n' +
      'Wellneuro est l’outil que j’utilise pour le suivi de mes patients, et ' +
      'wellneuro.fr est mon site : ce message, et ceux qui suivront depuis ' +
      'noreply@wellneuro.fr, viennent de mon cabinet. L’accès à cet espace et le ' +
      'suivi qui s’y fait sont gratuits — il n’y a rien à payer, ni maintenant ni ' +
      'plus tard.\n\n' +
      'Pour entrer directement, ouvrez ce lien :\n{{lien}}\n\n' +
      'Il est valable 24 heures et ne s’ouvre qu’une fois. Passé ce délai, ou si ' +
      'vous l’avez déjà ouvert, votre page d’accès, elle, reste ouverte et ne ' +
      'change jamais :\n{{connexion}}\n\n' +
      'Vous pouvez taper cette adresse vous-même dans votre navigateur plutôt que de ' +
      'cliquer : elle mène au même endroit. Vous vous y connecterez avec Google, ou ' +
      'en demandant un lien d’accès par e-mail, à l’adresse à laquelle vous recevez ' +
      'ce message.\n\n' +
      'À la première connexion : votre consentement, une courte fiche de ' +
      'renseignements, puis quelques questions sur ce qui vous amène. Vos ' +
      'questionnaires sont mis à disposition ensuite, et vous avancez à votre ' +
      'rythme ; si l’un d’eux porte une date limite, elle vous sera indiquée.\n\n' +
      'On ne vous demandera jamais de coordonnées bancaires, de numéro de carte ni ' +
      'de mot de passe. Une question, un doute sur un message reçu : écrivez-moi à ' +
      'martialcayre@wellneuro.fr.\n\n' +
      SIGNATURE_PRATICIEN,
    variables: ['prenom', 'connexion', 'lien'],
    // Ni instrument, ni domaine clinique, ni chiffre — comme la v2 dont il
    // reprend le texte au caractère près, hors le paragraphe du lien.
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-09-07',
    valideLe: '2026-09-07',
    hash: '0e65572d94cc85966add63e7891136a552169d777a971e16319ec7e082694e86',
  },
  // ── OBJECTIF PROPOSÉ ────────────────────────────────────────────────────
  // ARBITRAGE DU RESPONSABLE, 2026-09-08 ([[D-154]], constat `M02`) : l'objectif
  // rédigé par le praticien doit ATTEINDRE le patient. Mesure de production du
  // même jour : 4 propositions, 1 objectif négocié, et **0 ratification, 0
  // amendement, 0 réponse de jalon** — les trois drapeaux de la chaîne étant
  // pourtant posés. Le retour spontané au portail est donc démenti par les
  // chiffres ; l'e-mail est le seul canal dont la production prouve qu'il
  // fonctionne (74 liens magiques, 58 accusés, tous en `Envoye`).
  //
  // LE TEXTE DE L'OBJECTIF N'EST PAS DANS L'E-MAIL, ET C'EST LE POINT DUR.
  // `enonce_patient` porte les mots du patient sur ce qui l'amène : c'est le
  // contenu le plus nominatif du dossier. Une boîte e-mail n'est pas un canal
  // maîtrisé (précédent : l'audit HDS du 2026-07-24 a retiré le motif de
  // consultation de l'e-mail portail). Le message dit qu'un texte attend, il ne
  // le transporte pas.
  {
    key: 'objectif_propose',
    version: 1,
    titre: 'Un objectif de suivi attend la relecture du patient',
    sujet: 'Un objectif à relire dans votre espace — Wellneuro',
    corps:
      'Bonjour {{prenom}},\n\n' +
      'À partir de nos échanges, j’ai écrit l’objectif que je vous propose pour la ' +
      'suite de votre suivi. Il vous attend dans votre espace.\n\n' +
      'Ce que j’attends de vous : le lire, et me dire s’il correspond à ce que vous ' +
      'vouliez. S’il ne correspond pas, dites-le — c’est utile, et c’est prévu : ' +
      'l’espace vous permet de le contester ou de proposer une autre formulation. ' +
      'Rien n’est engagé tant que vous ne l’avez pas relu.\n\n' +
      'Votre espace :\n{{connexion}}\n\n' +
      'Vous pouvez taper cette adresse vous-même dans votre navigateur plutôt que de ' +
      'cliquer : elle mène au même endroit. Vous vous y connecterez avec Google, ou ' +
      'en demandant un lien d’accès par e-mail, à l’adresse à laquelle vous recevez ' +
      'ce message.\n\n' +
      'On ne vous demandera jamais de coordonnées bancaires, de numéro de carte ni ' +
      'de mot de passe. Une question, un doute sur un message reçu : écrivez-moi à ' +
      'martialcayre@wellneuro.fr.\n\n' +
      SIGNATURE_PRATICIEN,
    variables: ['prenom', 'connexion'],
    // Ni instrument, ni domaine clinique, ni chiffre — et surtout PAS l'énoncé
    // de l'objectif, qui reste dans l'espace.
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-09-08',
    // VALIDÉ LE JOUR MÊME, sur demande explicite du responsable en session.
    // [[D-154]] §7 avait laissé le geste ouvert et en avait nommé la forme :
    // « elle se pose en changeant `valideLe`, sans toucher l'empreinte ».
    //
    // PREMIÈRE VALIDATION DU REGISTRE POSÉE APRÈS COUP : les deux autres
    // (`acces_portail@2`, `acces_portail_lien@1`) sont nées validées. Que le
    // `hash` ci-dessous ne bouge pas EST la preuve — il couvre
    // `{key, version, sujet, corps, variables}` et rien d'autre, donc le texte
    // servi au patient est au caractère près celui qui a été relu. Une
    // validation qui aurait exigé de recalculer l'empreinte aurait été, par
    // définition, une v2.
    valideLe: '2026-09-08',
    hash: 'c784b2257263dfce984bc370dc54af3b9e31cba3ec537fd52116bcab0b111f16',
  },
  {
    key: 'objectif_propose',
    version: 2,
    titre: 'Un objectif de suivi attend la relecture du patient',
    sujet: 'Un objectif à relire dans votre espace — Wellneuro',
    corps:
      'Bonjour {{prenom}},\n\n' +
      'À partir de nos échanges, j’ai écrit l’objectif que je vous propose pour la ' +
      'suite de votre suivi. Il vous attend dans votre espace.\n\n' +
      'Ce que j’attends de vous : le lire, et me dire s’il correspond à ce que vous ' +
      'vouliez. S’il ne correspond pas, dites-le — c’est utile, et c’est prévu : ' +
      'l’espace vous permet de le contester ou de proposer une autre formulation. ' +
      'Rien n’est engagé tant que vous ne l’avez pas relu.\n\n' +
      'Votre espace :\n{{connexion}}\n\n' +
      'Une fois connecté : choisissez « Accéder à mon parcours », puis ' +
      '« Ouvrir mon dossier à deux voix ».\n\n' +
      'Vous pouvez taper cette adresse vous-même dans votre navigateur plutôt que de ' +
      'cliquer : elle mène au même endroit. Vous vous y connecterez avec Google, ou ' +
      'en demandant un lien d’accès par e-mail, à l’adresse à laquelle vous recevez ' +
      'ce message.\n\n' +
      'On ne vous demandera jamais de coordonnées bancaires, de numéro de carte ni ' +
      'de mot de passe. Une question, un doute sur un message reçu : écrivez-moi à ' +
      'martialcayre@wellneuro.fr.\n\n' +
      SIGNATURE_PRATICIEN,
    variables: ['prenom', 'connexion'],
    // Ni instrument, ni domaine clinique, ni chiffre — et surtout PAS l'énoncé
    // de l'objectif, qui reste dans l'espace.
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-09-10',
    // VALIDÉE LE 2026-09-10, le jour de sa rédaction : date confirmée par le
    // responsable le 2026-10-23 (D/39 du plan). Le commentaire recopié de la
    // v1 la disait validée sans que la date soit posée ; l'empreinte ne
    // bouge pas, le texte servi est celui qui a été relu.
    valideLe: '2026-09-10',
    hash: 'f15fa027f32590344710015e66947d4e8ead2b2bd394beda8725848060b39024',
  },
  {
    key: 'relance_questionnaire',
    version: 1,
    titre: 'Rappel — un questionnaire attend toujours',
    sujet: 'Un questionnaire vous attend toujours — Wellneuro',
    // IL NE NOMME PAS L'INSTRUMENT, contrairement à l'invitation initiale
    // (`assignation_questionnaire`, écart « données de santé » assumé). Un
    // rappel part SEUL, souvent plusieurs jours après, et peut être lu par
    // quelqu'un d'autre que le destinataire : le titre d'un instrument révèle
    // le domaine exploré. L'échéance, elle, est ce qui rend le rappel
    // actionnable — c'est le seul segment qu'il porte.
    corps:
      'Bonjour,\n\n' +
      'Un questionnaire vous attend toujours dans votre espace patient.{{dateInfo}}\n\n' +
      'Le compléter permet à votre praticien de préparer votre consultation.\n\n' +
      'Accéder à votre espace :\n{{portalUrl}}\n\n' +
      "L'équipe Wellneuro",
    variables: ['dateInfo', 'portalUrl'],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-09-12',
    // VALIDÉ le 2026-10-23, en session, sur le texte servi relu par le
    // responsable (D/39 du plan) ; l'empreinte ne bouge pas.
    valideLe: '2026-10-23',
    hash: '29da6688c0d92bf35b9645066ecc3706c0ca261303c15a802a02f7f1970d0a90',
  },
  // ── UN DOCUMENT REMIS ([[D-251]] §9, lot 11) ────────────────────────────────
  // Part au clic « Valider pour diffusion » qui a remis au moins une fiche
  // d'assiette, UN par clic, et seulement espace de lecture ouvert.
  //
  // IL NE NOMME RIEN. Ni l'assiette — son nom révèle une indication, c'est ce
  // qui a qualifié la table des remises en article 9 —, ni « fiche », ni axe,
  // ni nombre. La fiche ne voyage jamais par e-mail : l'espace la sert. Objet
  // et phrase centrale sont ceux du §9 et de l'amendement du 2026-09-28,
  // mot pour mot ; le reste reprend `objectif_propose@2`, déjà validé.
  //
  // « Accéder à mon parcours » est le bouton de l'écran qui accueille un
  // patient connecté (`portail/[token]/page.tsx`, `DoneScreen`) ; « la liste
  // de ce que vous avez à faire » est le fil du jour (`MonParcoursAccueil`),
  // où chaque fiche servie non lue est une tâche (lot 10). Le fil n'est PAS
  // nommé par son titre : il devient « Pour reprendre » pour un patient qui
  // revient après des mois (revue Copilot de #1249).
  {
    key: 'document_remis',
    version: 1,
    titre: 'Un document remis attend le patient dans son espace',
    sujet: 'Un document de votre praticien vous attend',
    corps:
      'Bonjour {{prenom}},\n\n' +
      'Un document de votre praticien vous attend dans votre espace.\n\n' +
      'Votre espace :\n{{connexion}}\n\n' +
      'Une fois connecté : choisissez « Accéder à mon parcours » ; le document ' +
      'figure dans la liste de ce que vous avez à faire.\n\n' +
      'Vous pouvez taper cette adresse vous-même dans votre navigateur plutôt que de ' +
      'cliquer : elle mène au même endroit. Vous vous y connecterez avec Google, ou ' +
      'en demandant un lien d’accès par e-mail, à l’adresse à laquelle vous recevez ' +
      'ce message.\n\n' +
      'On ne vous demandera jamais de coordonnées bancaires, de numéro de carte ni ' +
      'de mot de passe. Une question, un doute sur un message reçu : écrivez-moi à ' +
      'martialcayre@wellneuro.fr.\n\n' +
      SIGNATURE_PRATICIEN,
    variables: ['prenom', 'connexion'],
    // Ni assiette, ni « fiche », ni domaine clinique, ni chiffre — tenu par
    // `registreGabarits.test.ts`.
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-09-29',
    // NÉ VALIDÉ, en session, sur le texte exact : le responsable a choisi la
    // variante « où le trouver », puis validé deux corrections de sa phrase —
    // nommer le bouton réellement vu après connexion (« Accéder à mon
    // parcours »), puis ne pas nommer un titre de fil qui change en reprise.
    valideLe: '2026-09-29',
    hash: '945547ddcdb2b816ebc0bafcd316d24b083e30545ff2cf147717d92845a198ed',
  },
  // ── CONDITIONS D'UTILISATION ────────────────────────────────────────────
  // [[D-292]] §3 — l'e-mail aux patients déjà suivis, envoyé en une fois depuis
  // le cockpit. Le texte est celui de la proposition validée
  // (`docs/claude/propositions/2026-10-14-k-conditions-utilisation/README.md`),
  // mot pour mot à l'apostrophe typographique du registre près, plus UNE
  // phrase ajoutée après le lien (arbitrage du 2026-10-16) : le lien magique
  // ne vit que 24 heures, et la page reste ensuite où le patient la trouve.
  // Ni nom, ni prénom, ni donnée de santé. Signé « Wellneuro » : les réponses
  // vont au praticien du dossier par l'en-tête `Reply-To`.
  {
    key: 'conditions_utilisation',
    version: 1,
    titre: "Annonce des conditions d'utilisation aux patients suivis",
    sujet: 'Wellneuro — les conditions d’utilisation de votre espace',
    corps:
      'Bonjour,\n\n' +
      'Les informations de votre espace Wellneuro sont désormais réunies en un seul ' +
      'document : les conditions d’utilisation de votre espace.\n\n' +
      'Rien ne change dans votre accompagnement, et votre espace reste accessible ' +
      'comme avant.\n\n' +
      'Pour lire ce document et le valider, ouvrez ce lien : {{lien}}\n\n' +
      'Ce lien est valable 24 heures et ne s’ouvre qu’une fois. Passé ce délai, ' +
      'connectez-vous à votre espace comme d’habitude : le document vous attend ' +
      'dans « Informations, confidentialité et droits ».\n\n' +
      'Le lien ouvre le texte. Rien n’est validé tant que vous n’avez pas cliqué ' +
      'sur « J’en ai pris connaissance ».\n\n' +
      'Pour toute question, répondez simplement à ce message.\n\n' +
      'Wellneuro',
    variables: ['lien'],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-10-16',
    // Texte validé avec la proposition de D-292 ; la phrase des 24 heures,
    // choisie par le responsable le 2026-10-16, en est la seule addition.
    valideLe: '2026-10-16',
    hash: '73c6d787a50e9352a83d89444e6e260f0cfa468437000f9a6f7cac4e68cda59d',
  },
  // [[D-292]] §3, conditions v2 (ACT-4, [[D-330]]) : l'annonce d'une NOUVELLE
  // version. Texte validé tel quel par le responsable le 2026-10-20
  // (`docs/claude/propositions/2026-10-20-act4-textes/README.md`, B4) ; ses
  // quatre derniers paragraphes sont ceux de la version 1, au caractère près.
  // Ni nom, ni donnée de santé : « déposer des documents » ne dit rien du
  // dossier. `getGabarit` rend la version la plus haute : elle part dès que
  // les conditions v2 sont en vigueur.
  {
    key: 'conditions_utilisation',
    version: 2,
    titre: "Annonce d'une nouvelle version des conditions d'utilisation aux patients suivis",
    sujet: 'Wellneuro — les conditions d’utilisation de votre espace évoluent',
    corps:
      'Bonjour,\n\n' +
      'Les conditions d’utilisation de votre espace Wellneuro évoluent : vous pouvez ' +
      'désormais y déposer des documents pour votre praticien, et la partie « Vos ' +
      'données personnelles » dit ce qui en est gardé et qui peut les ouvrir. Elle ' +
      'précise aussi que le jour où vous ouvrez pour la première fois un document ' +
      'remis par votre praticien est noté.\n\n' +
      'Rien d’autre ne change dans votre accompagnement.\n\n' +
      'Pour lire cette nouvelle version et la valider, ouvrez ce lien : {{lien}}\n\n' +
      'Ce lien est valable 24 heures et ne s’ouvre qu’une fois. Passé ce délai, ' +
      'connectez-vous à votre espace comme d’habitude : le document vous attend ' +
      'dans « Informations, confidentialité et droits ».\n\n' +
      'Le lien ouvre le texte. Rien n’est validé tant que vous n’avez pas cliqué ' +
      'sur « J’en ai pris connaissance ».\n\n' +
      'Pour toute question, répondez simplement à ce message.\n\n' +
      'Wellneuro',
    variables: ['lien'],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-10-20',
    valideLe: '2026-10-20',
    hash: '1b4a43fae6d9273838713b53583e38f691840006a6f041fe125864a44a92be71',
  },
  // [[D-292]] §5 — conditions v3 : la partie « Vos données personnelles » passe
  // en v20 ([[D-318]], b25 du plan). Même patron que la @2 : une phrase dit ce
  // qui change, puis les paragraphes de la @2 au caractère près. VALIDÉ le jour
  // de sa rédaction, en session, sur le texte exact relu par le responsable.
  {
    key: 'conditions_utilisation',
    version: 3,
    titre: "Annonce d'une nouvelle version des conditions d'utilisation aux patients suivis",
    sujet: 'Wellneuro — les conditions d’utilisation de votre espace évoluent',
    corps:
      'Bonjour,\n\n' +
      'Les conditions d’utilisation de votre espace Wellneuro évoluent : la partie ' +
      '« Vos données personnelles » précise ce qui reste d’un compte rendu d’analyses ' +
      'après sa lecture. Seules les valeurs validées par votre praticien sont gardées, ' +
      'avec la trace de leur lecture.\n\n' +
      'Rien d’autre ne change dans votre accompagnement.\n\n' +
      'Pour lire cette nouvelle version et la valider, ouvrez ce lien : {{lien}}\n\n' +
      'Ce lien est valable 24 heures et ne s’ouvre qu’une fois. Passé ce délai, ' +
      'connectez-vous à votre espace comme d’habitude : le document vous attend ' +
      'dans « Informations, confidentialité et droits ».\n\n' +
      'Le lien ouvre le texte. Rien n’est validé tant que vous n’avez pas cliqué ' +
      'sur « J’en ai pris connaissance ».\n\n' +
      'Pour toute question, répondez simplement à ce message.\n\n' +
      'Wellneuro',
    variables: ['lien'],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-10-24',
    valideLe: '2026-10-24',
    hash: 'c6989d6667b0d0de58349ae58ff5ba2c0e44376de90ab9969e07fba69ebfb60c',
  },
  // [[D-292]] §5 — conditions v4 : la partie « Vos données personnelles » passe
  // en v21 ([[D-364]] §4). Même patron que la @3 : la phrase de tête
  // dit ce qui change, puis les paragraphes de la @3 au caractère près. Elle
  // remplace la @3, jamais partie. VALIDÉ le jour de sa rédaction, en session,
  // sur le texte exact choisi par le responsable (2026-10-27).
  {
    key: 'conditions_utilisation',
    version: 4,
    titre: "Annonce d'une nouvelle version des conditions d'utilisation aux patients suivis",
    sujet: 'Wellneuro — les conditions d’utilisation de votre espace évoluent',
    corps:
      'Bonjour,\n\n' +
      'Les conditions d’utilisation de votre espace Wellneuro évoluent : la partie ' +
      '« Vos données personnelles » dit que votre praticien peut soumettre à ChatGPT ' +
      '(OpenAI) une version de votre dossier qui retire votre nom et vos coordonnées.\n\n' +
      'Rien d’autre ne change dans votre accompagnement.\n\n' +
      'Pour lire cette nouvelle version et la valider, ouvrez ce lien : {{lien}}\n\n' +
      'Ce lien est valable 24 heures et ne s’ouvre qu’une fois. Passé ce délai, ' +
      'connectez-vous à votre espace comme d’habitude : le document vous attend ' +
      'dans « Informations, confidentialité et droits ».\n\n' +
      'Le lien ouvre le texte. Rien n’est validé tant que vous n’avez pas cliqué ' +
      'sur « J’en ai pris connaissance ».\n\n' +
      'Pour toute question, répondez simplement à ce message.\n\n' +
      'Wellneuro',
    variables: ['lien'],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-10-27',
    valideLe: '2026-10-27',
    hash: '48cbce1a194b1d3b82e452a7522713f0b474947b890993031ce315c39164a207',
  },
  // ── PROTOCOLE DIFFUSÉ ───────────────────────────────────────────────────
  // [[D-317]] §3 (PA-2) — part au clic « Valider pour diffusion » qui diffuse
  // une NOUVELLE version, et vaut alors l'annonce des fiches et du courrier
  // remis par le même clic. Rédigé sur le modèle de `document_remis` : sans
  // nom de document, sans contenu clinique, sans pièce jointe ; les deux
  // paragraphes de fin sont les siens au caractère près.
  //
  // LE CHEMIN NOMMÉ EST CELUI DU PORTAIL : le protocole n'est pas une ligne du
  // fil du jour ; il se lit dans le volet repliable « Mon accompagnement » de la
  // page « Mon parcours » (`portail/[token]/questionnaires/page.tsx`).
  //
  // VALIDÉ le jour de sa rédaction, en session, sur le texte exact relu mot
  // pour mot par le responsable (§3). Sans `valideLe`, le drapeau ne l'ouvrirait
  // pas (`protocol/annonceDiffusion.ts`).
  {
    key: 'protocole_diffuse',
    version: 1,
    titre: 'Une nouvelle version du protocole attend le patient dans son espace',
    sujet: 'Votre protocole vous attend',
    corps:
      'Bonjour {{prenom}},\n\n' +
      'Votre protocole vous attend dans votre espace.\n\n' +
      'Votre espace :\n{{connexion}}\n\n' +
      'Une fois connecté : choisissez « Accéder à mon parcours », puis ouvrez ' +
      '« Mon accompagnement », en bas de la page.\n\n' +
      'Vous pouvez taper cette adresse vous-même dans votre navigateur plutôt que de ' +
      'cliquer : elle mène au même endroit. Vous vous y connecterez avec Google, ou ' +
      'en demandant un lien d’accès par e-mail, à l’adresse à laquelle vous recevez ' +
      'ce message.\n\n' +
      'On ne vous demandera jamais de coordonnées bancaires, de numéro de carte ni ' +
      'de mot de passe. Une question, un doute sur un message reçu : écrivez-moi à ' +
      'martialcayre@wellneuro.fr.\n\n' +
      SIGNATURE_PRATICIEN,
    variables: ['prenom', 'connexion'],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-10-17',
    valideLe: '2026-10-17',
    hash: '619bf4277ec37db2ef11d15f9e7344c0f2baeea2145c68fc17272c224d26c780',
  },
  // ── LES QUATRE INVITATIONS SANS DONNÉE DE SANTÉ (2026-10-23) ──────────────
  // Décision du praticien du 2026-10-23 (D/39 du plan) : les v1 nommaient
  // l'instrument, le pack et la liste des titres, et recopiaient la note libre
  // du praticien — l'écart déclaré du registre. Les v2 ne portent plus que
  // l'échéance et l'adresse de l'espace. La note reste lisible dans l'espace :
  // elle s'affiche en tête du questionnaire (`GenericQuestionnaire.tsx`,
  // `PlaintesForm.tsx`). Textes relus et validés par le responsable en session,
  // le jour de leur rédaction. Le pack et la sélection ne renvoient pas au
  // « mot » du praticien : sans note, leurs routes enregistrent une note par
  // défaut que l'espace affiche comme la sienne (revue de #1659).
  {
    key: 'assignation_questionnaire',
    version: 2,
    titre: "Invitation à compléter un questionnaire",
    sujet: 'Questionnaire à compléter avant votre consultation — Wellneuro',
    corps:
      'Bonjour,\n\n' +
      'Votre praticien vous invite à compléter un questionnaire avant votre consultation.{{dateInfo}}\n\n' +
      "Il vous attend dans votre espace patient. Si votre praticien vous a laissé un mot, vous le trouverez en l'ouvrant.\n\n" +
      'Accédez à votre espace patient ici :\n{{portalUrl}}\n\n' +
      "L'équipe Wellneuro",
    variables: ['dateInfo', 'portalUrl'],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-10-23',
    valideLe: '2026-10-23',
    hash: '5060d03bc8ebd79051a24aca2f53cc55afdcbe6016b868c53ec0f5d1943454dd',
  },
  {
    key: 'assignation_pack',
    version: 2,
    titre: "Invitation à compléter les questionnaires d'un pack",
    sujet: 'Questionnaires à compléter avant votre consultation — Wellneuro',
    corps:
      'Bonjour,\n\n' +
      'Votre praticien vous invite à compléter plusieurs questionnaires avant votre consultation.{{dateInfo}}\n\n' +
      "Un seul lien suffit : après confirmation de votre email, vous pourrez accéder à tous les questionnaires en attente et les remplir dans l'ordre de votre choix.\n\n" +
      'Accéder à vos questionnaires :\n{{portalUrl}}\n\n' +
      "L'équipe Wellneuro",
    variables: ['dateInfo', 'portalUrl'],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-10-23',
    valideLe: '2026-10-23',
    hash: 'a4986a4e76b9c1d7014798c23cf2a584051e9201f6137d9868fac7bbabcf8f9e',
  },
  {
    key: 'file_envoi',
    version: 2,
    titre: "Invitation à compléter une sélection de questionnaires",
    sujet: 'Questionnaires à compléter avant votre consultation — Wellneuro',
    corps:
      'Bonjour,\n\n' +
      'Votre praticien vous invite à compléter des questionnaires.{{dateInfo}}\n\n' +
      "Un seul lien suffit : après confirmation de votre email, vous pourrez accéder à tous les questionnaires en attente et les remplir dans l'ordre de votre choix.\n\n" +
      'Accéder à vos questionnaires :\n{{portalUrl}}\n\n' +
      "L'équipe Wellneuro",
    variables: ['dateInfo', 'portalUrl'],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-10-23',
    valideLe: '2026-10-23',
    hash: '613dbe22fe8930a1eceb83aeea0efeb81e7c87837aa90fe735fee783bc6897f1',
  },
  {
    key: 'accuse_reception',
    version: 2,
    titre: "Accusé de réception d'un questionnaire",
    sujet: 'Vos réponses ont bien été reçues — Wellneuro',
    corps:
      'Bonjour,\n\n' +
      'Nous confirmons la bonne réception de vos réponses.\n\n' +
      'Votre praticien Wellneuro en prendra connaissance prochainement.\n\n' +
      "L'équipe Wellneuro",
    variables: [],
    donneesSante: { statut: 'conforme' },
    redigeLe: '2026-10-23',
    valideLe: '2026-10-23',
    hash: '3a18f994746053008a87d0ceddfb782733156f833fc6a5608009312778d9a2b4',
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
