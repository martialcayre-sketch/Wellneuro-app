import type { TrustDocumentKey, VersionDocumentTrust } from '../types';

/**
 * TRUST V1 — registre des documents d'information normatifs (LOT-01).
 *
 * La version canonique est HTML rendue depuis ces données (le PDF n'est
 * qu'un export). Une version publiée est IMMUABLE : toute évolution du texte
 * = nouvel objet version ajouté au registre (les anciennes versions restent
 * consultables — carte « Historique des versions »). Le hash de chaque
 * version est verrouillé par test (registre.test.ts) : modifier un texte
 * sans créer de version casse la CI.
 *
 * Textes v1 issus du cadrage (PARCOURS_PATIENT_ET_CONTENUS.md), validés par
 * le responsable du traitement le 2026-07-16 (GATES_GO_NO_GO.md, G-TRUST-03) ;
 * la revue juridique externe est consignée en dette.
 *
 * Données pures, client-safe : aucun import serveur ici.
 */

const CADRE_ACCOMPAGNEMENT_V1: VersionDocumentTrust = {
  key: 'cadre_accompagnement',
  type: 'care_framework',
  version: 'v1',
  titre: 'Le cadre de votre accompagnement',
  resume:
    'Ce que Wellneuro vous permet de faire, le rôle de chacun, et ce que cet espace n’est pas.',
  sections: [
    {
      titre: 'À quoi sert cet espace',
      paragraphes: [
        'Wellneuro est un espace sécurisé de préparation et de suivi de votre accompagnement en neuronutrition.',
        'Il vous permet de transmettre les informations utiles, de compléter vos questionnaires, de consulter les documents validés par votre praticien et de suivre les étapes de votre accompagnement.',
      ],
      points: [
        'Vos réponses servent à préparer un accompagnement personnalisé.',
        'Vous retrouvez ici les informations et documents qui vous concernent.',
        'Vous restez libre de poser des questions et de demander une correction.',
      ],
    },
    {
      titre: 'Le rôle de chacun',
      paragraphes: [
        'Votre praticien prépare, relit et valide les contenus qui vous sont destinés. Rien de ce qui vous est adressé n’est publié sans sa validation.',
        'Votre médecin traitant reste votre référent médical : les explorations, traitements et décisions médicales se discutent avec lui.',
        'Vous êtes acteur de votre accompagnement : vos réponses, vos questions et vos retours en font partie.',
      ],
    },
    {
      titre: 'Ce que cet espace n’est pas',
      paragraphes: [
        'Les questionnaires, scores et profils sont des outils d’orientation. Ils ne suffisent pas à établir une conclusion médicale et ne remplacent pas l’avis de votre médecin.',
        'Wellneuro n’est ni un service d’urgence, ni un dispositif de surveillance continue.',
      ],
    },
  ],
  changeLevel: 'information_substantielle',
  changeSummary: 'Première version publiée.',
  publieLe: '2026-07-16',
  requiresAcknowledgement: true,
  hash: 'cd64f000fcd2b77b8e7b008a980c0d4b22d8a05942f6c7087aa6f78355166695',
};

const LIMITES_SECURITE_V1: VersionDocumentTrust = {
  key: 'limites_securite',
  type: 'medical_safety',
  version: 'v1',
  titre: 'Limites et sécurité médicale',
  resume:
    'Wellneuro ne remplace ni une consultation, ni les urgences. Vos messages ne sont pas lus en continu.',
  sections: [
    {
      titre: 'L’essentiel',
      paragraphes: [
        'Wellneuro est un outil d’accompagnement. Il ne remplace pas une consultation médicale, les services d’urgence ou le suivi de vos traitements.',
        'Vos réponses ne sont pas lues en continu. Une information transmise dans cet espace ne garantit pas une réponse immédiate.',
      ],
      points: [
        'Ne modifiez pas un traitement prescrit sans l’accord du prescripteur.',
        'Signalez vos traitements, allergies, grossesse éventuelle et changements importants.',
        'En cas de symptôme aigu ou inquiétant, utilisez les services médicaux habituels ou les numéros d’urgence.',
      ],
    },
    {
      titre: 'En cas d’urgence',
      paragraphes: [
        'Si vous ressentez des symptômes graves ou inquiétants, n’attendez pas une réponse dans cet espace : contactez directement les services d’urgence.',
      ],
      points: [
        '15 — SAMU, urgence médicale',
        '112 — numéro d’urgence européen',
        '114 — urgence par SMS ou application (personnes sourdes, malentendantes, sourdaveugles ou aphasiques)',
        '3114 — numéro national de prévention du suicide',
      ],
    },
  ],
  changeLevel: 'information_substantielle',
  changeSummary: 'Première version publiée.',
  publieLe: '2026-07-16',
  requiresAcknowledgement: true,
  hash: 'a3a50f21cd4ac3a595a93943d238f2d7a5e9de1c4f5088428249c942c8acfa1a',
};

