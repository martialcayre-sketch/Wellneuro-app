import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// L'entrée publiée ré-exporte du code serveur qui ouvre Prisma au chargement
// (`import/transmission`) : ce banc ne lit que ses listes, aucune base.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import {
  DRAPEAUX_BIOFLOW,
  FICHIERS_PUBLIES,
  TABLES_BIOFLOW,
} from '@/lib/biology-library/publie';
import { RACINE, estUnTest, fichiersSource, lire, specificateursImportes } from './balayageSources';

// J3-BIOFLOW — LE BANC À LISTE FERMÉE DES IMPORTS DE LA BIOLOGIE DEPUIS
// L'EXTÉRIEUR ([[D-306]] §2, §5 ; lettre j, plan F63).
//
// Un domaine ne lit BioFlow que par son entrée publiée
// (`biology-library/publie.ts`). Les imports directs qui existaient le jour de
// la publication sont des DÉROGATIONS DATÉES : la liste ne peut que diminuer,
// et une dérogation neuve exige sa ligne datée, par un diff relu de ce
// fichier — un import nouveau rougit la CI.
//
// Le banc BP-01 voisin (`importeursBiologyLibrary.guard.test.ts`) reste la
// liste nominative de TOUS les importeurs, domaine compris ; celui-ci ne juge
// que la frontière du domaine. La garde générale de tous les domaines (K-19)
// reste au palier 2, porte 24.
//
// LIMITE, la même que BP-01 : le banc juge l'import DIRECT.
// LIMITE des drapeaux : seule la forme `process.env.WN_…` est lue dans
// `featureFlag.ts` ; une lecture par crochets ou par déstructuration
// échapperait au banc, qui ne rougit alors que si un drapeau déclaré n'est
// plus lu. La forme du fichier aujourd'hui est la seule qu'il emploie.

/** Le domaine de la biologie, par chemin : ce qui est dedans n'a pas de frontière à passer. */
const DOMAINE_BIOLOGIE = [
  'web/src/lib/biology-library/',
  'web/src/lib/bio-parcours/',
  'web/src/app/api/praticien/biologie/',
  // La page de la biologie : « Biologie fonctionnelle » jusqu'au 2026-10-18,
  // le rayon « Analyses biologiques » depuis D-324 §6 (l'ancienne adresse ne
  // fait plus que rediriger, sans import).
  'web/src/app/dashboard/bibliotheque/biologie/',
  'web/src/components/biologie/',
  'web/src/components/patient/biologie/',
];

/** Imports directs hors entrée publiée, datés du jour de la publication — liste qui ne fait que diminuer. */
const DEROGATIONS: ReadonlyArray<{ chemin: string; depuis: string }> = [
  { chemin: 'web/src/app/api/portail/comptes-rendus/route.ts', depuis: '2026-10-17' },
  { chemin: 'web/src/app/api/praticien/cockpit/route.ts', depuis: '2026-10-17' },
  { chemin: 'web/src/app/api/praticien/fil/route.ts', depuis: '2026-10-17' },
  { chemin: 'web/src/app/api/praticien/patients/route.ts', depuis: '2026-10-17' },
  { chemin: 'web/src/app/api/praticien/protocoles/versions/route.ts', depuis: '2026-10-17' },
  { chemin: 'web/src/app/dashboard/patients/[idPatient]/page.tsx', depuis: '2026-10-17' },
  { chemin: 'web/src/app/portail/[token]/comptes-rendus/page.tsx', depuis: '2026-10-17' },
  { chemin: 'web/src/components/patient-cockpit/ActeAnnulationResultat.tsx', depuis: '2026-10-17' },
  { chemin: 'web/src/components/patient-cockpit/ArbitrageBiologiquePanel.tsx', depuis: '2026-10-17' },
  { chemin: 'web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx', depuis: '2026-10-17' },
  { chemin: 'web/src/components/patient-cockpit/EstimeMesurePanel.tsx', depuis: '2026-10-17' },
  { chemin: 'web/src/components/patient-cockpit/ImportCompteRenduPanel.tsx', depuis: '2026-10-17' },
  { chemin: 'web/src/components/patient-cockpit/LectureImportBiologique.tsx', depuis: '2026-10-17' },
  { chemin: 'web/src/components/patient-cockpit/MasquageIdentite.tsx', depuis: '2026-10-17' },
  { chemin: 'web/src/components/patient-cockpit/PropositionBilanPanel.tsx', depuis: '2026-10-17' },
  { chemin: 'web/src/components/patient-cockpit/SaisieBilan.tsx', depuis: '2026-10-17' },
  { chemin: 'web/src/lib/clinical/portesBiologiquesService.ts', depuis: '2026-10-17' },
  { chemin: 'web/src/lib/fil/cartes.ts', depuis: '2026-10-17' },
  { chemin: 'web/src/lib/praticien/ancrageCorrespondance.ts', depuis: '2026-10-17' },
];

