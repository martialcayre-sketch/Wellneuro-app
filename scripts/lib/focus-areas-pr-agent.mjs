// Les « Recommended focus areas for review » de PR-Agent : chacune est un
// constat, et reçoit un verdict — corrigé, écarté avec motif, routé avec
// adresse — avant « prête » (CLAUDE.md, « Trois verdicts, aucun commentaire
// sans l'un d'eux » ; mémoire du 2026-11-05 : #1878 renvoyée, deux focus
// areas sans verdict sous « aucun problème relevé »). Lot
// `autonomie-pieges-restes`, partie 14.
//
// Les titres attendus sont ceux de la tête (la section affichée) et ceux des
// têtes précédentes, que le bloc d'état garde dans `findings`.
//
// Le verdict se reconnaît à son TITRE, cité tel que PR-Agent l'écrit, dans un
// commentaire du propriétaire du dépôt posté au plus tard avec la déclaration
// (la déclaration elle-même comprise). Un titre d'un ou deux mots ne vaut
// cité qu'entre marques (gras, chevrons, guillemets, code). Le contrôle ne
// juge pas le verdict : il dit qu'un titre n'a été cité nulle part, ce qui
// suffit à montrer qu'il n'a pas reçu le sien. Ses limites : une citation sans
// verdict (la ligne de `wn-revue-pr-agent.mjs` recopiée, par exemple) passe ;
// deux remarques de même titre se contentent d'une citation ; un verdict
// donné ailleurs qu'en commentaire de conversation (revue, réponse en ligne,
// corps de la PR) ne compte pas. Constaté avant la partie 14, sur les déclarations de
// #2180 à #2312 : pour les focus areas de la tête, 35 PR sur 39 citaient déjà
// chaque titre — deux (#2274, #2278) ont été mergées sans aucun verdict, deux
// autres paraphrasaient (#2258) ou omettaient un titre générique (« Possible
// Issue », #2305) ; pour celles des têtes précédentes, 19 sur 25.
//
// FONCTIONS PURES — aucune lecture, aucun réseau.

/** L'en-tête de la section dans le commentaire persistant (v0.49.0). */
export const SECTION_FOCUS = 'Recommended focus areas for review';

const ENTITES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" };