const DONNEES_CONFIDENTIALITE_V1: VersionDocumentTrust = {
  key: 'donnees_confidentialite',
  type: 'privacy',
  version: 'v1',
  titre: 'Vos données personnelles et leur confidentialité',
  resume:
    'Quelles données sont recueillies, pourquoi, qui peut y accéder, et comment exercer vos droits.',
  sections: [
    {
      titre: 'Qui est responsable ?',
      paragraphes: [
        'Votre praticien Wellneuro est responsable du traitement de vos données dans le cadre de votre accompagnement. Vous pouvez le contacter pour toute question à l’adresse indiquée dans « Exercer mes droits ».',
      ],
    },
    {
      titre: 'Quelles données sont recueillies ?',
      paragraphes: [
        'Les informations que vous transmettez : votre fiche de renseignements, vos réponses aux questionnaires, les éléments de votre situation que vous décrivez, vos signalements et vos choix.',
        'Nous recueillons uniquement les informations nécessaires à votre accompagnement et à son suivi.',
      ],
    },
    {
      titre: 'Pourquoi ?',
      paragraphes: [
        'Pour préparer et suivre votre accompagnement en neuronutrition : comprendre votre situation, préparer les consultations, suivre l’évolution, et vous remettre des documents validés par votre praticien.',
        'Cet accompagnement relève du bien-être et du suivi ; il n’établit pas de diagnostic médical.',
      ],
    },
    {
      titre: 'Ce qui est obligatoire et ce qui est facultatif',
      paragraphes: [
        'Répondre aux questionnaires proposés est nécessaire au travail de préparation de votre praticien, mais chaque envoi reste un geste explicite de votre part : rien n’est transmis tant que vous n’avez pas choisi « Transmettre ».',
        'Les choix listés dans « Mes choix et autorisations » sont réellement facultatifs : les refuser ne bloque jamais votre accompagnement.',
      ],
    },
    {
      titre: 'Qui peut accéder à vos données ?',
      paragraphes: [
        'Votre praticien, dans le cadre de votre accompagnement. Personne d’autre n’y accède au sein de Wellneuro.',
        'Aucun partage avec un tiers (par exemple votre médecin traitant) n’a lieu sans un choix explicite de votre part.',
      ],
    },
    {
      titre: 'Quels prestataires techniques interviennent ?',
      paragraphes: [
        'Des prestataires hébergent et font fonctionner l’application. Ils n’utilisent pas vos données pour leur propre compte :',
      ],
      points: [
        'Vercel — hébergement de l’application',
        'Supabase — hébergement de la base de données',
        'Anthropic — assistance d’intelligence artificielle pour la préparation des synthèses (voir « L’intelligence artificielle dans Wellneuro »)',
        'Un fournisseur d’envoi d’emails — acheminement des emails Wellneuro',
        'Google — connexion sécurisée du praticien uniquement (jamais des patients)',
      ],
    },
    {
      titre: 'Combien de temps sont-elles conservées ?',
      paragraphes: [
        'La politique détaillée de durées de conservation est en cours de formalisation. Vos données sont conservées le temps de votre accompagnement ; vous pouvez à tout moment demander des précisions ou l’exercice de vos droits.',
      ],
    },
    {
      titre: 'Exercer mes droits',
      paragraphes: [
        'Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, la limitation ou l’opposition à leur traitement, ainsi que le retrait d’une autorisation.',
        'Le plus simple : la carte « Signaler un problème » de cet espace, choix « Je souhaite exercer un droit ». Vous pouvez aussi écrire à martialcayre@wellneuro.fr.',
        'Certains droits dépendent du cadre applicable au traitement concerné : votre demande recevra une réponse expliquant ce qui est possible et pourquoi.',
      ],
    },
    {
      titre: 'Signaler un incident de confidentialité',
      paragraphes: [
        'Connexion que vous ne reconnaissez pas, document qui ne vous concerne pas, appareil perdu : signalez-le depuis la carte « Signaler un problème ». Chaque signalement est enregistré et examiné.',
      ],
    },
  ],
  changeLevel: 'information_substantielle',
  changeSummary: 'Première version publiée.',
  publieLe: '2026-07-16',
  requiresAcknowledgement: false,
  hash: 'b4a5551b20f985c2a9d4e7f9a61b10b6eb864a6f8e466874b3510c0ca04fd6ed',
};