/**
 * PLAFOND FIGÉ au nombre de dérogations du jour de la publication : la liste
 * ne peut que diminuer ([[D-306]] §2). Le relever est un diff relu, jamais un
 * réflexe pour faire passer un import neuf.
 */
const PLAFOND_DEROGATIONS = 20;

/** Les lecteurs hors biologie qui passent par la seule entrée publiée ([[D-306]] §1, §4). */
const LECTEURS_PUBLIES = [
  'web/src/app/api/praticien/patients/cycle-de-vie/route.ts',
  // « Mes échanges » ([[D-293]]) : comptes rendus transmis, date seule (2026-10-18).
  'web/src/lib/portail/mesEchangesServeur.ts',
  // La collecte documentaire ([[D-330]]) : les bornes du fichier, celles du
  // compte rendu — validation seule, aucune table de la biologie (2026-10-19).
  'web/src/app/api/portail/documents/route.ts',
  'web/src/app/api/praticien/documents-deposes/contenu/route.ts',
  'web/src/lib/collecte/documentsDeposesServeur.ts',
  // Le constat du praticien sur un besoin sans score ([[D-347]], t40) : le
  // drapeau de l'étage, le fil et le verrou de clé d'une ligne citée en
  // pièce — aucune valeur lue (2026-10-23).
  'web/src/app/api/praticien/besoins/constats/route.ts',
  'web/src/lib/constats-besoin/ecriture.ts',
  'web/src/lib/constats-besoin/lecture.ts',
];

const ENTREE = 'biology-library/publie';

function designeBiologie(specificateur: string): boolean {
  return /(^|\/)biology-library(\/|$)/.test(specificateur);
}

function designeEntree(specificateur: string): boolean {
  return new RegExp(`(^|/)${ENTREE}$`).test(specificateur);
}

function horsDomaine(chemin: string): boolean {
  return !DOMAINE_BIOLOGIE.some(prefixe => chemin.startsWith(prefixe));
}

/** Le pipeline, pur — extrait pour la contre-épreuve. */
export function frontiere(fichiers: readonly { chemin: string; source: string }[]): {
  derogations: string[];
  lecteurs: string[];
} {
  const derogations: string[] = [];
  const lecteurs: string[] = [];
  for (const f of fichiers) {
    if (estUnTest(f.chemin) || !horsDomaine(f.chemin)) continue;
    const biologie = specificateursImportes(f.source).filter(designeBiologie);
    if (biologie.length === 0) continue;
    if (biologie.every(designeEntree)) lecteurs.push(f.chemin);
    else derogations.push(f.chemin);
  }
  return { derogations: derogations.sort(), lecteurs: lecteurs.sort() };
}

const lus = () => frontiere(fichiersSource().map(chemin => ({ chemin, source: lire(chemin) })));

