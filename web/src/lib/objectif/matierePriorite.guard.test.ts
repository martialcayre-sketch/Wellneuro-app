import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// LA GARDE DE SURFACE — ce que `D-167` §10 aurait dû demander.
//
// La décision annonçait un amendement d'`IMPORTS_INTERDITS` de `G3`. C'était une
// erreur de lecture : `G3` garde `syntheseComprehension.ts` et trois routes, et
// l'adaptateur n'en est pas — il lit `syntheses_ia`, une autre table.
//
// SURTOUT, UN INTERDIT D'IMPORT N'AURAIT RIEN PROUVÉ ICI. `resume_praticien`,
// `narratif_patient` et `axes_prioritaires` vivent dans le MÊME blob
// `syntheseJson`. Une fois la table lue — et il FAUT la lire —, l'import est
// déjà fait : ce qui reste à garder, c'est ce qui SORT. Ces bancs éprouvent la
// surface, pas la porte d'entrée.

const RACINE = path.resolve(__dirname, '../../..');
const ADAPTATEUR = 'src/lib/objectif/matierePriorite.ts';
const APPEL = 'src/lib/objectif/propositionPriorite.ts';
const ROUTE = 'src/app/api/praticien/objectifs/proposition-priorite/route.ts';

function source(chemin: string): string {
  return fs.readFileSync(path.join(RACINE, chemin), 'utf8');
}

