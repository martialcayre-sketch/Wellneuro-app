import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';
import { LONGUEUR_MAX_SYNTHESE } from '@/lib/praticien/syntheseComprehension';
import type { MatiereComprehension } from '@/lib/objectif/matiereComprehension';

// L'APPEL QUI PROPOSE UN RÉSUMÉ GLOBAL — arbitrage du 2026-09-11.
//
// CE QU'IL FAIT, ET LE MOT COMPTE : IL RELIE. Il ne reformule pas. Le
// responsable a tranché « appel borné à lier, un résumé hiérarchisé du matériel
// à disposition », précisément pour éviter « le risque d'une reformulation qui
// s'éloignerait des synthèses établies ». Ce module reçoit des textes DÉJÀ
// validés par un praticien et n'a le droit que de les articuler.
//
// LA HIÉRARCHIE NE VIENT PAS DE LUI. C'est le point le plus délicat de cet
// appel, et celui qui l'empêche de tomber sous `DC-19`/`DC-20` : l'ordre des
// axes lui est DONNÉ, repris de celui qu'un praticien a validé en validant la
// synthèse. Une consigne qui lui demanderait de classer par importance poserait
// un rang sans provenance. Elle lui demande l'inverse : suivre.
//
// CE MODULE NE DÉCIDE RIEN, ET C'EST CE QUI SATISFAIT `D-003`. Il propose ; la
// proposition n'est jamais publiée telle quelle — le verrou de publication
// refuse un texte identique au tirage. Le praticien la réécrit, ou il n'y a
// pas de publication.
//
// IL VIT HORS DU MOTEUR DE PROPOSITION (`D-094` §4, `D-167` §5), comme son
// voisin `propositionPriorite.ts` : ni `assemblerPropositions`, ni
// `hashSources`, ni `fragments`.

/**
 * La version de la consigne, écrite en base à chaque proposition.
 *
 * ELLE PORTE UNE PROMESSE FAITE AU PATIENT. La v2 de « L'intelligence
 * artificielle dans Wellneuro » lui dit : « Le modèle utilisé et la version du
 * procédé sont enregistrés à chaque fois, ce qui permet de retracer l'origine de
 * chaque texte. » Un bump se fait ICI, avec sa raison en commentaire — jamais en
 * changeant la consigne sans changer le numéro, ce qui rendrait deux textes
 * différents indiscernables en relecture.
 *
 * v1 (2026-09-11) : première consigne.
 */
export const VERSION_CONSIGNE = 'comprehension-v1';

/**
 * La borne. Elle n'est PAS redéclarée ici : `syntheseComprehension.ts` la porte
 * et la route d'écriture s'en sert pour refuser un texte trop long. En poser une
 * seconde ferait DEUX bornes pour le même champ — elles tiendraient jusqu'au
 * jour où l'une bouge, puis l'appel produirait un texte que l'écriture
 * refuserait. Un CHECK la tient aussi en base sur la table des tirages.
 */
export { LONGUEUR_MAX_SYNTHESE };

/**
 * La longueur VISÉE, distincte de la borne.
 *
 * 1 500 caractères est un arbitrage du responsable, pas une mesure : « ce que le
 * patient lit » doit tenir sans être un rapport. Elle est dite au modèle comme
 * une cible, et RIEN NE LA FAIT RESPECTER — seule la borne de 4 000 refuse. Un
 * texte de 1 800 caractères est accepté, et c'est voulu : couper à 1 500
 * rendrait un texte que le modèle n'a pas écrit.
 */
export const LONGUEUR_VISEE = 1500;

/**
 * Le modèle de CET appel, réglable séparément de celui des synthèses et de
 * celui des priorités. Par défaut il suit `CLAUDE_MODEL`, pour qu'une
 * installation qui ne pose rien reste cohérente avec le reste.
 */
export function modelePropositionComprehension(): string {
  return process.env.WN_MODELE_PROPOSITION_COMPREHENSION ?? CLAUDE_MODEL;
}

/**
 * Le résultat d'un appel.
 *
 * UN ÉCHEC PORTE SON MOTIF, et les motifs ne se confondent pas : « rien à
 * proposer » et « l'appel n'a pas abouti » sont deux phrases différentes, et
 * les mélanger ferait affirmer à l'écran une cause qu'il n'a pas vérifiée.
 */
export type ResultatPropositionComprehension =
  | { ok: true; texte: string; modele: string; versionConsigne: string }
  | { ok: false; motif: 'indisponible' | 'trop_longue' | 'vide' };

