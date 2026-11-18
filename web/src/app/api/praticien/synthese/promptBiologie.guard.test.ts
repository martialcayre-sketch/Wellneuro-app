import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SYSTEM_PROMPT_CONTRAT_JSON,
  SYSTEM_PROMPT_GOUVERNANCE,
  VERSION_PROMPT_SYNTHESE,
  VERSION_SCHEMA_SYNTHESE,
} from '@/lib/anthropic';
import {
  SYSTEM_PROMPT_SYNTHESE_BIOLOGIE,
  VERSION_PROMPT_SYNTHESE_BIOLOGIE,
  messageRelanceBiologie,
  phraseReceptionBilan,
} from '@/lib/synthese/appelBiologie';

// LES DEUX CONSIGNES DE LA SYNTHÈSE ET LA BIOLOGIE — H95 part B, [[D-539]] §4
// et §5 (qui amende [[D-513]] §3, §4 et §6). Textes validés mot pour mot par le
// responsable le 2026-11-18 : la section « Résultats de biologie » de
// `synthese-v37`, ses deux retouches et son contrat de sortie ; la consigne du
// second appel, `synthese-biologie-v1` ; la phrase posée par le code.
//
// CE BANC NE PROUVE PAS QUE LE MODÈLE OBÉIT : il prouve qu'on ne peut plus
// toucher à ces textes sans le décider. Ce que le modèle écrit se voit par
// l'évaluation rejouée de D-539 §8 et le contrôle de contamination.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;
const TITRE_SECTION = '## Résultats de biologie';
const SECTION_SUIVANTE = '## Consignes de réponse';

const EMPREINTE_SECTION_V37 = 'd719b7994f3ecb2e';
const EMPREINTE_CONTRAT_V37 = '40026cfcb8b22b39';
const EMPREINTE_CONSIGNE_BIOLOGIE_V1 = 'a12d5d23a5b48f29';
const EMPREINTE_RELANCE_BIOLOGIE_V1 = '4e45bd3f269fe124';

const D539 = readFileSync(join(__dirname, '../../../../../../docs/decisions/D-539.md'), 'utf8').split('\n');

/** Un bloc cité de la décision, à partir de sa première ligne, sans ses chevrons (et leur retrait). */
function citation(premiere: string, retrait = ''): string {
  const ouvre = `${retrait}> `;
  const vide = `${retrait}>`;
  const debut = D539.findIndex((l) => l.startsWith(`${ouvre}${premiere}`));
  if (debut < 0) throw new Error(`citation introuvable : ${premiere}`);
  const lignes: string[] = [];
  for (let i = debut; i < D539.length; i++) {
    const l = D539[i];
    if (l === vide) lignes.push('');
    else if (l.startsWith(ouvre)) lignes.push(l.slice(ouvre.length));
    else break;
  }
  return lignes.join('\n');
}

function section(): string {
  const debut = CONSIGNE.indexOf(TITRE_SECTION);
  const fin = CONSIGNE.indexOf(SECTION_SUIVANTE);
  if (debut < 0 || fin < debut) throw new Error('la section de biologie a disparu ou a changé de place');
  return CONSIGNE.slice(debut, fin).trimEnd();
}

function empreinte(texte: string): string {
  return createHash('sha256').update(texte).digest('hex').slice(0, 16);
}

describe('synthese-v37 — la section « Résultats de biologie » (D-539 §5.1)', () => {
  it('la version est v37 ou au-delà : l’appel principal ne reçoit plus la biologie avant', () => {
    expect(Number(VERSION_PROMPT_SYNTHESE.replace('synthese-v', ''))).toBeGreaterThanOrEqual(37);
  });

  it('la section est, au caractère près, le texte cité par la décision', () => {
    expect(section()).toBe(citation('## Résultats de biologie', '   '));
  });

  it('la section est épinglée par empreinte', () => {
    expect(empreinte(section()), 'section modifiée : le texte a été validé mot pour mot, resoumettre au responsable').toBe(EMPREINTE_SECTION_V37);
  });

  it('elle suit la section des besoins et précède les consignes de réponse', () => {
    expect(CONSIGNE.indexOf('## Besoins mesurés et non mesurés')).toBeLessThan(CONSIGNE.indexOf(TITRE_SECTION));
    expect(CONSIGNE.indexOf(TITRE_SECTION)).toBeLessThan(CONSIGNE.indexOf(SECTION_SUIVANTE));
  });

  it('rien de la section v36 ne reste dans la consigne principale', () => {
    for (const reste of [
      '<textes_laboratoire_cites>',
      'resume_biologie_praticien',
      'points_de_vigilance_biologie',
      'Les données patient peuvent inclure un bloc « Résultats de biologie »',
      "Le contexte de prélèvement ne remplace pas l'anamnèse.",
      "seule la réception d'un bilan daté peut y être dite",
    ]) {
      expect(CONSIGNE, reste).not.toContain(reste);
    }
  });
});

