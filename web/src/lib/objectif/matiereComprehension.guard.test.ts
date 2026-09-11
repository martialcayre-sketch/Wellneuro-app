import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// LA GARDE DE SURFACE DU SECOND ADAPTATEUR BORNÉ.
//
// Elle existe pour la même raison que celle de `matierePriorite.ts`, et elle a
// une charge de plus. Là-bas, `axes_prioritaires` ne devait JAMAIS sortir, et
// un seul banc suffisait à le dire. Ici, l'arbitrage du 2026-09-11 ouvre une
// porte pour l'ORDRE des axes — et une porte ouverte se garde autrement qu'une
// porte fermée : il faut prouver ce qui passe ET ce qui ne passe pas.
//
// Un axe prioritaire porte quatre champs. UN SEUL a le droit de sortir.
// Les trois autres sont exactement ce que `DC-19`/`DC-20` interdit de faire
// voyager : une bande, des scores, une consigne d'entretien.

const RACINE = path.resolve(__dirname, '../../..');
const ADAPTATEUR = 'src/lib/objectif/matiereComprehension.ts';
const APPEL = 'src/lib/objectif/propositionComprehension.ts';
const ROUTE = 'src/app/api/praticien/comprehension/proposition/route.ts';

function source(chemin: string): string {
  return fs.readFileSync(path.join(RACINE, chemin), 'utf8');
}