const USAGE_IA_V1: VersionDocumentTrust = {
  key: 'usage_ia',
  type: 'ai_transparency',
  version: 'v1',
  titre: 'L’intelligence artificielle dans Wellneuro',
  resume:
    'Où l’IA intervient, ce qu’elle fait, ce qu’elle ne fait jamais, et comment contester un contenu.',
  sections: [
    {
      titre: 'L’essentiel',
      paragraphes: [
        'Certaines tâches peuvent être préparées avec une assistance d’intelligence artificielle. L’outil peut aider à organiser ou reformuler des informations, mais il ne publie jamais seul une décision ou une recommandation qui vous est destinée.',
        'Toute synthèse qui vous est adressée est relue et validée par votre praticien avant envoi. Sans cette validation, rien ne part.',
      ],
    },
    {
      titre: 'Le seul usage actuel',
      paragraphes: [
        'Aujourd’hui, l’IA intervient à un seul endroit : la préparation du brouillon de la synthèse de votre bilan, à partir de vos réponses aux questionnaires et des éléments transmis à votre praticien.',
        'Le fournisseur est Anthropic. Le modèle utilisé et la version du procédé sont enregistrés à chaque préparation, ce qui permet de retracer l’origine de chaque synthèse.',
      ],
    },
    {
      titre: 'Ce que l’IA ne fait jamais ici',
      paragraphes: [],
      points: [
        'Publier un contenu sans validation de votre praticien.',
        'Prendre une décision concernant votre accompagnement.',
        'Établir une conclusion médicale — un score ou une hypothèse n’est jamais une certitude.',
        'Surveiller vos messages ou vos réponses en continu.',
      ],
    },
    {
      titre: 'Contester ou faire corriger',
      paragraphes: [
        'Si une information d’un document reçu vous semble incorrecte, utilisez la carte « Signaler un problème », choix « Une information est incorrecte ». Votre praticien examinera la demande et pourra corriger le document.',
      ],
    },
  ],
  changeLevel: 'information_substantielle',
  changeSummary: 'Première version publiée.',
  publieLe: '2026-07-16',
  requiresAcknowledgement: false,
  hash: 'd57fdfcfd7367559c49f3cafd3668126cf063798897d2f5c29b8426dc0d2ea7d',
};

