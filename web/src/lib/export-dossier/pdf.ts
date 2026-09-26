// Export PDF du dossier patient (D-252) — le moteur de rendu.
//
// Il ne connaît que le modèle (`modele.ts`) : il met en page des blocs typés
// sans rien savoir du dossier. Polices standard seulement (aucun fichier à
// embarquer), d'où `versWinAnsi` : elles n'encodent que WinAnsi (cp1252) et
// pdf-lib LÈVE sur tout autre caractère.
//
// Deux temps : la mise en page (pure, testable par `planifierPages`), puis le
// dessin. Le pied « page n/N » se pose en dernier, une fois N connu.

import { PDFDocument, StandardFonts, rgb, type Color, type PDFFont, type PDFPage } from 'pdf-lib';
import { NON_RENSEIGNE, type BlocExport, type DocumentExport } from './modele';

// ── Conversion WinAnsi ─────────────────────────────────────────────────────

const REMPLACEMENTS: ReadonlyMap<string, string> = new Map([
  ['\t', ' '],
  ['\u00A0', ' '],
  ['\u2007', ' '],
  ['\u2009', ' '],
  ['\u200A', ' '],
  ['\u202F', ' '],
  ['\u000B', '\n'],
  ['\u000C', '\n'],
  ['\u0085', '\n'],
  ['\u2028', '\n'],
  ['\u2029', '\n'],
  ['\u2010', '-'],
  ['\u2011', '-'],
  // Signe moins : un « ? » à sa place ferait lire un score faux.
  ['\u2212', '-'],
  // Césure conditionnelle : Helvetica la dessinerait comme un trait visible.
  ['\u00AD', ''],
  ['≥', '>='],
  ['≤', '<='],
  ['≠', '!='],
  ['≈', '~'],
  ['→', '->'],
  ['←', '<-'],
  ['⇒', '=>'],
  ['↑', '^'],
  ['↓', 'v'],
  ['✓', 'oui'],
  ['✔', 'oui'],
  // Unités et marqueurs courants (µg, γGT, oméga-3) : un « ? » les rendrait illisibles.
  ['\u03BC', '\u00B5'],
  ['α', 'alpha'],
  ['β', 'beta'],
  ['γ', 'gamma'],
  ['δ', 'delta'],
  ['ω', 'omega'],
]);

const DIACRITIQUE = /\p{M}/gu;
const A_RETIRER = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\p{Cc}\p{Cf}]/u;

/**
 * Ramène un texte au jeu de caractères d'une police standard (`font.getCharacterSet()`).
 * Ne lève jamais : ce qui ne s'encode pas est translittéré, retiré (emoji,
 * caractères invisibles) ou remplacé par « ? ».
 */
export function versWinAnsi(texte: string, jeu: ReadonlySet<number>): string {
  const convertir = (car: string): string | null => {
    const remplacement = REMPLACEMENTS.get(car);
    if (remplacement !== undefined) return remplacement;
    if (car === '\n' || jeu.has(car.codePointAt(0) ?? -1)) return car;
    return null;
  };

  let sortie = '';
  for (const car of texte.replace(/\r\n?/g, '\n').normalize('NFC')) {
    const direct = convertir(car);
    if (direct !== null) {
      sortie += direct;
      continue;
    }
    const morceaux = [...car.normalize('NFKD').replace(DIACRITIQUE, '')].map(convertir);
    if (morceaux.every((m): m is string => m !== null)) {
      sortie += morceaux.join('');
      continue;
    }
    if (!A_RETIRER.test(car)) sortie += '?';
  }
  return sortie;
}

// ── Gabarit ────────────────────────────────────────────────────────────────

const LARGEUR_PAGE = 595.28;
const HAUTEUR_PAGE = 841.89;
const MARGE_GAUCHE = 56;
const MARGE_DROITE = 56;
const MARGE_HAUT = 56;
const MARGE_BAS = 64;
const LARGEUR_UTILE = LARGEUR_PAGE - MARGE_GAUCHE - MARGE_DROITE;
/** Limite basse du contenu, mesurée depuis le haut de la page. */
const LIMITE_BAS = HAUTEUR_PAGE - MARGE_BAS;
const RETRAIT = 12;
const INTERLIGNE_CORPS = 13.5;
const Y_PIED = 32;