describe('BioFlow publié — la frontière du domaine (D-306, J3-bioflow)', () => {
  it('aucun import direct hors des dérogations datées, aucune dérogation périmée', () => {
    expect(
      lus().derogations,
      'import direct neuf de la biologie : passer par `@/lib/biology-library/publie` ; '
        + 'dérogation qui n’importe plus en direct : la retirer (la liste ne fait que diminuer)',
    ).toEqual(DEROGATIONS.map(d => d.chemin).sort());
  });

  it('chaque dérogation est datée, et la liste ne dépasse pas son plafond', () => {
    expect(DEROGATIONS.length).toBeLessThanOrEqual(PLAFOND_DEROGATIONS);
    for (const d of DEROGATIONS) {
      expect(d.depuis, d.chemin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(existsSync(join(RACINE, d.chemin)), `dérogation périmée : ${d.chemin}`).toBe(true);
    }
  });

  it('un lecteur hors biologie passe par la seule entrée publiée', () => {
    expect(LECTEURS_PUBLIES.length).toBeGreaterThan(0);
    expect(lus().lecteurs).toEqual([...LECTEURS_PUBLIES].sort());
  });

  it('l’entrée ne ré-exporte que la liste fermée de ses fichiers', () => {
    const source = lire('web/src/lib/biology-library/publie.ts');
    const relatifs = specificateursImportes(source).map(s => s.replace(/^\.\//, ''));
    expect([...new Set(relatifs)].sort()).toEqual([...FICHIERS_PUBLIES].sort());
    for (const fichier of FICHIERS_PUBLIES) {
      expect(existsSync(join(RACINE, 'web/src/lib/biology-library', `${fichier}.ts`)), fichier).toBe(true);
    }
  });

  it('les tables déclarées existent, et aucune table de biologie n’y manque', () => {
    const schema = readFileSync(join(RACINE, 'web/prisma/schema.prisma'), 'utf8');
    const tables = [...schema.matchAll(/@@map\("([a-z_]+)"\)/g)].map(m => m[1]);
    for (const table of TABLES_BIOFLOW) expect(tables, table).toContain(table);
    const biologie = tables.filter(t => /biolog|^masquages_comptes_rendus$/.test(t));
    expect(biologie.filter(t => !(TABLES_BIOFLOW as readonly string[]).includes(t))).toEqual([]);
  });

  it('les drapeaux déclarés sont ceux que lit `featureFlag.ts`', () => {
    const source = lire('web/src/lib/biology-library/featureFlag.ts');
    const lus = [...new Set([...source.matchAll(/process\.env\.(WN_[A-Z_]+)/g)].map(m => m[1]))].sort();
    expect(lus).toEqual([...DRAPEAUX_BIOFLOW].sort());
  });

  // CONTRE-ÉPREUVE : un import direct neuf hors domaine rougit ; l'entrée
  // publiée fait un lecteur ; un import mixte reste une dérogation ; un fichier
  // du domaine et un banc ne comptent pas.
  it('le pipeline voit un import direct neuf et reconnaît un lecteur de l’entrée', () => {
    const r = frontiere([
      { chemin: 'web/src/lib/neuf/a.ts', source: "import { x } from '@/lib/biology-library/catalogue';" },
      { chemin: 'web/src/lib/neuf/b.ts', source: "import { y } from '@/lib/biology-library/publie';" },
      {
        chemin: 'web/src/lib/neuf/c.ts',
        source: "import { y } from '@/lib/biology-library/publie';\nimport { z } from '@/lib/biology-library/statuts';",
      },
      { chemin: 'web/src/app/api/praticien/biologie/x/route.ts', source: "import { z } from '@/lib/biology-library/statuts';" },
      { chemin: 'web/src/lib/neuf/d.test.ts', source: "import { z } from '@/lib/biology-library/statuts';" },
    ]);
    expect(r.derogations).toEqual(['web/src/lib/neuf/a.ts', 'web/src/lib/neuf/c.ts']);
    expect(r.lecteurs).toEqual(['web/src/lib/neuf/b.ts']);
  });
});
