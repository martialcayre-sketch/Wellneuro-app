import { describe, expect, it } from 'vitest';
import { creerMasqueur, MARQUE_MASQUE, masquerDocument } from './masquage';
import type { DocumentExport, PatientExport } from './modele';

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
    expect(masquer('Dogné a prescrit')).toBe(`${M} a prescrit`);
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
    '+33 6 12 34 56 78',
    '+33612345678',
    '0033 6 12 34 56 78',
  ])('masque le téléphone écrit « %s »', forme => {
    expect(masquer(`Joindre au ${forme} le soir`)).toBe(`Joindre au ${M} le soir`);
  });

  it('retrouve le numéro stocké sous une autre forme que celle du texte', () => {
    const espace = creerMasqueur(patient({ telephone: '06 12 34 56 78' }));
    expect(espace('tél. 0612345678')).toBe(`tél. ${M}`);
  });

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

  it('ne masque pas une adresse de moins de 8 caractères', () => {
    const courte = creerMasqueur(patient({ adresse: 'Lyon' }));
    expect(courte('Né à Lyon')).toBe('Né à Lyon');
  });

  it('masque les coordonnées du médecin, leur téléphone et leur e-mail', () => {
    expect(masquer('Cabinet du parc')).toBe(M);
    expect(masquer('appeler le 01.23.45.67.89')).toBe(`appeler le ${M}`);
    expect(masquer('écrire à cabinet.parc@example.test')).toBe(`écrire à ${M}`);
  });

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
  it.each(['1985-03-14', '14/03/1985', '14/3/1985', '14.03.1985', '14 mars 1985', '14 MARS 1985'])(
    'masque « %s »',
    forme => {
      expect(masquer(`née le ${forme}.`)).toBe(`née le ${M}.`);
    },
  );

  it('ne masque ni l’année seule ni une autre date', () => {
    expect(masquer('en 1985, puis le 15/03/1985')).toBe('en 1985, puis le 15/03/1985');
  });

  it('accepte « 1er » pour un premier du mois', () => {
    const premier = creerMasqueur(patient({ dateNaissance: '1990-11-01' }));
    expect(premier('née le 1er novembre 1990')).toBe(`née le ${M}`);
    expect(premier('née le 01/11/1990')).toBe(`née le ${M}`);
  });
});

describe('creerMasqueur — garanties', () => {
  it('ne masque jamais l’identifiant PATnnn', () => {
    expect(masquer('Dossier PAT030 de Sophie Nicola (PAT030).')).toBe(`Dossier PAT030 de ${M} ${M} (PAT030).`);
    const pat = creerMasqueur(patient({ nom: 'Pat', prenom: 'PAT030' }));
    expect(pat('PAT030 et Pat')).toBe(`PAT030 et ${M}`);
  });

  it('est idempotent : la marque posée n’est pas remasquée', () => {
    const texte = 'Sophie Nicola, 06 12 34 56 78, sophie.nicola@example.test, née le 14/03/1985.';
    expect(masquer(masquer(texte))).toBe(masquer(texte));
  });

  it('laisse un texte sans donnée identifiante inchangé', () => {
    const texte = 'Fatigue le matin, sommeil fragmenté ; « score 12 » — 21 jours.';
    expect(masquer(texte)).toBe(texte);
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
});

describe('masquerDocument', () => {
  const doc: DocumentExport = {
    titre: 'Dossier de Sophie',
    sousTitre: 'Nicola — PAT030',
    mentionPied: 'Confidentiel Sophie',
    metadonnees: { titre: 'Export Nicola', sujet: 'Sujet Sophie' },
    blocs: [
      { type: 'titre', niveau: 2, texte: 'Consultation de Sophie' },
      { type: 'paragraphe', texte: 'Nicola dort mal', ton: 'alerte' },
      { type: 'paragraphe', texte: 'Sans ton Sophie' },
      { type: 'champ', libelle: 'Note sur Sophie', valeur: '« Appeler Nicola au 0612345678 »' },
      { type: 'liste', elements: ['Sophie', 'rien', 'Nicola'] },
      { type: 'espace' },
    ],
  };

  it('masque chaque texte de l’en-tête, des métadonnées et de chaque type de bloc', () => {
    expect(masquerDocument(doc, masquer)).toEqual({
      titre: `Dossier de ${M}`,
      sousTitre: `${M} — PAT030`,
      mentionPied: `Confidentiel ${M}`,
      metadonnees: { titre: `Export ${M}`, sujet: `Sujet ${M}` },
      blocs: [
        { type: 'titre', niveau: 2, texte: `Consultation de ${M}` },
        { type: 'paragraphe', texte: `${M} dort mal`, ton: 'alerte' },
        { type: 'paragraphe', texte: `Sans ton ${M}` },
        { type: 'champ', libelle: `Note sur ${M}`, valeur: `« Appeler ${M} au ${M} »` },
        { type: 'liste', elements: [M, 'rien', M] },
        { type: 'espace' },
      ],
    });
  });

  it('rend une copie neuve sans toucher au document d’origine', () => {
    const avant = JSON.stringify(doc);
    const masque = masquerDocument(doc, masquer);
    expect(JSON.stringify(doc)).toBe(avant);
    expect(masque).not.toBe(doc);
    expect(masque.blocs).not.toBe(doc.blocs);
    masque.blocs.forEach((bloc, i) => expect(bloc).not.toBe(doc.blocs[i]));
    expect(masque.metadonnees).not.toBe(doc.metadonnees);
  });

  it('applique la fonction reçue à chaque texte, et à rien d’autre', () => {
    const vus: string[] = [];
    masquerDocument(doc, texte => {
      vus.push(texte);
      return texte;
    });
    expect(vus).toEqual([
      'Dossier de Sophie',
      'Nicola — PAT030',
      'Confidentiel Sophie',
      'Export Nicola',
      'Sujet Sophie',
      'Consultation de Sophie',
      'Nicola dort mal',
      'Sans ton Sophie',
      'Note sur Sophie',
      '« Appeler Nicola au 0612345678 »',
      'Sophie',
      'rien',
      'Nicola',
    ]);
  });
});
