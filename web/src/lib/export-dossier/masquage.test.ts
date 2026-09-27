import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import {
  creerMasqueur,
  MARQUE_MASQUE,
  masquerConsultation,
  masquerPassation,
  masquerSynthese,
  plier,
} from './masquage';
import type { ConsultationExport, PassationExport, PatientExport, SyntheseExport } from './modele';
import { versWinAnsi } from './pdf';

const M = MARQUE_MASQUE;

function patient(surcharge: Partial<PatientExport> = {}): PatientExport {
  return {
    idPatient: 'PAT030',
    prenom: 'Sophie',
    nom: 'Nicola',
    dateNaissance: '1985-03-14',
    email: 'sophie.nicola@example.test',
    telephone: '0612345678',
    adresse: '12 rue des Lilas, 75011 Paris',
    nir: '199999999999999',
    medecinTraitantNom: 'Dr Michel Dogné',
    medecinTraitantCoordonnees: 'Cabinet du parc, 01 23 45 67 89, cabinet.parc@example.test',
    actif: true,
    suiviClotureLe: null,
    accessTokenRevoked: false,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    ...surcharge,
  };
}

const masquer = creerMasqueur(patient());

// Jeu WinAnsi d'une police standard : ce que le PDF saura dessiner.
let jeu: ReadonlySet<number>;
beforeAll(async () => {
  const doc = await PDFDocument.create();
  const police = await doc.embedFont(StandardFonts.Helvetica);
  jeu = new Set(police.getCharacterSet());
});

/** Ce qu'un lecteur du PDF lirait, casse et accents effacés. */
function lu(texte: string): string {
  return versWinAnsi(texte, jeu).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
}

describe('plier', () => {
  it('plie casse, accents, ligatures, pleine chasse, apostrophes, tirets et invisibles', () => {
    expect(plier('Ｎi\u{AD}cola’s \u{FB01}–Łő').plie).toBe("nicola's fi-lo");
    expect(plier('A\u{200B}B\u{200C}C\u{200D}D\u{2060}E\u{FEFF}F\u{180E}G').plie).toBe('abcdefg');
    expect(plier('ß Æ Œ Þ Ø Đ Ħ ı ð').plie).toBe('ss ae oe th o d h i d');
    expect(plier('a\u{A0}b\u{202F}c\u{85}d\te').plie).toBe('a b c d e');
  });

  it('donne, pour chaque caractère plié, la plage du texte d’origine qui l’a produit', () => {
    const { plie, debut, fin } = plier('Ｎi\u{AD}co\u{FB01} e\u{301}');
    expect(plie).toBe('nicofi e');
    expect(debut).toEqual([0, 1, 3, 4, 5, 5, 6, 7]);
    // L'accent combinant rejoint le « e » ; la césure ne rejoint rien : une
    // plage qui l'enjambe la couvre, une plage qui s'arrête avant la laisse.
    expect(fin).toEqual([1, 2, 4, 5, 6, 6, 7, 9]);
  });

  it('fusionne une suite de blancs en un seul, comme le composeur du PDF', () => {
    const { plie, debut, fin } = plier('06 \t\n\u{A0} 12');
    expect(plie).toBe('06 12');
    expect([debut[2], fin[2]]).toEqual([2, 7]);
  });

  it('plie en séparateur ce que le rendu imprime sans lettre latine : pictogramme, autre écriture, ™', () => {
    expect(plier('Merci♥Sophie').plie).toBe('merci sophie');
    expect(plier('Sophie➡Nicola').plie).toBe('sophie nicola');
    expect(plier('Nicola™Sophie').plie).toBe('nicola sophie');
    expect(plier('докторDogné').plie).toBe(' dogne');
    expect(plier('我的医生是Dogné医生').plie).toBe(' dogne ');
  });

  it('plie deux fois ce que le rendu efface : rien, ou un séparateur', () => {
    for (const texte of ['Mme\u{200B}Nicola', 'Sophie😀merci', 'Sophie❤\u{FE0F}merci', 'Mme\u{AD}Nicola']) {
      expect(plier(texte).effaces).toBe(true);
    }
    expect(plier('Mme\u{200B}Nicola').plie).toBe('mmenicola');
    expect(plier('Mme\u{200B}Nicola', ' ').plie).toBe('mme nicola');
    expect(plier('Sophie😀merci', ' ').plie).toBe('sophie merci');
    // Le liant sans chasse et le sélecteur de variante rejoignent leur voisin.
    expect(plier('Sophie👩\u{200D}⚕\u{FE0F}merci', ' ').plie).toBe('sophie merci');
    expect(plier('Jof\u{200D}frey', ' ').plie).toBe('joffrey');
    expect(plier('Sophie Nicola').effaces).toBe(false);
  });
});