/** Le source débarrassé de ses commentaires — un interdit cité ne compte pas. */
function sourceSansCommentaires(chemin: string): string {
  return source(chemin)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('matière de priorité — la surface exposée', () => {
  it.each([ADAPTATEUR, APPEL, ROUTE])('%s ne lit JAMAIS axes_prioritaires', (chemin) => {
    const code = sourceSansCommentaires(chemin);
    expect(code.length).toBeGreaterThan(400); // anti-vacuité
    expect(code).not.toContain('axes_prioritaires');
    expect(code).not.toContain('axesPrioritaires');
  });

  it('l’adaptateur n’extrait du blob que DEUX clés, nommées une par une', () => {
    const code = sourceSansCommentaires(ADAPTATEUR);
    const cles = [...code.matchAll(/texteDepuisBlob\([^,]+,\s*'([^']+)'\)/g)].map((m) => m[1]);
    expect(cles.sort()).toEqual(['narratif_patient', 'resume_praticien']);
  });

  it('le type de sortie est FERMÉ — aucune clé de plus, aucune signature d’index', () => {
    const code = source(ADAPTATEUR);
    const bloc = code.match(/export type MatiereSynthese = \{([\s\S]*?)\};/);
    expect(bloc, 'MatiereSynthese introuvable').not.toBeNull();
    const champs = [...(bloc?.[1] ?? '').matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]);
    expect(champs.sort()).toEqual(['idSynthese', 'narratifPatient', 'resumePraticien']);
    expect(bloc?.[1]).not.toContain('[cle:');
    expect(bloc?.[1]).not.toContain('[key:');
    expect(bloc?.[1]).not.toContain('unknown');
  });

  it('l’adaptateur ne rend jamais le blob entier', () => {
    const code = sourceSansCommentaires(ADAPTATEUR);
    // `syntheseJson` n'apparaît QUE dans le `select` et dans les deux
    // extractions. Un `return … syntheseJson` le ferait franchir la frontière.
    expect(code).not.toMatch(/return[^;]*syntheseJson/);
    expect(code).not.toMatch(/\.\.\.\s*ligne\b/);
  });

  it('seule une synthèse VALIDÉE est citable — jamais un brouillon', () => {
    // t62 : « validée » = `Validee_Praticien` ou `Corrigee_Praticien`, l'ensemble
    // du module feuille, le même que celui de la précondition T0. L'adaptateur
    // l'IMPORTE et ne nomme aucun statut lui-même : une liste locale dériverait.
    const code = sourceSansCommentaires(ADAPTATEUR);
    expect(code).toMatch(
      /import \{ STATUTS_SYNTHESE_VALIDEE \} from '@\/lib\/synthese\/statutsValidee'/,
    );
    expect(code).toContain('export const STATUTS_SYNTHESE_CITABLES = STATUTS_SYNTHESE_VALIDEE;');
    expect(code).toContain('statut: { in: [...STATUTS_SYNTHESE_CITABLES] }');
    for (const statut of ['Brouillon_IA', 'Brouillon_Praticien', 'Rejetee', 'Validee_Praticien', 'Corrigee_Praticien']) {
      expect(code).not.toContain(statut);
    }
  });

  it('le module feuille des statuts n’importe RIEN, et la précondition T0 le ré-exporte', () => {
    // Une feuille qui importerait tirerait dans l'adaptateur ce que la garde
    // « aucun moteur clinique » lui interdit. Et une précondition qui
    // redéclarerait la liste rouvrirait la divergence que t62 ferme.
    const feuille = sourceSansCommentaires('src/lib/synthese/statutsValidee.ts');
    expect(feuille).not.toMatch(/\bimport\b/);
    expect(feuille).not.toMatch(/\brequire\(/);
    expect(feuille).toContain(
      "export const STATUTS_SYNTHESE_VALIDEE = ['Validee_Praticien', 'Corrigee_Praticien'] as const;",
    );
    const precondition = sourceSansCommentaires('src/lib/clinical-engine/preconditionsT0.ts');
    expect(precondition).toContain("import { STATUTS_SYNTHESE_VALIDEE } from '../synthese/statutsValidee';");
    expect(precondition).toContain('export { STATUTS_SYNTHESE_VALIDEE };');
    expect(precondition).not.toMatch(/const STATUTS_SYNTHESE_VALIDEE\s*=/);
  });

  it.each([ADAPTATEUR, APPEL, ROUTE])('%s n’importe aucun moteur clinique', (chemin) => {
    const code = sourceSansCommentaires(chemin);
    for (const interdit of [
      '@/lib/clinical',
      '@/lib/clinical-engine',
      '@/lib/scoring',
      '@/lib/instruments',
      '@/lib/equilibre',
      // Un import RELATIF y mènerait aussi (revue de t62) : le module feuille
      // existe pour que la liste des statuts n'ait pas à passer par là.
      'clinical-engine',
      'preconditionsT0',
    ]) {
      expect(code).not.toContain(interdit);
    }
  });

  it('l’appel vit HORS du moteur de proposition déterministe (D-094 §4, D-167 §5)', () => {
    const code = sourceSansCommentaires(APPEL);
    expect(code).not.toContain('assemblerPropositions');
    expect(code).not.toContain('hashSources');
    expect(code).not.toContain('propositionObjectif');
  });

  it('la consigne interdit la liste, l’ordre et le rang (DC-19/DC-20, D-094 §3)', () => {
    const code = source(APPEL);
    const bloc = code.match(/const CONSIGNE = \[([\s\S]*?)\]\.join/);
    expect(bloc, 'CONSIGNE introuvable').not.toBeNull();
    const consigne = (bloc?.[1] ?? '').toLowerCase();
    for (const mot of ['liste', 'ordre', 'rang', 'numérotation', 'diagnostic', 'score', 'seuil']) {
      expect(consigne, `la consigne ne dit rien de « ${mot} »`).toContain(mot);
    }
  });

  it('la borne REFUSE, elle ne coupe pas, et elle n’est pas redéclarée (D-167 §3)', () => {
    const code = sourceSansCommentaires(APPEL);
    // UNE SEULE BORNE POUR CE CHAMP. `objectifNegocie.ts` la porte et la route
    // d'écriture s'en sert : en poser une seconde ici laisserait l'appel
    // produire un libellé que l'écriture refuserait, le jour où l'une bouge.
    expect(code).toMatch(
      /import \{[^}]*LONGUEUR_MAX_PRIORITE[^}]*\} from '@\/lib\/praticien\/objectifNegocie'/,
    );
    expect(code).not.toMatch(/const LONGUEUR_MAX_PRIORITE\s*=/);
    // Aucune troncature : ni `slice`, ni `substring`, ni `substr` sur le texte.
    expect(code).not.toMatch(/texte\.(slice|substring|substr)\(/);
    expect(code).toContain("motif: 'trop_longue'");
  });

  it('le GET n’appelle jamais le modèle — ouvrir un cockpit ne fait pas parler la machine', () => {
    const code = source(ROUTE);
    const get = code.match(/export async function GET[\s\S]*?\n\}/);
    expect(get, 'GET introuvable').not.toBeNull();
    expect(get?.[0]).not.toContain('proposerPriorite');
    expect(get?.[0]).not.toContain('anthropic');
  });
});
