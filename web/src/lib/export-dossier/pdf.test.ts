import { PDFDocument, StandardFonts } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import type { BlocExport, DocumentExport } from './modele';
import { planifierPages, rendrePdf, versWinAnsi } from './pdf';

// Gabarit A4 du moteur : largeur 595.28 − 2 × 56, contenu jusqu'à 64 pt du bas.
const LARGEUR_UTILE = 595.28 - 56 - 56;
const LIMITE_BAS = 841.89 - 64;

let jeu: ReadonlySet<number>;

beforeAll(async () => {
  const pdf = await PDFDocument.create();
  const police = await pdf.embedFont(StandardFonts.Helvetica);
  jeu = new Set(police.getCharacterSet());
});

function documentDe(blocs: BlocExport[], surcharge: Partial<DocumentExport> = {}): DocumentExport {
  return {
    titre: 'Dossier patient PAT001',
    sousTitre: 'Version pour IA externe — pseudonymisée',
    mentionPied: 'WellNeuro — PAT001 — document pseudonymisé',
    metadonnees: { titre: 'Dossier PAT001 — export', sujet: 'Export du dossier de neuronutrition' },
    blocs,
    ...surcharge,
  };
}

function paragraphes(n: number, prefixe = 'Ligne de remplissage'): BlocExport[] {
  return Array.from({ length: n }, (_, i) => ({ type: 'paragraphe', texte: `${prefixe} ${i + 1}` }));
}

const LONG =
  'Le patient rapporte une fatigue matinale persistante, un endormissement difficile et des ' +
  'réveils nocturnes fréquents ; il décrit aussi une envie de sucre en fin de journée, ' +
  'surtout après une journée de travail chargée, et un besoin de café pour démarrer la matinée.';

describe('versWinAnsi', () => {
  it('conserve ce que cp1252 encode : accents, guillemets, apostrophe, points de suspension, tirets, euro, ×', () => {
    const texte = 'é à ç œ « » ’ … – — € × Œ ° µ ½';
    expect(versWinAnsi(texte, jeu)).toBe(texte);
  });

  it('recompose les accents décomposés (NFD)', () => {
    expect(versWinAnsi('Me\u0301lanie a e\u0301te\u0301 vue', jeu)).toBe('Mélanie a été vue');
  });

  it('remplace les espaces fines et insécables par une espace normale', () => {
    expect(versWinAnsi('a\u202Fb\u2009c\u200Ad\u2007e\u00A0f', jeu)).toBe('a b c d e f');
    expect(versWinAnsi('Score\u202F:\u00A012', jeu)).toBe('Score : 12');
  });

  it('translittère les symboles mathématiques et les flèches', () => {
    expect(versWinAnsi('≥ 3', jeu)).toBe('>= 3');
    expect(versWinAnsi('≤ 3', jeu)).toBe('<= 3');
    expect(versWinAnsi('≠ 3', jeu)).toBe('!= 3');
    expect(versWinAnsi('A → B ← C', jeu)).toBe('A -> B <- C');
    expect(versWinAnsi('↑ ↓', jeu)).toBe('^ v');
    expect(versWinAnsi('✓ fait, ✔ vu', jeu)).toBe('oui fait, oui vu');
  });

  it('ramène les traits d’union insécables à un tiret simple', () => {
    expect(versWinAnsi('anti\u2010inflammatoire, oméga\u20113', jeu)).toBe('anti-inflammatoire, oméga-3');
  });

  it('ne transforme pas un signe moins en « ? » (un score négatif resterait lisible)', () => {
    expect(versWinAnsi('score \u22122', jeu)).toBe('score -2');
  });

  it('translittère les lettres grecques courantes des unités et marqueurs', () => {
    // \u03BC : mu grec ; \u00B5 : signe micro de cp1252 — deux caractères qui se ressemblent.
    expect(versWinAnsi('γGT 40, 200 \u03BCg, ω-3', jeu)).toBe('gammaGT 40, 200 \u00B5g, omega-3');
  });

  it('retire les emoji, modificateurs, drapeaux, sélecteurs de variante et ZWJ', () => {
    expect(versWinAnsi('Bien 😀 dormi', jeu)).toBe('Bien  dormi');
    expect(versWinAnsi('ok👍🏽', jeu)).toBe('ok');
    expect(versWinAnsi('🇫🇷France', jeu)).toBe('France');
    expect(versWinAnsi('\u2764\uFE0F', jeu)).toBe('');
    expect(versWinAnsi('\u{1F468}\u200D\u{1F469}\u200D\u{1F467}', jeu)).toBe('');
  });

  it('retire les caractères invisibles (espace sans chasse, BOM, césure conditionnelle, contrôles)', () => {
    expect(versWinAnsi('\uFEFFneuro\u200Bnutri\u00ADtion\u0007', jeu)).toBe('neuronutrition');
  });

  it('retire les diacritiques hors jeu par NFKD, puis remplace le reste par « ? »', () => {
    expect(versWinAnsi('Ő ą ﬁ', jeu)).toBe('O a fi');
    expect(versWinAnsi('漢 ł', jeu)).toBe('? ?');
  });

  it('tabulation → espace, \\r\\n et \\r → \\n, les \\n conservés', () => {
    expect(versWinAnsi('a\tb\r\nc\rd\n\ne', jeu)).toBe('a b\nc\nd\n\ne');
  });

  it('ne lève jamais, même sur un demi-substitut isolé, et ne rend que des caractères encodables', () => {
    const hostile = 'x\uD800y\uDC00z 😀 \u0301 ≥ \u202F 漢 \u0000\u001F\u007F\u0080\u009F \uFFFF \u{10FFFF}';
    const sortie = versWinAnsi(hostile, jeu);
    for (const car of sortie) {
      expect(car === '\n' || jeu.has(car.codePointAt(0) ?? -1)).toBe(true);
    }
  });
});

