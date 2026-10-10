import { assemblerDocument } from '@/lib/documents/document';
import { blocsPourDestinataire, contenuPourDestinataire } from '@/lib/documents/bloc';
import { MODELE_COURRIER_ADRESSAGE } from '@/lib/documents/modele';
import { renderDocumentHtml } from '@/lib/documents/rendu';
import type { Bloc, DocumentComposite } from '@/lib/documents/types';
import { SIGNATURE_PRATICIEN } from '@/lib/correspondance/signature';
import { sha256 } from './corpusSyntheseV1';
import { SAFETY_SIGNALS_SHA256, SAFETY_SIGNAL_CONDUITES, rangDuSignal } from './safetySignalsV1';
import { SAFETY_QUESTIONNAIRE_SHA256 } from './safetyQuestionnaireV1';
import { reponsesSecuriteAdressees, type ReponseSecurite } from '@/lib/clinical-engine/safetyFindings';

// Lettre d'adressage — la SEULE raison cliniquement obligatoire d'écrire à un
// médecin, et elle n'avait aucun chemin ([[D-099]], cadrage du 2026-09-16).
//
// LE FAIT QUI FONDE CE MODULE. Un signal d'alerte de rang `adressage` INHIBE la
// chaîne C1 : `evaluerAbstention` passe en `required`, la table des priorités se
// tait, aucun protocole n'est diffusable. Le texte de conduite signé dit
// « avis médical à évaluer en priorité » — et jusqu'ici aucune surface n'offrait
// le geste, rien ne consignait qu'il avait eu lieu. Le blocage était écrit, la
// sortie ne l'était pas.
//
// UN SEUL CHEMIN DE RENDU, comme le courrier biologie : `renderDocumentHtml(…,
// 'medecin')`, donc sous `assertRenduMedecinNonPrescriptif`. Jamais de second
// gabarit. Un courrier qui ne se rend pas ne se consigne pas.
//
// RIEN N'EST RECALCULÉ, TOUT EST RECOPIÉ. Ce module ne cote aucun signal, n'en
// invente aucun, ne lit aucun score et ne touche pas la table signée : il
// recopie les libellés que le PATIENT a déclarés et le texte de conduite du
// rang, tels qu'ils sont écrits dans `safetySignalsV1`. Le garde clinique
// interdit le câblage d'une signature, pas la recopie d'un texte signé
// (`DC-01`, `DC-19`).
//
// REMISE MANUELLE : aucun envoi, aucune messagerie de santé, aucune pièce
// jointe ([[D-122]]). Le praticien imprime ou transcrit, et la consignation
// passe par `preparerCorrespondance`, chokepoint de `CorrespondanceMedecin`.

/**
 * L'estampille de version portée par la lettre. LITTÉRAL, et non
 * `SAFETY_SIGNALS_METADATA.version` : [[D-079]] pose que LE SHA FAIT FOI, et
 * que l'estampille ne dérive d'aucune métadonnée — une re-signature sans
 * changement de contenu ne périme aucune lettre. Le patron est celui du
 * courrier biologie, repris au caractère près.
 *
 * `lib/praticien/ancrageCorrespondance` connaît ce littéral et le mappe sur le
 * SHA VIVANT de la table. Sans cette ligne-là, chaque lettre d'adressage se
 * lirait `reference_inconnue` dans le fil.
 */
export const VERSION_ANCRAGE_ADRESSAGE = 'safety-signals-nnpp2-v1';

/**
 * L'estampille d'une lettre qui cite AU MOINS UNE réponse de questionnaire
 * ([[D-275]] §2). Une lettre sans réponse de questionnaire garde la version
 * d'avant, au caractère près : les lettres déjà consignées ne changent pas de
 * verdict, et la lettre d'anamnèse seule ne change pas de texte.
 *
 * PRÉFIXE `safety-signals-` CONSERVÉ : le trigger d'`adressages_signal_alerte`
 * et `couverturesRetenues` l'exigent — une autre version serait écartée en
 * silence, et le constat ne se lèverait jamais.
 */
export const VERSION_ANCRAGE_ADRESSAGE_QUESTIONNAIRE = 'safety-signals-questionnaire-v1';

/**
 * Le SHA VIVANT d'une lettre qui cite une réponse de questionnaire : celui des
 * DEUX tables qu'elle recopie. Que l'une bouge, et la lettre se lit périmée.
 */