type Police = 'regulier' | 'gras' | 'oblique';
type Polices = Record<Police, PDFFont>;
type Style = { police: Police; taille: number; interligne: number; couleur: Color };

const NOIR = rgb(0, 0, 0);
const GRIS = rgb(0.35, 0.35, 0.35);
const GRIS_FILET = rgb(0.7, 0.7, 0.7);
const ROUGE_SOMBRE = rgb(0.6, 0.1, 0.1);

const CORPS: Style = { police: 'regulier', taille: 10, interligne: INTERLIGNE_CORPS, couleur: NOIR };
const LIBELLE: Style = { ...CORPS, police: 'gras' };
const DISCRET: Style = { police: 'oblique', taille: 9, interligne: 12, couleur: GRIS };
const ALERTE: Style = { ...CORPS, police: 'gras', couleur: ROUGE_SOMBRE };
const TITRE_DOCUMENT: Style = { police: 'gras', taille: 18, interligne: 22.5, couleur: NOIR };
const SOUS_TITRE: Style = { police: 'regulier', taille: 11, interligne: 14, couleur: GRIS };
const PIED: Style = { police: 'regulier', taille: 8, interligne: 10, couleur: GRIS };

const TITRES: Record<1 | 2 | 3, { style: Style; avant: number; apres: number }> = {
  1: { style: { police: 'gras', taille: 15, interligne: 18.75, couleur: NOIR }, avant: 14, apres: 6 },
  2: { style: { police: 'gras', taille: 12.5, interligne: 15.5, couleur: NOIR }, avant: 10, apres: 4 },
  3: { style: { police: 'gras', taille: 11, interligne: 13.75, couleur: NOIR }, avant: 8, apres: 3 },
};

// ── Composition des lignes ─────────────────────────────────────────────────

type Mesure = (texte: string, style: Style) => number;
type Fragment = { texte: string; style: Style };
type Jeton = { genre: 'mot'; texte: string; style: Style } | { genre: 'espace'; style: Style } | { genre: 'saut' };
/** `x` : décalage depuis la marge gauche. */
type Segment = { texte: string; style: Style; x: number };
type Ligne = { segments: Segment[]; hauteur: number; taille: number };

// Somme des chasses caractère par caractère : pdf-lib crénelle la mesure de
// `widthOfTextAtSize` mais pas le dessin — la mesure d'un mot entier déborderait.
function creerMesure(polices: Polices): Mesure {
  const caches = new Map<string, Map<string, number>>();
  return (texte, style) => {
    const cle = `${style.police}:${style.taille}`;
    let cache = caches.get(cle);
    if (!cache) {
      cache = new Map();
      caches.set(cle, cache);
    }
    let total = 0;
    for (const car of texte) {
      let chasse = cache.get(car);
      if (chasse === undefined) {
        chasse = polices[style.police].widthOfTextAtSize(car, style.taille);
        cache.set(car, chasse);
      }
      total += chasse;
    }
    return total;
  };
}

// Une ponctuation haute ne commence pas une ligne, un « ne la finit pas.
const PONCTUATION_FERMANTE = /^[:;!?»]/;

function decouper(fragments: Fragment[]): Jeton[] {
  const jetons: Jeton[] = [];
  for (const { texte, style } of fragments) {
    for (const morceau of texte.split(/(\n| +)/)) {
      if (morceau === '') continue;
      if (morceau === '\n') jetons.push({ genre: 'saut' });
      else if (morceau.startsWith(' ')) jetons.push({ genre: 'espace', style });
      else jetons.push({ genre: 'mot', texte: morceau, style });
    }
  }

  const soudes: Jeton[] = [];
  for (const jeton of jetons) {
    const n = soudes.length;
    const precedent = n >= 2 ? soudes[n - 2] : undefined;
    const entre = n >= 1 ? soudes[n - 1] : undefined;
    if (
      jeton.genre === 'mot' &&
      entre?.genre === 'espace' &&
      precedent?.genre === 'mot' &&
      precedent.style === jeton.style &&
      (PONCTUATION_FERMANTE.test(jeton.texte) || precedent.texte === '«')
    ) {
      soudes.splice(n - 2, 2, { genre: 'mot', texte: `${precedent.texte} ${jeton.texte}`, style: jeton.style });
    } else {
      soudes.push(jeton);
    }
  }
  return soudes;
}