describe('rendrePdf', () => {
  it('produit un PDF', async () => {
    const octets = await rendrePdf(documentDe([{ type: 'paragraphe', texte: 'Bonjour.' }]));
    expect(octets).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder('latin1').decode(octets.slice(0, 5))).toBe('%PDF-');
  });

  it('pose les métadonnées, jamais le contenu du dossier', async () => {
    const maintenant = new Date('2026-09-26T08:30:00.000Z');
    const octets = await rendrePdf(documentDe([]), { maintenant });
    const pdf = await PDFDocument.load(octets, { updateMetadata: false });
    expect(pdf.getTitle()).toBe('Dossier PAT001 — export');
    expect(pdf.getSubject()).toBe('Export du dossier de neuronutrition');
    expect(pdf.getAuthor()).toBe('WellNeuro');
    expect(pdf.getCreator()).toBe('WellNeuro');
    expect(pdf.getProducer()).toBe('WellNeuro');
    expect(pdf.getCreationDate()?.toISOString()).toBe(maintenant.toISOString());
    expect(pdf.getModificationDate()?.toISOString()).toBe(maintenant.toISOString());
  });

  it('un document long s’étend sur plusieurs pages, comme planifié', async () => {
    const doc = documentDe(paragraphes(40, LONG));
    const octets = await rendrePdf(doc);
    const pdf = await PDFDocument.load(octets);
    const plan = await planifierPages(doc);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(pdf.getPageCount()).toBe(plan.length);
  });

  it('un document sans bloc tient sur une page', async () => {
    const pdf = await PDFDocument.load(await rendrePdf(documentDe([])));
    expect(pdf.getPageCount()).toBe(1);
  });

  it('ne lève sur aucun texte hostile, quel que soit le type de bloc', async () => {
    const hostile =
      'Humeur 😀👍🏽 ≥ 7\u202F/ 10 — Me\u0301lanie\n\n\nfin 漢 ✓ ' + 'x'.repeat(300) + ' \t\r\n suite \uD800';
    const doc = documentDe(
      [
        { type: 'titre', niveau: 1, texte: hostile },
        { type: 'titre', niveau: 2, texte: hostile },
        { type: 'titre', niveau: 3, texte: hostile },
        { type: 'paragraphe', texte: hostile },
        { type: 'paragraphe', texte: hostile, ton: 'discret' },
        { type: 'paragraphe', texte: hostile, ton: 'alerte' },
        { type: 'champ', libelle: hostile, valeur: hostile },
        { type: 'liste', elements: [hostile, '', hostile] },
        { type: 'espace' },
        { type: 'paragraphe', texte: '' },
        { type: 'liste', elements: [] },
      ],
      { titre: hostile, sousTitre: hostile, mentionPied: hostile },
    );
    await expect(rendrePdf(doc)).resolves.toBeInstanceOf(Uint8Array);
  });
});