export const SHA_ANCRAGE_ADRESSAGE_QUESTIONNAIRE = sha256(
  JSON.stringify({ anamnese: SAFETY_SIGNALS_SHA256, questionnaire: SAFETY_QUESTIONNAIRE_SHA256 }),
);

export type EntreeCourrierAdressage = {
  patientId: string;
  /**
   * Les signaux DÉCLARÉS par le patient, tels que `signauxDeclares` les rend —
   * bruts, dédupliqués, triés. Le module les filtre par rang ; il n'en dérive
   * rien d'autre.
   */
  signaux: string[];
  /**
   * Les réponses aux questions sur le suicide ([[D-275]] §2), telles que
   * `reponsesSecuriteDeclarees` les rend. Le module retient celles que le
   * producteur retient (`reponsesSecuriteAdressees`) ; il n'en dérive rien.
   * L'appelant passe `[]` quand `SAF-QUEST-01` n'est pas signée : la lettre
   * ne doit pas citer ce que le moteur ne bloque pas.
   */
  reponses: ReponseSecurite[];
  /** SHA VIVANT de la table de sécurité au moment du rendu (provenance). */
  tableSha256: string;
  /** ISO 8601 — date du courrier, posée par l'appelant (jamais l'horloge ici). */
  dateCourrier: string;
  /**
   * Nom lisible du patient, porté par l'en-tête du RENDU seulement — jamais
   * dans le texte consigné. Une lettre d'adressage sans nom de patient n'est
   * pas exploitable par son destinataire.
   */
  patientNom?: string;
};

export type RefusCourrierAdressage =
  /** Aucun signal ni aucune réponse n'appelle un adressage : il n'y a pas de lettre à écrire. */
  | 'aucun_signal_adressage'
  /** La garde non prescriptive a levé au rendu. */
  | 'terme_prescriptif'
  /** Le rendu médecin ne porte pas le texte à consigner : rien ne part. */
  | 'bloc_non_diffuse';

export type CourrierAdressage = {
  document: DocumentComposite;
  /** Rendu HTML destinataire médecin, passé par la garde non prescriptive. */
  html: string;
  /** Texte brut à consigner dans `CorrespondanceMedecin` (même contenu). */
  texte: string;
};

export type PreparationCourrierAdressage =
  | { ok: true; courrier: CourrierAdressage }
  | { ok: false; raison: RefusCourrierAdressage };

/**
 * Les signaux qui appellent un adressage — MÊME RÈGLE que le producteur de
 * constats (`construireSafetyFindings`), et ce n'est pas une coïncidence : la
 * lettre doit porter exactement ce qui suspend la décision, ni plus ni moins.
 *
 * Trois cas, et le troisième est le seul qui surprenne :
 *   1. rang `adressage` ⇒ retenu ;
 *   2. rang `vigilance` ⇒ écarté — le praticien le porte dans la consultation
 *      en cours, il ne suspend rien ([[D-099]]) ;
 *   3. libellé INCONNU de la cotation ⇒ retenu (fail-closed). Un signal dont on
 *      ne sait pas le rang est un silence sur le rang, jamais une permission
 *      (`DC-13`, `DC-24`) — et la lettre le DIT, au lieu de le faire passer
 *      pour coté.
 */
function signauxAdresses(signaux: string[]): { libelle: string; cote: boolean }[] {
  return signaux
    .map(libelle => ({ libelle, rang: rangDuSignal(libelle) }))
    .filter(entree => entree.rang !== 'vigilance')
    .map(entree => ({ libelle: entree.libelle, cote: entree.rang === 'adressage' }));
}

const PHRASE_DECLARE =
  'Ces éléments sont DÉCLARÉS par le patient lors de son anamnèse. Ils ne '
  + 'proviennent d’aucune passation de questionnaire, n’ont fait l’objet '
  + 'd’aucun examen de ma part, et ne constituent ni un diagnostic ni une '
  + 'hypothèse diagnostique.';

const PHRASE_HORS_COTATION =
  'Un ou plusieurs des libellés ci-dessus (†) n’appartiennent pas à la liste '
  + 'de signaux relue et signée par le cabinet : faute de rang connu, ils sont '
  + 'traités comme un adressage plutôt qu’ignorés.';

// [[D-275]] §2 — textes des lettres qui citent une réponse de questionnaire.
// Une lettre d'anamnèse seule n'en porte aucun : son texte est inchangé.
const PHRASE_DECLARE_QUESTIONNAIRE =
  'Ces réponses proviennent de questionnaires que le patient a remplis lui-même. '
  + 'Elles n’ont fait l’objet d’aucun examen de ma part, et ne constituent ni un '
  + 'diagnostic ni une hypothèse diagnostique.';