function fermerLigne(segments: Segment[], styleParDefaut: Style): Ligne {
  const styles = segments.length > 0 ? segments.map((s) => s.style) : [styleParDefaut];
  return {
    segments,
    hauteur: Math.max(...styles.map((s) => s.interligne)),
    taille: Math.max(...styles.map((s) => s.taille)),
  };
}

function caracteresQuiTiennent(texte: string, style: Style, disponible: number, mesure: Mesure): number {
  let largeur = 0;
  let n = 0;
  for (const car of texte) {
    largeur += mesure(car, style);
    if (largeur > disponible) break;
    n += car.length;
  }
  return Math.max(n, 1);
}

/** Retour à la ligne mot à mot à travers les fragments ; les `\n` sont des retours forcés. */
function composer(fragments: Fragment[], mesure: Mesure, retraitSuite: number, retraitPremiere = 0): Ligne[] {
  const styleParDefaut = fragments[0]?.style ?? CORPS;
  const lignes: Ligne[] = [];
  let segments: Segment[] = [];
  let largeur = 0;
  let espace: Style | null = null;

  const retrait = () => (lignes.length === 0 ? retraitPremiere : retraitSuite);
  const disponible = () => LARGEUR_UTILE - retrait();
  const poser = (texte: string, style: Style) => {
    const dernier = segments[segments.length - 1];
    if (dernier && dernier.style === style) dernier.texte += texte;
    else segments.push({ texte, style, x: retrait() + largeur });
    largeur += mesure(texte, style);
  };
  const clore = () => {
    lignes.push(fermerLigne(segments, styleParDefaut));
    segments = [];
    largeur = 0;
    espace = null;
  };

  for (const jeton of decouper(fragments)) {
    if (jeton.genre === 'saut') {
      clore();
      continue;
    }
    if (jeton.genre === 'espace') {
      if (segments.length > 0) espace = jeton.style;
      continue;
    }
    const largeurEspace = espace ? mesure(' ', espace) : 0;
    if (largeur + largeurEspace + mesure(jeton.texte, jeton.style) <= disponible()) {
      if (espace) poser(' ', espace);
      espace = null;
      poser(jeton.texte, jeton.style);
      continue;
    }
    if (segments.length > 0) clore();
    // Mot plus long que la ligne (URL, e-mail) : coupé par caractères.
    let reste = jeton.texte;
    while (mesure(reste, jeton.style) > disponible()) {
      const n = caracteresQuiTiennent(reste, jeton.style, disponible(), mesure);
      poser(reste.slice(0, n), jeton.style);
      clore();
      reste = reste.slice(n);
    }
    poser(reste, jeton.style);
  }
  if (segments.length > 0) clore();
  return lignes;
}

function avecPuce(lignes: Ligne[]): Ligne[] {
  const puce: Segment = { texte: '•', style: CORPS, x: 0 };
  const [premiere, ...suite] = lignes;
  if (!premiere) return [fermerLigne([puce], CORPS)];
  return [{ ...premiere, segments: [puce, ...premiere.segments] }, ...suite];
}

// ── Éléments et pagination ─────────────────────────────────────────────────

type Element =
  | { genre: 'titre' | 'texte'; lignes: Ligne[]; avant: number; apres: number }
  | { genre: 'filet'; avant: number; apres: number };

type Placement = { genre: 'ligne'; ligne: Ligne; haut: number; titre: boolean } | { genre: 'filet'; haut: number };

type Convertir = (texte: string) => string;

