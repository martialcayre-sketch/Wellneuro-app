import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { empreinteScoring } from './empreinteScoring';
import INSTANTANE from './seuilsCatalogue.instantane.json';

// GARDE : AUCUN SEUIL DU CATALOGUE NE BOUGE SANS DÉCISION — t23, portée
// déclarée par le LOT-03 « Doctrine exécutable » ([[D-105]]), rappelée par le
// LOT-11 ([[D-107]]) ; forme arbitrée le 2026-10-21.
//
// LE TROU QU'IL FERME. `seuilsLitterauxMotives.guard.test.ts` exempte le
// catalogue PAR FORME : un cut-off écrit dans `questions.ts` est chez lui. Les
// seuils, bandes et interprétations des 65 questionnaires (PSQI, Horne-Östberg,
// Karasek…) n'étaient donc gardés que par une PROCÉDURE — la certification de
// scoring et `DC-17`/`DC-18` —, aucun banc ne rougissait sur une retouche.
//
// LA FORME. Un instantané figé (`seuilsCatalogue.instantane.json`) porte, par
// questionnaire, l'HISTORIQUE des empreintes de son bloc `scoring`
// (`empreinteScoring.ts`). Le banc exige :
//   — que la dernière empreinte de l'historique soit celle du code ;
//   — que chaque étape APRÈS la pose porte une décision `D-xxx` présente au
//     registre (`docs/DECISIONS.md`) — une retouche se décide avant de s'écrire ;
//   — qu'une étape sans décision ne soit que la pose elle-même (2026-10-21) :
//     un questionnaire ajouté plus tard entre avec sa décision ;
//   — que l'instantané et le catalogue aient les mêmes questionnaires.
//
// JAMAIS UN VERROU. Une empreinte divergente fait rougir le CI ; elle ne coupe
// pas le scoring en production — couper 65 questionnaires sur une virgule
// serait le pire des modes de panne.
//
// METTRE À JOUR (après la décision, jamais avant) : ajouter à l'historique du
// questionnaire `{ "empreinte": <celle que le banc affiche>, "decision":
// "D-xxx", "date": "AAAA-MM-JJ" }`. Ne jamais réécrire une étape existante :
// l'historique s'allonge, il ne se corrige pas.
//
// LIMITES, NOMMÉES : la valeur des options de réponse (`sections`) est hors du
// bloc et hors de l'empreinte ; la `note` libre aussi. Et le banc vérifie
// qu'une décision EXISTE, pas qu'elle parle de ce questionnaire — la revue le
// fait.

type Etape = { empreinte: string; decision: string | null; date: string };
type Instantane = { version: number; pose: string; entrees: Record<string, Etape[]> };

const instantane = INSTANTANE as Instantane;
const CATALOGUE = QUESTIONNAIRE_CATALOGUE as Record<string, { scoring?: unknown }>;
const REGISTRE = readFileSync(path.resolve(__dirname, '../../../../docs/DECISIONS.md'), 'utf8');

/** Une décision existe si le registre lui consacre un titre. */
function decisionAuRegistre(decision: string): boolean {
  return new RegExp(`^#+ ${decision.replace('-', '\\-')} `, 'm').test(REGISTRE);
}

describe('garde : les seuils du catalogue ne bougent pas sans décision', () => {
  it('le registre des décisions est lu (un banc qui ne lit rien ne garde rien)', () => {
    expect(decisionAuRegistre('D-107')).toBe(true);
    expect(decisionAuRegistre('D-999')).toBe(false);
  });

  it('l’instantané et le catalogue portent les mêmes questionnaires', () => {
    expect(Object.keys(instantane.entrees).sort()).toEqual(Object.keys(CATALOGUE).sort());
  });

  it('chaque bloc de scoring a l’empreinte de la dernière étape de son historique', () => {
    const divergents = Object.entries(CATALOGUE)
      .map(([id, entree]) => ({
        id,
        attendue: instantane.entrees[id]?.at(-1)?.empreinte,
        actuelle: empreinteScoring(entree.scoring),
      }))
      .filter(d => d.attendue !== d.actuelle);
    // Le message porte l'empreinte à recopier — APRÈS la décision.
    expect(divergents).toEqual([]);
  });

  it('chaque étape après la pose porte une décision présente au registre', () => {
    const fautives: string[] = [];
    for (const [id, historique] of Object.entries(instantane.entrees)) {
      historique.forEach((etape, rang) => {
        const pose = rang === 0 && etape.date === instantane.pose;
        if (etape.decision === null) {
          if (!pose) fautives.push(`${id}#${rang} : sans décision hors de la pose`);
        } else if (!/^D-\d{3,}$/.test(etape.decision) || !decisionAuRegistre(etape.decision)) {
          fautives.push(`${id}#${rang} : ${etape.decision} absente du registre`);
        }
        if (!/^[0-9a-f]{64}$/.test(etape.empreinte)) fautives.push(`${id}#${rang} : empreinte illisible`);
      });
    }
    expect(fautives).toEqual([]);
  });
});

describe('l’empreinte voit ce qu’elle doit voir', () => {
  const BLOC = { type: 'sum', interpretation: [{ min: 0, max: 4, label: 'Faible' }], note: 'provenance' };

  it('un seuil retouché change l’empreinte', () => {
    const retouche = { ...BLOC, interpretation: [{ min: 0, max: 5, label: 'Faible' }] };
    expect(empreinteScoring(retouche)).not.toBe(empreinteScoring(BLOC));
  });

  it('une interprétation retouchée change l’empreinte', () => {
    const retouche = { ...BLOC, interpretation: [{ min: 0, max: 4, label: 'Bas' }] };
    expect(empreinteScoring(retouche)).not.toBe(empreinteScoring(BLOC));
  });

  it('la note libre et l’ordre des clés ne la changent pas', () => {
    const { note: _note, ...sansNote } = BLOC;
    const reordonne = { interpretation: BLOC.interpretation, note: 'autre provenance', type: 'sum' };
    expect(empreinteScoring(sansNote)).toBe(empreinteScoring(BLOC));
    expect(empreinteScoring(reordonne)).toBe(empreinteScoring(BLOC));
  });

  it('une note imbriquée n’est PAS exclue : seule celle du bloc l’est', () => {
    const imbriquee = { ...BLOC, interpretation: [{ min: 0, max: 4, label: 'Faible', note: 'x' }] };
    expect(empreinteScoring(imbriquee)).not.toBe(empreinteScoring(BLOC));
  });
});
