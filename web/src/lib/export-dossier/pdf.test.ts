import { PDFDocument, StandardFonts } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { ANAMNESE_SECTIONS } from '@/lib/consultation/anamnese';
import { FICHE_SECTIONS } from '@/lib/consultation/fiche';
import { QUESTIONNAIRE_PLAINTES_LECTURE } from '@/lib/plaintes';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { Q_ALI_01_COURT_14, Q_ALI_01_SIIN_57, Q_ALI_03 } from '@/lib/questionnaires/alimentaire';
import type { BlocExport, DocumentExport } from './modele';
import { planifierPages, rendrePdf, versWinAnsi, type LignePlanifiee } from './pdf';

// Gabarit A4 du moteur : largeur 595.28 − 2 × 56, contenu jusqu'à 64 pt du bas.
const LARGEUR_UTILE = 595.28 - 56 - 56;
const LIMITE_BAS = 841.89 - 64;

let jeu: ReadonlySet<number>;

beforeAll(async () => {
  // Même jeu que le moteur : ce que les trois polices encodent toutes.
  const pdf = await PDFDocument.create();
  const polices = [
    await pdf.embedFont(StandardFonts.Helvetica),
    await pdf.embedFont(StandardFonts.HelveticaBold),
    await pdf.embedFont(StandardFonts.HelveticaOblique),
  ];
  const jeux = polices.map((p) => new Set(p.getCharacterSet()));
  jeu = new Set(polices[0].getCharacterSet().filter((c) => jeux.every((j) => j.has(c))));
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
    expect(versWinAnsi('score ⩾ 3, ⩽ 5', jeu)).toBe('score >= 3, <= 5');
    expect(versWinAnsi('√2', jeu)).toBe('racine de 2');
    expect(versWinAnsi('A ⇔ B', jeu)).toBe('A <=> B');
    expect(versWinAnsi('➡ à revoir, ⬅ retour', jeu)).toBe('-> à revoir, <- retour');
    expect(versWinAnsi('☑ fait, ☐ à faire, ✖ arrêté', jeu)).toBe('[x] fait, [ ] à faire, x arrêté');
  });

  it('« ↔ » (pictogramme) est translittéré : la note UPPS garde « 1<->4, 2<->3 », pas « 14, 23 »', () => {
    expect(versWinAnsi('item renversé (recotation 1↔4, 2↔3)', jeu)).toBe('item renversé (recotation 1<->4, 2<->3)');
    expect(versWinAnsi('axe intestin ↔ cerveau', jeu)).toBe('axe intestin <-> cerveau');
    expect(versWinAnsi('1\u2194\uFE0F4', jeu)).toBe('1<->4');
  });

  it('un pictogramme textuel non translittéré devient « ? », jamais rien', () => {
    expect(versWinAnsi('2↗3', jeu)).toBe('2?3');
    expect(versWinAnsi('☺ ok', jeu)).toBe('? ok');
  });

  it('« √ » : « racine de » quand une lettre ou un chiffre le suit, sinon une coche « [x] »', () => {
    expect(versWinAnsi('√2', jeu)).toBe('racine de 2');
    expect(versWinAnsi('√x', jeu)).toBe('racine de x');
    expect(versWinAnsi('√ fait', jeu)).toBe('[x] fait');
    expect(versWinAnsi('magnésium √', jeu)).toBe('magnésium [x]');
    expect(versWinAnsi('Mg √ ; vit D √.', jeu)).toBe('Mg [x] ; vit D [x].');
  });

  it('emoji porteurs de sens (opération, coche, croix, interdiction) : translittérés, avec ou sans VS16', () => {
    expect(versWinAnsi('3➕4, 10➖2, 8➗2', jeu)).toBe('3+4, 10-2, 8/2');
    expect(versWinAnsi('Vitamine D ✅, Magnésium ❌, fer ❎', jeu)).toBe('Vitamine D [x], Magnésium x, fer x');
    expect(versWinAnsi('lactose 🚫, sucre ⛔', jeu)).toBe('lactose [interdit], sucre [interdit]');
    // Suivis de VS16 (présentation emoji explicite) : même lecture, le sélecteur disparaît.
    expect(versWinAnsi('✅\u{FE0F} ❌\u{FE0F} ❎\u{FE0F} ⛔\u{FE0F} ➕\u{FE0F}➖\u{FE0F}➗\u{FE0F}', jeu)).toBe(
      '[x] x x [interdit] +-/',
    );
    // Entre deux chiffres : jamais recollés.
    expect(versWinAnsi('1❌2, 5🚫6, 2✅3', jeu)).toBe('1x2, 5[interdit]6, 2[x]3');
  });

  it('tout autre emoji collé à une lettre ou à un chiffre laisse un « ? », jamais rien', () => {
    expect(versWinAnsi('2😀3', jeu)).toBe('2?3');
    expect(versWinAnsi('Merci😀Sophie', jeu)).toBe('Merci?Sophie');
    expect(versWinAnsi('fatigue😴', jeu)).toBe('fatigue?');
    expect(versWinAnsi('😴fatigue', jeu)).toBe('?fatigue');
    // Une suite collée (emoji + modificateur, séquence ZWJ, plusieurs emoji) : un seul « ? ».
    expect(versWinAnsi('top👍🏽👍🏽!', jeu)).toBe('top?!');
    expect(versWinAnsi('famille\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}ok', jeu)).toBe('famille?ok');
    // Détaché par une espace ou une ponctuation : retiré.
    expect(versWinAnsi('fatigue 😴 !', jeu)).toBe('fatigue  !');
    expect(versWinAnsi('fatigue (😴)', jeu)).toBe('fatigue ()');
  });

  it('exposants : une suite hors cp1252 s’écrit « ^n », sans coller les chiffres au nombre', () => {
    expect(versWinAnsi('lymphocytes 1,2 × 10⁹/L', jeu)).toBe('lymphocytes 1,2 × 10^9/L');
    expect(versWinAnsi('10⁴ UFC', jeu)).toBe('10^4 UFC');
    expect(versWinAnsi('10⁻³, x⁻¹', jeu)).toBe('10^-3, x^-1');
    expect(versWinAnsi('Na⁺ K⁺', jeu)).toBe('Na^+ K^+');
    // ¹ ² ³ sont dans cp1252 et restent ; dans une suite mixte, la suite entière se convertit.
    expect(versWinAnsi('10¹ 10² 10³ 10¹² m²', jeu)).toBe('10¹ 10² 10³ 10¹² m²');
    expect(versWinAnsi('10¹⁰', jeu)).toBe('10^10');
  });

  it('indices : « _n »', () => {
    expect(versWinAnsi('H₂O, vitamine B₁₂, 25(OH)D₃', jeu)).toBe('H_2O, vitamine B_12, 25(OH)D_3');
  });

  it('fractions : « n/m », séparées d’un entier qui les précède', () => {
    expect(versWinAnsi('dose ⅓ comprimé', jeu)).toBe('dose 1/3 comprimé');
    expect(versWinAnsi('⅔ des repas, ⅛ de litre', jeu)).toBe('2/3 des repas, 1/8 de litre');
    expect(versWinAnsi('2⅓ comprimés', jeu)).toBe('2 1/3 comprimés');
    expect(versWinAnsi('1\u20442 et 3\u22154', jeu)).toBe('1/2 et 3/4');
    expect(versWinAnsi('½ ¼ ¾', jeu)).toBe('½ ¼ ¾');
  });

  it('aucun caractère des textes du catalogue n’est perdu ni remplacé par « ? »', () => {
    const textes: string[] = [];
    const visiter = (valeur: unknown, profondeur: number): void => {
      if (profondeur > 12) return;
      if (typeof valeur === 'string') textes.push(valeur);
      else if (Array.isArray(valeur)) valeur.forEach((v) => visiter(v, profondeur + 1));
      else if (valeur && typeof valeur === 'object') {
        // `icon` : emoji décoratif d'une option (échelle de Bristol), que l'export ne restitue pas.
        for (const [cle, v] of Object.entries(valeur)) if (cle !== 'icon') visiter(v, profondeur + 1);
      }
    };
    visiter(Object.values(QUESTIONNAIRE_CATALOGUE), 0);
    // Les DEUX formes de Q_ALI_01, quelle que soit celle que le drapeau sert.
    visiter([Q_ALI_01_COURT_14, Q_ALI_01_SIIN_57], 0);
    visiter(QUESTIONNAIRE_PLAINTES_LECTURE, 0);
    visiter(ANAMNESE_SECTIONS, 0);
    visiter(FICHE_SECTIONS, 0);
    expect(textes.length).toBeGreaterThan(5000);

    const horsJeu = new Set<string>();
    for (const texte of textes) {
      for (const car of texte.normalize('NFC')) {
        if (car !== '\n' && !jeu.has(car.codePointAt(0) ?? -1)) horsJeu.add(car);
      }
    }
    // Garde anti-vacuité : le catalogue porte bien des caractères à convertir (↔, ≥, −…).
    expect(horsJeu.has('↔')).toBe(true);
    const perdus = [...horsJeu].filter((car) => ['', '?'].includes(versWinAnsi(car, jeu)));
    expect(perdus).toEqual([]);
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

  it('retire les emoji, modificateurs, drapeaux, sélecteurs de variante et ZWJ détachés du texte', () => {
    expect(versWinAnsi('Bien 😀 dormi', jeu)).toBe('Bien  dormi');
    expect(versWinAnsi('ok 👍🏽', jeu)).toBe('ok ');
    expect(versWinAnsi('🇫🇷 France', jeu)).toBe(' France');
    // Collés au mot, ils laissent un seul « ? » (voir plus haut).
    expect(versWinAnsi('ok👍🏽', jeu)).toBe('ok?');
    expect(versWinAnsi('🇫🇷France', jeu)).toBe('?France');
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

  it('coupe un mot sans espace en temps linéaire : 300 000 caractères planifiés en moins d’une seconde, sans perte', async () => {
    const mot = 'x'.repeat(300_000);
    const debut = performance.now();
    const plan = await planifierPages(documentDe([{ type: 'paragraphe', texte: mot }]));
    const duree = performance.now() - debut;
    expect(duree).toBeLessThan(1000);
    const lignes = plan.flat().slice(2);
    expect(lignes.map((l) => l.texte).join('')).toBe(mot);
    for (const ligne of lignes) expect(ligne.droite).toBeLessThanOrEqual(LARGEUR_UTILE + 0.01);
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

  it('champ : un libellé qui finit déjà par « : » n’en reçoit pas un second (Q_ALI_03, AP13)', async () => {
    const ap13 = Q_ALI_03.sections.flatMap((s) => s.questions).find((q) => q.id === 'AP13');
    // Garde anti-vacuité : le catalogue porte bien ce libellé ponctué.
    expect(ap13?.texte.trim().endsWith(':')).toBe(true);
    const plan = await planifierPages(
      documentDe([
        { type: 'champ', libelle: ap13?.texte ?? '', valeur: 'Femme' },
        { type: 'champ', libelle: 'Sexe', valeur: 'Femme' },
      ]),
    );
    const lignes = plan.flat().map((l) => l.texte);
    expect(lignes).toContain('Vous êtes : Femme');
    expect(lignes).toContain('Sexe : Femme');
    expect(lignes.filter((l) => l.includes(': :'))).toEqual([]);
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

  /** Toute ligne « à garder avec la suite » a au moins deux lignes ordinaires après elle, sur sa page. */
  function verifierGardes(plan: LignePlanifiee[][]): void {
    for (const lignes of plan) {
      lignes.forEach((ligne, i) => {
        if (!ligne.garderAvecSuite) return;
        const suite = lignes.slice(i + 1).filter((l) => !l.garderAvecSuite);
        expect(suite.length, `« ${ligne.texte} » sans sa suite en bas de page`).toBeGreaterThanOrEqual(2);
      });
    }
  }

  /** La ligne ouvre une page alors qu'elle aurait tenu seule en bas de la précédente. */
  function repoussee(plan: LignePlanifiee[][], texte: string, espaceAvant: number): boolean {
    return plan.some((lignes, p) => {
      if (p === 0 || lignes[0]?.texte !== texte) return false;
      const fin = plan[p - 1][plan[p - 1].length - 1];
      return fin.haut + fin.hauteur + espaceAvant + lignes[0].hauteur <= LIMITE_BAS;
    });
  }

  it('un pseudo-titre en bas de page est repoussé avec sa suite, chaîne titre → pseudo-titres comprise', async () => {
    let chaineRepoussee = false;
    let seulRepousse = false;
    for (let n = 20; n <= 90; n++) {
      const chaine = await planifierPages(
        documentDe([
          ...paragraphes(n),
          { type: 'titre', niveau: 2, texte: 'Sommeil' },
          { type: 'paragraphe', texte: 'Réponses :', garderAvecSuite: true },
          { type: 'paragraphe', texte: 'Section A', ton: 'discret', garderAvecSuite: true },
          { type: 'champ', libelle: 'Question 1', valeur: 'Réponse 1' },
          { type: 'champ', libelle: 'Question 2', valeur: 'Réponse 2' },
          ...paragraphes(3, 'Après'),
        ]),
      );
      verifierGardes(chaine);
      // Le titre n'est jamais séparé de ses pseudo-titres.
      chaine.forEach((lignes) => {
        const i = lignes.findIndex((l) => l.texte === 'Sommeil');
        if (i >= 0) expect(lignes.slice(i + 1, i + 3).map((l) => l.texte)).toEqual(['Réponses :', 'Section A']);
      });
      // 4 : espace après un paragraphe ; 10 : espace avant un titre de niveau 2.
      if (repoussee(chaine, 'Sommeil', 4 + 10)) chaineRepoussee = true;

      const seul = await planifierPages(
        documentDe([
          ...paragraphes(n),
          { type: 'paragraphe', texte: 'Arguments :', garderAvecSuite: true },
          { type: 'liste', elements: ['Score PSQI élevé', 'Réveils nocturnes déclarés', 'Sieste quotidienne'] },
          ...paragraphes(3, 'Après'),
        ]),
      );
      verifierGardes(seul);
      if (repoussee(seul, 'Arguments :', 4)) seulRepousse = true;

      // Forme d'un axe de synthèse : un champ d'une ligne entre le titre et le pseudo-titre.
      const axe = await planifierPages(
        documentDe([
          ...paragraphes(n),
          { type: 'titre', niveau: 3, texte: 'Axe 1 — Sommeil' },
          { type: 'champ', libelle: 'Priorité', valeur: 'Élevée' },
          { type: 'paragraphe', texte: 'Arguments :', garderAvecSuite: true },
          { type: 'liste', elements: ['Score PSQI élevé', 'Réveils nocturnes déclarés', 'Sieste quotidienne'] },
        ]),
      );
      verifierGardes(axe);
    }
    expect(chaineRepoussee).toBe(true);
    expect(seulRepousse).toBe(true);
  });

  it('un paragraphe ordinaire n’est pas « à garder » : il peut finir une page', async () => {
    const plan = await planifierPages(documentDe(paragraphes(120)));
    expect(plan.length).toBeGreaterThan(1);
    expect(plan.flat().some((l) => l.garderAvecSuite)).toBe(false);
  });
});