function elementsDuBloc(bloc: BlocExport, convertir: Convertir, mesure: Mesure): Element[] {
  switch (bloc.type) {
    case 'titre': {
      const { style, avant, apres } = TITRES[bloc.niveau];
      return [{ genre: 'titre', lignes: composer([{ texte: convertir(bloc.texte), style }], mesure, 0), avant, apres }];
    }
    case 'paragraphe': {
      const style = bloc.ton === 'discret' ? DISCRET : bloc.ton === 'alerte' ? ALERTE : CORPS;
      return [{ genre: 'texte', lignes: composer([{ texte: convertir(bloc.texte), style }], mesure, 0), avant: 0, apres: 4 }];
    }
    case 'champ': {
      // Une valeur vide n'est pas « rien à dire » : l'absence s'écrit.
      const valeur = convertir(bloc.valeur) || convertir(NON_RENSEIGNE);
      const fragments: Fragment[] = [
        { texte: `${convertir(bloc.libelle)} :`, style: LIBELLE },
        { texte: ` ${valeur}`, style: CORPS },
      ];
      return [{ genre: 'texte', lignes: composer(fragments, mesure, RETRAIT), avant: 0, apres: 2 }];
    }
    case 'liste':
      return bloc.elements.map((element, i): Element => ({
        genre: 'texte',
        lignes: avecPuce(composer([{ texte: convertir(element), style: CORPS }], mesure, RETRAIT, RETRAIT)),
        avant: 0,
        apres: i === bloc.elements.length - 1 ? 5 : 2,
      }));
    case 'espace':
      return [{ genre: 'texte', lignes: [], avant: 6, apres: 0 }];
  }
}

function hauteurDesLignes(lignes: Ligne[]): number {
  return lignes.reduce((total, ligne) => total + ligne.hauteur, 0);
}

/** Titres consécutifs + deux lignes de corps : ce qui doit tenir ensemble en bas de page. */
function hauteurAGarderEnsemble(elements: Element[], debut: number): number {
  let hauteur = 0;
  let i = debut;
  for (; i < elements.length; i++) {
    const element = elements[i];
    if (element.genre !== 'titre') break;
    hauteur += element.avant + hauteurDesLignes(element.lignes) + element.apres;
  }
  return i < elements.length ? hauteur + 2 * INTERLIGNE_CORPS : hauteur;
}

function paginer(elements: Element[]): Placement[][] {
  const pages: Placement[][] = [[]];
  let courante = pages[0];
  let curseur = MARGE_HAUT;
  const nouvellePage = () => {
    courante = [];
    pages.push(courante);
    curseur = MARGE_HAUT;
  };

  elements.forEach((element, i) => {
    if (element.genre === 'titre' && courante.length > 0 && curseur + hauteurAGarderEnsemble(elements, i) > LIMITE_BAS) {
      nouvellePage();
    }
    if (courante.length > 0) curseur += element.avant;
    if (element.genre === 'filet') {
      courante.push({ genre: 'filet', haut: curseur });
    } else {
      for (const ligne of element.lignes) {
        if (courante.length > 0 && curseur + ligne.hauteur > LIMITE_BAS) nouvellePage();
        courante.push({ genre: 'ligne', ligne, haut: curseur, titre: element.genre === 'titre' });
        curseur += ligne.hauteur;
      }
    }
    curseur += element.apres;
  });
  return pages;
}

async function preparer(doc: DocumentExport) {
  const pdf = await PDFDocument.create({ updateMetadata: false });
  const polices: Polices = {
    regulier: await pdf.embedFont(StandardFonts.Helvetica),
    gras: await pdf.embedFont(StandardFonts.HelveticaBold),
    oblique: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };
  const jeux = Object.values(polices).map((p) => new Set(p.getCharacterSet()));
  const jeu: ReadonlySet<number> = new Set(polices.regulier.getCharacterSet().filter((c) => jeux.every((j) => j.has(c))));
  const convertir: Convertir = (texte) => versWinAnsi(texte, jeu).trim();
  const mesure = creerMesure(polices);

  const entete: Element[] = [
    { genre: 'texte', lignes: composer([{ texte: convertir(doc.titre), style: TITRE_DOCUMENT }], mesure, 0), avant: 0, apres: 4 },
    { genre: 'texte', lignes: composer([{ texte: convertir(doc.sousTitre), style: SOUS_TITRE }], mesure, 0), avant: 0, apres: 8 },
    { genre: 'filet', avant: 0, apres: 10 },
  ];
  const elements = [...entete, ...doc.blocs.flatMap((bloc) => elementsDuBloc(bloc, convertir, mesure))];
  return { pdf, polices, convertir, mesure, pages: paginer(elements) };
}

