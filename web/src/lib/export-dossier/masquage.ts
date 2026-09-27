// Export PDF du dossier patient (D-252) — le masquage de la version « IA externe ».
//
// Un FILET sur les TEXTES LIBRES, posé au point d'entrée (`assembler.ts`) :
// fiche, anamnèse, réponses en texte et clés de réponses hors définition,
// motif d'invalidation, synthèse, note du praticien. Les sections
// pseudonymisées n'écrivent déjà aucune valeur identifiante, mais un patient ou
// un praticien a pu en taper une. Les textes FIXES (libellés du catalogue,
// consignes, préambule) ne passent jamais ici : un nom qui est aussi un mot
// courant n'y efface pas une option de réponse.
//
// La recherche porte sur un texte PLIÉ (`plier`) qui ressemble à ce que le PDF
// DESSINE (`versWinAnsi`, puis le composeur, qui fusionne les espaces) :
// casse, accents de toutes les langues, ligatures, pleine chasse, apostrophes
// et tirets typographiques ramenés à l'ASCII ; une suite de blancs réduite à
// un seul ; tout caractère imprimé qui ne se ramène pas à une lettre ou à un
// chiffre latins (pictogramme, lettre d'une autre écriture) devenu un
// séparateur — un nom collé à lui reste un mot, comme sur la page. Ce que le
// rendu EFFACE (caractères invisibles, emoji) est cherché deux fois : retiré
// (« Nic\u{200B}ola » se lit « nicola ») et comme séparateur (« Mme\u{200B}Nicola » se lit
// « mme nicola »). Les valeurs du dossier sont pliées de la même façon ; les
// plages trouvées par les deux recherches sont réunies, puis remplacées dans le
// texte d'ORIGINE.
//
// Toutes les expressions sont réunies en UNE alternance, appliquée en une
// passe par pli : la marque posée n'est jamais relue, et à position égale la
// forme la plus longue l'emporte (e-mail entier avant le prénom qu'il
// contient). Chaque alternative commence par un caractère obligatoire qui
// n'est pas un séparateur, les séparateurs entre chiffres sont bornés, et le
// pli ne laisse jamais deux blancs de suite : une longue suite d'espaces, de
// points ou de tirets se parcourt en temps linéaire.

import { ANAMNESE_SECTIONS } from '@/lib/consultation/anamnese';
import { FICHE_SECTIONS } from '@/lib/consultation/fiche';
import { isMotifValide } from '@/lib/consultation/motifs';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { definitionLectureAgendaAli } from './libellesAgendas';
import type { ConsultationExport, PassationExport, PatientExport, SyntheseExport } from './modele';

export const MARQUE_MASQUE = '[masqué]';

export type Masqueur = (texte: string) => string;

// ── Le pli ─────────────────────────────────────────────────────────────────

export type TextePlie = {
  plie: string;
  /** debut[i] / fin[i] : la plage du texte d'origine qui a produit plie[i]. */
  debut: number[];
  fin: number[];
  /** Le texte porte au moins un caractère que le rendu efface. */
  effaces: boolean;
};

/** Ce que vaut, dans le pli, un caractère que le rendu efface : rien, ou un séparateur. */
export type PliEfface = '' | ' ';

const APOSTROPHES = new Set(["'", '\u{2019}', '\u{2BC}', '\u{2018}', '\u{2032}']);
// Tous les tirets (U+2010 à U+2015, U+2E3A…) et le signe moins.
const TIRET = /[\p{Pd}\u{2212}]/u;
// Barres de division et de fraction, que le rendu imprime « / ».
const BARRES = new Set(['\u{2215}', '\u{2044}']);

// Lettres que la NFKD ne décompose pas.
const TRANSLITTERATIONS = new Map([
  ['ł', 'l'],
  ['ø', 'o'],
  ['đ', 'd'],
  ['ð', 'd'],
  ['ħ', 'h'],
  ['ı', 'i'],
  ['ß', 'ss'],
  ['æ', 'ae'],
  ['œ', 'oe'],
  ['þ', 'th'],
]);

// Rattachés au caractère qu'ils modifient : marques combinantes (sélecteur de
// variante compris) et liant sans chasse. Rien d'autre — un pictogramme collé
// après un nom ne disparaît pas avec lui.
const RATTACHE = /[\p{M}\u{200D}]/u;
// Ce que le rendu efface sans le dessiner : caractères de format et de
// contrôle (césure conditionnelle, espaces sans chasse, indicateur d'ordre des
// octets), modificateurs et indicateurs régionaux d'emoji.
const INVISIBLE = /[\p{Cf}\p{Cc}\p{Emoji_Modifier}\p{Regional_Indicator}]/u;
const PICTOGRAMME = /\p{Extended_Pictographic}/u;
const PRESENTATION_EMOJI = /\p{Emoji_Presentation}/u;
const MODIFICATEUR_EMOJI = /\p{Emoji_Modifier}/u;
const LIANT = '\u{200D}';
const SELECTEUR_EMOJI = '\u{FE0F}';
// Imprimé tel quel par WinAnsi : sa décomposition « TM » souderait deux mots.
const SYMBOLES_IMPRIMES = new Set(['\u{2122}']);
const ESPACE = /\s/u;
const MARQUES = /\p{M}/gu;