/** Le source débarrassé de ses commentaires — un interdit cité ne compte pas. */
function sourceSansCommentaires(chemin: string): string {
  return source(chemin)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('matière de compréhension — la surface exposée', () => {
  it('les TROIS champs interdits d’un axe ne sont jamais nommés', () => {
    const code = sourceSansCommentaires(ADAPTATEUR);
    expect(code.length).toBeGreaterThan(400); // anti-vacuité

    // `niveau_priorite` est une BANDE ; `arguments` porte des SCORES (« Score X
    // élevé » est l'exemple du contrat JSON lui-même) ; `points_a_confirmer`
    // est une consigne d'entretien. Ce qui n'est pas nommé ne peut pas sortir.
    expect(code).not.toContain('niveau_priorite');
    expect(code).not.toContain("'arguments'");
    expect(code).not.toContain('points_a_confirmer');
  });

  it('les autres clés de la synthèse ne sortent pas non plus', () => {
    const code = sourceSansCommentaires(ADAPTATEUR);
    for (const cle of ['points_de_vigilance', 'questions_entretien', 'limites', 'resume_praticien']) {
      expect(code, `« ${cle} » ne doit pas être lu ici`).not.toContain(cle);
    }
  });

  it('d’une entrée d’axe, UNE SEULE clé est extraite, et c’est « axe »', () => {
    const code = sourceSansCommentaires(ADAPTATEUR);
    const cles = [...code.matchAll(/\(entree as Record<string, unknown>\)\['([^']+)'\]/g)].map((m) => m[1]);
    expect(cles).toEqual(['axe']);
  });

  it('du blob de synthèse, seules deux clés sont atteintes', () => {
    const code = sourceSansCommentaires(ADAPTATEUR);
    const parBlob = [...code.matchAll(/\(blob as Record<string, unknown>\)\['([^']+)'\]/g)].map((m) => m[1]);
    const parHelper = [...code.matchAll(/texteDepuisBlob\([^,]+,\s*'([^']+)'\)/g)].map((m) => m[1]);
    expect([...parBlob, ...parHelper].sort()).toEqual(['axes_prioritaires', 'narratif_patient']);
  });

  it('les deux types de sortie sont FERMÉS — aucune clé de plus, aucune signature d’index', () => {
    const code = source(ADAPTATEUR);

    const synthese = code.match(/export type MatiereSyntheseGlobale = \{([\s\S]*?)\};/);
    expect(synthese, 'MatiereSyntheseGlobale introuvable').not.toBeNull();
    const champsSynthese = [...(synthese?.[1] ?? '').matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]);
    expect(champsSynthese.sort()).toEqual(['axes', 'idSynthese', 'narratifPatient']);
    expect(synthese?.[1]).not.toContain('[cle:');
    expect(synthese?.[1]).not.toContain('[key:');
    expect(synthese?.[1]).not.toContain('unknown');

    const desaccord = code.match(/export type MatiereDesaccord = \{([\s\S]*?)\};/);
    expect(desaccord, 'MatiereDesaccord introuvable').not.toBeNull();
    const champsDesaccord = [...(desaccord?.[1] ?? '').matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]);
    expect(champsDesaccord.sort()).toEqual(['idDesaccord', 'texte']);
    expect(desaccord?.[1]).not.toContain('unknown');
  });

  it('les axes sortent comme des CHAÎNES, jamais comme les objets d’origine', () => {
    // `axes: string[]` et non `axes: { axe: string }[]` : un objet, même réduit
    // à une clé aujourd'hui, est une place où l'on rajoute un champ demain sans
    // que le type de sortie change de forme.
    const code = source(ADAPTATEUR);
    expect(code).toMatch(/axes:\s*string\[\];/);
    expect(code).toMatch(/function libellesDAxes\([^)]*\): string\[\]/);
  });

  it('l’adaptateur ne rend jamais le blob entier', () => {
    const code = sourceSansCommentaires(ADAPTATEUR);
    expect(code).not.toMatch(/return[^;]*syntheseJson/);
    expect(code).not.toMatch(/\.\.\.\s*ligne\b/);
  });

  it('seule une synthèse VALIDÉE est citable — jamais un brouillon', () => {
    const code = sourceSansCommentaires(ADAPTATEUR);
    expect(code).toContain('statut: STATUT_SYNTHESE_CITABLE');
    expect(code).not.toContain('Brouillon_IA');
    expect(code).not.toContain('Corrigee_Praticien');
  });

  it('le statut citable et l’extracteur sont IMPORTÉS, jamais redéclarés', () => {
    // Une seconde définition dériverait de la première le jour où l'une bouge —
    // la borne dupliquée du 2026-09-10 a coûté une correction pour ce motif.
    const code = sourceSansCommentaires(ADAPTATEUR);
    expect(code).toMatch(
      /import \{[^}]*STATUT_SYNTHESE_CITABLE[^}]*texteDepuisBlob[^}]*\} from '\.\/matierePriorite'/,
    );
    expect(code).not.toMatch(/const STATUT_SYNTHESE_CITABLE\s*=/);
    expect(code).not.toMatch(/function texteDepuisBlob\s*\(/);
  });

  it('la trajectoire se lit dans le sens où elle s’est produite', () => {
    // L'ordre CROISSANT n'est pas cosmétique : c'est lui qui entre dans la clé
    // d'unicité des tirages, où `{A,B}` et `{B,A}` sont deux matières.
    const code = sourceSansCommentaires(ADAPTATEUR);
    expect(code).toContain("orderBy: { dateValidation: 'asc' }");
  });

  it.each([ADAPTATEUR, APPEL, ROUTE])('%s ne nomme aucun champ interdit d’un axe', (chemin) => {
    // La porte est ouverte chez l'adaptateur POUR LES LIBELLÉS. Elle doit rester
    // fermée partout en aval : c'est toujours la frontière la moins relue qui
    // laisse fuir une bande.
    const code = sourceSansCommentaires(chemin);
    expect(code.length).toBeGreaterThan(400); // anti-vacuité
    expect(code).not.toContain('niveau_priorite');
    expect(code).not.toContain('points_a_confirmer');
  });

  it('l’appel vit HORS du moteur de proposition déterministe (D-094 §4, D-167 §5)', () => {
    const code = sourceSansCommentaires(APPEL);
    expect(code).not.toContain('assemblerPropositions');
    expect(code).not.toContain('hashSources');
    expect(code).not.toContain('propositionObjectif');
  });

  it('la consigne interdit d’inventer un ordre, et le dit mot par mot', () => {
    const code = source(APPEL);
    const bloc = code.match(/const CONSIGNE = \[([\s\S]*?)\]\.join/);
    expect(bloc, 'CONSIGNE introuvable').not.toBeNull();
    const consigne = (bloc?.[1] ?? '').toLowerCase();
    for (const mot of ['ordre', 'hiérarchise', 'rang', 'liste', 'numérotation', 'diagnostic', 'score', 'seuil', 'bande']) {
      expect(consigne, `la consigne ne dit rien de « ${mot} »`).toContain(mot);
    }
  });

  it('la borne REFUSE, elle ne coupe pas, et elle n’est pas redéclarée', () => {
    const code = sourceSansCommentaires(APPEL);
    expect(code).toMatch(
      /import \{[^}]*LONGUEUR_MAX_SYNTHESE[^}]*\} from '@\/lib\/praticien\/syntheseComprehension'/,
    );
    expect(code).not.toMatch(/const LONGUEUR_MAX_SYNTHESE\s*=/);
    expect(code).not.toMatch(/texte\.(slice|substring|substr)\(/);
    expect(code).toContain("motif: 'trop_longue'");
  });

  it('le GET n’appelle jamais le modèle — ouvrir la phase 3 ne dépense pas un appel', () => {
    const code = source(ROUTE);
    const get = code.match(/export async function GET[\s\S]*?\n\}/);
    expect(get, 'GET introuvable').not.toBeNull();
    expect(get?.[0]).not.toContain('proposerComprehension');
    expect(get?.[0]).not.toContain('anthropic');
  });

  it('la route n’écrit jamais dans la table de compréhension elle-même', () => {
    // Un tirage n'est PAS une compréhension. Le verrou de publication vit
    // ailleurs ; cette route ne doit pas pouvoir court-circuiter le praticien.
    const code = sourceSansCommentaires(ROUTE);
    expect(code).not.toContain('syntheseComprehension.create');
    expect(code).not.toContain('syntheseComprehension.update');
  });

  it('la table des tirages est APPEND-ONLY depuis la route', () => {
    const code = sourceSansCommentaires(ROUTE);
    for (const verbe of ['update', 'updateMany', 'delete', 'deleteMany', 'upsert']) {
      expect(code, `propositionComprehensionIA.${verbe} ne doit pas exister`)
        .not.toContain(`propositionComprehensionIA.${verbe}`);
    }
    expect(code).toContain('propositionComprehensionIA.create');
  });

  it('l’adaptateur n’importe aucun moteur clinique', () => {
    const code = sourceSansCommentaires(ADAPTATEUR);
    for (const interdit of [
      '@/lib/clinical',
      '@/lib/clinical-engine',
      '@/lib/scoring',
      '@/lib/instruments',
      '@/lib/equilibre',
    ]) {
      expect(code).not.toContain(interdit);
    }
  });
});
