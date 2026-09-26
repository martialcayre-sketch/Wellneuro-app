// LES CONTRÔLES D'UNE FICHE ADAPTÉE PAR IA ([[D-251]] §5 et §6) — purs, sans
// base ni réseau.
//
// POURQUOI ILS EXISTENT AVANT TOUT BROUILLON. Une adaptation par IA « cite » ou
// elle « invente », et rien dans le texte ne dit laquelle des deux elle a faite.
// Ces contrôles tranchent ce que la machine peut trancher, avant qu'un humain
// lise : un nombre absent de la source, un bloc qui ne dit pas d'où il vient, un
// passage donné pour verbatim qui ne l'est pas, une réserve de sécurité omise, un
// mot proscrit d'une surface patient. Ils ne remplacent pas la relecture du
// responsable ([[D-195]] §1) : ils l'empêchent de porter sur un texte déjà faux.
//
// OÙ ILS SERONT REJOUÉS. À l'ingestion du brouillon (refus dur), à la validation
// par le responsable, et au moment de servir la fiche — une table d'indications
// qui change ses réserves de sécurité rend une fiche validée non servable.
//
// CE QU'ILS NE VOIENT PAS, et il faut le dire : un nombre écrit en lettres
// (« trois semaines »), une reformulation qui déplace le sens sans toucher aux
// chiffres, une population élargie par un adjectif (`DC-14`). C'est la relecture
// intégrale qui les garde, pas ce module.

import type { CleClaimFiche, ContenuFicheAssiette, ProvenanceBloc } from './types';

export type CodeAnomalie =
  | 'texte_vide'
  | 'bloc_sans_provenance'
  | 'claim_mal_forme'
  | 'claim_hors_fiche'
  | 'verbatim_introuvable'
  | 'nombre_hors_source'
  | 'precaution_sans_claim'
  | 'precaution_hors_perimetre'
  | 'precaution_manquante'
  | 'balisage_dans_le_texte'
  | 'terme_interdit';

export type AnomalieFiche = { code: CodeAnomalie; detail: string };

/** `WN-CL-nnnn-nnn::vX.Y` — le nnnn est le numéro de la source du claim. */
const RE_CLE_CLAIM = /^WN-CL-(\d{4})-\d{3}::v\d+\.\d+$/;

/**
 * Racines proscrites de toute surface patient (registre des frontières,
 * vocabulaire réglementaire amendé le 2026-07-21) : « ordonnance »,
 * « diagnostic », « NeuroScore » interdits sans dérogation ; « prescription »
 * proscrit des surfaces patient. Comparaison sur le texte en minuscules.
 *
 * `diagnostiq` ajoute « diagnostiqué(e) », qui échappait à `diagnostic` ;
 * « posologie » et « dosage » sont le vocabulaire d'une dose de complément, qui
 * devient un renvoi au praticien (`DC-44`) — constats de la revue du lot 5.
 */
export const LEXIQUE_INTERDIT_FICHE: readonly string[] = [
  'prescri',
  'ordonnance',
  'diagnostic',
  'diagnostiq',
  'neuroscore',
  'posologie',
  'dosage',
];

/** Mots qu'un nombre traverse pour atteindre ce qu'il compte (« 2 et 3 portions »). */
const MOTS_DE_LIAISON = new Set(['et', 'à', 'a', 'ou', 'de', 'd', 'du', 'des', 'au', 'aux', 'par', 'sur', '-', '–', 'environ']);

const ESPACES = /[\s\u00a0\u202f\u2009]+/gu;