const PHRASE_DECLARE_MIXTE =
  'Les signaux d’alerte ci-dessus sont DÉCLARÉS par le patient lors de son '
  + 'anamnèse ; les réponses citées proviennent de questionnaires qu’il a remplis '
  + 'lui-même. Aucun de ces éléments n’a fait l’objet d’un examen de ma part, et '
  + 'ils ne constituent ni un diagnostic ni une hypothèse diagnostique.';

const PHRASE_HORS_OPTIONS =
  'Pour une ou plusieurs des réponses ci-dessus (‡), la valeur enregistrée ne '
  + 'correspond à aucune option de la question : faute de savoir ce qu’elle dit, '
  + 'elle est traitée comme un adressage plutôt qu’ignorée.';

const PHRASE_ABSTENTION =
  'Dans l’attente de votre appréciation, je n’ai formulé aucune proposition '
  + 'de priorité ni d’accompagnement pour ce dossier.';

/**
 * Génère la lettre d'adressage depuis les signaux déclarés. Le rendu HTML est
 * produit ICI, pour que la garde non prescriptive ait jugé le contenu avant
 * toute consignation : un courrier qui ne se rend pas ne se consigne pas.
 */
export function genererCourrierAdressage(
  entree: EntreeCourrierAdressage,
): PreparationCourrierAdressage {
  const retenus = signauxAdresses(entree.signaux);
  const reponses = reponsesSecuriteAdressees(entree.reponses);
  if (retenus.length === 0 && reponses.length === 0) {
    return { ok: false, raison: 'aucun_signal_adressage' };
  }

  const dateLisible = entree.dateCourrier.slice(0, 10);
  const horsCotation = retenus.some(signal => !signal.cote);
  const horsOptions = reponses.some(reponse => reponse.lecture.kind === 'hors_options');
  const avecQuestionnaire = reponses.length > 0;
  // La source, dite au médecin : anamnèse seule (texte d'avant [[D-275]] §2,
  // au caractère près), questionnaires seuls, ou les deux.
  const origine = !avecQuestionnaire
    ? 'son anamnèse porte un ou plusieurs signaux d’alerte'
    : retenus.length === 0
      ? 'ses réponses à un ou plusieurs questionnaires portent un ou plusieurs signaux d’alerte'
      : 'son anamnèse et ses réponses à un ou plusieurs questionnaires portent des signaux d’alerte';
  const paragraphes = [
    'Docteur,',
    'Dans le cadre d’un accompagnement en neuronutrition, je vous adresse ce '
    + `patient : ${origine} pour `
    + 'lesquels un avis médical me paraît devoir précéder toute proposition de '
    + 'ma part. L’appréciation de ces éléments, comme la conduite à tenir, vous '
    + 'appartiennent pleinement.',
    ...(retenus.length > 0
      ? ['Signaux déclarés par le patient :\n'
        + retenus
          .map(signal => `— « ${signal.libelle} »${signal.cote ? '' : ' (†)'}`)
          .join('\n')]
      : []),
    ...(avecQuestionnaire
      ? ['Réponses du patient à la question sur les idées de mort ou de suicide :\n'
        + reponses
          .map(reponse => `— ${reponse.instrument}, passation du ${reponse.date} : ${
            reponse.lecture.kind === 'option'
              ? `« ${reponse.lecture.libelle} »`
              : 'valeur hors des options de la question (‡)'
          }`)
          .join('\n')]
      : []),
    // RECOPIÉ, jamais reformulé : ce texte est celui du rang `adressage` de la
    // table signée. Le réécrire en ferait un contenu clinique sans provenance.
    SAFETY_SIGNAL_CONDUITES.adressage,
    !avecQuestionnaire ? PHRASE_DECLARE : retenus.length === 0 ? PHRASE_DECLARE_QUESTIONNAIRE : PHRASE_DECLARE_MIXTE,
    ...(horsCotation ? [PHRASE_HORS_COTATION] : []),
    ...(horsOptions ? [PHRASE_HORS_OPTIONS] : []),
    PHRASE_ABSTENTION,
    `Avec mes remerciements pour votre lecture. Courrier préparé le ${dateLisible}.`,
    SIGNATURE_PRATICIEN,
  ];
  const texte = paragraphes.join('\n\n');

  const bloc: Bloc = {
    id: `courrier-adressage-${entree.patientId}-${dateLisible}`,
    type: 'narratif',
    regime: 'statique_valide',
    provenance: avecQuestionnaire
      ? {
        source: 'signaux_securite_questionnaires',
        ancrageHash: SHA_ANCRAGE_ADRESSAGE_QUESTIONNAIRE,
        version: VERSION_ANCRAGE_ADRESSAGE_QUESTIONNAIRE,
      }
      : {
        source: 'signaux_securite_anamnese',
        ancrageHash: entree.tableSha256,
        version: VERSION_ANCRAGE_ADRESSAGE,
      },
    contenu: {
      praticien: texte,
      medecin: texte,
    },
  };

  const document = assemblerDocument({
    modele: MODELE_COURRIER_ADRESSAGE,
    patientId: entree.patientId,
    blocs: [bloc],
  });

  let html: string;
  try {
    html = renderDocumentHtml(document, 'medecin', {
      dateDocument: dateLisible,
      patientNom: entree.patientNom,
    });
  } catch {
    // La garde du chokepoint a levé : un libellé de signal porte un terme
    // prescriptif. Refus explicite plutôt qu'un rendu contourné.
    return { ok: false, raison: 'terme_prescriptif' };
  }

  // LE TEXTE CONSIGNÉ EST LA SORTIE DU RENDU, PAS SON ENTRÉE (patron du
  // courrier biologie, revue M1). `renderDocumentHtml` juge ce que
  // `blocsPourDestinataire` laisse passer — garde de régime comprise. Sans
  // cette vérification, un bloc devenu non diffusable ferait passer la garde À
  // VIDE, et la route consignerait un texte que personne n'a jugé.
  const diffuses = blocsPourDestinataire(document.blocs, 'medecin');
  const texteJuge = diffuses.length === 1 ? contenuPourDestinataire(diffuses[0], 'medecin') : null;
  if (texteJuge !== texte) {
    return { ok: false, raison: 'bloc_non_diffuse' };
  }

  return { ok: true, courrier: { document, html, texte } };
}

