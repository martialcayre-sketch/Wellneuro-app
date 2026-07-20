import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Repere } from './lectureAsOf';
import { LONGUEUR_MAX_NOTE, chaineDeNote, notesActives, preparerNote } from './relectureNote';

const INSTANT_ANCIEN = '2026-01-01T00:00:00.000Z';

const reperes: Repere[] = [
  { date: INSTANT_ANCIEN, source: 'episode', libelle: 'Épisode T0 confirmé' },
  { date: '2026-01-22T00:00:00.000Z', source: 'reponse', libelle: 'Réponses reçues — Q_SOM_06' },
];

const entree = (partiel: Partial<Parameters<typeof preparerNote>[0]> = {}) =>
  preparerNote({
    idPatient: 'PAT_TEST',
    praticienEmail: 'praticien@wellneuro.fr',
    texte: 'Le sommeil s’était déjà dégradé à cette date.',
    instantRelu: INSTANT_ANCIEN,
    reperes,
    ...partiel,
  });

describe('preparerNote (SP-TT LOT-02)', () => {
  it('n’écrit jamais de date d’écriture : elle est laissée à la base', () => {
    const preparation = entree();
    expect(preparation.ok).toBe(true);
    if (!preparation.ok) return;

    // L'invariant du gate. `instantRelu` est une donnée, ancienne ici ; la date
    // d'écriture n'est PAS dans ce qui part en base — c'est `@default(now())`
    // qui la pose, donc toujours le présent. Une note ne peut pas être antidatée.
    expect(preparation.donnees.instantRelu.toISOString()).toBe(INSTANT_ANCIEN);
    expect(Object.keys(preparation.donnees)).not.toContain('creeLe');
    expect(Object.keys(preparation.donnees)).not.toContain('cree_le');
    expect(Object.keys(preparation.donnees).sort()).toEqual([
      'idPatient',
      'instantRelu',
      'praticienEmail',
      'supersedesNoteId',
      'texte',
    ]);
  });

  it('accepte un instant relu ancien — c’est précisément l’usage', () => {
    const ancien = entree({ instantRelu: INSTANT_ANCIEN });
    expect(ancien.ok).toBe(true);
  });

  it('refuse une date hors repères, comme la lecture elle-même', () => {
    const preparation = entree({ instantRelu: '2026-01-15T00:00:00.000Z' });
    expect(preparation).toEqual({ ok: false, raison: 'instant_hors_reperes' });
  });

  it('refuse un instant illisible ou absent : une note dit de quel état elle parle', () => {
    expect(entree({ instantRelu: 'hier' })).toEqual({ ok: false, raison: 'instant_invalide' });
    expect(entree({ instantRelu: null })).toEqual({ ok: false, raison: 'instant_invalide' });
    expect(entree({ instantRelu: '' })).toEqual({ ok: false, raison: 'instant_invalide' });
  });

  it('refuse une note vide ou démesurée, et rogne les blancs', () => {
    expect(entree({ texte: '   ' })).toEqual({ ok: false, raison: 'texte_vide' });
    expect(entree({ texte: 'x'.repeat(LONGUEUR_MAX_NOTE + 1) })).toEqual({
      ok: false,
      raison: 'texte_trop_long',
    });

    const rognee = entree({ texte: '  une observation  ' });
    expect(rognee.ok && rognee.donnees.texte).toBe('une observation');
  });
});

const ligne = (id: string, creeLe: string, supersedesNoteId: string | null = null) => ({
  id,
  creeLe: new Date(creeLe),
  supersedesNoteId,
  texte: `note ${id}`,
});

describe('chaînage append-only des notes', () => {
  it('une correction remplace la note dans la liste active, sans effacer la précédente', () => {
    const lignes = [
      ligne('n1', '2026-02-01T10:00:00.000Z'),
      ligne('n2', '2026-02-02T10:00:00.000Z', 'n1'),
    ];

    const actives = notesActives(lignes);
    expect(actives.map((note) => note.id)).toEqual(['n2']);

    // « La précédente reste lisible » : elle sort de la liste active, pas de la
    // base — la chaîne la restitue.
    const chaine = chaineDeNote(lignes, 'n2');
    expect(chaine.map((note) => note.id)).toEqual(['n2', 'n1']);
    expect(chaine[1].texte).toBe('note n1');
  });

  it('plusieurs notes indépendantes restent toutes actives, de la plus récente à la plus ancienne', () => {
    const actives = notesActives([
      ligne('n1', '2026-02-01T10:00:00.000Z'),
      ligne('n2', '2026-02-03T10:00:00.000Z'),
      ligne('n3', '2026-02-02T10:00:00.000Z'),
    ]);
    expect(actives.map((note) => note.id)).toEqual(['n2', 'n3', 'n1']);
  });

  it('une chaîne de corrections successives ne laisse qu’une tête', () => {
    const lignes = [
      ligne('n1', '2026-02-01T10:00:00.000Z'),
      ligne('n2', '2026-02-02T10:00:00.000Z', 'n1'),
      ligne('n3', '2026-02-03T10:00:00.000Z', 'n2'),
    ];
    expect(notesActives(lignes).map((note) => note.id)).toEqual(['n3']);
    expect(chaineDeNote(lignes, 'n3').map((note) => note.id)).toEqual(['n3', 'n2', 'n1']);
  });

  it('aucune note, aucune tête', () => {
    expect(notesActives([])).toEqual([]);
    expect(chaineDeNote([], 'inconnue')).toEqual([]);
  });
});

// Garde-fou structurel : la note de relecture est PRATICIEN SEUL. Elle porte le
// regard clinique sur un état passé, jamais destiné au patient. Ce test échoue
// si un import apparaît un jour dans une surface patient.
describe('frontière patient : une note de relecture ne fuit jamais côté patient', () => {
  const RACINE = join(__dirname, '..', '..');
  const SURFACES_PATIENT = [
    join(RACINE, 'app', 'api', 'patient'),
    join(RACINE, 'app', 'api', 'portail'),
    join(RACINE, 'app', 'patient'),
    join(RACINE, 'app', 'portail'),
    join(RACINE, 'components', 'patient'),
    join(RACINE, 'components', 'patient-companion'),
  ];

  const fichiers = (dossier: string): string[] => {
    let entrees: string[];
    try {
      entrees = readdirSync(dossier);
    } catch {
      return []; // dossier absent : rien à vérifier
    }
    return entrees.flatMap((entree) => {
      const chemin = join(dossier, entree);
      if (statSync(chemin).isDirectory()) return fichiers(chemin);
      return /\.tsx?$/.test(entree) ? [chemin] : [];
    });
  };

  it('aucune surface patient n’importe le module de note ni sa route', () => {
    const coupables = SURFACES_PATIENT.flatMap(fichiers).filter((chemin) => {
      const source = readFileSync(chemin, 'utf8');
      return (
        /from\s+['"][^'"]*praticien\/relectureNote['"]/.test(source)
        || /relecture-notes/.test(source)
        || /relectureNote\./.test(source)
      );
    });
    expect(coupables).toEqual([]);
  });

  it('aucune surface patient ne lit la table des notes via Prisma', () => {
    const coupables = SURFACES_PATIENT.flatMap(fichiers).filter((chemin) =>
      /prisma\.relectureNote/.test(readFileSync(chemin, 'utf8')),
    );
    expect(coupables).toEqual([]);
  });
});