// ── Dessin ─────────────────────────────────────────────────────────────────

function dessinerLigne(page: PDFPage, ligne: Ligne, yLigneDeBase: number, polices: Polices): void {
  for (const segment of ligne.segments) {
    page.drawText(segment.texte, {
      x: MARGE_GAUCHE + segment.x,
      y: yLigneDeBase,
      size: segment.style.taille,
      font: polices[segment.style.police],
      color: segment.style.couleur,
    });
  }
}

function dessinerFilet(page: PDFPage, y: number): void {
  page.drawLine({
    start: { x: MARGE_GAUCHE, y },
    end: { x: LARGEUR_PAGE - MARGE_DROITE, y },
    thickness: 0.5,
    color: GRIS_FILET,
  });
}

export async function rendrePdf(doc: DocumentExport, options?: { maintenant?: Date }): Promise<Uint8Array> {
  const { pdf, polices, convertir, mesure, pages } = await preparer(doc);
  const maintenant = options?.maintenant ?? new Date();

  pdf.setTitle(doc.metadonnees.titre);
  pdf.setSubject(doc.metadonnees.sujet);
  pdf.setAuthor('WellNeuro');
  pdf.setCreator('WellNeuro');
  pdf.setProducer('WellNeuro');
  pdf.setLanguage('fr-FR');
  pdf.setCreationDate(maintenant);
  pdf.setModificationDate(maintenant);

  for (const placements of pages) {
    const page = pdf.addPage([LARGEUR_PAGE, HAUTEUR_PAGE]);
    for (const placement of placements) {
      if (placement.genre === 'filet') {
        dessinerFilet(page, HAUTEUR_PAGE - placement.haut);
        continue;
      }
      const { ligne, haut } = placement;
      const ligneDeBase = haut + (ligne.hauteur - ligne.taille) / 2 + ligne.taille * 0.8;
      dessinerLigne(page, ligne, HAUTEUR_PAGE - ligneDeBase, polices);
    }
  }

  const mention = convertir(doc.mentionPied);
  const total = pdf.getPageCount();
  pdf.getPages().forEach((page, index) => {
    const pagination = `page ${index + 1}/${total}`;
    const texte = mention ? `${mention} — ${pagination}` : pagination;
    page.drawLine({
      start: { x: MARGE_GAUCHE, y: Y_PIED + 12 },
      end: { x: LARGEUR_PAGE - MARGE_DROITE, y: Y_PIED + 12 },
      thickness: 0.4,
      color: GRIS_FILET,
    });
    composer([{ texte, style: PIED }], mesure, 0)
      .slice(0, 3)
      .forEach((ligne, i) => dessinerLigne(page, ligne, Y_PIED - i * PIED.interligne, polices));
  });

  return pdf.save();
}

// ── Pour les tests ─────────────────────────────────────────────────────────

export type LignePlanifiee = {
  texte: string;
  titre: boolean;
  /** Haut de la ligne, en points depuis le haut de la page. */
  haut: number;
  hauteur: number;
  /** Bords du texte, en points depuis la marge gauche. */
  gauche: number;
  droite: number;
};

/** La mise en page sans le dessin : ce que `rendrePdf` poserait, page par page. */
export async function planifierPages(doc: DocumentExport): Promise<LignePlanifiee[][]> {
  const { pages, mesure } = await preparer(doc);
  return pages.map((placements) =>
    placements.flatMap((placement) => {
      if (placement.genre !== 'ligne') return [];
      const { segments, hauteur } = placement.ligne;
      return [
        {
          texte: segments.map((s) => s.texte).join(''),
          titre: placement.titre,
          haut: placement.haut,
          hauteur,
          gauche: segments[0]?.x ?? 0,
          droite: Math.max(0, ...segments.map((s) => s.x + mesure(s.texte, s.style))),
        },
      ];
    }),
  );
}
