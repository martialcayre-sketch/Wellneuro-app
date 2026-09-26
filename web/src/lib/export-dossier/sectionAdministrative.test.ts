import { describe, expect, it } from 'vitest';
import { NON_RENSEIGNE, type BlocExport, type PatientExport } from './modele';
import { MENTION_PSEUDONYMISATION, sectionAdministrative } from './sectionAdministrative';

const MAINTENANT = new Date('2026-09-26T12:00:00Z');

function patient(surcharge: Partial<PatientExport> = {}): PatientExport {
  return {
    idPatient: 'PAT030',
    prenom: 'Sophie',
    nom: 'Nicola',
    dateNaissance: '1985-03-14',
    email: 'sophie.nicola@example.test',
    telephone: '06 12 34 56 78',
    adresse: '12 rue des Lilas, 75011 Paris',
    nir: '1 99 99 99 999 999 99',
    medecinTraitantNom: 'Dr Michel Dogné',
    medecinTraitantCoordonnees: 'Cabinet du parc, 01 23 45 67 89',
    actif: true,
    suiviClotureLe: null,
    accessTokenRevoked: false,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    ...surcharge,
  };
}

function valeurDe(blocs: BlocExport[], libelle: string): string | undefined {
  const bloc = blocs.find(b => b.type === 'champ' && b.libelle === libelle);
  return bloc?.type === 'champ' ? bloc.valeur : undefined;
}

describe('sectionAdministrative — version complète', () => {
  it('rend la fiche administrative entière, groupée comme à l’écran', () => {
    expect(sectionAdministrative(patient(), 'complete', MAINTENANT)).toEqual([
      { type: 'titre', niveau: 1, texte: '1. Renseignements administratifs' },
      { type: 'champ', libelle: 'Identifiant WellNeuro', valeur: 'PAT030' },
      { type: 'champ', libelle: 'Prénom', valeur: 'Sophie' },
      { type: 'champ', libelle: 'Nom', valeur: 'Nicola' },
      { type: 'champ', libelle: 'Date de naissance', valeur: '14/03/1985 (41 ans)' },
      { type: 'champ', libelle: 'Sexe', valeur: "Non recueilli par l'application" },
      { type: 'titre', niveau: 2, texte: 'Contact' },
      { type: 'champ', libelle: 'Adresse e-mail', valeur: 'sophie.nicola@example.test' },
      { type: 'champ', libelle: 'Téléphone', valeur: '06 12 34 56 78' },
      { type: 'champ', libelle: 'Adresse postale', valeur: '12 rue des Lilas, 75011 Paris' },
      { type: 'titre', niveau: 2, texte: 'Sécurité sociale' },
      { type: 'champ', libelle: 'Numéro de sécurité sociale', valeur: '1 99 99 99 999 999 99' },
      { type: 'titre', niveau: 2, texte: 'Médecin traitant' },
      { type: 'champ', libelle: 'Nom du médecin', valeur: 'Dr Michel Dogné' },
      { type: 'champ', libelle: 'Coordonnées', valeur: 'Cabinet du parc, 01 23 45 67 89' },
      { type: 'titre', niveau: 2, texte: 'État du dossier' },
      { type: 'champ', libelle: 'Dossier', valeur: 'Actif' },
      { type: 'champ', libelle: 'Accès du patient', valeur: 'Actif' },
      { type: 'champ', libelle: 'Création du dossier', valeur: '01/09/2026' },
    ]);
  });

  it('dit « Non renseigné » pour chaque valeur absente ou blanche, jamais une case vide', () => {
    const blocs = sectionAdministrative(
      patient({
        prenom: '  ',
        dateNaissance: null,
        email: '',
        telephone: null,
        adresse: '   ',
        nir: null,
        medecinTraitantNom: null,
        medecinTraitantCoordonnees: '',
      }),
      'complete',
      MAINTENANT,
    );
    for (const libelle of [
      'Prénom',
      'Date de naissance',
      'Adresse e-mail',
      'Téléphone',
      'Adresse postale',
      'Numéro de sécurité sociale',
      'Nom du médecin',
      'Coordonnées',
    ]) {
      expect(valeurDe(blocs, libelle)).toBe(NON_RENSEIGNE);
    }
    expect(valeurDe(blocs, 'Nom')).toBe('Nicola');
  });

  it('rend une date de naissance illisible telle quelle, sans âge inventé', () => {
    const blocs = sectionAdministrative(patient({ dateNaissance: '1985-02-31' }), 'complete', MAINTENANT);
    expect(valeurDe(blocs, 'Date de naissance')).toBe('31/02/1985');
  });

  it('compte l’âge en années révolues à l’instant fourni', () => {
    const veille = new Date('2026-03-13T12:00:00Z');
    expect(valeurDe(sectionAdministrative(patient(), 'complete', veille), 'Date de naissance')).toBe(
      '14/03/1985 (40 ans)',
    );
    const bebe = patient({ dateNaissance: '2025-09-01' });
    expect(valeurDe(sectionAdministrative(bebe, 'complete', MAINTENANT), 'Date de naissance')).toBe(
      '01/09/2025 (1 an)',
    );
  });

  it('rend l’état du dossier : inactif, suivi clôturé, accès révoqué', () => {
    const blocs = sectionAdministrative(
      patient({ actif: false, suiviClotureLe: new Date('2026-09-20T22:30:00Z'), accessTokenRevoked: true }),
      'complete',
      MAINTENANT,
    );
    expect(valeurDe(blocs, 'Dossier')).toBe('Inactif');
    // 22 h 30 UTC le 20 = le 21 à Paris.
    expect(valeurDe(blocs, 'Suivi')).toBe('Clôturé le 21/09/2026');
    expect(valeurDe(blocs, 'Accès du patient')).toBe('Révoqué');
  });

  it('n’écrit pas de ligne « Suivi » tant que le suivi n’est pas clôturé', () => {
    expect(valeurDe(sectionAdministrative(patient(), 'complete', MAINTENANT), 'Suivi')).toBeUndefined();
  });
});