describe('synthese-v37 — les deux retouches (D-539 §5.2 et §5.3)', () => {
  it('le contexte anamnestique non renseigné renvoie aux blocs déterministes, sans le contexte de prélèvement', () => {
    expect(CONSIGNE).toContain("- Si le contexte anamnestique est indiqué comme non renseigné, mentionne cette limite. Appuie-toi sur les scores et les blocs déterministes effectivement transmis, dans les seules limites autorisées par leurs sections respectives.\n");
  });

  it('le ton du narratif ferme la biologie au texte patient, la puce citée par la décision, après celle des scores', () => {
    const puce = citation("- N'écris dans narratif_patient aucun nom d'analyte", '   ');
    const ton = CONSIGNE.slice(CONSIGNE.indexOf('## Ton du narratif patient'));
    const puceScores = ton.indexOf("- N'écris dans narratif_patient ni score");
    expect(puceScores).toBeGreaterThanOrEqual(0);
    expect(ton.indexOf(`${puce}\n`)).toBeGreaterThan(puceScores);
  });
});

describe('synthese-v37 — le contrat de sortie, schéma v4 sans les clés biologiques (D-539 §5.4)', () => {
  it('le schéma enregistré reste synthese-json-v4', () => {
    expect(VERSION_SCHEMA_SYNTHESE).toBe('synthese-json-v4');
  });

  it('le contrat ne nomme plus les deux clés, ni la phrase qui les décrivait', () => {
    expect(SYSTEM_PROMPT_CONTRAT_JSON).not.toContain('resume_biologie_praticien');
    expect(SYSTEM_PROMPT_CONTRAT_JSON).not.toContain('points_de_vigilance_biologie');
    expect(SYSTEM_PROMPT_CONTRAT_JSON.trimEnd().endsWith('}')).toBe(true);
  });

  it('le contrat est épinglé par empreinte', () => {
    expect(empreinte(SYSTEM_PROMPT_CONTRAT_JSON), 'contrat modifié : le texte a été validé mot pour mot, resoumettre au responsable').toBe(EMPREINTE_CONTRAT_V37);
  });
});

describe('synthese-biologie-v1 — la consigne du second appel (D-539 §4)', () => {
  it('la version est synthese-biologie-v1', () => {
    expect(VERSION_PROMPT_SYNTHESE_BIOLOGIE).toBe('synthese-biologie-v1');
  });

  it('la consigne est, au caractère près, le texte cité par la décision', () => {
    expect(SYSTEM_PROMPT_SYNTHESE_BIOLOGIE).toBe(citation('Tu restitues, pour le praticien seul'));
  });

  it('la consigne est épinglée par empreinte', () => {
    expect(empreinte(SYSTEM_PROMPT_SYNTHESE_BIOLOGIE), 'consigne modifiée : le texte a été validé mot pour mot, resoumettre au responsable ; toute modification fait rejouer l’évaluation de D-539 §8').toBe(EMPREINTE_CONSIGNE_BIOLOGIE_V1);
  });

  it('elle ne parle ni de narratif, ni du cas sans bloc (D-539 §4, puces retirées)', () => {
    expect(SYSTEM_PROMPT_SYNTHESE_BIOLOGIE).not.toContain('narratif_patient');
    expect(SYSTEM_PROMPT_SYNTHESE_BIOLOGIE).not.toContain('Si le bloc est absent');
  });

  // La relance n'est pas citée par D-539 (elle dit le format, pas la clinique),
  // mais le modèle la lit : épinglée pour qu'une retouche se voie et fasse
  // rejouer l'évaluation de D-539 §8 (revue `wn-reviewer`, P2).
  it('la relance du second appel est épinglée par empreinte', () => {
    const relance = messageRelanceBiologie(['resume_biologie_praticien : chaîne non vide attendue']);
    expect(empreinte(relance), 'relance modifiée : toute modification fait rejouer l’évaluation de D-539 §8').toBe(EMPREINTE_RELANCE_BIOLOGIE_V1);
  });
});

describe('la phrase du narratif (D-539 §5, N3)', () => {
  it('le gabarit du code est la phrase citée par la décision', () => {
    const gabarit = citation('Votre praticien a reçu votre bilan biologique du');
    expect(gabarit).toBe('Votre praticien a reçu votre bilan biologique du {date}.');
    const phrase = phraseReceptionBilan({
      texte: '## Résultats de biologie\nX — 1 prélèvement.\n- Prélevé le 2026-03-12, heure non lue : 1 u.',
      formes: { valeursUnites: [], intervalles: [] },
    });
    expect(phrase).toBe(gabarit.replace('{date}', '12 mars 2026'));
  });
});
