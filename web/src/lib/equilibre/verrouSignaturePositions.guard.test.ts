import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// LE VERROU DE SIGNATURE ([[D-548]] §2.7, [[D-541]] §5.8) : chaque décision que la
// vague 1 applique et qui utilise une position pointe vers la signature de ces
// positions — la date où le responsable les a cochées — et cette signature est
// antérieure ou égale à la décision. Une position non signée n'entre dans aucune
// décision ; ce banc EXÉCUTÉ est la preuve que le renvoi existe, pas qu'il est
// juste : la signature elle-même vit au dossier privé, hors dépôt.
//
// CE QUE LE BANC NE FAIT PAS, et le dit : il ne lit pas les cases cochées (elles
// sont hors du dépôt public, [[D-251]] §4). Il garde le RENVOI, et la cohérence
// des dates.

const DOSSIER = path.resolve(__dirname, '../../../../docs/decisions');

/** Les décisions appliquées par la vague 1 qui reposent sur des positions signées. */
const DECISIONS_A_POSITIONS = ['D-516', 'D-526', 'D-529', 'D-538', 'D-541', 'D-542'] as const;

function entete(id: string): { texte: string; date: string } {
  const source = readFileSync(path.join(DOSSIER, `${id}.md`), 'utf8');
  // L'en-tête va jusqu'au premier paragraphe « Forme : » ou au premier « §1 ».
  const fin = Math.min(...['\nForme :', '\n**§1'].map(m => (source.indexOf(m) < 0 ? source.length : source.indexOf(m))));
  const texte = source.slice(0, fin);
  const date = /^- Date : (\d{4}-\d{2}-\d{2})/m.exec(texte)?.[1] ?? '';
  return { texte, date };
}

/** Le texte de l'en-tête, normalisé sur une ligne. */
const aplati = (t: string) => t.replace(/\s+/g, ' ');

describe('chaque décision qui utilise une position pointe vers sa signature', () => {
  it.each(DECISIONS_A_POSITIONS)('%s : cite les positions signées, avec une date de signature', id => {
    const { texte, date } = entete(id);
    const t = aplati(texte);
    expect(date, `${id} : date de la décision lisible`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Les positions et leur signature figurent dans l'en-tête de la décision.
    expect(t, `${id} : cite les positions`).toMatch(/positions/);
    expect(t, `${id} : dit qu'elles sont signées`).toMatch(/sign(é|ée|ées|és|ature)/);
    // Aucune date de l'en-tête ne doit être postérieure à la décision.
    const dates = [...t.matchAll(/\d{4}-\d{2}-\d{2}/g)].map(m => m[0]);
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) expect(d <= date, `${id} : ${d} postérieure à ${date}`).toBe(true);
  });

  it('la liste est celle des décisions que D-548 applique aux besoins 1, 4, 5 et 9', () => {
    const d548 = readFileSync(path.join(DOSSIER, 'D-548.md'), 'utf8').replace(/\s+/g, ' ');
    for (const id of DECISIONS_A_POSITIONS) expect(d548, `D-548 ne cite pas ${id}`).toContain(`[[${id}]]`);
  });

  it("D-541 §5.8 ne se présente pas comme déjà prouvé : la preuve est celle de ce banc, exécuté", () => {
    const d541 = readFileSync(path.join(DOSSIER, 'D-541.md'), 'utf8').replace(/\s+/g, ' ');
    expect(d541).toContain('Verrou de signature');
    expect(d541).toMatch(/pas présentée comme faite ici/);
  });
});