describe('creerMasqueur — noms', () => {
  it.each([
    ['Sophie Nicola se plaint de fatigue.', `${M} ${M} se plaint de fatigue.`],
    ['SOPHIE nicola, sophie, NICOLA.', `${M} ${M}, ${M}, ${M}.`],
    ['Mme Nicola dort mal', `Mme ${M} dort mal`],
    ['« Sophie » a écrit', `« ${M} » a écrit`],
  ])('%s', (entree, attendu) => {
    expect(masquer(entree)).toBe(attendu);
  });

  it('masque le médecin traitant, entier puis jeton par jeton, accents indifférents', () => {
    expect(masquer('Suivie par le Dr Michel Dogné depuis 2019.')).toBe(`Suivie par le ${M} depuis 2019.`);
    expect(masquer('le docteur DOGNE, puis michel')).toBe(`le docteur ${M}, puis ${M}`);
    expect(masquer('Dogné a prescrit')).toBe(`${M} a prescrit`);
  });

  it('ne masque ni les civilités ni les mots qui contiennent le nom sans frontière', () => {
    expect(masquer('Madame, Monsieur, Docteur, Dr, Pr')).toBe('Madame, Monsieur, Docteur, Dr, Pr');
    expect(masquer('Sophiestication, Nicolas, Michelle, Dognéville')).toBe(
      'Sophiestication, Nicolas, Michelle, Dognéville',
    );
    expect(masquer('Sophie2 et 2Sophie')).toBe('Sophie2 et 2Sophie');
  });

  it('masque les jetons d’un nom composé, tirets et apostrophes compris', () => {
    const composee = creerMasqueur(patient({ prenom: 'Jennifer-Sophie', nom: "D'Martin" }));
    expect(composee('Jennifer-Sophie est là')).toBe(`${M} est là`);
    expect(composee('Jennifer Sophie, puis Jennifer seule')).toBe(`${M}, puis ${M} seule`);
    expect(composee('Mme D’Martin et Martin')).toBe(`Mme ${M} et ${M}`);
  });

  it('ne masque pas « médecin » ni « généraliste » quand ils figurent dans le nom du médecin', () => {
    const fonction = creerMasqueur(patient({ medecinTraitantNom: 'Dr Michel Dogné, médecin généraliste' }));
    expect(fonction('À évoquer avec le médecin traitant ou un généraliste.')).toBe(
      'À évoquer avec le médecin traitant ou un généraliste.',
    );
    expect(fonction('Adressée par le Dr Dogné.')).toBe(`Adressée par le Dr ${M}.`);
  });
});

// Noms D'EMPRUNT, fictifs, choisis pour leurs lettres hors du français : aucun
// ne désigne un patient.
const EMPRUNTS: Array<{ prenom: string; nom: string; temoins: string[] }> = [
  { prenom: 'Ana', nom: 'Petrović', temoins: ['petrovic'] },
  { prenom: 'Thị Hương', nom: 'Nguyễn', temoins: ['huong', 'nguyen'] },
  { prenom: 'Mirela', nom: 'Kovačević', temoins: ['mirela', 'kovacevic'] },
  { prenom: 'Ioana', nom: 'Stănescu', temoins: ['ioana', 'stanescu'] },
  { prenom: 'Łukasz', nom: 'Dvořák-Černý', temoins: ['ukasz', 'dvorak', 'cerny'] },
];