// Points de code ASCII (techniques, sans rapport clinique) : le chemin rapide du pli.
const ASCII_A = 0x41;
const ASCII_Z = 0x5a;
const ASCII_ECART_MINUSCULE = 0x20;
const ASCII_ESPACE = 0x20;
const ASCII_TABULATION = 0x09;
const ASCII_RETOUR_CHARIOT = 0x0d;
const ASCII_SUPPRESSION = 0x7f;
const ASCII_FIN = 0x80;

const EFFACER = Symbol('effacé par le rendu');
const RATTACHER = Symbol('rattaché au caractère précédent');
type PliCaractere = string | typeof EFFACER | typeof RATTACHER;

function plierAscii(code: number, caractere: string): PliCaractere {
  if (code >= ASCII_A && code <= ASCII_Z) return String.fromCharCode(code + ASCII_ECART_MINUSCULE);
  if (code === ASCII_ESPACE || (code >= ASCII_TABULATION && code <= ASCII_RETOUR_CHARIOT)) return ' ';
  if (code < ASCII_ESPACE || code === ASCII_SUPPRESSION) return EFFACER;
  return caractere;
}

/** La règle `estEmoji` du rendu : un pictogramme en présentation emoji s'efface, un autre s'imprime. */
function enPresentationEmoji(caractere: string, precedent: string | undefined, suivant: string | undefined): boolean {
  if (PRESENTATION_EMOJI.test(caractere) || precedent === LIANT) return true;
  return suivant === SELECTEUR_EMOJI || suivant === LIANT || (suivant !== undefined && MODIFICATEUR_EMOJI.test(suivant));
}

function plierAutre(caractere: string, precedent: string | undefined, suivant: string | undefined): PliCaractere {
  // U+0085 est un saut de ligne pour le rendu, mais pas un \s pour JavaScript ;
  // U+FEFF est un \s pour JavaScript, mais le rendu l'efface.
  if (caractere === '\u{85}' || (caractere !== '\u{FEFF}' && ESPACE.test(caractere))) return ' ';
  if (RATTACHE.test(caractere)) return RATTACHER;
  if (INVISIBLE.test(caractere)) return EFFACER;
  if (APOSTROPHES.has(caractere)) return "'";
  if (TIRET.test(caractere)) return '-';
  if (BARRES.has(caractere)) return '/';
  // Le rendu imprime un pictogramme en présentation texte (translittéré, ou
  // « ? ») et efface un emoji : le premier sépare, le second se cherche deux fois.
  if (PICTOGRAMME.test(caractere)) return enPresentationEmoji(caractere, precedent, suivant) ? EFFACER : ' ';
  if (SYMBOLES_IMPRIMES.has(caractere)) return ' ';
  let sortie = '';
  for (const c of caractere.normalize('NFKD').toLowerCase().normalize('NFKD').replace(MARQUES, '')) {
    if (ESPACE.test(c)) sortie += ' ';
    else if (APOSTROPHES.has(c)) sortie += "'";
    else if (TIRET.test(c)) sortie += '-';
    else if (BARRES.has(c)) sortie += '/';
    else if (c.charCodeAt(0) < ASCII_FIN) sortie += c.toLowerCase();
    // Une lettre qui ne se ramène pas au latin (cyrillique, CJK…), un symbole
    // imprimé : un séparateur, jamais un rien qui souderait ses voisins.
    else sortie += TRANSLITTERATIONS.get(c) ?? ' ';
  }
  return sortie;
}

/**
 * Pli d'un texte, point de code par point de code, avec la plage d'origine de
 * chaque caractère plié. `efface` : ce que vaut un caractère que le rendu
 * efface — rien (« Nic\u{200B}ola ») ou un séparateur (« Mme\u{200B}Nicola »).
 */
export function plier(texte: string, efface: PliEfface = ''): TextePlie {
  const caracteres = Array.from(texte);
  let plie = '';
  const debut: number[] = [];
  const fin: number[] = [];
  let effaces = false;
  let blanc = false;
  let position = 0;
  const emettre = (morceau: string, depart: number, arrivee: number) => {
    for (const c of morceau) {
      // Le composeur du PDF fusionne une suite de blancs : le pli aussi.
      if (c === ' ' && blanc) {
        fin[fin.length - 1] = arrivee;
        continue;
      }
      plie += c;
      debut.push(depart);
      fin.push(arrivee);
      blanc = c === ' ';
    }
  };
  caracteres.forEach((caractere, i) => {
    const apres = position + caractere.length;
    const code = caractere.charCodeAt(0);
    const morceau =
      code < ASCII_FIN ? plierAscii(code, caractere) : plierAutre(caractere, caracteres[i - 1], caracteres[i + 1]);
    if (morceau === RATTACHER) {
      if (fin.length > 0) fin[fin.length - 1] = apres;
    } else if (morceau === EFFACER) {
      effaces = true;
      emettre(efface, position, apres);
    } else {
      emettre(morceau, position, apres);
    }
    position = apres;
  });
  return { plie, debut, fin, effaces };
}