const DROITS_PATIENT_V1: VersionDocumentTrust = {
  key: 'droits_patient',
  type: 'patient_rights',
  version: 'v1',
  titre: 'Vos droits et vos choix',
  resume:
    'Prendre connaissance n’est pas autoriser : vos choix facultatifs se donnent, se consultent et se retirent librement.',
  sections: [
    {
      titre: 'Deux choses distinctes',
      paragraphes: [
        '« J’ai pris connaissance » signifie que l’information vous a été présentée et que vous l’avez lue. Ce n’est pas une autorisation.',
        '« J’autorise » est un choix facultatif, jamais précoché, que vous pouvez retirer aussi simplement que vous l’avez donné.',
      ],
    },
    {
      titre: 'Vos choix facultatifs',
      paragraphes: [
        'La carte « Mes choix et autorisations » liste chaque choix avec sa finalité, les données concernées, le destinataire et l’effet d’un refus. Refuser un choix facultatif ne bloque jamais votre accompagnement.',
        'Chaque accord et chaque retrait est enregistré avec sa date et la version du texte présenté : votre historique reste consultable et n’est jamais effacé.',
      ],
    },
    {
      titre: 'Le retrait',
      paragraphes: [
        'Le retrait s’applique aux utilisations futures. Les traitements déjà réalisés et les obligations de conservation peuvent rester soumis au cadre applicable.',
      ],
    },
    {
      titre: 'Exercer un droit ou signaler un problème',
      paragraphes: [
        'La carte « Signaler un problème » vous permet d’exercer un droit sur vos données, de signaler un incident de confidentialité ou un produit qui vous semble mal toléré. Chaque demande est enregistrée, datée et suivie.',
      ],
    },
  ],
  changeLevel: 'information_substantielle',
  changeSummary: 'Première version publiée.',
  publieLe: '2026-07-16',
  requiresAcknowledgement: false,
  hash: '84057933a33a5f8b0f80b5b8fee6a4ac04553e0ae77790df86f2566acf117499',
};

const CONSENTEMENT_SUIVI_V2: VersionDocumentTrust = {
  key: 'consentement_suivi',
  type: 'care_framework',
  version: 'v2',
  titre: 'Consentement au suivi Wellneuro',
  resume:
    'Le texte présenté au moment de votre consentement au suivi — version de référence.',
  sections: [
    {
      titre: 'Ce à quoi vous consentez',
      paragraphes: [
        'Vous consentez au recueil et à l’utilisation de vos réponses et des informations que vous transmettez, dans un seul but : l’accompagnement bien-être et le suivi en neuronutrition personnalisé préparé par votre praticien (hors diagnostic médical).',
        'Vos données sont réservées à votre praticien et aux prestataires techniques qui font fonctionner l’application. Elles ne sont ni vendues, ni partagées avec un tiers sans un choix explicite de votre part.',
      ],
      points: [
        'Vous pouvez demander à tout moment la modification ou la suppression de vos données auprès de votre praticien.',
        'Vous pouvez retirer votre consentement pour l’avenir — votre accompagnement s’interrompra alors dans cet espace.',
        'Le détail complet est disponible dans « Informations, confidentialité et droits », accessible depuis toutes les pages.',
      ],
    },
  ],
  changeLevel: 'clarification',
  changeSummary:
    'v2 : texte unifié et versionné (remplace les deux textes divergents codés en dur — les consentements v1 déjà recueillis restent valides, le fond est inchangé).',
  publieLe: '2026-07-16',
  requiresAcknowledgement: false,
  hash: 'b1e4a215ec692632354ad2563467b1d7228c5c05ea67c0468f4778b24960b414',
};

/** Toutes les versions, les plus récentes en premier par clé. */
export const REGISTRE_DOCUMENTS_TRUST: readonly VersionDocumentTrust[] = Object.freeze([
  CADRE_ACCOMPAGNEMENT_V1,
  LIMITES_SECURITE_V1,
  DONNEES_CONFIDENTIALITE_V1,
  USAGE_IA_V1,
  DROITS_PATIENT_V1,
  CONSENTEMENT_SUIVI_V2,
]);

export function getDocumentCourant(key: TrustDocumentKey): VersionDocumentTrust {
  const versions = REGISTRE_DOCUMENTS_TRUST.filter(d => d.key === key);
  if (versions.length === 0) throw new Error(`Document TRUST inconnu : ${key}`);
  return versions.reduce((a, b) => (a.publieLe >= b.publieLe ? a : b));
}

export function getVersion(key: TrustDocumentKey, version: string): VersionDocumentTrust | null {
  return REGISTRE_DOCUMENTS_TRUST.find(d => d.key === key && d.version === version) ?? null;
}

/** Version du consentement à estampiller en base (remplace la constante 'v1'
 * historique de lib/consultation/portail.ts au LOT-02). */
export const VERSION_CONSENTEMENT_COURANTE = getDocumentCourant('consentement_suivi').version;