/** La consigne système, versionnée par `VERSION_CONSIGNE`. */
const CONSIGNE = [
  'Tu assistes un praticien en neuronutrition qui écrit, pour son patient, ce',
  "qu'il a compris de lui.",
  '',
  'On te donne les textes que ce praticien a DÉJÀ validés pour ce dossier, du',
  "plus ancien au plus récent, et les axes de travail de chacun DANS L'ORDRE OÙ",
  'LE PRATICIEN LES A VALIDÉS. On te donne aussi, le cas échéant, ce que le',
  "patient a répondu quand il a estimé que ce n'était pas exactement ça.",
  '',
  'Ta tâche est de RELIER ces textes en un seul, adressé au patient.',
  '',
  'Règles absolues :',
  "- N'AJOUTE RIEN. Chaque affirmation doit se retrouver dans les textes",
  '  fournis. Tu ne sais rien de ce patient en dehors d’eux ;',
  "- N'INVENTE AUCUN ORDRE D'IMPORTANCE. L'ordre des axes t'est donné : suis-le.",
  '  Ne classe pas, ne hiérarchise pas toi-même, n’attribue aucun degré, aucun',
  '  niveau, aucun rang, aucune priorité que tu aurais décidés ;',
  '- pas de liste, pas de puces, pas de numérotation : un texte continu ;',
  '- aucun diagnostic, aucune conclusion médicale, aucun score, aucun seuil,',
  '  aucune bande, aucun chiffre de mesure ;',
  "- aucune recommandation de traitement, de complément ni d'examen ;",
  '- écris en t’adressant au patient, à la deuxième personne ;',
  '- si le patient a signalé un désaccord, tiens-en compte : ne répète pas mot',
  "  pour mot ce qu'il a contesté ;",
  `- vise environ ${LONGUEUR_VISEE} caractères, et ne dépasse jamais`,
  `  ${LONGUEUR_MAX_SYNTHESE} ;`,
  '- réponds par le texte SEUL, sans titre, sans guillemets, sans préambule,',
  '  sans commentaire.',
].join('\n');

/**
 * Met la matière en forme pour l'appel.
 *
 * LES AXES SONT DONNÉS SANS NUMÉROTATION, séparés par des virgules : les
 * numéroter dans le message d'entrée réintroduirait par la porte de service le
 * rang que la consigne interdit — et le modèle recopierait la numérotation.
 * L'ordre suffit à porter l'ordre.
 *
 * UNE SYNTHÈSE SANS AXE RESTE DANS LA MATIÈRE : son narratif vaut, même si
 * aucun axe n'a été validé avec lui. L'absence d'axes n'est pas l'absence de
 * matière (`DC-24`).
 */
export function messageDeMatiere(matiere: MatiereComprehension): string {
  const blocs: string[] = [];

  matiere.syntheses.forEach((synthese, index) => {
    blocs.push(`TEXTE VALIDÉ ${index + 1} SUR ${matiere.syntheses.length} :`);
    blocs.push(synthese.narratifPatient);
    if (synthese.axes.length > 0) {
      blocs.push(`Axes de travail validés avec ce texte : ${synthese.axes.join(', ')}`);
    }
    blocs.push('');
  });

  if (matiere.desaccords.length > 0) {
    blocs.push('CE QUE LE PATIENT A CONTESTÉ, TEL QU’IL L’A ÉCRIT :');
    for (const desaccord of matiere.desaccords) blocs.push(desaccord.texte);
  }

  return blocs.join('\n').trim();
}

/**
 * Produit un résumé global à partir de la matière.
 *
 * CETTE FONCTION NE VÉRIFIE PAS LE MINIMUM DE DEUX SYNTHÈSES. La règle du
 * 2026-09-11 est une condition d'OUVERTURE de la fonction, opposée par la route
 * — qui seule sait lire les rideaux — et par un CHECK en base. La redoubler ici
 * en ferait une troisième copie de la même règle, à dériver le jour où l'une
 * bouge.
 */
export async function proposerComprehension(
  matiere: MatiereComprehension,
): Promise<ResultatPropositionComprehension> {
  const modele = modelePropositionComprehension();

  let brut: string;
  try {
    const reponse = await anthropic.messages.create({
      model: modele,
      max_tokens: 2000,
      system: CONSIGNE,
      messages: [{ role: 'user', content: messageDeMatiere(matiere) }],
    });
    const bloc = reponse.content.find((c) => c.type === 'text');
    brut = bloc !== undefined && bloc.type === 'text' ? bloc.text : '';
  } catch {
    // AUCUN DÉTAIL D'ERREUR NE REMONTE. Un message de fournisseur peut porter
    // de la matière d'appel ; le praticien n'en a pas besoin pour agir.
    return { ok: false, motif: 'indisponible' };
  }

  const texte = brut.trim();
  if (texte === '') return { ok: false, motif: 'vide' };

  // UN DÉPASSEMENT SE REFUSE, IL NE SE COUPE PAS. Tronquer rendrait un texte
  // que le modèle n'a pas écrit, sous une marque qui dirait qu'il l'a écrit —
  // l'« ALTÉRATION DE DONNÉE » que `lib/patient/ceQuiCompte.ts` nomme en
  // contre-patron.
  if (texte.length > LONGUEUR_MAX_SYNTHESE) return { ok: false, motif: 'trop_longue' };

  return { ok: true, texte, modele, versionConsigne: VERSION_CONSIGNE };
}
