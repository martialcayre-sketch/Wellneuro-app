import { describe, expect, it } from 'vitest';
import {
  ALIAS_HISTORIQUES,
  CATALOGUE_DEFINITIONS,
  IDS_ASSIGNABLES,
  PASSATION_PRATICIEN,
  listeBibliotheque,
} from './bibliotheque';
import { IDS_SUSPENDUS, QUESTIONNAIRES_CATALOG } from './questionnaires-catalog';
import { calculateScore } from './questions';

describe('listeBibliotheque', () => {
  const entrees = listeBibliotheque();
  const parId = new Map(entrees.map(e => [e.id, e]));

  it('expose les instruments assignables avec leur nombre de questions', () => {
    const pss = parId.get('Q_STR_02');
    expect(pss).toBeDefined();
    expect(pss?.assignable).toBe(true);
    expect(pss?.nbQuestions).toBe(10);
    expect(pss?.passationPraticien).toBe(false);
  });

  it('marque les alias historiques non assignables, grille cible renseignée', () => {
    for (const [alias, cible] of Object.entries(ALIAS_HISTORIQUES)) {
      const entree = parId.get(alias);
      expect(entree, alias).toBeDefined();
      expect(entree?.assignable).toBe(false);
      expect(entree?.aliasVers).toBe(cible);
      expect(IDS_ASSIGNABLES.has(alias)).toBe(false);
    }
  });

  it('expose les 5 passations praticien, jamais assignables', () => {
    for (const { id } of PASSATION_PRATICIEN) {
      const entree = parId.get(id);
      expect(entree, id).toBeDefined();
      expect(entree?.passationPraticien).toBe(true);
      expect(entree?.assignable).toBe(false);
      expect(IDS_ASSIGNABLES.has(id)).toBe(false);
    }
  });

  it('ne contient aucun doublon d’identifiant', () => {
    expect(parId.size).toBe(entrees.length);
  });
});

// Suspendre un instrument (`actif: false`) doit couper l'assignation SANS
// rendre illisibles les passations déjà enregistrées. Les deux moitiés se
// tiennent : couper sans préserver ferait disparaître des données cliniques,
// préserver sans couper laisserait proposer un instrument retiré.
//
// Formulé en invariant sur TOUS les suspendus, et non sur un identifiant
// nommé : la propriété doit valoir pour la prochaine suspension aussi. Au
// 2026-07-27 il y en a deux — Q_FIB_03 (ELFE) et Q_SOM_07 (MFI-20 divergent).
describe('questionnaire suspendu (actif: false)', () => {
  const suspendus = QUESTIONNAIRES_CATALOG.filter(q => !q.actif);
  const affiches = new Set(listeBibliotheque().map(e => e.id));

  // Contrôle négatif : sans lui, les deux gardes suivantes passeraient au vert
  // sur un ensemble vide et ne prouveraient rien.
  it('il en existe au moins un dans le catalogue', () => {
    expect(suspendus.length).toBeGreaterThan(0);
  });

  it('disparaît du rayon affiché et des ids assignables', () => {
    for (const q of suspendus) {
      expect(affiches.has(q.id), q.id).toBe(false);
      expect(IDS_ASSIGNABLES.has(q.id), q.id).toBe(false);
    }
  });

  it('reste scorable — les passations existantes restent lisibles', () => {
    for (const q of suspendus) {
      const cible = ALIAS_HISTORIQUES[q.id] ?? q.id;
      expect(CATALOGUE_DEFINITIONS[cible], q.id).toBeDefined();
      // Assertion sur le vrai point d'entrée, pas sur un proxy : `calculateScore`
      // rend `{ error: 'Questionnaire introuvable' }` sur un id absent du
      // catalogue de scoring. Une « purge des inactifs » de ce catalogue —
      // le nettoyage plausible — ferait donc échouer ceci.
      expect(calculateScore(cible, {}), q.id).not.toHaveProperty('error');
    }
  });

  // Les trois gardes ci-dessus étaient VERTES avant la suspension de Q_SOM_07 :
  // Q_FIB_03 les satisfaisait déjà à lui seul. Un invariant sur « les
  // suspendus » verrouille le mécanisme, jamais la décision — le repasser à
  // `actif: true` laisserait la suite entièrement verte. D'où cette assertion
  // nommée, qui est la seule à tomber si la suspension est défaite.
  it('Q_SOM_07 (MFI-20 divergent) est suspendu et le reste', () => {
    const mfi = QUESTIONNAIRES_CATALOG.find(q => q.id === 'Q_SOM_07');
    expect(mfi, 'Q_SOM_07 doit exister au catalogue').toBeDefined();
    expect(mfi?.actif).toBe(false);
    expect(IDS_SUSPENDUS.has('Q_SOM_07')).toBe(true);
  });
});