/**
 * LA LETTRE REMISE, RENDUE POUR L'IMPRESSION ([[D-262]], LOT-03b ; cadrage
 * §3.2). Le texte FIGÉ de la remise passe par le MÊME chokepoint que la lettre
 * générée — `renderDocumentHtml(…, 'medecin')` : en-tête, nom du patient, date,
 * cadre interprofessionnel, garde non prescriptive. Le médecin reçoit la même
 * feuille, que le patient l'imprime ou que le praticien la lui remette.
 *
 * AUCUNE RÉGÉNÉRATION : le corps est l'instantané de la remise, jamais une
 * relecture des signaux. La provenance recopie celle de la lettre consignée.
 * La garde du chokepoint lève sur un terme prescriptif : `null`, l'appelant le
 * dit sans servir de rendu contourné.
 */
export function rendreCourrierAdressageFige(entree: {
  patientId: string;
  texte: string;
  dateCourrier: string;
  patientNom?: string;
  ancrageSha256: string | null;
  ancrageVersion: string | null;
}): string | null {
  // Aucune provenance fabriquée (revue du LOT-03b) : une lettre sans ancrage
  // n'est pas une lettre d'adressage, et la remise l'a déjà refusée.
  if (!entree.ancrageSha256 || !entree.ancrageVersion) return null;
  // Le JOUR UTC, comme `genererCourrierAdressage` : l'en-tête imprimé doit dire
  // le jour que le corps écrit (« Courrier préparé le … »), au caractère près.
  const dateLisible = entree.dateCourrier.slice(0, 10);
  const bloc: Bloc = {
    id: `courrier-adressage-${entree.patientId}-${dateLisible}`,
    type: 'narratif',
    regime: 'statique_valide',
    provenance: {
      // La source se lit sur la version que la lettre a consignée.
      source: entree.ancrageVersion === VERSION_ANCRAGE_ADRESSAGE_QUESTIONNAIRE
        ? 'signaux_securite_questionnaires'
        : 'signaux_securite_anamnese',
      ancrageHash: entree.ancrageSha256,
      version: entree.ancrageVersion,
    },
    contenu: { praticien: entree.texte, medecin: entree.texte },
  };
  const document = assemblerDocument({ modele: MODELE_COURRIER_ADRESSAGE, patientId: entree.patientId, blocs: [bloc] });
  try {
    return renderDocumentHtml(document, 'medecin', { dateDocument: dateLisible, patientNom: entree.patientNom });
  } catch {
    return null;
  }
}
