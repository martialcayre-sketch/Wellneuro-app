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
  | 'precaution_manquante'
  | 'terme_interdit';

export type AnomalieFiche = { code: CodeAnomalie; detail: string };

/** `WN-CL-nnnn-nnn::vX.Y` — le nnnn est le numéro de la source du claim. */
const RE_CLE_CLAIM = /^WN-CL-(\d{4})-\d{3}::v\d+\.\d+$/;

/**
 * Racines proscrites de toute surface patient (registre des frontières,
 * vocabulaire réglementaire amendé le 2026-07-21) : « ordonnance »,
 * « diagnostic », « NeuroScore » interdits sans dérogation ; « prescription »
 * proscrit des surfaces patient. Comparaison sur le texte en minuscules.
 */
export const LEXIQUE_INTERDIT_FICHE: readonly string[] = ['prescri', 'ordonnance', 'diagnostic', 'neuroscore'];

/** Mots qu'un nombre traverse pour atteindre ce qu'il compte (« 2 et 3 portions »). */
const MOTS_DE_LIAISON = new Set(['et', 'à', 'a', 'ou', 'de', 'd', 'du', 'des', 'au', 'aux', 'par', 'sur', '-', '–', 'environ']);

const ESPACES = /[\s\u00a0\u202f\u2009]+/gu;

function normaliser(texte: string): string {
  return texte.normalize('NFC').toLowerCase().replace(/[’']/g, "'").replace(ESPACES, ' ').trim();
}

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
export function nombresDuTexte(texte: string): string[] {
  const propre = normaliser(texte);
  const trouves: string[] = [];
  const re = /(\d{1,3}(?: \d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)([a-zà-ÿ%]*)/gu;
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
  }

  // LES PRÉCAUTIONS D'ABORD, comme le patient les lira.
  contenu.precautions.forEach((precaution, rang) => {
    if (precaution.claims.length === 0) {
      anomalies.push({ code: 'precaution_sans_claim', detail: `La précaution ${rang + 1} ne cite aucun claim de sécurité.` });
    }
    for (const cle of precaution.claims) {
      if (!RE_CLE_CLAIM.test(cle)) anomalies.push({ code: 'claim_mal_forme', detail: `Clé de claim illisible : « ${cle} ».` });
    }
  });
  const portees = new Set(contenu.precautions.flatMap(p => p.claims));
  for (const attendue of clesSecuriteAttendues) {
    if (!portees.has(attendue)) {
      anomalies.push({ code: 'precaution_manquante', detail: `La réserve de sécurité ${attendue} n'est portée par aucune précaution.` });
    }
  }

  // LES BLOCS : une provenance, et la bonne.
  const sourceNormalisee = normaliser(texteSource);
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
        if (!sourceNormalisee.includes(normaliser(bloc.texte))) {
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

  // LES NOMBRES : chacun doit exister, avec ce qu'il compte, dans une source.
  const autorises = new Set([texteSource, ...textesClaimsCites].flatMap(nombresDuTexte));
  const vus = new Set<string>();
  for (const nombre of textesLisibles(contenu).flatMap(nombresDuTexte)) {
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