describe('planifierPages — mise en page', () => {
  it('aucune ligne ne déborde de la marge droite, même un mot de 300 caractères', async () => {
    const url = `https://exemple.test/${'a'.repeat(280)}`;
    const plan = await planifierPages(
      documentDe([
        { type: 'paragraphe', texte: `${LONG} ${url} ${LONG}` },
        { type: 'champ', libelle: 'Lien', valeur: url },
        { type: 'liste', elements: [url, LONG] },
        { type: 'titre', niveau: 1, texte: 'b'.repeat(300) },
      ]),
    );
    const lignes = plan.flat();
    for (const ligne of lignes) expect(ligne.droite).toBeLessThanOrEqual(LARGEUR_UTILE + 0.01);
    // Le mot long est coupé sur plusieurs lignes, sans perte de caractères.
    const morceaux = lignes.filter((l) => /^a+$/.test(l.texte) || l.texte.startsWith('https://'));
    expect(morceaux.length).toBeGreaterThan(1);
  });

  it('écrit le texte converti en WinAnsi', async () => {
    const plan = await planifierPages(documentDe([{ type: 'paragraphe', texte: 'Score ≥ 12\u202F/ 20 😀' }]));
    expect(plan.flat().map((l) => l.texte)).toContain('Score >= 12 / 20');
  });

  it('champ : libellé et valeur dans le même flux, continuation en retrait de 12 pt, \\n honorés', async () => {
    const plan = await planifierPages(
      documentDe([{ type: 'champ', libelle: 'Antécédents', valeur: `${LONG}\nDeuxième ligne forcée` }]),
    );
    const lignes = plan.flat().slice(2);
    expect(lignes[0].texte.startsWith(`Antécédents : Le patient rapporte`)).toBe(true);
    expect(lignes[0].gauche).toBe(0);
    expect(lignes.length).toBeGreaterThanOrEqual(3);
    for (const ligne of lignes.slice(1)) expect(ligne.gauche).toBe(12);
    expect(lignes[lignes.length - 1].texte).toBe('Deuxième ligne forcée');
  });

  it('champ vide : l’absence s’écrit « Non renseigné », jamais un blanc', async () => {
    const plan = await planifierPages(documentDe([{ type: 'champ', libelle: 'Médecin traitant', valeur: '  ' }]));
    expect(plan.flat().map((l) => l.texte)).toContain('Médecin traitant : Non renseigné');
  });

  it('ne commence jamais une ligne par « : » ni ne la finit par « «', async () => {
    // Des libellés de longueur croissante font tomber « : » puis « « » sur le bord droit.
    const libelle = 'Un libellé de champ assez long pour atteindre le bord droit de la page, puis un peu plus loin encore';
    const plan = await planifierPages(
      documentDe(
        Array.from({ length: 40 }, (_, i): BlocExport => ({
          type: 'champ',
          libelle: libelle.slice(0, 65 + i),
          valeur: `« ${LONG} »`,
        })),
      ),
    );
    for (const ligne of plan.flat()) {
      expect(ligne.texte.startsWith(':')).toBe(false);
      expect(ligne.texte.startsWith('»')).toBe(false);
      expect(ligne.texte.endsWith('«')).toBe(false);
    }
  });

  it('liste : puce puis texte en retrait suspendu de 12 pt', async () => {
    const plan = await planifierPages(documentDe([{ type: 'liste', elements: [LONG, 'Court'] }]));
    const lignes = plan.flat().slice(2);
    expect(lignes[0].texte.startsWith('•Le patient')).toBe(true);
    expect(lignes[0].gauche).toBe(0);
    const suite = lignes.slice(1).filter((l) => !l.texte.startsWith('•'));
    expect(suite.length).toBeGreaterThan(0);
    for (const ligne of suite) expect(ligne.gauche).toBe(12);
    expect(lignes.some((l) => l.texte === '•Court')).toBe(true);
  });

  it('\\n multiples : autant de lignes, vides comprises', async () => {
    const plan = await planifierPages(documentDe([{ type: 'paragraphe', texte: 'un\n\n\nquatre' }]));
    expect(plan.flat().slice(2).map((l) => l.texte)).toEqual(['un', '', '', 'quatre']);
  });

  it('aucune ligne ne franchit la marge basse', async () => {
    const plan = await planifierPages(documentDe(paragraphes(60, LONG)));
    for (const ligne of plan.flat()) expect(ligne.haut + ligne.hauteur).toBeLessThanOrEqual(LIMITE_BAS + 0.01);
  });

  it('un titre en bas de page est repoussé avec sa suite : jamais moins de deux lignes de corps sous lui', async () => {
    let repousse = false;
    for (let n = 25; n <= 90; n++) {
      const plan = await planifierPages(
        documentDe([
          ...paragraphes(n),
          { type: 'titre', niveau: 1, texte: 'Questionnaires' },
          { type: 'titre', niveau: 2, texte: 'Sommeil' },
          { type: 'paragraphe', texte: LONG },
          ...paragraphes(3, 'Après'),
        ]),
      );
      plan.forEach((lignes, p) => {
        lignes.forEach((ligne, i) => {
          if (!ligne.titre) return;
          expect(lignes.slice(i + 1).filter((l) => !l.titre).length).toBeGreaterThanOrEqual(2);
          if (i === 0 && p > 0 && ligne.texte === 'Questionnaires') {
            const precedente = plan[p - 1];
            const fin = precedente[precedente.length - 1];
            // Le titre seul aurait tenu : il a bien été repoussé, pas débordé.
            if (fin.haut + fin.hauteur + 4 + 14 + ligne.hauteur <= LIMITE_BAS) repousse = true;
          }
        });
      });
    }
    expect(repousse).toBe(true);
  });
});