function pli(texte: string): string {
  return plier(texte).plie.trim();
}

/** Un motif qui se plie en vide, en blancs ou en ponctuation seuls ne désigne rien : il est ignoré. */
function utile(textePlie: string): boolean {
  return LETTRE_OU_CHIFFRE.test(textePlie);
}

// ── Les motifs, écrits pour le texte plié ──────────────────────────────────

type Motif = { source: string; poids: number; frontiere: 'mot' | 'nombre' };

const AVANT_MOT = '(?<![\\p{L}\\p{N}])';
const APRES_MOT = '(?![\\p{L}\\p{N}])';
const AVANT_NOMBRE = '(?<!\\p{N})';
const APRES_NOMBRE = '(?!\\p{N})';
// Espaces, apostrophes et tirets souples, et facultatifs : « N'Diaye » stocké
// couvre « Ndiaye », « Du Pont » couvre « Dupont ». Dans ce sens seulement : un
// nom stocké soudé (« Lepetit ») ne se cherche jamais découpé, sans quoi
// « le petit-déjeuner » serait effacé. « Le Petit » écrit pour « Lepetit » est
// un identifiant écrit autrement, limite que le préambule du PDF annonce.
const SEPARATEUR_SOUPLE = "[\\s'\\-]*";
// Une adresse admet en plus la virgule : « 12, rue des Lilas ».
const SEPARATEUR_ADRESSE = "[\\s,'\\-]*";
// Entre deux chiffres d'un numéro : espaces, points, tirets, barres,
// parenthèses — et tout autre signe (« • », « ― »), que le rendu imprimerait
// tel quel ou en « ? » sans rendre le numéro illisible. Borné : jamais un
// retour arrière sur une longue suite de ponctuation.
const SEPARATEUR_CHIFFRES = '[^\\p{L}\\p{N}]{0,3}';
// Entre jour, mois et année : un séparateur AU MOINS — « 1500 mg » n'est pas le
// 1/5/00, « 73,85 » n'est pas le 7/3/85.
const SEPARATEUR_DATE = '[^\\p{L}\\p{N}]{1,3}';
const LETTRE = /\p{L}/gu;
const LETTRE_OU_CHIFFRE = /[\p{L}\p{N}]/u;

type Separateurs = { caracteres: ReadonlySet<string>; souple: string };
const SEPARATEURS_NOM: Separateurs = { caracteres: new Set([' ', "'", '-']), souple: SEPARATEUR_SOUPLE };
const SEPARATEURS_ADRESSE: Separateurs = { caracteres: new Set([' ', "'", '-', ',']), souple: SEPARATEUR_ADRESSE };

// Mots d'un nom qui ne désignent personne : les masquer effacerait « Madame »,
// « des » ou « médecin » de tous les textes. Le nom entier, lui, reste masqué.
const NON_IDENTIFIANTS = new Set([
  'dr', 'docteur', 'pr', 'professeur', 'mme', 'madame', 'm', 'monsieur', 'mlle', 'mademoiselle',
  'des', 'les', 'del', 'della', 'der', 'den', 'van', 'von', 'dos', 'das',
  'medecin', 'generaliste', 'traitant',
]);

// Bornes techniques de pseudonymisation, sans rapport clinique (DC-20) : en
// deçà, une suite de chiffres ou un morceau de texte est trop court pour être
// cherché sans masquer des valeurs qui ne désignent pas le patient.
const CHIFFRES_MIN_TELEPHONE = 8;
const CHIFFRES_MIN_NIR = 10;
const CARACTERES_MIN_MORCEAU = 8;
// Un jeton de nom plus court (« Du », « Le ») n'est cherché que dans le nom entier.
const LETTRES_MIN_JETON = 3;
// Deux numéros français au moins, soudés sans séparateur.
const CHIFFRES_MIN_SUITE_FUSIONNEE = 18;
// La plus longue écriture d'un numéro français : « 0033 » + 9 chiffres.
const CHIFFRES_MAX_NUMERO_FRANCAIS = 13;

// Le mois en toutes lettres, et ses abréviations d'usage.
const MOIS = [
  ['janvier', 'janv'], ['février', 'févr', 'fév'], ['mars'], ['avril', 'avr'], ['mai'], ['juin'],
  ['juillet', 'juil'], ['août'], ['septembre', 'sept'], ['octobre', 'oct'], ['novembre', 'nov'],
  ['décembre', 'déc'],
];