describe('sectionAdministrative — version IA externe', () => {
  it('ne garde que l’identifiant, l’âge, le sexe non recueilli et l’état du dossier', () => {
    expect(sectionAdministrative(patient(), 'ia-externe', MAINTENANT)).toEqual([
      { type: 'titre', niveau: 1, texte: '1. Renseignements administratifs' },
      { type: 'champ', libelle: 'Identifiant WellNeuro', valeur: 'PAT030' },
      { type: 'champ', libelle: 'Âge', valeur: '41 ans' },
      { type: 'champ', libelle: 'Sexe', valeur: "Non recueilli par l'application" },
      { type: 'titre', niveau: 2, texte: 'État du dossier' },
      { type: 'champ', libelle: 'Dossier', valeur: 'Actif' },
      { type: 'champ', libelle: 'Accès du patient', valeur: 'Actif' },
      { type: 'champ', libelle: 'Création du dossier', valeur: '01/09/2026' },
      { type: 'paragraphe', texte: MENTION_PSEUDONYMISATION, ton: 'discret' },
    ]);
  });

  it('annonce la pseudonymisation dans les mots attendus', () => {
    expect(MENTION_PSEUDONYMISATION).toBe(
      'Version pseudonymisée : nom, prénom, date de naissance, coordonnées, numéro de sécurité sociale et médecin traitant sont retirés de ce document.',
    );
  });

  it('dit « Non renseigné » quand l’âge ne se calcule pas — jamais la date à la place', () => {
    for (const dateNaissance of [null, '', '1985-02-31', '14/03/1985', '2030-01-01']) {
      const blocs = sectionAdministrative(patient({ dateNaissance }), 'ia-externe', MAINTENANT);
      expect(valeurDe(blocs, 'Âge')).toBe(NON_RENSEIGNE);
      expect(valeurDe(blocs, 'Date de naissance')).toBeUndefined();
    }
  });

  it('garde l’état du dossier complet, clôture et révocation comprises', () => {
    const blocs = sectionAdministrative(
      patient({ actif: false, suiviClotureLe: new Date('2026-09-20T10:00:00Z'), accessTokenRevoked: true }),
      'ia-externe',
      MAINTENANT,
    );
    expect(valeurDe(blocs, 'Dossier')).toBe('Inactif');
    expect(valeurDe(blocs, 'Suivi')).toBe('Clôturé le 20/09/2026');
    expect(valeurDe(blocs, 'Accès du patient')).toBe('Révoqué');
  });

  describe('aucune valeur identifiante ne figure dans les blocs', () => {
    const variantes: [string, PatientExport][] = [
      ['Sophie Nicola', patient()],
      [
        'Jennifer Martin',
        patient({
          idPatient: 'PAT031',
          prenom: 'Jennifer',
          nom: 'Martin',
          dateNaissance: '1990-11-02',
          email: 'jennifer.martin@example.test',
          telephone: '+33 7 00 00 00 01',
          adresse: '4 allée des Tilleuls\n69000 Lyon',
          nir: '299999999999999',
          medecinTraitantNom: 'Docteur Michel Dogné',
          medecinTraitantCoordonnees: 'michel.dogne@example.test',
          actif: false,
          suiviClotureLe: new Date('2026-09-10T10:00:00Z'),
          accessTokenRevoked: true,
        }),
      ],
    ];

    it.each(variantes)('%s', (_nom, p) => {
      const blocs = sectionAdministrative(p, 'ia-externe', MAINTENANT);
      const texte = JSON.stringify(blocs).toLowerCase();
      const chiffres = (valeur: string | null) => (valeur ?? '').replace(/\D/g, '');
      const interdits = [
        p.prenom,
        p.nom,
        p.email,
        p.telephone,
        p.adresse,
        p.nir,
        p.medecinTraitantNom,
        p.medecinTraitantCoordonnees,
        p.dateNaissance,
        p.dateNaissance?.split('-').reverse().join('/'),
        p.dateNaissance?.slice(0, 4),
        ...(p.adresse ?? '').split(/[\s,\n]+/).filter(mot => mot.length >= 4),
        ...(p.medecinTraitantNom ?? '').split(/\s+/).filter(mot => mot.length >= 3),
      ].filter((v): v is string => typeof v === 'string' && v.length > 0);

      for (const interdit of interdits) {
        expect(texte, interdit).not.toContain(interdit.toLowerCase());
      }
      const suiteDeChiffres = JSON.stringify(blocs).replace(/\D/g, '');
      for (const numero of [chiffres(p.telephone), chiffres(p.nir)]) {
        expect(suiteDeChiffres).not.toContain(numero);
      }
      // Aucun libellé identifiant n'est seulement vidé : il est absent.
      for (const libelle of ['Prénom', 'Nom', 'Date de naissance', 'Adresse e-mail', 'Téléphone',
        'Adresse postale', 'Numéro de sécurité sociale', 'Nom du médecin', 'Coordonnées']) {
        expect(valeurDe(blocs, libelle)).toBeUndefined();
      }
    });
  });
});
