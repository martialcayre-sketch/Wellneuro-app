import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT_GOUVERNANCE, VERSION_PROMPT_SYNTHESE } from '@/lib/anthropic';

// LA SECTION DES BESOINS ET LA PUCE DU TEXTE PATIENT, CONSIGNE v32 — H95 part A,
// [[D-462]]. Textes validés mot pour mot par le responsable le 2026-11-08.
//
// CE BANC NE PROUVE PAS QUE LE MODÈLE OBÉIT : il prouve qu'on ne peut plus toucher
// à ces textes sans le décider. Ce que le modèle écrit se voit par le signalement
// `SYNTHESE_IA.NARRATIF.FORME_DE_SCORE`.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;
const TITRE_SECTION = '## Besoins mesurés et non mesurés';
const SECTION_SUIVANTE = '## Consignes de réponse';
const DEBUT_PUCE = "- N'écris dans narratif_patient ni score";

const EMPREINTE_SECTION = '7d9da65e883da4b7';
const EMPREINTE_PUCE = 'ef22c6e1f4f6198b';

function section(): string {
  const debut = CONSIGNE.indexOf(TITRE_SECTION);
  const fin = CONSIGNE.indexOf(SECTION_SUIVANTE);
  if (debut < 0 || fin < debut) throw new Error('la section des besoins a disparu ou a changé de place');
  return CONSIGNE.slice(debut, fin);
}

function puce(): string {
  const debut = CONSIGNE.indexOf(DEBUT_PUCE);
  if (debut < 0) throw new Error('la puce du texte patient a disparu');
  return CONSIGNE.slice(debut, CONSIGNE.indexOf('\n', debut));
}

function empreinte(texte: string): string {
  return createHash('sha256').update(texte).digest('hex').slice(0, 16);
}

describe('consigne système — le bloc des besoins (D-462)', () => {
  it('la version est v32 ou au-delà : la section n’existe pas avant', () => {
    expect(Number(VERSION_PROMPT_SYNTHESE.replace('synthese-v', ''))).toBeGreaterThanOrEqual(32);
  });

  it('la section est épinglée par empreinte', () => {
    expect(empreinte(section()), 'section modifiée : le texte a été validé mot pour mot, resoumettre au responsable').toBe(EMPREINTE_SECTION);
  });

  it('elle dit qu’aucune valeur par besoin n’est transmise, sans viser les scores par questionnaire', () => {
    expect(section()).toContain('Aucune valeur numérique par besoin ne t\'est transmise dans ce bloc');
    expect(section()).toContain('aucune valeur ni aucun score de besoin');
  });

  it('le non mesuré n’autorise aucune proposition, et rien n’est levé', () => {
    expect(section()).toContain('ni un zéro, ni un manque constaté');
    expect(section()).toContain('Il ne t\'autorise à proposer aucun questionnaire');
    expect(section()).toContain('Ce bloc ne lève aucune interdiction posée plus haut');
  });

  it('la date du bloc n’élit aucune passation de forme ambiguë', () => {
    expect(section()).toContain('porte formeInstrumentAmbigue, sa date dit ce que le calcul a lu, pas la passation qui fait foi');
  });

  it('la section suit celle de l’orientation, qu’elle renvoie aux explorations', () => {
    expect(CONSIGNE.indexOf('## Recommandation d\'exploration déterministe')).toBeLessThan(CONSIGNE.indexOf(TITRE_SECTION));
  });
});

describe('consigne système — ce que le texte patient ne porte pas (D-333, D-462)', () => {
  it('la puce est épinglée par empreinte', () => {
    expect(empreinte(puce()), 'puce modifiée : le texte a été validé mot pour mot, resoumettre au responsable').toBe(EMPREINTE_PUCE);
  });

  it('elle vit dans la section du ton du narratif patient', () => {
    const ton = CONSIGNE.slice(CONSIGNE.indexOf('## Ton du narratif patient'));
    expect(ton).toContain(puce());
  });

  it('elle nomme les quatre interdits, en toutes lettres comprises', () => {
    expect(puce()).toContain('ni score, ni total calculé, ni pourcentage, ni nombre de besoins');
    expect(puce()).toContain('en chiffres comme en toutes lettres');
  });

  it('elle nomme ses trois seules exclusions', () => {
    expect(puce()).toContain('oméga-3');
    expect(puce()).toContain('« votre agenda couvre 21 nuits »');
    expect(puce()).toContain('« vous déclarez dormir 6 heures »');
  });

  it('une dose n’entre jamais, même déclarée', () => {
    expect(puce()).toContain("N'écris jamais une dose de complément ou de médicament, même déclarée.");
  });
});

describe('message envoyé au modèle — le bloc passe par le canal de l’orientation', () => {
  // En TEXTE, comme `enveloppePatient.guard.test.ts` : `buildUserMessage` n'est pas
  // exporté. La preuve d'exécution est dans `besoins.generation.test.ts`.
  const SOURCE = readFileSync(join(__dirname, '../../../../lib/synthese/generation.ts'), 'utf8');

  // Depuis [[D-471]], le bloc des règles non évaluées s'intercale entre les deux.
  it('le bloc suit celui de l’orientation, et disparaît quand il est vide', () => {
    // Depuis v34 ([[D-511]]), le bloc des règles non servies s'insère avant celui des besoins.
    expect(SOURCE).toContain("...(blocOrientation ? [blocOrientation] : []),\n    ...(blocNonEvaluees ? [blocNonEvaluees] : []),\n    ...(blocNonServies ? [blocNonServies] : []),\n    ...(blocBesoins ? [blocBesoins] : []),");
  });
});
