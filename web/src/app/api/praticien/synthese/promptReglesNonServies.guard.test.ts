import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT_GOUVERNANCE, VERSION_PROMPT_SYNTHESE } from '@/lib/anthropic';

// LA SECTION DES RÈGLES NON APPLIQUÉES PAR LE SERVICE, CONSIGNE v34 — ligne t77,
// [[D-511]]. Texte validé mot pour mot par le responsable le 2026-11-13, après
// corrections de sa main (fenêtre d'arrêt, date future, mention qui reprend les
// motifs au lieu de recopier un exemple).
//
// CE BANC NE PROUVE PAS QUE LE MODÈLE OBÉIT : il prouve qu'on ne peut plus toucher
// à ce texte sans le décider.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;
const TITRE_SECTION = '## Règles non appliquées par le service';
const SECTION_PRECEDENTE = "## Règles d'orientation non évaluées";
const SECTION_SUIVANTE = '## Besoins mesurés et non mesurés';

const EMPREINTE_SECTION = '670504254d48761e';

function section(): string {
  const debut = CONSIGNE.indexOf(TITRE_SECTION);
  const fin = CONSIGNE.indexOf(SECTION_SUIVANTE);
  if (debut < 0 || fin < debut) throw new Error('la section des règles non servies a disparu ou a changé de place');
  return CONSIGNE.slice(debut, fin);
}

function empreinte(texte: string): string {
  return createHash('sha256').update(texte).digest('hex').slice(0, 16);
}

describe('consigne système — les règles non appliquées par le service (D-511)', () => {
  it('la version est v34 ou au-delà : la section n’existe pas avant', () => {
    expect(Number(VERSION_PROMPT_SYNTHESE.replace('synthese-v', ''))).toBeGreaterThanOrEqual(34);
  });

  it('la section est épinglée par empreinte', () => {
    expect(empreinte(section()), 'section modifiée : le texte a été validé mot pour mot, resoumettre au responsable').toBe(EMPREINTE_SECTION);
  });

  it('elle suit la section des règles non évaluées (v33, intacte) et précède celle des besoins', () => {
    expect(CONSIGNE.indexOf(SECTION_PRECEDENTE)).toBeGreaterThan(-1);
    expect(CONSIGNE.indexOf(SECTION_PRECEDENTE)).toBeLessThan(CONSIGNE.indexOf(TITRE_SECTION));
  });

  it('les quatre situations sont distinguées', () => {
    for (const situation of [
      '« Sources de l\'orientation non vérifiées »',
      '« Règles d\'orientation non appliquées »',
      '« Règles d\'arrêt suspendues »',
      '« Règles d\'arrêt non évaluées »',
    ]) expect(section()).toContain(situation);
  });

  it('fenêtre d’arrêt et date future pour les arrêts non évalués (D-500 §1, D-508 §2)', () => {
    expect(section()).toContain('au-delà de sa fenêtre d\'arrêt, une passation datée après la date du jour, ou un questionnaire sans fenêtre d\'arrêt valide définie');
  });

  it('une règle non servie n’est ni un résultat normal, ni « rien à explorer » (DC-24)', () => {
    expect(section()).toContain('ne te permet donc pas d\'écrire qu\'aucune exploration n\'est utile');
  });

  it('aucun lien entre une règle d’arrêt et une exploration précise : le service ne le calcule pas', () => {
    expect(section()).toContain('Ne relie aucune règle d\'arrêt suspendue ou non évaluée à une exploration précise');
  });

  it('une mention qui reprend les motifs, distingue invalide et non vérifiable, et laisse la main au praticien', () => {
    expect(section()).toContain('reprend leurs motifs');
    expect(section()).toContain('Distingue une source qui ne satisfait pas les critères de validité du corpus d\'une source dont la validité n\'a pas pu être vérifiée.');
    expect(section()).toContain('Termine cette mention par « L\'appréciation relève du praticien. »');
    expect(section()).toContain('N\'y cite aucun identifiant de règle ni aucune source');
  });

  it('rien ne part au patient', () => {
    expect(section()).toContain('N\'évoque pas ce bloc dans narratif_patient.');
  });
});

describe('message envoyé au modèle — le bloc suit celui des règles non évaluées', () => {
  // En TEXTE, comme `promptReglesNonEvaluees.guard.test.ts` : `buildUserMessage`
  // n'est pas exporté. La preuve d'exécution est dans
  // `reglesNonServies.generation.test.ts`.
  const SOURCE = readFileSync(join(__dirname, '../../../../lib/synthese/generation.ts'), 'utf8');
  const MODULE = readFileSync(join(__dirname, '../../../../lib/synthese/blocReglesNonServies.ts'), 'utf8');

  it('il part même sans bloc d’orientation, et disparaît quand il est vide', () => {
    expect(SOURCE).toContain(
      '...(blocNonEvaluees ? [blocNonEvaluees] : []),\n    ...(blocNonServies ? [blocNonServies] : []),\n    ...(blocBesoins ? [blocBesoins] : []),',
    );
  });

  it('les listes viennent du service seul, jamais d’une fenêtre ni d’une horloge', () => {
    expect(MODULE).toContain('orientation.reglesNonAppliquees');
    expect(MODULE).toContain('orientation.arretsSuspendus');
    expect(MODULE).toContain('orientation.arretsNonEvalues');
    expect(MODULE).not.toMatch(/FENETRES_|Date\.now\(|maintenantMs|STOP_RULES|ORIENTATION_RULES/);
  });
});
