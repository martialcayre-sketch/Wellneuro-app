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

// LA SECTION « RÉSULTATS DE BIOLOGIE », SES TROIS RETOUCHES ET LE CONTRAT DE
// SORTIE, CONSIGNE v36 — H95 part B, [[D-513]] §3, §4 et §6. Textes validés mot
// pour mot par le responsable le 2026-11-13 (§2 à §7), et le contrat de sortie
// le 2026-11-17 (`docs/claude/propositions/2026-11-17-h95b-code-textes/`, §1).
//
// CE BANC NE PROUVE PAS QUE LE MODÈLE OBÉIT : il prouve qu'on ne peut plus
// toucher à ces textes sans le décider. Ce que le modèle écrit se voit par
// l'évaluation sur dossiers fictifs (D-513 §11) et le contrôle de contamination.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;
const TITRE_SECTION = '## Résultats de biologie';
const SECTION_SUIVANTE = '## Consignes de réponse';

const EMPREINTE_SECTION = 'd3da87691bc4158d';
const EMPREINTE_CONTRAT = '44f8af10d1f33a08';

const D513 = readFileSync(join(__dirname, '../../../../../../docs/decisions/D-513.md'), 'utf8').split('\n');

function section(): string {
  const debut = CONSIGNE.indexOf(TITRE_SECTION);
  const fin = CONSIGNE.indexOf(SECTION_SUIVANTE);
  if (debut < 0 || fin < debut) throw new Error('la section de biologie a disparu ou a changé de place');
  return CONSIGNE.slice(debut, fin).trimEnd();
}

/** Le texte cité au §3 de la décision, sans ses chevrons de citation. */
function sectionDeLaDecision(): string {
  const debut = D513.findIndex((l) => l === '> ## Résultats de biologie');
  const fin = D513.findIndex((l, i) => i > debut && l.startsWith('> Si le bloc est absent'));
  return D513.slice(debut, fin + 1).map((l) => (l === '>' ? '' : l.replace(/^> /, ''))).join('\n');
}

function empreinte(texte: string): string {
  return createHash('sha256').update(texte).digest('hex').slice(0, 16);
}

describe('consigne système — la section de biologie (D-513 §3)', () => {
  it('la version est v36 ou au-delà : la section n’existe pas avant', () => {
    expect(Number(VERSION_PROMPT_SYNTHESE.replace('synthese-v', ''))).toBeGreaterThanOrEqual(36);
  });

  it('la section est, au caractère près, le texte cité par la décision', () => {
    expect(section()).toBe(sectionDeLaDecision());
  });

  it('la section est épinglée par empreinte', () => {
    expect(empreinte(section()), 'section modifiée : le texte a été validé mot pour mot, resoumettre au responsable').toBe(EMPREINTE_SECTION);
  });

  it('elle suit la section des besoins et précède les consignes de réponse', () => {
    expect(CONSIGNE.indexOf('## Besoins mesurés et non mesurés')).toBeLessThan(CONSIGNE.indexOf(TITRE_SECTION));
    expect(CONSIGNE.indexOf(TITRE_SECTION)).toBeLessThan(CONSIGNE.indexOf(SECTION_SUIVANTE));
  });

  it('elle nomme l’enveloppe des textes du laboratoire, les deux champs, et l’absence du bloc', () => {
    expect(section()).toContain('placés entre <textes_laboratoire_cites> et </textes_laboratoire_cites>');
    expect(section()).toContain('exclusivement dans resume_biologie_praticien et points_de_vigilance_biologie');
    expect(section()).toContain("Si le bloc est absent, n'en parle pas, et n'en conclus pas qu'aucun bilan n'a été fait.");
  });
});

describe('consigne système — les trois retouches (D-513 §4)', () => {
  it('le contexte anamnestique non renseigné renvoie aux blocs déterministes', () => {
    expect(CONSIGNE).toContain("- Si le contexte anamnestique est indiqué comme non renseigné, mentionne cette limite. Appuie-toi sur les scores et les blocs déterministes effectivement transmis, dans les seules limites autorisées par leurs sections respectives. Le contexte de prélèvement ne remplace pas l'anamnèse.\n");
    expect(CONSIGNE).not.toContain('appuie-toi sur les seuls scores et mentionne cette limite');
  });

  it('le cadre déontologique nomme les blocs déterministes', () => {
    expect(CONSIGNE).toContain("- Tu t'appuies uniquement sur les scores et interprétations fournis, sur le contexte anamnestique et signalétique du patient ET sur les blocs déterministes qui te sont transmis, sans rien extrapoler au-delà des données transmises.\n");
  });

  it('le ton du narratif ferme la biologie au texte patient, après la puce des scores', () => {
    const ton = CONSIGNE.slice(CONSIGNE.indexOf('## Ton du narratif patient'));
    const puceScores = ton.indexOf("- N'écris dans narratif_patient ni score");
    const puceBiologie = ton.indexOf("- N'écris dans narratif_patient aucun nom d'analyte, aucune valeur ni aucun intervalle de biologie : seule la réception d'un bilan daté peut y être dite.");
    expect(puceScores).toBeGreaterThanOrEqual(0);
    expect(puceBiologie).toBeGreaterThan(puceScores);
  });
});

describe('contrat de sortie — schéma v4 (D-513 §6)', () => {
  it('le schéma est synthese-json-v4', () => {
    expect(VERSION_SCHEMA_SYNTHESE).toBe('synthese-json-v4');
  });

  it('le contrat reprend au mot près la phrase validée au §6', () => {
    const ligne = D513.find((l) => l.startsWith('> `resume_biologie_praticien` est une chaîne'));
    expect(ligne).toBeDefined();
    expect(SYSTEM_PROMPT_CONTRAT_JSON).toContain(ligne!.replace(/^> /, ''));
  });

  it('le contrat est épinglé par empreinte', () => {
    expect(empreinte(SYSTEM_PROMPT_CONTRAT_JSON), 'contrat modifié : le texte a été validé mot pour mot, resoumettre au responsable').toBe(EMPREINTE_CONTRAT);
  });
});