const FORMES: Array<[string, (texte: string) => string]> = [
  ['exacte (NFC)', texte => texte.normalize('NFC')],
  ['décomposée (NFD)', texte => texte.normalize('NFD')],
  ['sans accent', texte => texte.normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').replace(/Ł/g, 'L')],
  ['en majuscules', texte => texte.normalize('NFC').toUpperCase()],
];

describe('creerMasqueur — lettres de toutes les langues', () => {
  describe.each(EMPRUNTS)('$prenom $nom', ({ prenom, nom, temoins }) => {
    const masqueur = creerMasqueur(patient({ prenom, nom, email: '', medecinTraitantNom: null }));

    it.each(FORMES)('forme %s : masquée, et rien du nom ne ressort du PDF', (_forme, ecrire) => {
      const texte = `Suivie par ${ecrire(`${prenom} ${nom}`)}, qui écrit.`;
      // Témoin : sans masque, le rendu imprimerait le nom.
      expect(temoins.every(t => lu(texte).includes(t))).toBe(true);
      const masque = masqueur(texte);
      expect(masque).toBe(`Suivie par ${M} ${M}, qui écrit.`);
      for (const temoin of temoins) expect(lu(masque)).not.toContain(temoin);
    });
  });

  it('masque un prénom de trois lettres accentuées seul (« Thị »)', () => {
    const masqueur = creerMasqueur(patient({ prenom: 'Thị Hương', nom: 'Nguyễn' }));
    expect(masqueur('Thị, Hương et NGUYỄN')).toBe(`${M}, ${M} et ${M}`);
  });
});

describe('creerMasqueur — caractères que le rendu efface ou recompose', () => {
  const masqueur = creerMasqueur(
    patient({ prenom: 'Joffrey', nom: 'Lafitte', email: '', medecinTraitantNom: 'Dr Ana Petrović' }),
  );

  it.each([
    ['césure conditionnelle', 'La\u{AD}fitte', 'lafitte'],
    ['césure au milieu d’un nom accentué', 'Petro\u{AD}vić', 'petrovic'],
    ['espace sans chasse', 'Petro\u{200B}vić', 'petrovic'],
    ['liant sans chasse', 'Jof\u{200D}frey', 'joffrey'],
    ['indicateur d’ordre des octets', 'Laf\u{FEFF}itte', 'lafitte'],
    ['ligature « fi »', 'La\u{FB01}tte', 'lafitte'],
    ['ligature « ff »', 'Jo\u{FB00}rey', 'joffrey'],
    ['pleine chasse', 'Ｌａｆｉｔｔｅ', 'lafitte'],
  ])('%s', (_cas, forme, temoin) => {
    const texte = `Adressé par ${forme} hier.`;
    expect(lu(texte)).toContain(temoin);
    const masque = masqueur(texte);
    expect(masque).toBe(`Adressé par ${M} hier.`);
    expect(lu(masque)).not.toContain(temoin);
  });

  it.each([
    ['chiffres pleine chasse', '０６ １２ ３４ ５６ ７８'],
    ['traits d’union insécables', '06\u{2011}12\u{2011}34\u{2011}56\u{2011}78'],
    ['barre horizontale, que le rendu imprime « ? »', '06\u{2015}12\u{2015}34\u{2015}56\u{2015}78'],
    ['puces', '06•12•34•56•78'],
  ])('masque aussi un numéro écrit avec des %s', (_cas, forme) => {
    const tel = creerMasqueur(patient({ telephone: '06 12 34 56 78' }));
    expect(tel(`au ${forme}`)).toBe(`au ${M}`);
    expect(lu(tel(`au ${forme}`))).not.toMatch(/\d/);
  });

  it('retrouve un numéro stocké avec des séparateurs inattendus', () => {
    const puces = creerMasqueur(patient({ telephone: '06•12•34•56•78' }));
    expect(puces('tél. 0612345678')).toBe(`tél. ${M}`);
  });

  // Le composeur réduit les espaces multiples : « 06  -  12 » s'imprime « 06 - 12 ».
  it.each([
    ['06    12    34    56    78', '06 12 34 56 78'],
    ['06  -  12  -  34  -  56  -  78', '06 12 34 56 78'],
    ['06\u{A0}\u{A0}-\u{A0}\u{A0}12\u{A0}\u{A0}-\u{A0}\u{A0}34\u{A0}\u{A0}-\u{A0}\u{A0}56\u{A0}\u{A0}-\u{A0}\u{A0}78', '06 12 34 56 78'],
    ['2  -  85  -  03  -  69  -  123  -  456  -  78', null],
    ['2    85    03    69    123    456    78', null],
  ])('masque un numéro écrit avec des séparateurs larges « %s »', (forme, telephone) => {
    const large = creerMasqueur(patient({ telephone, nir: '2 85 03 69 123 456 78' }));
    expect(large(`numéro ${forme}.`)).toBe(`numéro ${M}.`);
    // Et le même numéro STOCKÉ ainsi se retrouve sous sa forme ordinaire.
    const stocke = creerMasqueur(patient({ telephone: forme, nir: forme }));
    expect(stocke(`numéro ${telephone ?? '2 85 03 69 123 456 78'}.`)).toBe(`numéro ${M}.`);
  });

  // Un nom collé à ce que le PDF DESSINE (« ? », « -> », « © ») reste un mot sur
  // la page ; un nom collé à ce qu'il EFFACE (invisible, emoji) se lit soudé ou
  // détaché : les deux sont cherchés.
  it.each([
    ['Merci♥Sophie', `Merci♥${M}`],
    ['Photo©Nicola', `Photo©${M}`],
    ['Nicola™Sophie', `${M}™${M}`],
    ['Appeler Sophie↔RDV', `Appeler ${M}↔RDV`],
    ['Sophie➡kiné', `${M}➡kiné`],
    ['RDV☎Nicola', `RDV☎${M}`],
    ['x☑Nicola', `x☑${M}`],
    ['我的医生是Dogné医生', `我的医生是${M}医生`],
    ['докторDogné', `доктор${M}`],
    ['Mme\u{200B}Nicola', `Mme\u{200B}${M}`],
    ['Nic\u{200B}ola', M],
    ['Sophie😀merci', `${M}😀merci`],
    ['Merci❤\u{FE0F}Sophie', `Merci❤\u{FE0F}${M}`],
  ])('« %s »', (texte, attendu) => {
    expect(lu(texte)).toMatch(/sophie|nicola|dogne/);
    expect(masquer(texte)).toBe(attendu);
    expect(lu(masquer(texte))).not.toMatch(/sophie|nicola|dogne/);
  });

  it('ne fait pas disparaître le pictogramme collé après un nom masqué', () => {
    expect(masquer('RDV Sophie✔ ok')).toBe(`RDV ${M}✔ ok`);
    expect(lu(masquer('RDV Sophie✔ ok'))).toContain('oui');
    expect(masquer('Nicola↔ fatigue')).toBe(`${M}↔ fatigue`);
  });
});

describe('creerMasqueur — formes soudées', () => {
  // Noms d'emprunt, fictifs.
  it.each([
    ["N'Diaye", ['Ndiaye', 'NDiaye', 'N Diaye', 'N’Diaye', 'Diaye']],
    ["D'Angelo", ['Dangelo', 'DAngelo', 'd’Angelo', 'Angelo']],
    ['Du Pont', ['Dupont', 'DUPONT', 'Du-Pont', 'Pont']],
    ['de La Fontaine', ['Lafontaine', 'LA FONTAINE', 'Delafontaine', 'Fontaine']],
  ])('%s', (nom, formes) => {
    const masqueur = creerMasqueur(patient({ nom }));
    for (const forme of formes) expect(masqueur(`Mme ${forme} dort mal`), forme).toBe(`Mme ${M} dort mal`);
  });

  // Dans ce sens seulement. Un nom stocké soudé n'est jamais cherché découpé :
  // « le petit-déjeuner » resterait sinon effacé chez une patiente Lepetit.
  // « Le Petit » écrit pour « Lepetit » est un identifiant écrit autrement — la
  // limite que le préambule du PDF annonce.
  it.each([
    ['Lepetit', 'Je saute le petit-déjeuner ; le petit creux de 16 h'],
    ['Simon', 'je ne sais pas si mon traitement convient'],
    ['Lebas', 'douleurs dans le bas du dos'],
    ['Dupain', 'du pain complet, pain blanc le soir'],
    ['Legrand', 'le grand-père paternel était diabétique'],
    ['Leblanc', 'le blanc de poulet, le blanc de l’œil'],
    ['Laporte', 'laisse la porte ouverte la nuit'],
  ])('« %s » stocké soudé laisse intacte la locution détachée', (nom, texte) => {
    const masqueur = creerMasqueur(patient({ prenom: 'Jennifer', nom }));
    expect(masqueur(texte)).toBe(texte);
    expect(masqueur(`Mme ${nom} dort mal`)).toBe(`Mme ${M} dort mal`);
  });

  it('ne masque jamais une particule seule, ni un nom court coupé en deux', () => {
    const masqueur = creerMasqueur(patient({ nom: 'de La Fontaine' }));
    expect(masqueur('de la fatigue, des réveils')).toBe('de la fatigue, des réveils');
    const delafontaine = creerMasqueur(patient({ nom: 'Delafontaine' }));
    expect(delafontaine('de la fatigue, la fontaine')).toBe('de la fatigue, la fontaine');
    const anne = creerMasqueur(patient({ prenom: 'Anne' }));
    expect(anne('un an ne suffit pas ; Anne vient')).toBe(`un an ne suffit pas ; ${M} vient`);
  });
});

describe('creerMasqueur — coordonnées', () => {
  it('masque l’e-mail entier, casse indifférente', () => {
    expect(masquer('Écrire à Sophie.Nicola@Example.test.')).toBe(`Écrire à ${M}.`);
  });

  it.each([
    '0612345678',
    '06 12 34 56 78',
    '06.12.34.56.78',
    '06-12-34-56-78',
    '06/12/34/56/78',
    '+33 6 12 34 56 78',
    '+33612345678',
    '0033 6 12 34 56 78',
    '+33 (0)6 12 34 56 78',
    '+33(0)612345678',
    '(+33) 6 12 34 56 78',
    '0033 (0)6 12 34 56 78',
  ])('masque le téléphone écrit « %s »', forme => {
    expect(masquer(`Joindre au ${forme} le soir`)).toBe(`Joindre au ${M} le soir`);
  });

  it.each(['+33 (0)6 12 34 56 78', '06/12/34/56/78', '(+33) 6 12 34 56 78', '0033 6 12 34 56 78'])(
    'retrouve le numéro stocké « %s » sous une autre forme',
    stocke => {
      const masqueur = creerMasqueur(patient({ telephone: stocke }));
      expect(masqueur('tél. 0612345678 ou 06 12 34 56 78')).toBe(`tél. ${M} ou ${M}`);
      expect(masqueur(`tél. ${stocke}`)).toBe(`tél. ${M}`);
    },
  );

  it.each(['06 12 34 56 78 - 04 78 99 88 77', '0612345678 / 0478998877', '06123456780478998877'])(
    'masque chacun des deux numéros d’un même champ « %s »',
    stocke => {
      const masqueur = creerMasqueur(patient({ telephone: stocke }));
      expect(masqueur('portable 0612345678, fixe 04.78.99.88.77')).toBe(`portable ${M}, fixe ${M}`);
    },
  );

  it.each(['Cabinet, Lyon 69006\n04 78 00 11 22', '04 78 00 11 22\n12 rue des Tilleuls 69006 Lyon'])(
    'isole le numéro du médecin collé à une ligne d’adresse « %s »',
    coordonnees => {
      const masqueur = creerMasqueur(patient({ medecinTraitantCoordonnees: coordonnees }));
      expect(masqueur('médecin au 0478001122, ou 04.78.00.11.22')).toBe(`médecin au ${M}, ou ${M}`);
    },
  );

  it('ne masque pas un numéro plus long qui contiendrait le téléphone', () => {
    expect(masquer('réf. 06123456789')).toBe('réf. 06123456789');
  });

  it('ne construit aucun motif de téléphone sous 8 chiffres', () => {
    const court = creerMasqueur(patient({ telephone: '1234567' }));
    expect(court('code 1234567')).toBe('code 1234567');
  });

  it('masque le NIR avec ou sans espaces, et sans sa clé', () => {
    expect(masquer('NIR : 1 99 99 99 999 999 99.')).toBe(`NIR : ${M}.`);
    expect(masquer('NIR : 199999999999999')).toBe(`NIR : ${M}`);
    expect(masquer('NIR : 1.99.99.99.999.999')).toBe(`NIR : ${M}`);
  });

  it('ne construit aucun motif de NIR sous 10 chiffres', () => {
    const court = creerMasqueur(patient({ nir: '123456789' }));
    expect(court('lot 123456789')).toBe('lot 123456789');
  });

  it('masque l’adresse entière et chacun de ses morceaux', () => {
    expect(masquer('Habite 12 rue des Lilas, 75011 Paris.')).toBe(`Habite ${M}.`);
    expect(masquer('Habite 12 Rue des lilas depuis peu')).toBe(`Habite ${M} depuis peu`);
    expect(masquer('à 75011 Paris')).toBe(`à ${M}`);
  });

  it('découpe une adresse saisie sur une ligne, sans virgule, avant son code postal', () => {
    const uneLigne = creerMasqueur(patient({ adresse: '12 rue des Lilas 75011 Paris' }));
    expect(uneLigne('j’habite au 12 rue des Lilas depuis peu')).toBe(`j’habite au ${M} depuis peu`);
    expect(uneLigne('installée à 75011 Paris')).toBe(`installée à ${M}`);
    expect(uneLigne('12 RUE DES LILAS 75011 PARIS')).toBe(M);
  });

  it('accepte la virgule d’usage après le numéro : « 12, rue des Lilas »', () => {
    const uneLigne = creerMasqueur(patient({ adresse: '12 rue des Lilas 75011 Paris' }));
    expect(uneLigne('au 12, rue des Lilas')).toBe(`au ${M}`);
    expect(uneLigne('au 12, rue des Lilas, 75011 Paris.')).toBe(`au ${M}.`);
    expect(uneLigne('rue des Lilas')).toBe(M);
  });

  it.each([
    ['12 rue des Lilas 75011 Paris Cedex 11', ['au 12 rue des Lilas', 'à 75011 Paris']],
    ['75011 Paris 12 rue des Lilas', ['au 12 rue des Lilas', 'à 75011 Paris']],
    ['12 rue des Lilas Paris', ['au 12 rue des Lilas', 'rue des Lilas']],
  ])('découpe l’adresse « %s » : voie, et « CP ville » jusqu’au nombre ou au Cedex qui suit', (adresse, textes) => {
    const masqueur = creerMasqueur(patient({ adresse }));
    for (const texte of textes) {
      const masque = masqueur(texte);
      expect(masque, texte).toContain(M);
      expect(masque, texte).not.toMatch(/lilas|75011/i);
    }
  });

  it('isole la voie du cabinet sans code postal, sa ville ôtée', () => {
    const masqueur = creerMasqueur(patient({ medecinTraitantCoordonnees: 'Cabinet 3 avenue Foch Lyon' }));
    expect(masqueur('Médecin au 3 avenue Foch.')).toBe(`Médecin au ${M}.`);
    // Un nom de voie qui finit par une particule n'a pas de ville à ôter.
    const sansVille = creerMasqueur(patient({ adresse: '12 rue des Lilas' }));
    expect(sansVille('au 12 rue des Roses')).toBe('au 12 rue des Roses');
  });

  it('ne masque pas une adresse de moins de 8 caractères', () => {
    const courte = creerMasqueur(patient({ adresse: 'Lyon' }));
    expect(courte('Né à Lyon')).toBe('Né à Lyon');
  });

  it('masque les coordonnées du médecin, leur téléphone et leur e-mail', () => {
    expect(masquer('Cabinet du parc')).toBe(M);
    expect(masquer('appeler le 01.23.45.67.89')).toBe(`appeler le ${M}`);
    expect(masquer('écrire à cabinet.parc@example.test')).toBe(`écrire à ${M}`);
  });

  it.each([
    'Tél 01 23 45 67 89. Mail : cabinet.parc@example.test.',
    'mail:cabinet.parc@example.test',
    '(cabinet.parc@example.test)',
    "Mail : 'cabinet.parc@example.test'",
    "Mail:'cabinet.parc@example.test'",
    'Mail : cabinet.parc@example.test.Tél 01 23 45 67 89',
    'Mail : cabinet.parc@example.test-Tél 01 23 45 67 89',
    'mél.cabinet.parc@example.test',
  ])(
    'extrait l’e-mail du médecin sans la ponctuation voisine « %s »',
    coordonnees => {
      const masqueur = creerMasqueur(patient({ medecinTraitantCoordonnees: coordonnees }));
      expect(masqueur('Le Dr m’a écrit à cabinet.parc@example.test hier.')).toBe(`Le Dr m’a écrit à ${M} hier.`);
    },
  );

  it('échappe les métacaractères des valeurs stockées', () => {
    const speciale = creerMasqueur(
      patient({ email: 'sophie.nicola+suivi@example.test', adresse: '12 rue des Lilas (bât. B) [2e]' }),
    );
    expect(speciale('mail sophie.nicola+suivi@example.test')).toBe(`mail ${M}`);
    // Non échappés, « . » et « + » auraient accepté cette adresse-ci.
    expect(speciale('mail sophie.nicolaasuivi@exampleXtest')).toBe(`mail ${M}.nicolaasuivi@exampleXtest`);
    expect(speciale('adresse 12 rue des Lilas (bât. B) [2e]')).toBe(`adresse ${M}`);
  });
});

describe('creerMasqueur — date de naissance', () => {
  it.each([
    '1985-03-14',
    '14/03/1985',
    '14/3/1985',
    '14.03.1985',
    '14 mars 1985',
    '14 MARS 1985',
    '14/03/85',
    '14.03.85',
    '14-3-85',
    '14 03 1985',
    '14 / 03 / 1985',
    '14 mars 85',
    '14031985',
    '14\u{2215}03\u{2215}1985',
    '14–03–1985',
    '14•03•85',
  ])('masque « %s »', forme => {
    expect(masquer(`née le ${forme}.`)).toBe(`née le ${M}.`);
  });

  it('ne masque ni l’année seule ni une autre date', () => {
    expect(masquer('en 1985, puis le 15/03/1985 et le 14/03/1986')).toBe('en 1985, puis le 15/03/1985 et le 14/03/1986');
  });

  it('accepte jour et mois sans zéro, et « 1er » pour un premier du mois', () => {
    const premier = creerMasqueur(patient({ dateNaissance: '1990-01-01' }));
    expect(premier('née le 1er janvier 1990')).toBe(`née le ${M}`);
    expect(premier('née le 1/1/90')).toBe(`née le ${M}`);
    expect(premier('née le 01 01 1990')).toBe(`née le ${M}`);
  });

  it('accepte le mois abrégé et la virgule autour du mois en toutes lettres', () => {
    const fevrier = creerMasqueur(patient({ dateNaissance: '1975-02-05' }));
    expect(fevrier('née le 5 févr. 1975')).toBe(`née le ${M}`);
    expect(fevrier('née le 05-février-75')).toBe(`née le ${M}`);
    expect(masquer('née le 14 mars, 1985')).toBe(`née le ${M}`);
  });

  // Séparateur exigé entre jour, mois et année ; forme compacte sur huit
  // chiffres exacts seulement ; année sur deux chiffres seulement entre
  // séparateurs : une dose, un apport ou une mesure ne se lit pas comme une date.
  it.each([
    ['2000-05-01', ['1500 mg de magnésium', 'objectif 1500 kcal', '15 00'], ['1/5/00', '01/05/2000', '01052000', '20000501', '1er mai 2000']],
    ['2000-02-01', ['1200 kcal par jour', '1 200 kcal'], ['1.2.00', '01 02 2000']],
    ['1985-03-07', ['Poids actuel : 73,85', 'Poids 73.85 kg'], ['7/3/85', '07031985', '7 mars 85']],
    ['1980-03-12', ['Plaquettes 120380 /mm3', '12380'], ['12/03/80', '12031980']],
    ['1990-01-01', ['Note 11/90', '1190 kcal'], ['1/1/90', '01011990']],
  ])('née le %s : les mesures restent, la date est masquée', (dateNaissance, intacts, dates) => {
    const masqueur = creerMasqueur(patient({ dateNaissance }));
    for (const texte of intacts) expect(masqueur(texte), texte).toBe(texte);
    for (const date of dates) expect(masqueur(`née le ${date}.`), date).toBe(`née le ${M}.`);
  });
});

describe('creerMasqueur — garanties', () => {
  it('ne masque jamais l’identifiant PATnnn', () => {
    expect(masquer('Dossier PAT030 de Sophie Nicola (PAT030).')).toBe(`Dossier PAT030 de ${M} ${M} (PAT030).`);
    const pat = creerMasqueur(patient({ nom: 'Pat', prenom: 'PAT030' }));
    expect(pat('PAT030 et Pat')).toBe(`PAT030 et ${M}`);
  });

  // Contre-audit Codex P0-1 : l'identifiant était protégé en COUPANT le texte
  // avant la recherche — un e-mail qui le contient n'était jamais vu entier.
  it('une coordonnée qui contient l’identifiant se masque entière ; un nom collé à l’identifiant aussi', () => {
    const avecId = creerMasqueur(patient({ email: 'PAT030@example.test' }));
    expect(avecId('Contact PAT030@example.test, dossier PAT030.')).toBe(`Contact ${M}, dossier PAT030.`);
    expect(avecId('écrire à pat030@EXAMPLE.test')).toBe(`écrire à ${M}`);
    expect(masquer('SophiePAT030 et PAT030Nicola')).toBe(`${M}PAT030 et PAT030${M}`);
  });

  it('est idempotent : la marque posée n’est pas remasquée', () => {
    const texte = 'Sophie Nicola, 06 12 34 56 78, sophie.nicola@example.test, née le 14/03/1985.';
    expect(masquer(masquer(texte))).toBe(masquer(texte));
  });

  it('laisse un texte sans donnée identifiante inchangé, au caractère près', () => {
    const texte = 'Fatigue le matin, sommeil fragmenté ; « score 12 » — 21 jours. Ｅｔ \u{FB01}n\u{AD}.';
    expect(masquer(texte)).toBe(texte);
  });

  it('remplace dans le texte d’origine : ce qui entoure le nom garde sa graphie', () => {
    expect(masquer('Ｒｅçｕ : So\u{AD}phie ; \u{FB01}n')).toBe(`Ｒｅçｕ : ${M} ; \u{FB01}n`);
  });

  it('n’a rien à masquer quand le dossier ne porte que l’identifiant', () => {
    const vide = creerMasqueur(
      patient({
        prenom: '',
        nom: ' ',
        dateNaissance: null,
        email: '',
        telephone: null,
        adresse: null,
        nir: null,
        medecinTraitantNom: null,
        medecinTraitantCoordonnees: null,
      }),
    );
    expect(vide('Sophie PAT030 0612345678')).toBe('Sophie PAT030 0612345678');
  });

  it('reste linéaire : 80 000 caractères hostiles en moins de 200 ms chacun', () => {
    const complet = creerMasqueur(
      patient({
        prenom: 'Jennifer-Sophie',
        nom: "de La Fontaine N'Diaye",
        telephone: '06 12 34 56 78 / 01 23 45 67 89',
        adresse: '12 rue des Lilas 75011 Paris',
        medecinTraitantNom: 'Dr Michel Dogné, médecin généraliste',
        medecinTraitantCoordonnees: 'Cabinet du parc\n04 78 00 11 22 - cabinet.parc@example.test',
      }),
    );
    const N = 80_000;
    const remplir = (motif: string) => motif.repeat(Math.ceil(N / motif.length)).slice(0, N);
    for (const texte of [
      ' '.repeat(N),
      '.'.repeat(N),
      '-'.repeat(N),
      '('.repeat(N),
      remplir('0 '),
      remplir('+33 (0)'),
      remplir('14 03 '),
      remplir('de la '),
      remplir('jennifer '),
      'e' + '\u{301}'.repeat(N - 1),
      remplir('ＪＥＮＮＩＦＥＲ '),
      remplir('\u{200B}'),
      remplir('😀'),
      remplir('( '),
    ]) {
      const debut = performance.now();
      complet(texte);
      expect(performance.now() - debut).toBeLessThan(200);
    }
  });

  // « ( » puis des blancs : l'indicatif « (+33) » n'enchaîne jamais deux `\s*`,
  // et le pli ne laisse jamais deux blancs de suite.
  it('reste linéaire sur « ( » suivi de 80 000 blancs : moins de 50 ms', () => {
    const tel = creerMasqueur(patient({ telephone: '06 12 34 56 78' }));
    const N = 80_000;
    tel('(' + ' '.repeat(N));
    for (const blanc of [' ', '\t', '\n', '\u{A0}']) {
      const debut = performance.now();
      tel('(' + blanc.repeat(N));
      expect(performance.now() - debut, JSON.stringify(blanc)).toBeLessThan(50);
    }
  });

  // Revue finale de #1237 : l'expression se compile au premier appel, de façon
  // synchrone — un dossier aux champs extrêmes, mais admis par les routes,
  // bloquait tout le serveur (e-mail très pointé : 2 min ; coordonnées de 500
  // caractères : plus de 10 min, ou débordement de pile à la compilation).
  it('se construit vite sur des champs extrêmes admis par les routes : moins de 500 ms, sans lever', () => {
    const pointe = (n: number) => `${'a.'.repeat(n)}a@${'b.'.repeat(n)}fr`;
    for (const champs of [
      { email: pointe(62) },
      { medecinTraitantCoordonnees: `Mail : ${pointe(124)}` },
      { medecinTraitantCoordonnees: '1'.repeat(499) },
      { medecinTraitantCoordonnees: `${'06 12 34 56 78, '.repeat(31)}`.slice(0, 500) },
      { adresse: `${'12, rue des Lilas'.repeat(29)}`.slice(0, 500) },
      { nom: `${'Du-'.repeat(33)}Pont` },
    ]) {
      const debut = performance.now();
      const masquer = creerMasqueur(patient(champs));
      masquer('Texte libre ordinaire, 06 12 34 56 78, a.a@b.fr, 12 rue des Lilas.');
      expect(performance.now() - debut, Object.keys(champs)[0]).toBeLessThan(500);
    }
  });

  it('un e-mail très pointé reste masqué sous sa forme entière et ses voisins emportés', () => {
    const masquer = creerMasqueur(patient({ email: 'a.b.c.d.e.f@g.h.i.fr' }));
    expect(masquer('écrire à a.b.c.d.e.f@g.h.i.fr')).toBe('écrire à [masqué]');
    expect(masquer('mél.a.b.c.d.e.f@g.h.i.fr.Tél')).not.toContain('a.b.c.d.e.f@g.h.i.fr');
  });
});

// ── Portée : les textes libres, jamais le catalogue ──

// Définition de test : l'option porte un mot qui est aussi le nom de la
// patiente fictive Jennifer Martin.
const DEFINITION: QuestionnaireDef = {
  id: 'Q_FICTIF',
  titre: 'Oiseaux observés par Martin',
  sections: [
    {
      id: 'A',
      titre: 'Observation',
      questions: [
        {
          id: 'O1',
          texte: 'Quel oiseau Martin a-t-il vu ?',
          type: 'select',
          options: [{ v: 'martin', l: 'Martin-pêcheur' }, { v: 'merle', l: 'Merle' }],
        },
      ],
    },
  ],
};

const JENNIFER = creerMasqueur(
  patient({ prenom: 'Jennifer', nom: 'Martin', email: 'jennifer.martin@example.test' }),
);

function passation(surcharge: Partial<PassationExport> = {}): PassationExport {
  return {
    idReponse: 'R1',
    idQuestionnaire: 'Q_FICTIF',
    titre: 'Oiseaux observés par Martin',
    dateReponse: new Date('2026-09-10T09:00:00Z'),
    scores: {
      type: 'sum',
      note: 'Score de Martin',
      rawAnswers: {
        O1: 'martin',
        AUTRE: 'Jennifer Martin, 06 12 34 56 78',
        AGENDA: { nuits: [{ commentaire: 'Martin ronfle' }, { duree: 7 }] },
        N: 3,
      },
    },
    scorePrincipal: 3,
    interpretation: 'Martin',
    statutValidite: 'INVALID',
    invalideLe: new Date('2026-09-11T09:00:00Z'),
    motifInvalidation: 'Saisie par Mme Martin',
    nonInterpretable: null,
    definition: DEFINITION,
    definitionRetiree: false,
    courante: false,
    ...surcharge,
  };
}

describe('masquerPassation', () => {
  it('masque les réponses en texte et le motif d’invalidation, jamais la définition, le titre ni les scores', () => {
    const p = passation();
    const avant = JSON.stringify(p);
    const masquee = masquerPassation(p, JENNIFER);
    expect(JSON.stringify(p)).toBe(avant);
    expect(masquee.definition).toBe(DEFINITION);
    expect(masquee.titre).toBe('Oiseaux observés par Martin');
    expect(masquee.interpretation).toBe('Martin');
    expect(masquee.motifInvalidation).toBe(`Saisie par Mme ${M}`);
    expect(masquee.scores).toEqual({
      type: 'sum',
      note: 'Score de Martin',
      rawAnswers: {
        // Code d'une option du catalogue : il reste, et se lit « Martin-pêcheur ».
        O1: 'martin',
        AUTRE: `${M} ${M}, ${M}`,
        AGENDA: { nuits: [{ commentaire: `${M} ronfle` }, { duree: 7 }] },
        N: 3,
      },
    });
  });

  // Un appel direct à la soumission choisit ses clés librement : hors de la
  // définition, une clé est un texte libre, imprimé parmi les codes non traduits.
  it('masque les clés hors définition, imbriquées comprises ; jamais un identifiant de question', () => {
    const p = passation({
      scores: {
        type: 'sum',
        rawAnswers: {
          O1: 'martin',
          Jennifer_Martin: 1,
          'Jennifer Martin 06 12 34 56 78': 2,
          EXTRA: { 'Jennifer Martin': 1, O1: 'x' },
        },
      },
    });
    expect(masquerPassation(p, JENNIFER).scores?.rawAnswers).toEqual({
      O1: 'martin',
      [`${M}_${M}`]: 1,
      [`${M} ${M} ${M}`]: 2,
      EXTRA: { [`${M} ${M}`]: 1, O1: 'x' },
    });
  });

  it('sans définition, toute clé est masquée ; deux clés masquées à l’identique gardent chacune leur valeur', () => {
    const p = passation({
      definition: null,
      scores: { type: 'sum', rawAnswers: { O1: 'martin', Martin: 1, Jennifer: 2, 'jennifer.martin@example.test': 'x' } },
    });
    expect(masquerPassation(p, JENNIFER).scores?.rawAnswers).toEqual({
      O1: M,
      [M]: 1,
      [`${M} (2)`]: 2,
      [`${M} (3)`]: 'x',
    });
  });

  it('sans réponses brutes ni motif : rendue telle quelle', () => {
    const p = passation({ scores: null, motifInvalidation: null });
    expect(masquerPassation(p, JENNIFER)).toEqual(p);
  });
});

function consultation(surcharge: Partial<ConsultationExport> = {}): ConsultationExport {
  return {
    idConsultation: 'CONS_1',
    statut: 'validee',
    motif: 'Fatigue chronique',
    createdAt: new Date('2026-08-01T09:00:00Z'),
    dateValidation: null,
    consentement: 'donne',
    consentementHorodatage: null,
    consentementVersion: 'v1',
    finaliteConsentement: 'Suivi de Jennifer Martin',
    ficheSignaletique: {
      situation_familiale: 'Marié·e / Pacsé·e',
      composition_foyer: 'Avec Marie et Jennifer',
      particularites: 'Voisine du Dr Dogné',
    },
    anamnese: {
      motif_principal: 'Je suis Jennifer Martin, née le 14/03/1985.',
      variation_poids: 'Stable',
      debut: 'Depuis que Martin est parti',
      attentes: ['Mieux dormir'],
      medicaments: [{ nom: 'Mélatonine', motif: 'prescrite par le Dr Dogné' }],
    },
    ...surcharge,
  };
}

describe('masquerConsultation', () => {
  // « Marie » : prénom d'emprunt, fictif, qui coïncide avec une option de la fiche.
  const MARIE = creerMasqueur(patient({ prenom: 'Marie', nom: 'Martin', email: '' }));

  it('masque chaque valeur libre de la fiche et de l’anamnèse, entrées de groupes comprises', () => {
    const masquee = masquerConsultation(consultation(), MARIE);
    expect(masquee.ficheSignaletique).toEqual({
      situation_familiale: 'Marié·e / Pacsé·e',
      composition_foyer: `Avec ${M} et Jennifer`,
      particularites: `Voisine du Dr ${M}`,
    });
    expect(masquee.anamnese).toEqual({
      motif_principal: `Je suis Jennifer ${M}, née le ${M}.`,
      variation_poids: 'Stable',
      // Hors des options d'un choix : texte écrit, donc masqué.
      debut: `Depuis que ${M} est parti`,
      attentes: ['Mieux dormir'],
      medicaments: [{ nom: 'Mélatonine', motif: `prescrite par le Dr ${M}` }],
    });
  });

  it('garde une option d’une liste fermée, même quand elle coïncide avec le prénom', () => {
    const masquee = masquerConsultation(consultation(), MARIE);
    expect(masquee.ficheSignaletique?.situation_familiale).toBe('Marié·e / Pacsé·e');
    expect(MARIE('Marié·e / Pacsé·e')).not.toBe('Marié·e / Pacsé·e');
  });

  it('masque un motif écrit hors des catégories, garde une catégorie', () => {
    expect(masquerConsultation(consultation(), JENNIFER).motif).toBe('Fatigue chronique');
    expect(masquerConsultation(consultation({ motif: 'Envoyée par le Dr Dogné' }), JENNIFER).motif).toBe(
      `Envoyée par le Dr ${M}`,
    );
  });

  it('ne touche ni aux textes de l’application ni à la consultation d’origine', () => {
    const c = consultation();
    const avant = JSON.stringify(c);
    const masquee = masquerConsultation(c, JENNIFER);
    expect(JSON.stringify(c)).toBe(avant);
    expect(masquee.finaliteConsentement).toBe('Suivi de Jennifer Martin');
    expect(masquerConsultation(consultation({ ficheSignaletique: null, anamnese: null }), JENNIFER)).toMatchObject({
      ficheSignaletique: null,
      anamnese: null,
    });
  });
});

describe('masquerSynthese', () => {
  it('masque chaque texte du JSON, en profondeur, et la note ; garde clés et valeurs non textuelles', () => {
    const s: SyntheseExport = {
      idSynthese: 'SYN_1',
      statut: 'Validee_Praticien',
      dateGeneration: new Date('2026-09-15T09:00:00Z'),
      dateValidation: null,
      modele: 'modele-ia-fictif',
      syntheseJson: {
        resume_praticien: 'Mme Martin décrit une fatigue.',
        axes_prioritaires: [{ axe: 'Sommeil', niveau_priorite: 'eleve', arguments: ['Jennifer se réveille'], poids: 2 }],
        Martin: true,
      },
      notesPraticien: 'Rappeler Jennifer au 06 12 34 56 78',
      avertissementMesureRetiree: null,
    };
    const avant = JSON.stringify(s);
    const masquee = masquerSynthese(s, JENNIFER);
    expect(JSON.stringify(s)).toBe(avant);
    expect(masquee).toEqual({
      ...s,
      syntheseJson: {
        resume_praticien: `Mme ${M} décrit une fatigue.`,
        axes_prioritaires: [{ axe: 'Sommeil', niveau_priorite: 'eleve', arguments: [`${M} se réveille`], poids: 2 }],
        Martin: true,
      },
      notesPraticien: `Rappeler ${M} au ${M}`,
    });
  });
});
