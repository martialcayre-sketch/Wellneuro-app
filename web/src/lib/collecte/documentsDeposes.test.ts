import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CATEGORIES_DOCUMENT,
  categorieCourante,
  estCategorieDocument,
  estMotifRetrait,
  MOTIFS_RETRAIT_DOCUMENT,
  PLAFOND_DEPOTS_24H,
  PLAFOND_DOCUMENTS_NON_CONSULTES,
} from './documentsDeposes';
import { BLOCS_COLLECTE_G11 } from '@/components/patient/collecte/textesDepot';

// Le domaine pur de la collecte ([[D-330]]).

const MIGRATION = readFileSync(
  path.join(process.cwd(), 'prisma', 'migrations', '20261018200000_documents_deposes_patient_v1', 'migration.sql'),
  'utf8',
);

function listeDuCheck(colonne: string): string[] {
  const motif = new RegExp(`CHECK \\("${colonne}" IN \\(([^)]*)\\)\\)`);
  const trouve = MIGRATION.match(motif);
  if (!trouve) throw new Error(`CHECK introuvable : ${colonne}`);
  return [...trouve[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

describe('les listes fermées sont celles de la base', () => {
  it('catégories : la liste du CHECK, dans l’ordre', () => {
    expect([...CATEGORIES_DOCUMENT]).toEqual(listeDuCheck('categorie_proposee'));
    expect([...CATEGORIES_DOCUMENT]).toEqual(listeDuCheck('categorie'));
  });

  it('motifs de retrait : la liste du CHECK', () => {
    expect([...MOTIFS_RETRAIT_DOCUMENT]).toEqual(listeDuCheck('motif_retrait'));
  });

  it('les gardes refusent ce qui n’est pas de la liste', () => {
    expect(estCategorieDocument('courrier')).toBe(true);
    expect(estCategorieDocument('ordonnance')).toBe(false);
    expect(estCategorieDocument(null)).toBe(false);
    expect(estMotifRetrait('demande_droit')).toBe(true);
    expect(estMotifRetrait('autre')).toBe(false);
  });

  it('plafonds : ceux du compte rendu (D-269 §5, D-330 §2)', () => {
    expect(PLAFOND_DEPOTS_24H).toBe(10);
    expect(PLAFOND_DOCUMENTS_NON_CONSULTES).toBe(3);
  });
});

describe('categorieCourante', () => {
  it('sans classement : la proposition du patient', () => {
    expect(categorieCourante('autre', [])).toBe('autre');
  });
  it('avec classements : le dernier', () => {
    expect(categorieCourante('autre', [{ categorie: 'courrier' }, { categorie: 'traitements_complements' }])).toBe(
      'traitements_complements',
    );
  });
});

describe('le texte de collecte de G-11 est servi tel quel', () => {
  const VALIDE = readFileSync(
    path.join(process.cwd(), '..', 'docs', 'claude', 'propositions', '2026-10-14-g11-textes-patient', 'README.md'),
    'utf8',
  );
  const section = VALIDE.split('## Texte 1 — Déposer un document dans votre espace')[1].split('\n---')[0];
  // Seule l'apostrophe est typographique à l'écran.
  const normaliser = (t: string) => t.replace(/’/g, "'").replace(/\s+/g, ' ').trim();

  it('mêmes intertitres, mêmes paragraphes, dans le même ordre', () => {
    const blocs = [...section.matchAll(/\*\*(.+?)\*\*\n\n(.+)/g)].map(m => ({ titre: m[1], texte: m[2] }));
    expect(blocs).toHaveLength(6);
    expect(BLOCS_COLLECTE_G11.map(b => ({ titre: normaliser(b.titre), texte: normaliser(b.texte) }))).toEqual(
      blocs.map(b => ({ titre: normaliser(b.titre), texte: normaliser(b.texte) })),
    );
  });
});