function normaliser(texte: string): string {
  return texte.normalize('NFC').toLowerCase().replace(/[’']/g, "'").replace(ESPACES, ' ').trim();
}

/**
 * LE TEXTE SANS SA PRÉSENTATION, découpé en SEGMENTS. L'extraction
 * (`canonical.md`) porte du Markdown — gras, titres, citations, puces, numéros
 * de liste, tableaux — et des marqueurs de page en commentaire HTML. Une fiche
 * patient, elle, est du texte brut.
 *
 * Constats des premiers essais de l'outil (lot 5), puis de sa revue :
 *   — une phrase reprise d'une ligne qui contenait du gras était déclarée
 *     « introuvable », et un nombre en gras (« **3 semaines** ») comptait
 *     « semaines** » : la fiche conforme était refusée, celle qui gardait les
 *     astérisques acceptée ;
 *   — retirer le balisage en aplatissant tout le texte laissait un verbatim
 *     JOINDRE deux cellules d'un tableau ou deux lignes (« à éviter » d'une
 *     ligne, suivi du produit de la ligne suivante) : un sens inversé passait.
 * D'où des segments : une ligne, ou une cellule de tableau, balisage retiré. Un
 * verbatim se cherche DANS UN SEUL segment ; les nombres se lisent sur les
 * segments. Un marqueur de page n'est le texte d'aucun segment.
 */
export function segmentsSansBalisage(texte: string): string[] {
  return texte
    .replace(/<!--[\s\S]*?-->/g, '\n')
    .split('\n')
    .map(ligne => ligne.replace(/^[ \t]*(?:#{1,6}[ \t]+|>[ \t]?|[-*+][ \t]+|\d+[.)][ \t]+)/, '').replace(/\*\*|__|\*/g, ''))
    .flatMap(ligne => ligne.split('|'))
    .map(segment => segment.trim())
    .filter(Boolean);
}

/** Le texte net, segment par segment — ce sur quoi se lisent les nombres. */
function texteNet(texte: string): string {
  return segmentsSansBalisage(texte).join('\n');
}

/**
 * Du balisage, un marqueur de page ou de figure dans un texte que le PATIENT
 * lira : il s'afficherait tel quel. La comparaison verbatim ignore le balisage ;
 * le texte servi, lui, n'en porte pas.
 */
const RE_BALISAGE = /\*\*|__|<!--|-->|\[figure|\||^[ \t]*#{1,6}[ \t]|^[ \t]*>[ \t]/imu;

/**
 * CHIFFRE TECHNIQUE, PAS UN SEUIL (`DC-20`) : la longueur à partir de laquelle un
 * « s » final se lit comme un pluriel. En deçà (« ans », « kg »), le mot est
 * gardé tel quel. L'erreur possible est symétrique — la même normalisation
 * s'applique à la source et à la fiche — et ne peut que refuser à tort, jamais
 * laisser passer un nombre absent.
 */
const LONGUEUR_MIN_MOT_AU_PLURIEL = 4;

function uniteNormalisee(mot: string): string {
  const propre = mot.replace(/[.,;:!?)»"]+$/u, '');
  return propre.length >= LONGUEUR_MIN_MOT_AU_PLURIEL && propre.endsWith('s') ? propre.slice(0, -1) : propre;
}

/**
 * Les nombres d'un texte, chacun avec ce qu'il compte : `« 3 semaine »`,
 * `« 60 ans »`, `« 20 % »`, `« 1.5 l »`. Le mot compté est le premier mot qui
 * suit, liaisons et autres nombres sautés, dans une fenêtre de trois mots — sans
 * quoi « 3 semaines » et « 3 jours » se confondraient sur le seul chiffre. Un
 * nombre qui ne compte rien de lisible garde sa valeur seule.
 */
/**
 * « oméga 3 », « omega-3 », « oméga‑3 » : UN nom, écrit de trois façons. Les
 * Fiches MY l'écrivent avec une espace (constat d'un essai sur `WN-SRC-0305` :
 * un titre qui finissait par ce nom laissait un « 3 » nu). La forme unique est
 * `oméga-<n>`, des deux côtés du contrôle.
 */
function omegasUnifies(propre: string): string {
  return propre.replace(/(?<!\p{L})om[ée]ga[ ‑-]?(?=\d)/gu, 'oméga-');
}

export function nombresDuTexte(texte: string): string[] {
  const propre = omegasUnifies(normaliser(texte));
  const trouves: string[] = [];
  // UN CHIFFRE COLLÉ À UNE LETTRE N'EST PAS UNE QUANTITÉ : « oméga-3 », « B12 »,
  // « D3 » sont des NOMS (constat de la revue du lot 5 : ils faisaient refuser
  // « Les oméga-3 », lu « 3 se »). Ils sont contrôlés à part, par
  // `nomsChiffres`. Un intervalle « 3-4 portions » reste deux nombres : c'est un
  // chiffre, pas une lettre, qui précède le trait d'union.
  const re = /(?<![\p{L}\d])(?<!\p{L}[-‑])(\d{1,3}(?: \d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)([a-zà-ÿ%]*)/gu;
  for (const m of propre.matchAll(re)) {
    const valeur = String(Number(m[1].replace(/ /g, '').replace(',', '.')));
    let unite = m[2];
    if (!unite) {
      const suite = propre.slice((m.index ?? 0) + m[0].length);
      const mots = suite.split(/[\s,;:()«»"'/!?]+/u).filter(Boolean).slice(0, 3);
      unite = mots.find(mot => !MOTS_DE_LIAISON.has(mot) && !/^\d/.test(mot)) ?? '';
    }
    trouves.push(`${valeur} ${uniteNormalisee(unite)}`.trim());
  }
  return trouves;
}

/**
 * Les NOMS qui portent un chiffre — `« oméga-3 »`, `« b12 »` — tels qu'écrits,
 * trait d'union normalisé. Chacun doit exister dans une source : un « oméga-6 »
 * absent reste refusé.
 */
export function nomsChiffres(texte: string): string[] {
  return [...omegasUnifies(normaliser(texte)).matchAll(/\p{L}+[-‑]?\d+(?:[.,]\d+)?/gu)].map(m => m[0].replace('‑', '-'));
}

/** Tous les textes qu'un patient lira — le titre compris. */
export function textesLisibles(contenu: ContenuFicheAssiette): string[] {
  return [
    contenu.titre,
    ...contenu.precautions.map(p => p.texte),
    ...contenu.sections.flatMap(s => [s.titre, ...s.blocs.map(b => b.texte)]),
  ];
}

function numeroDeSource(sourceId: string): string | null {
  return /^WN-SRC-(\d{4})$/.exec(sourceId)?.[1] ?? null;
}

export type EntreesControle = {
  contenu: ContenuFicheAssiette;
  /** La Fiche MY adaptée (`WN-SRC-nnnn`) : ses blocs ne citent que SES claims. */
  sourceIdFiche: string;
  /** Le texte extrait de la fiche — la référence du verbatim et des nombres. */
  texteSource: string;
  /** Le texte des claims cités (fiche et sécurité), lus en base par l'appelant. */
  textesClaimsCites: readonly string[];
  /** Les réserves de sécurité de l'assiette, que les précautions doivent porter. */
  clesSecuriteAttendues: readonly CleClaimFiche[];
};

/**
 * Toutes les anomalies d'une fiche adaptée — une liste vide est la seule issue
 * qui autorise la suite. L'ordre suit le texte, pour que la relecture les
 * retrouve dans l'ordre où elle lit.
 */
export function controlerFiche(entrees: EntreesControle): AnomalieFiche[] {
  const { contenu, sourceIdFiche, texteSource, textesClaimsCites, clesSecuriteAttendues } = entrees;
  const anomalies: AnomalieFiche[] = [];
  const numeroFiche = numeroDeSource(sourceIdFiche);

  for (const texte of textesLisibles(contenu)) {
    if (!/\S/u.test(texte)) anomalies.push({ code: 'texte_vide', detail: 'Un titre, un bloc ou une précaution est vide.' });
    if (RE_BALISAGE.test(texte)) {
      anomalies.push({ code: 'balisage_dans_le_texte', detail: 'Un texte patient porte du balisage, ou un marqueur de page ou de figure.' });
    }
  }

  // LES PRÉCAUTIONS D'ABORD, comme le patient les lira.
  contenu.precautions.forEach((precaution, rang) => {
    if (precaution.claims.length === 0) {
      anomalies.push({ code: 'precaution_sans_claim', detail: `La précaution ${rang + 1} ne cite aucun claim de sécurité.` });
    }
    for (const cle of precaution.claims) {
      const m = RE_CLE_CLAIM.exec(cle);
      if (!m) {
        anomalies.push({ code: 'claim_mal_forme', detail: `Clé de claim illisible : « ${cle} ».` });
      } else if (!clesSecuriteAttendues.includes(cle) && m[1] !== numeroFiche) {
        // UNE PRÉCAUTION NE CITE QUE CE QUI LUI REVIENT — constat de revue
        // (#1232). Contrôlée en couverture seule, une précaution pouvait porter
        // la réserve d'une AUTRE assiette et passer. Le périmètre : les réserves
        // de sécurité des lignes publiées de l'assiette, et les claims de la
        // fiche elle-même (une mise en garde qu'elle porte déjà).
        anomalies.push({
          code: 'precaution_hors_perimetre',
          detail: `La précaution ${rang + 1} cite ${cle}, qui n'est ni une réserve de l'assiette ni un claim de la fiche.`,
        });
      }
    }
  });
  const portees = new Set(contenu.precautions.flatMap(p => p.claims));
  for (const attendue of clesSecuriteAttendues) {
    if (!portees.has(attendue)) {
      anomalies.push({ code: 'precaution_manquante', detail: `La réserve de sécurité ${attendue} n'est portée par aucune précaution.` });
    }
  }

  // LES BLOCS : une provenance, et la bonne.
  const segmentsSource = segmentsSansBalisage(texteSource).map(normaliser);
  contenu.sections.forEach((section, s) => {
    section.blocs.forEach((bloc, b) => {
      const ou = `section ${s + 1}, bloc ${b + 1}`;
      // Le type l'exige, mais un brouillon arrive d'un outil par le réseau : sa
      // forme se constate, elle ne se suppose pas.
      const provenance: ProvenanceBloc | undefined = bloc.provenance;
      if (!provenance || (provenance.type !== 'verbatim' && provenance.type !== 'claims')) {
        anomalies.push({ code: 'bloc_sans_provenance', detail: `${ou} : aucune provenance.` });
        return;
      }
      if (provenance.type === 'verbatim') {
        const cherche = normaliser(bloc.texte);
        if (!segmentsSource.some(segment => segment.includes(cherche))) {
          anomalies.push({ code: 'verbatim_introuvable', detail: `${ou} : donné pour verbatim, introuvable dans la fiche source.` });
        }
        return;
      }
      if (provenance.claims.length === 0) {
        anomalies.push({ code: 'bloc_sans_provenance', detail: `${ou} : reformulé sans citer de claim.` });
      }
      for (const cle of provenance.claims) {
        const m = RE_CLE_CLAIM.exec(cle);
        if (!m) {
          anomalies.push({ code: 'claim_mal_forme', detail: `${ou} : clé de claim illisible « ${cle} ».` });
        } else if (m[1] !== numeroFiche) {
          // LA COUCHE « RÈGLE » N'ENTRE PAS DANS UN TEXTE PATIENT ([[D-216]]) :
          // un bloc ne cite que les claims de la FICHE. Les claims de sécurité
          // du protocole n'entrent que par les précautions.
          anomalies.push({ code: 'claim_hors_fiche', detail: `${ou} : ${cle} n'est pas un claim de la fiche ${sourceIdFiche}.` });
        }
      }
    });
  });

  // LES NOMBRES : chacun doit exister, avec ce qu'il compte, dans une source —
  // lus sur le texte NET, des deux côtés. Les noms qui portent un chiffre
  // (« oméga-3 ») doivent exister tels quels.
  const sources = [texteSource, ...textesClaimsCites].map(texteNet);
  const lisibles = textesLisibles(contenu).map(texteNet);
  const autorises = new Set([...sources.flatMap(nombresDuTexte), ...sources.flatMap(nomsChiffres)]);
  const vus = new Set<string>();
  for (const nombre of [...lisibles.flatMap(nombresDuTexte), ...lisibles.flatMap(nomsChiffres)]) {
    if (!autorises.has(nombre) && !vus.has(nombre)) {
      vus.add(nombre);
      anomalies.push({ code: 'nombre_hors_source', detail: `« ${nombre} » ne figure ni dans la fiche source ni dans un claim cité.` });
    }
  }

  // LE VOCABULAIRE d'une surface patient.
  const tout = normaliser(textesLisibles(contenu).join(' '));
  for (const racine of LEXIQUE_INTERDIT_FICHE) {
    if (tout.includes(racine)) anomalies.push({ code: 'terme_interdit', detail: `Terme proscrit d'une surface patient : « ${racine}… ».` });
  }

  return anomalies;
}
