import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT_GOUVERNANCE, VERSION_PROMPT_SYNTHESE } from '@/lib/anthropic';

// LA SECTION DES RÈGLES D'ORIENTATION NON ÉVALUÉES, CONSIGNE v33 — ligne t61,
// [[D-471]]. Texte validé mot pour mot par le responsable le 2026-11-09, après deux
// corrections de sa main (« certaines règles », exemple réduit au PSS-10).
//
// CE BANC NE PROUVE PAS QUE LE MODÈLE OBÉIT : il prouve qu'on ne peut plus toucher
// à ce texte sans le décider.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;
const TITRE_SECTION = "## Règles d'orientation non évaluées";
// Depuis v34 ([[D-511]]), la section des règles non appliquées par le service
// s'insère entre celle-ci et celle des besoins : la borne de fin la suit, et
// l'empreinte de la section v33 est inchangée.
const SECTION_SUIVANTE = '## Règles non appliquées par le service';

const EMPREINTE_SECTION = 'e957110d87808289';

function section(): string {
  const debut = CONSIGNE.indexOf(TITRE_SECTION);
  const fin = CONSIGNE.indexOf(SECTION_SUIVANTE);
  if (debut < 0 || fin < debut) throw new Error('la section des règles non évaluées a disparu ou a changé de place');
  return CONSIGNE.slice(debut, fin);
}

function empreinte(texte: string): string {
  return createHash('sha256').update(texte).digest('hex').slice(0, 16);
}

describe('consigne système — les règles d’orientation non évaluées (D-471)', () => {
  it('la version est v33 ou au-delà : la section n’existe pas avant', () => {
    expect(Number(VERSION_PROMPT_SYNTHESE.replace('synthese-v', ''))).toBeGreaterThanOrEqual(33);
  });

  it('la section est épinglée par empreinte', () => {
    expect(empreinte(section()), 'section modifiée : le texte a été validé mot pour mot, resoumettre au responsable').toBe(EMPREINTE_SECTION);
  });

  it('elle suit le bloc de recommandation et précède celui des besoins', () => {
    expect(CONSIGNE.indexOf("## Recommandation d'exploration déterministe")).toBeLessThan(CONSIGNE.indexOf(TITRE_SECTION));
  });

  it('« certaines règles », jamais toutes : un déclencheur frais peut en écarter', () => {
    expect(section()).toContain('Certaines règles qui lisent ces passations sont restées non évaluées');
    expect(section()).toContain('certaines règles qui le lisent n\'ont pas été évaluées');
  });

  it('une règle non évaluée n’est ni un résultat normal, ni « rien à explorer » (DC-24)', () => {
    expect(section()).toContain('ne te permet donc pas d\'écrire qu\'aucune exploration n\'est utile');
  });

  it('aucune proposition de refaire, et la réévaluation reste au praticien (D-433 §3)', () => {
    expect(section()).toContain('Ne propose pas de refaire ces questionnaires');
    expect(section()).toContain('L\'opportunité d\'une réévaluation relève du praticien.');
  });

  it('la mesure est datée, jamais l’état actuel, et prime sur la passation courante pour elle seule', () => {
    expect(section()).toContain('la dernière mesure disponible, datée, pas l\'état actuel du patient');
    expect(section()).toContain('Pour ces passations seulement, cette règle prime sur « rapporte l\'état actuel d\'après la passation courante »');
    expect(CONSIGNE).toContain("**rapporte l'état actuel d'après la passation courante**");
  });

  it('la fenêtre n’est pas une validité, et rien ne part au patient', () => {
    expect(section()).toContain('pas une durée de validité du questionnaire');
    expect(section()).toContain('N\'évoque pas ce bloc dans narratif_patient.');
  });
});

describe('message envoyé au modèle — le bloc suit celui de l’orientation', () => {
  // En TEXTE, comme `promptBesoins.guard.test.ts` : `buildUserMessage` n'est pas
  // exporté. La preuve d'exécution est dans `reglesNonEvaluees.generation.test.ts`.
  const SOURCE = readFileSync(join(__dirname, '../../../../lib/synthese/generation.ts'), 'utf8');

  it('il part même sans bloc d’orientation, et disparaît quand il est vide', () => {
    expect(SOURCE).toContain(
      "...(blocOrientation ? [blocOrientation] : []),\n    ...(blocNonEvaluees ? [blocNonEvaluees] : []),\n    ...(blocNonServies ? [blocNonServies] : []),\n    ...(blocBesoins ? [blocBesoins] : []),",
    );
  });

  it('la liste vient du moteur seul, jamais de l’âge des passations', () => {
    const MODULE = readFileSync(join(__dirname, '../../../../lib/synthese/blocReglesNonEvaluees.ts'), 'utf8');
    expect(MODULE).toContain('orientation.reglesNonEvaluees');
    expect(MODULE).not.toMatch(/FENETRES_FRAICHEUR_ORIENTATION|Date\.now\(|maintenantMs/);
  });
});