/** Texte d'un fragment HTML : balises retirées, entités courantes décodées. */
function texte(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&(?:nbsp|amp|lt|gt|quot|#39|#x27);/g, (e) => ENTITES[e]).trim();
}

/**
 * Titres des focus areas affichées (celles de la tête), dans l'ordre, sans
 * doublon. Rend `[]` sans section ; `null` quand la section existe mais
 * qu'aucun titre ne s'y lit — un gabarit changé ne vaut jamais « aucune
 * focus area ».
 */
export function titresAffiches(corps) {
  const s = String(corps ?? '');
  const i = s.indexOf(SECTION_FOCUS);
  if (i < 0) return [];
  const titres = [];
  // Chaque focus area : `<summary>` puis, après un lien éventuel, le titre en
  // `<strong>`. Le reste du `<summary>` est l'explication.
  for (const m of s.slice(i).matchAll(/<summary>\s*(?:<a\b[^>]*>\s*)?<strong>([\s\S]*?)<\/strong>/g)) {
    const t = texte(m[1]);
    if (t !== '' && !titres.includes(t)) titres.push(t);
  }
  return titres.length > 0 ? titres : null;
}

/** Préfixe du bloc d'état (v0.49.0), et le bloc entier. */
const ESPACE_BLOC = '<!-- pr-agent-review-state';
const BLOC_RE = /<!-- pr-agent-review-state:v\d+\n([\s\S]*?)\n-->/;

/**
 * Titres des remarques du bloc d'état (`findings`), quel que soit leur état :
 * celles des têtes précédentes y restent, et une remarque que PR-Agent marque
 * lui-même « résolue » n'a pas reçu de verdict (`.claude/rules/pr-revue-et-
 * release-db.md`, PR-Agent). Le titre est le gras qui ouvre le corps. Rend
 * `[]` sans bloc ; `null` sur un bloc ou un titre illisible — un marqueur
 * présent mais mal délimité (CRLF, espaces), ou deux blocs, compris : les
 * remarques des têtes précédentes ne disparaissent jamais en silence.
 */
export function titresBloc(corps) {
  const s = String(corps ?? '');
  const marqueurs = s.split(ESPACE_BLOC).length - 1;
  if (marqueurs === 0) return [];
  const m = BLOC_RE.exec(s);
  if (marqueurs > 1 || !m) return null;
  let etat;
  try {
    etat = JSON.parse(m[1]);
  } catch {
    return null;
  }
  if (!Array.isArray(etat?.findings)) return null;
  const titres = [];
  for (const f of etat.findings) {
    const t = /^\*\*(.+?)\*\*/.exec(typeof f?.body === 'string' ? f.body : '');
    if (!t || t[1].trim() === '') return null;
    if (!titres.includes(t[1].trim())) titres.push(t[1].trim());
  }
  return titres;
}

/**
 * Tous les titres qui attendent un verdict : les focus areas affichées, puis
 * celles du bloc d'état que l'affichage ne porte plus. `null` si l'une des
 * deux lectures est illisible.
 */
export function titresFocus(corps) {
  const affiches = titresAffiches(corps);
  const bloc = titresBloc(corps);
  if (affiches === null || bloc === null) return null;
  const cle = new Set(affiches.map(normaliser));
  return [...affiches, ...bloc.filter((t) => !cle.has(normaliser(t)))];
}

/**
 * Forme comparable : NFC, minuscules, balises, emphase Markdown et guillemets
 * retirés, blancs réduits. Un titre cité en gras, entre chevrons ou en code
 * reste le même titre.
 */
export function normaliser(s) {
  return String(s ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[`*_«»"“”'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Un titre d'au plus ce nombre de mots ne vaut cité qu'entre marques. */
export const MOTS_TITRE_COURT = 2;

/** Le titre normalisé, sans ponctuation finale (« Régression possible. »). */
const cleTitre = (t) => normaliser(t).replace(/[.:;,!?…]+$/, '').trim();

/**
 * Le texte d'un commentaire, comparable mais avec ses marques : NFC,
 * minuscules, balises et apostrophes retirées, blancs réduits. Gras, code,
 * chevrons et guillemets restent, pour reconnaître une citation délimitée.
 */
const preparer = (s) =>
  String(s ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ');

const echapper = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MARQUES = '[`*_«»"“”]*';
// Collée au titre, sauf après un chevron : « * Tests verts » est une puce, et
// `_tests` un identifiant, pas des citations.
const OUVRANTE = '(?:\\*|«\\s?|"|“|`)';
const FIN_DE_MOT = '(?![\\p{L}\\p{N}])';

/**
 * Le motif d'une citation du titre dans un texte préparé : les marques du
 * titre lui-même (« `limites` non corrigeable ») restent facultatives, entre
 * deux caractères comme entre deux mots. Un titre court (au plus
 * `MOTS_TITRE_COURT` mots) doit ouvrir une marque — gras, italique,
 * chevrons, guillemets, code — et finir sur une fin de mot : « Tests » ou
 * « Migration » se liraient sinon dans la prose de n'importe quelle
 * déclaration (revue `wn-reviewer`, partie 14). La marque fermante n'est pas
 * exigée juste après : les verdicts réels écrivent `**Titre (précision)**`
 * ou `**Titre — détail**` (#2228, #2251, #2269, #2281).
 */
function motifCitation(cle) {
  const corps = cle
    .split(' ')
    .map((mot) => [...mot].map(echapper).join(MARQUES))
    .join(`[\\s\`*_«»"“”]+`);
  const court = cle.split(' ').length <= MOTS_TITRE_COURT;
  return new RegExp(court ? `${OUVRANTE}${corps}${FIN_DE_MOT}` : corps, 'gu');
}

/**
 * Titres qu'aucun texte ne cite. Les titres se cherchent du plus long au plus
 * court, et chaque citation trouvée est retirée du texte : un titre contenu
 * dans un autre (« Focus perdu », « Focus perdu au succès », #2251) n'est pas
 * cité par la seule citation du plus long.
 * @param {string[]} titres
 * @param {string[]} textes
 */
export function titresNonCites(titres, textes) {
  let restes = textes.map(preparer);
  const cites = new Set();
  for (const t of [...titres].sort((a, b) => cleTitre(b).length - cleTitre(a).length)) {
    const cle = cleTitre(t);
    if (cle === '') continue;
    const motif = motifCitation(cle);
    if (restes.some((x) => x.search(motif) >= 0)) {
      cites.add(t);
      restes = restes.map((x) => x.replace(motif, ' \u0000 '));
    }
  }
  return titres.filter((t) => !cites.has(t));
}