function echapper(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Un texte déjà plié ; séparateurs souples, en tête et en queue ignorés. */
function motifTexte(textePlie: string, separateurs: Separateurs): string {
  let source = '';
  let separateur = false;
  for (const caractere of textePlie) {
    if (separateurs.caracteres.has(caractere)) {
      separateur = source !== '';
      continue;
    }
    if (separateur) source += separateurs.souple;
    separateur = false;
    source += echapper(caractere);
  }
  return source;
}

function motifChiffres(caracteres: string): string {
  return Array.from(caracteres, echapper).join(SEPARATEUR_CHIFFRES);
}

function texteUtile(valeur: string | null): string | null {
  const texte = valeur?.trim();
  return texte && LETTRE_OU_CHIFFRE.test(texte) ? texte : null;
}

function motifMot(textePlie: string, separateurs: Separateurs = SEPARATEURS_NOM): Motif {
  return { source: motifTexte(textePlie, separateurs), poids: textePlie.length, frontiere: 'mot' };
}

// ── E-mails ──

const EMAIL = /[\p{L}\p{N}._%+'\-]+@[\p{L}\p{N}\-]+(?:\.[\p{L}\p{N}\-]+)+/gu;
const PONCTUATION_TETE = /^[._%+'\-]+/u;
const PONCTUATION_FINALE = /[.,;:!?»)'’\-]+$/u;

/**
 * Un e-mail extrait d'un texte a pu emporter ses voisins (« mél.x@y.fr »,
 * « x@y.fr.Tél ») : chaque fin de la partie locale après un « . », et chaque
 * début du domaine arrêté à un « . » ou à un « - », qui garde un « . ».
 */
function formesEmail(texte: string): string[] {
  const arobase = texte.lastIndexOf('@');
  if (arobase < 0) return [texte];
  const locale = texte.slice(0, arobase);
  const domaine = texte.slice(arobase + 1);
  const locales = [locale, ...Array.from(locale.matchAll(/\./g), m => locale.slice(m.index + 1))].filter(Boolean);
  const domaines = [
    domaine,
    ...Array.from(domaine.matchAll(/[.\-]/g), m => domaine.slice(0, m.index)).filter(d => d.includes('.')),
  ];
  return locales.flatMap(l => domaines.map(d => `${l}@${d}`));
}

function motifsEmail(valeur: string | null): Motif[] {
  const texte = texteUtile(valeur)?.replace(PONCTUATION_TETE, '').replace(PONCTUATION_FINALE, '');
  if (!texte) return [];
  return [...new Set(formesEmail(texte).map(pli))]
    .filter(utile)
    .map(plie => ({ source: echapper(plie), poids: plie.length, frontiere: 'mot' }));
}

function motifsEmailsDans(valeur: string | null): Motif[] {
  return (valeur?.match(EMAIL) ?? []).flatMap(motifsEmail);
}

// ── Téléphones ──

// Le numéro national à 9 chiffres, quelle que soit la forme stockée (0…, 33…, +33 (0)…, 0033…).
function numeroNational(chiffres: string): string | null {
  const trouve = /^(?:0|33|330|0033)([1-9]\d{8})$/.exec(chiffres);
  return trouve ? trouve[1] : null;
}

/** Une suite de chiffres soudée : 0033 + 9, 33 + 9 ou 0 + 9 chiffres, de gauche à droite. */
function decouperSuiteFusionnee(chiffres: string): { nationaux: string[]; restes: string[] } {
  const nationaux: string[] = [];
  const restes: string[] = [];
  let reste = '';
  let i = 0;
  while (i < chiffres.length) {
    const longueur = [13, 11, 10].find(n => i + n <= chiffres.length && numeroNational(chiffres.slice(i, i + n)));
    if (longueur === undefined) {
      reste += chiffres[i];
      i += 1;
      continue;
    }
    if (reste) restes.push(reste);
    reste = '';
    nationaux.push(numeroNational(chiffres.slice(i, i + longueur)) as string);
    i += longueur;
  }
  if (reste) restes.push(reste);
  return { nationaux, restes };
}

/**
 * Tous les numéros d'une série de groupes de chiffres (« 06 12 34 56 78 - 04 78 00 11 22 »,
 * « Lyon 69006 / 04 78 00 11 22 ») : à chaque groupe, le plus long assemblage
 * de groupes voisins qui forme un numéro français.
 */
function numerosDansSerie(groupes: string[]): { nationaux: string[]; restes: string[] } {
  const nationaux: string[] = [];
  const restes: string[] = [];
  let reste = '';
  const viderReste = () => {
    if (reste.length >= CHIFFRES_MIN_SUITE_FUSIONNEE) {
      const decoupe = decouperSuiteFusionnee(reste);
      nationaux.push(...decoupe.nationaux);
      restes.push(...decoupe.restes);
    } else if (reste) {
      restes.push(reste);
    }
    reste = '';
  };
  let i = 0;
  while (i < groupes.length) {
    let dernier = -1;
    let national: string | null = null;
    let chiffres = '';
    for (let j = i; j < groupes.length && chiffres.length <= CHIFFRES_MAX_NUMERO_FRANCAIS; j++) {
      chiffres += groupes[j];
      const trouve = numeroNational(chiffres);
      if (trouve) {
        dernier = j;
        national = trouve;
      }
    }
    if (national) {
      viderReste();
      nationaux.push(national);
      i = dernier + 1;
    } else {
      reste += groupes[i];
      i += 1;
    }
  }
  viderReste();
  return { nationaux, restes };
}

// « 0… », « 33… », « +33… », « 0033… », « (+33)… », « +33 (0)… » — le motif
// commence par un chiffre, « + » ou « ( » : jamais par un séparateur
// facultatif, et jamais deux `\s*` qui se suivent.
const INDICATIF = `(?:\\(\\s*(?:(?:\\+|00)\\s*)?33\\s*\\)|(?:\\+|00)\\s*33|33)(?:${SEPARATEUR_CHIFFRES}0)?`;

function motifNumeroNational(national: string): Motif {
  return {
    source: `(?:0|${INDICATIF})${SEPARATEUR_CHIFFRES}${motifChiffres(national)}`,
    poids: 13,
    frontiere: 'nombre',
  };
}

function motifsTelephone(valeur: string | null): Motif[] {
  const motifs: Motif[] = [];
  for (const serie of pli(valeur ?? '').match(/\d(?:[^\p{L}\p{N}]{0,3}\d)*/gu) ?? []) {
    const { nationaux, restes } = numerosDansSerie(serie.match(/\d+/g) ?? []);
    motifs.push(...nationaux.map(motifNumeroNational));
    for (const chiffres of restes) {
      if (chiffres.length < CHIFFRES_MIN_TELEPHONE) continue;
      motifs.push({ source: `(?:\\+\\s*)?${motifChiffres(chiffres)}`, poids: chiffres.length, frontiere: 'nombre' });
    }
  }
  return motifs;
}

// ── NIR ──

function motifsNir(valeur: string | null): Motif[] {
  // Lettres gardées : les NIR de Corse portent 2A ou 2B.
  const caracteres = pli(valeur ?? '').replace(/[^0-9a-z]/g, '');
  if (caracteres.replace(/\D/g, '').length < CHIFFRES_MIN_NIR) return [];
  const motifs: Motif[] = [{ source: motifChiffres(caracteres), poids: caracteres.length, frontiere: 'nombre' }];
  // Le numéro cité sans sa clé de contrôle.
  if (caracteres.length === 15) {
    motifs.push({ source: motifChiffres(caracteres.slice(0, 13)), poids: 13, frontiere: 'nombre' });
  }
  return motifs;
}

// ── Adresse, coordonnées ──

const CODE_POSTAL = /^\d{5}$/;
const NUMERO_VOIE = /^\d{1,4}[a-z]?$/;
const INDICES_REPETITION = new Set(['bis', 'ter', 'quater']);
// Types de voie, pliés (sans accent).
const TYPES_VOIE = new Set([
  'rue', 'ruelle', 'avenue', 'av', 'boulevard', 'bd', 'allee', 'chemin', 'place', 'impasse', 'route',
  'quai', 'cours', 'square', 'passage', 'voie', 'faubourg', 'residence', 'lotissement', 'hameau',
  'sentier', 'promenade', 'esplanade', 'parvis', 'villa', 'cite', 'domaine', 'chaussee', 'traverse',
  'montee', 'clos', 'rond-point', 'lieu-dit',
]);
// Mots qui ne finissent pas un nom de voie : la ville ne peut pas les suivre.
const PARTICULES_VOIE = new Set(['de', 'des', 'du', 'd', "d'", 'la', 'le', 'les', 'l', "l'", 'au', 'aux', 'en', 'sur', 'sous', 'et']);

/** La voie qui commence à un numéro (« 12 bis rue… ») ; `type` : rang de son type de voie. */
function voieDepuisNumero(mots: string[]): { mots: string[]; type: number } | null {
  for (let i = 0; i < mots.length; i++) {
    if (!NUMERO_VOIE.test(mots[i])) continue;
    const type = INDICES_REPETITION.has(mots[i + 1]) ? i + 2 : i + 1;
    if (TYPES_VOIE.has(mots[type] ?? '')) return { mots: mots.slice(i), type: type - i };
  }
  return null;
}

/**
 * Les morceaux d'une ligne d'adresse pliée. Un code postal ouvre un morceau,
 * que sa ville ferme au premier nombre ou au « Cedex » : « 75011 Paris 12 rue
 * des Lilas » donne « 75011 paris » et « 12 rue des lilas ». Sans code postal,
 * la ville suit la voie sans rien qui l'en sépare : la voie sans son dernier
 * mot est ajoutée, si ce qui le précède peut finir un nom de voie. Chaque voie
 * est aussi cherchée sans son numéro (« rue des Lilas »).
 */
function morceauxLigne(ligne: string): string[] {
  const segments: string[][] = [];
  let courant: string[] = [];
  let dansVille = false;
  let codePostal = false;
  for (const mot of ligne.split(' ').filter(Boolean)) {
    const estCodePostal = CODE_POSTAL.test(mot);
    if (estCodePostal || (dansVille && (/^\d/.test(mot) || mot === 'cedex'))) {
      if (courant.length) segments.push(courant);
      courant = [];
      dansVille = estCodePostal;
      codePostal ||= estCodePostal;
    }
    courant.push(mot);
  }
  if (courant.length) segments.push(courant);
  const morceaux = segments.map(segment => segment.join(' '));
  for (const segment of segments) {
    const voie = voieDepuisNumero(segment);
    if (!voie) continue;
    const sansVille = voie.mots.slice(0, -1);
    const villeDetachable =
      !codePostal && sansVille.length > voie.type + 1 && !PARTICULES_VOIE.has(sansVille[sansVille.length - 1]);
    for (const forme of villeDetachable ? [voie.mots, sansVille] : [voie.mots]) {
      morceaux.push(forme.join(' '), forme.slice(voie.type).join(' '));
    }
  }
  return morceaux;
}

function motifsCoordonnees(valeur: string | null): Motif[] {
  const texte = texteUtile(valeur);
  if (!texte) return [];
  // Morceaux : le texte entier, ses parties (sauts de ligne, virgules, points-virgules), et la voie et
  // « CP ville » de chaque partie et de chaque ligne entière, virgules neutralisées : « 12, rue des
  // Lilas » garde son numéro à sa voie.
  const parties = texte.split(/[\n,;]+/).map(pli);
  const lignes = texte.split(/[\n;]+/).map(ligne => pli(ligne.replace(/,/g, ' ')));
  const morceaux = new Set([pli(texte), ...parties, ...[...parties, ...lignes].flatMap(morceauxLigne)]);
  return [...morceaux]
    .filter(morceau => morceau.length >= CARACTERES_MIN_MORCEAU && utile(morceau))
    .map(morceau => motifMot(morceau, SEPARATEURS_ADRESSE));
}

// ── Date de naissance ──

function nombreSouple(deuxChiffres: string): string {
  return deuxChiffres.startsWith('0') ? `0?${deuxChiffres.slice(1)}` : deuxChiffres;
}

function motifsDateNaissance(valeur: string | null): Motif[] {
  const texte = texteUtile(valeur);
  if (!texte) return [];
  const trouve = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte);
  if (!trouve) {
    const plie = pli(texte);
    return plie.length >= CARACTERES_MIN_MORCEAU && utile(plie) ? [motifMot(plie)] : [];
  }
  const [, annee, moisChiffres, jourChiffres] = trouve;
  const D = SEPARATEUR_DATE;
  const jour = nombreSouple(jourChiffres);
  const jourLong = jourChiffres === '01' ? '(?:0?1|1er)' : jour;
  const mois = nombreSouple(moisChiffres);
  // L'année sur deux chiffres, seulement entre séparateurs.
  const anneeCourteOuLongue = `(?:${annee}|${annee.slice(2)})`;
  const motifs: Motif[] = [
    { source: `${annee}${D}${mois}${D}${jour}`, poids: 10, frontiere: 'nombre' },
    { source: `${jourLong}${D}${mois}${D}${anneeCourteOuLongue}`, poids: 10, frontiere: 'nombre' },
    // Sans séparateur : les huit chiffres exacts, zéros compris (« 14031985 », « 19850314 »).
    { source: `${jourChiffres}${moisChiffres}${annee}`, poids: 8, frontiere: 'nombre' },
    { source: `${annee}${moisChiffres}${jourChiffres}`, poids: 8, frontiere: 'nombre' },
  ];
  const noms = MOIS[Number(moisChiffres) - 1];
  if (noms) {
    motifs.push({
      source: `${jourLong}${D}(?:${noms.map(nom => echapper(pli(nom))).join('|')})${D}${anneeCourteOuLongue}`,
      poids: 10 + noms[0].length,
      frontiere: 'nombre',
    });
  }
  return motifs;
}

// ── Noms ──

function motifsNom(valeur: string | null): Motif[] {
  const texte = texteUtile(valeur);
  if (!texte) return [];
  const plie = pli(texte);
  const jetons = plie.split(/[\s\-'.,;:()]+/).filter(Boolean);
  const lettres = (jeton: string) => jeton.match(LETTRE)?.length ?? 0;
  const significatifs = jetons.map(jeton => lettres(jeton) >= LETTRES_MIN_JETON && !NON_IDENTIFIANTS.has(jeton));
  const morceaux = new Set([plie]);
  jetons.forEach((jeton, i) => {
    if (significatifs[i]) morceaux.add(jeton);
    // Deux ou trois jetons voisins : la forme soudée d'une particule
    // (« de La Fontaine » → « Lafontaine »), jamais une particule seule.
    for (const longueur of [2, 3]) {
      if (i + longueur <= jetons.length && significatifs.slice(i, i + longueur).some(Boolean)) {
        morceaux.add(jetons.slice(i, i + longueur).join(' '));
      }
    }
  });
  return [...morceaux].filter(utile).map(morceau => motifMot(morceau));
}

// ── Le masqueur ────────────────────────────────────────────────────────────

export function creerMasqueur(patient: PatientExport): Masqueur {
  const motifs = [
    ...motifsEmail(patient.email),
    ...motifsTelephone(patient.telephone),
    ...motifsNir(patient.nir),
    ...motifsCoordonnees(patient.adresse),
    ...motifsCoordonnees(patient.medecinTraitantCoordonnees),
    ...motifsTelephone(patient.medecinTraitantCoordonnees),
    ...motifsEmailsDans(patient.medecinTraitantCoordonnees),
    ...motifsDateNaissance(patient.dateNaissance),
    ...motifsNom(patient.prenom),
    ...motifsNom(patient.nom),
    ...motifsNom(patient.medecinTraitantNom),
  ]
    .filter(motif => motif.source)
    .sort((a, b) => b.poids - a.poids);

  // Une frontière par famille, évaluée une fois par position.
  const famille = (frontiere: Motif['frontiere'], avant: string, apres: string): string[] => {
    const sources = [...new Set(motifs.filter(m => m.frontiere === frontiere).map(m => `(?:${m.source})`))];
    return sources.length ? [`${avant}(?:${sources.join('|')})${apres}`] : [];
  };
  const alternatives = [
    ...famille('mot', AVANT_MOT, APRES_MOT),
    ...famille('nombre', AVANT_NOMBRE, APRES_NOMBRE),
  ];
  if (!alternatives.length) return texte => texte;
  const expression = new RegExp(alternatives.join('|'), 'gu');

  /** Les plages du texte d'origine trouvées sur un pli. */
  const plages = ({ plie, debut, fin }: TextePlie): Array<[number, number]> =>
    Array.from(plie.matchAll(expression), (trouve): [number, number] | null =>
      trouve[0].length ? [debut[trouve.index], fin[trouve.index + trouve[0].length - 1]] : null,
    ).filter((plage): plage is [number, number] => plage !== null);

  const masquerMorceau = (morceau: string): string => {
    const soude = plier(morceau, '');
    // Sans caractère effacé par le rendu, les deux plis sont identiques.
    const trouvees = soude.effaces ? [...plages(soude), ...plages(plier(morceau, ' '))] : plages(soude);
    if (!trouvees.length) return morceau;
    // Union des plages : celles qui se chevauchent (ou tiennent dans un même
    // caractère d'origine, « ½ ») ne portent qu'une marque.
    trouvees.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    let sortie = '';
    let curseur = 0;
    for (const [depart, arrivee] of trouvees) {
      if (depart >= curseur) sortie += morceau.slice(curseur, depart) + MARQUE_MASQUE;
      curseur = Math.max(curseur, arrivee);
    }
    return sortie + morceau.slice(curseur);
  };

  // L'identifiant PATnnn est la clé que le praticien retrouve : il ne se masque jamais.
  const identifiant = patient.idPatient.trim();
  if (!identifiant) return masquerMorceau;
  const protege = new RegExp(`(${echapper(identifiant)})`, 'i');
  return texte =>
    texte
      .split(protege)
      .map((morceau, rang) => (rang % 2 === 1 ? morceau : masquerMorceau(morceau)))
      .join('');
}

// ── Les textes libres, masqués au point d'entrée ───────────────────────────

type Regles = {
  /** Codes d'options du catalogue : ils restent. */
  codes?: ReadonlySet<string>;
  /** Présent : toute clé d'objet hors de cet ensemble est un texte libre, masqué. */
  clesConnues?: ReadonlySet<string>;
};

/** Des entrées dont deux clés ont pu se masquer à l'identique : aucune valeur n'en écrase une autre. */
function objetSansCollision(entrees: Array<[string, unknown]>): Record<string, unknown> {
  const prises = new Set<string>();
  return Object.fromEntries(
    entrees.map(([cle, valeur]) => {
      let libre = cle;
      for (let rang = 2; prises.has(libre); rang++) libre = `${cle} (${rang})`;
      prises.add(libre);
      return [libre, valeur];
    }),
  );
}

/** Chaque chaîne d'une valeur JSON, en profondeur ; les codes connus restent, les clés connues aussi. */
function masquerProfond(valeur: unknown, masquer: Masqueur, regles: Regles = {}): unknown {
  if (typeof valeur === 'string') return regles.codes?.has(valeur) ? valeur : masquer(valeur);
  if (Array.isArray(valeur)) return valeur.map(element => masquerProfond(element, masquer, regles));
  if (typeof valeur === 'object' && valeur !== null) {
    const { clesConnues } = regles;
    return objetSansCollision(
      Object.entries(valeur).map(([cle, element]) => [
        clesConnues && !clesConnues.has(cle) ? masquer(cle) : cle,
        masquerProfond(element, masquer, regles),
      ]),
    );
  }
  return valeur;
}

function masquerOuNull(texte: string | null, masquer: Masqueur): string | null {
  return texte === null ? null : masquer(texte);
}

// Une option d'une liste fermée est un libellé du catalogue, pas un texte
// libre : « Marié·e / Pacsé·e » reste lisible pour une patiente prénommée Marie.
function optionsParChamp(champs: Array<{ id: string; options?: string[] }>): Map<string, ReadonlySet<string>> {
  return new Map(champs.filter(c => c.options?.length).map(c => [c.id, new Set(c.options)]));
}

const OPTIONS_FICHE = optionsParChamp(FICHE_SECTIONS.flatMap(section => section.champs));
const OPTIONS_ANAMNESE = optionsParChamp(
  ANAMNESE_SECTIONS.flatMap(section => [
    ...(section.champs ?? []),
    ...(section.groupes ?? []).flatMap(groupe => groupe.champs),
  ]),
);

function masquerValeurs<T>(
  valeurs: Record<string, T>,
  options: Map<string, ReadonlySet<string>>,
  masquer: Masqueur,
  clesConnues?: ReadonlySet<string>,
): Record<string, T> {
  return objetSansCollision(
    Object.entries(valeurs).map(([id, valeur]) => [
      clesConnues && !clesConnues.has(id) ? masquer(id) : id,
      masquerProfond(valeur, masquer, { codes: options.get(id), clesConnues }),
    ]),
  ) as Record<string, T>;
}

/** Fiche signalétique, anamnèse et motif écrit hors des catégories. */
export function masquerConsultation(c: ConsultationExport, masquer: Masqueur): ConsultationExport {
  return {
    ...c,
    motif: c.motif !== null && !isMotifValide(c.motif.trim()) ? masquer(c.motif) : c.motif,
    ficheSignaletique: c.ficheSignaletique && masquerValeurs(c.ficheSignaletique, OPTIONS_FICHE, masquer),
    anamnese: c.anamnese && masquerValeurs(c.anamnese, OPTIONS_ANAMNESE, masquer),
  };
}

function questionsDe(definition: QuestionnaireDef | null) {
  if (!definition) return [];
  // Q_ALI_09 se lit par ses pseudo-items d'agenda : ce sont aussi des identifiants connus.
  const lecture = definitionLectureAgendaAli(definition);
  return [definition, ...(lecture ? [lecture] : [])].flatMap(def =>
    (def.sections ?? []).flatMap(section => section.questions ?? []),
  );
}

function codesDesOptions(definition: QuestionnaireDef | null): Map<string, ReadonlySet<string>> {
  const codes = new Map<string, ReadonlySet<string>>();
  for (const question of questionsDe(definition)) {
    if (question.options?.length) codes.set(question.id, new Set(question.options.map(o => String(o.v))));
  }
  return codes;
}

/**
 * Réponses en texte (`scores.rawAnswers`) — et leurs CLÉS hors définition, qu'un
 * appel direct a pu choisir librement — et motif d'invalidation ; jamais la
 * définition, le titre, les scores, ni un identifiant de question.
 */
export function masquerPassation(p: PassationExport, masquer: Masqueur): PassationExport {
  const brut = p.scores?.rawAnswers;
  const clesConnues = new Set(questionsDe(p.definition).map(question => question.id));
  const rawAnswers = typeof brut === 'object' && brut !== null && !Array.isArray(brut)
    ? masquerValeurs(brut as Record<string, unknown>, codesDesOptions(p.definition), masquer, clesConnues)
    : null;
  return {
    ...p,
    scores: p.scores && rawAnswers ? { ...p.scores, rawAnswers } : p.scores,
    motifInvalidation: masquerOuNull(p.motifInvalidation, masquer),
  };
}

/** Chaque texte du JSON de synthèse, et la note du praticien. */
export function masquerSynthese(s: SyntheseExport, masquer: Masqueur): SyntheseExport {
  return {
    ...s,
    syntheseJson: masquerProfond(s.syntheseJson, masquer),
    notesPraticien: masquerOuNull(s.notesPraticien, masquer),
  };
}
