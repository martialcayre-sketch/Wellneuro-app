import { describe, expect, it } from 'vitest';
import {
  DESTINATIONS_FEUILLE_PLUS,
  DESTINATIONS_PRATICIEN,
  GROUPES_NAVIGATION,
  RACCOURCIS_TELEPHONE,
  destinationsDuGroupe,
  estActive,
} from './destinationsPraticien';

// BANC DE LA DÉCLARATION ([[D-485]]). Une source commune ne garantit pas le bon
// affichage de chaque couche (précision de la réponse 5 (a)) : les bancs du
// rail, de la barre et de l'en-tête restent, chacun sur son rendu. Celui-ci
// fixe ce que la déclaration dit.

const ORDRE = [
  'Le Fil du jour',
  'Patients',
  'Fiche-trajectoire',
  'Consultation copilote',
  'Agenda & consultations',
  'Correspondance',
  'Confiance & droits',
  'Questionnaires',
  'Fiches conseils',
  'Compléments alimentaires',
  'Analyses biologiques',
  'Connaissances',
  'Atelier corpus',
  'Comptes du cabinet',
  'Paramètres',
];

/** Toutes les routes servies sous `/dashboard` (une par `page.tsx`), et une fiche. */
const ROUTES = [
  '/dashboard',
  '/dashboard/agenda',
  '/dashboard/bibliotheque',
  '/dashboard/bibliotheque/biologie',
  '/dashboard/bibliotheque/complements',
  '/dashboard/bibliotheque/connaissances',
  '/dashboard/bibliotheque/fiches-conseils',
  '/dashboard/bibliotheque/positions-expert',
  '/dashboard/bibliotheque/questionnaires',
  '/dashboard/biologie',
  '/dashboard/cabinet',
  '/dashboard/copilote',
  '/dashboard/corpus',
  '/dashboard/correspondance',
  '/dashboard/documents',
  '/dashboard/droits',
  '/dashboard/parametres',
  '/dashboard/patients',
  '/dashboard/patients/PAT_SEED_01',
  '/dashboard/regles',
  '/dashboard/synthese',
  '/dashboard/trajectoires',
];

const actifsSur = (chemin: string) =>
  DESTINATIONS_PRATICIEN.filter((d) => estActive(d, chemin)).map((d) => d.libelle);

describe('destinations praticien — groupes et ordre ([[D-487]])', () => {
  it('quatre groupes, intertitres T-01 à T-04, dans l’ordre', () => {
    expect(GROUPES_NAVIGATION.map((g) => g.intertitre)).toEqual(['Travail', 'Bibliothèque', 'Ateliers', 'Cabinet']);
  });

  it('quinze entrées, dans l’ordre décidé, chacune une fois', () => {
    expect(DESTINATIONS_PRATICIEN.map((d) => d.libelle)).toEqual(ORDRE);
    expect(new Set(DESTINATIONS_PRATICIEN.map((d) => d.href)).size).toBe(15);
  });

  it('les groupes se suivent sans se mêler : l’ordre de la déclaration est celui des groupes', () => {
    const parGroupe = GROUPES_NAVIGATION.flatMap((g) => destinationsDuGroupe(g.id).map((d) => d.libelle));
    expect(parGroupe).toEqual(ORDRE);
  });

  it('composition des groupes', () => {
    const libelles = (id: (typeof GROUPES_NAVIGATION)[number]['id']) => destinationsDuGroupe(id).map((d) => d.libelle);
    expect(libelles('travail')).toEqual(ORDRE.slice(0, 7));
    expect(libelles('bibliotheque')).toEqual(ORDRE.slice(7, 12));
    expect(libelles('ateliers')).toEqual(['Atelier corpus']);
    expect(libelles('cabinet')).toEqual(['Comptes du cabinet', 'Paramètres']);
  });

  it('aucune entrée sans lien : ni Documents, ni Règles, ni Positions d’expert, ni Synthèses au menu', () => {
    const hrefs = DESTINATIONS_PRATICIEN.map((d) => d.href);
    for (const absent of ['/dashboard/documents', '/dashboard/regles', '/dashboard/bibliotheque/positions-expert', '/dashboard/synthese']) {
      expect(hrefs).not.toContain(absent);
    }
  });
});

describe('destinations praticien — activation ([[D-485]] §2-§3)', () => {
  it('au plus une entrée active sur chaque route servie', () => {
    for (const chemin of ROUTES) {
      expect(actifsSur(chemin).length, chemin).toBeLessThanOrEqual(1);
    }
  });

  it('chaque destination s’allume sur sa propre route, et sur elle seule', () => {
    for (const destination of DESTINATIONS_PRATICIEN) {
      expect(actifsSur(destination.href), destination.href).toEqual([destination.libelle]);
    }
  });

  it('une fiche allume « Fiche-trajectoire », la liste « Patients »', () => {
    expect(actifsSur('/dashboard/patients/PAT_SEED_01')).toEqual(['Fiche-trajectoire']);
    expect(actifsSur('/dashboard/patients')).toEqual(['Patients']);
  });

  it('les pages sans entrée n’allument rien', () => {
    for (const chemin of ['/dashboard/documents', '/dashboard/regles', '/dashboard/synthese', '/dashboard/bibliotheque/positions-expert']) {
      expect(actifsSur(chemin), chemin).toEqual([]);
    }
  });

  it('une rubrique s’allume sur ses sous-pages, pas sur un préfixe voisin', () => {
    expect(estActive({ href: '/dashboard/corpus', activation: 'rubrique' }, '/dashboard/corpus/piece-1')).toBe(true);
    expect(estActive({ href: '/dashboard/corpus', activation: 'rubrique' }, '/dashboard/corpusx')).toBe(false);
    expect(estActive({ href: '/dashboard', activation: 'exacte' }, '/dashboard/agenda')).toBe(false);
    expect(estActive({ href: '/dashboard', activation: 'exacte' }, null)).toBe(false);
  });
});

describe('destinations praticien — téléphone ([[D-324]] §5, [[D-481]] §5)', () => {
  it('trois raccourcis : Le Fil, Fiches, Synthèses', () => {
    expect(RACCOURCIS_TELEPHONE.map((r) => [r.libelle, r.href])).toEqual([
      ['Le Fil', '/dashboard'],
      ['Fiches', '/dashboard/trajectoires'],
      ['Synthèses', '/dashboard/synthese'],
    ]);
  });

  it('« Fiches » s’allume sur une fiche, pas sur la liste des patients', () => {
    const fiches = RACCOURCIS_TELEPHONE[1];
    expect(estActive(fiches, '/dashboard/patients/PAT_SEED_01')).toBe(true);
    expect(estActive(fiches, '/dashboard/patients')).toBe(false);
  });

  it('barre et feuille réunies couvrent tout le menu, la feuille dans son ordre', () => {
    const barre = RACCOURCIS_TELEPHONE.map((r) => r.href);
    expect(DESTINATIONS_FEUILLE_PLUS.map((d) => d.href)).toEqual(
      DESTINATIONS_PRATICIEN.map((d) => d.href).filter((href) => !barre.includes(href)),
    );
    expect(barre.filter((href) => !DESTINATIONS_PRATICIEN.some((d) => d.href === href))).toEqual(['/dashboard/synthese']);
  });
});
