import Anthropic from '@anthropic-ai/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
// `stream(params, options).finalMessage()` : `create` reçoit les deux arguments
// de l'appel et rend le message final.
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { stream: (params: unknown, options: unknown) => ({ finalMessage: () => create(params, options) }) } },
}));

import {
  analyserSortieExtraction,
  DELAI_EXTRACTION_MS,
  DUREE_TOTALE_EXTRACTION_MS,
  extraireCompteRendu,
  heureLisible,
  lireDatePrelevement,
  lireFaitLaboratoire,
  LONGUEUR_MAX_INTERVALLE,
  LONGUEUR_MAX_MARQUAGE,
  MODELE_EXTRACTION,
  motifDErreur,
  TENTATIVES_SUPPLEMENTAIRES,
  VERSION_PROCEDE_EXTRACTION,
} from './extraction';
import { DELAI_TRANSACTION_LIGNES_MS, PEREMPTION_EN_COURS_MS } from './verrou';

const SORTIE = {
  lisible: true,
  laboratoire: 'Laboratoire de fixture',
  lignes: [
    {
      page: 1, libelle: 'Ferritine', valeur: '48', unite: 'ng/mL', date_prelevement: '2026-09-15', heure_prelevement: '08:30',
      intervalle_reference: null, marquage: null,
    },
    {
      page: 2, libelle: 'CRP ultrasensible', valeur: '<0,5', unite: 'mg/L', date_prelevement: '2026-09-15', heure_prelevement: null,
      intervalle_reference: null, marquage: null,
    },
  ],
};

function reponse(texte: string, stop: string = 'end_turn') {
  return { stop_reason: stop, content: [{ type: 'text', text: texte }] };
}

describe('lireDatePrelevement — la date imprimée, heure de Paris', () => {
  it('convertit l’heure murale de Paris en instant UTC, été comme hiver', () => {
    expect(lireDatePrelevement('2026-09-15', '08:30')?.toISOString()).toBe('2026-09-15T06:30:00.000Z');
    expect(lireDatePrelevement('2026-01-15', '08:30')?.toISOString()).toBe('2026-01-15T07:30:00.000Z');
  });

  it('sans heure, ou une heure illisible : minuit à Paris, la date est gardée', () => {
    expect(lireDatePrelevement('2026-09-15', null)?.toISOString()).toBe('2026-09-14T22:00:00.000Z');
    expect(lireDatePrelevement('2026-09-15', '8h30')?.toISOString()).toBe('2026-09-14T22:00:00.000Z');
    expect(lireDatePrelevement('2026-09-15', '25:00')?.toISOString()).toBe('2026-09-14T22:00:00.000Z');
  });

  it('tient aux bascules d’heure', () => {
    // 02:30 n'existe pas le 2026-03-29 : l'instant tombe à 03:30 CEST.
    expect(lireDatePrelevement('2026-03-29', '02:30')?.toISOString()).toBe('2026-03-29T01:30:00.000Z');
    expect(lireDatePrelevement('2026-03-29', '04:00')?.toISOString()).toBe('2026-03-29T02:00:00.000Z');
    expect(lireDatePrelevement('2026-10-25', '04:00')?.toISOString()).toBe('2026-10-25T03:00:00.000Z');
  });

  it('ne devine rien : une date illisible ou impossible rend null', () => {
    expect(lireDatePrelevement(null, null)).toBeNull();
    expect(lireDatePrelevement('15/09/2026', null)).toBeNull();
    expect(lireDatePrelevement('2026-02-30', null)).toBeNull();
  });
});

describe('heure lue (D-258) — une heure imprimée « 00:00 » n’est pas une heure absente', () => {
  it('une heure d’horloge est lue, minuit compris ; une heure illisible ne l’est pas', () => {
    expect(heureLisible('00:00')).toBe(true);
    expect(heureLisible(' 08:30 ')).toBe(true);
    for (const h of [null, '', '8h30', '25:00', '08:30:00']) expect(heureLisible(h)).toBe(false);
  });

  it('jamais d’heure lue sans date lue (CHECK de la base)', () => {
    const ligne = (date: string | null, heure: string | null) => ({ ...SORTIE.lignes[0], date_prelevement: date, heure_prelevement: heure });
    const r = analyserSortieExtraction(JSON.stringify({
      ...SORTIE, lignes: [ligne('2026-09-15', '00:00'), ligne(null, '08:30'), ligne('15/09/2026', '08:30')],
    }));
    if (!r.ok) throw new Error('attendu ok');
    expect(r.lignes.map(l => [l.preleveLe?.toISOString() ?? null, l.heureLue])).toEqual([
      ['2026-09-14T22:00:00.000Z', true], [null, false], [null, false],
    ]);
  });
});

describe('analyserSortieExtraction — schéma fermé aux bornes des CHECK', () => {
  it('relève valeur, unité, page et DATE DU PRÉLÈVEMENT (promesse de la v4)', () => {
    const r = analyserSortieExtraction(JSON.stringify(SORTIE));
    expect(r).toMatchObject({ ok: true, laboratoire: 'Laboratoire de fixture' });
    if (!r.ok) throw new Error('attendu ok');
    expect(r.lignes).toHaveLength(2);
    expect(r.lignes[0]).toEqual({
      page: 1, libelle: 'Ferritine', valeur: '48', unite: 'ng/mL', preleveLe: new Date('2026-09-15T06:30:00.000Z'),
      heureLue: true, intervalle: null, marquage: null, intervalleNonTranscrit: false, marquageNonTranscrit: false,
    });
    // Date sans heure : minuit de Paris, et l'heure n'est PAS dite lue.
    expect(r.lignes[1]).toMatchObject({ preleveLe: new Date('2026-09-14T22:00:00.000Z'), heureLue: false });
    // Le texte reste tel qu'écrit : le refus d'une ligne qualitative vient après.
    expect(r.lignes[1].valeur).toBe('<0,5');
  });

  it('un document illisible rend `document_illisible`', () => {
    expect(analyserSortieExtraction(JSON.stringify({ lisible: false, laboratoire: null, lignes: [] })))
      .toEqual({ ok: false, motif: 'document_illisible' });
  });

  it('toute dérogation rend `reponse_invalide`, jamais une ligne tronquée', () => {
    const avec = (patch: Record<string, unknown>) =>
      JSON.stringify({ ...SORTIE, lignes: [{ ...SORTIE.lignes[0], ...patch }] });
    for (const texte of [
      'pas du json',
      '[]',
      JSON.stringify({ lisible: true, lignes: 'x' }),
      avec({ page: 0 }),
      avec({ page: 1.5 }),
      avec({ libelle: '   ' }),
      avec({ libelle: 'x'.repeat(301) }),
      avec({ valeur: 'x'.repeat(101) }),
      avec({ unite: 'x'.repeat(51) }),
      avec({ valeur: 12 }),
      // Schéma FERMÉ : une clé requise absente, une clé en trop.
      JSON.stringify({ lisible: true, lignes: SORTIE.lignes }),
      JSON.stringify({ ...SORTIE, commentaire: 'normal' }),
      JSON.stringify({ ...SORTIE, lignes: [{ page: 1, libelle: 'Ferritine', valeur: '48' }] }),
      avec({ interpretation: 'basse' }),
      // Les faits du laboratoire ([[D-267]]) : des clés requises, nullables,
      // de type texte — absentes ou d'un autre type, la sortie est invalide.
      avec({ intervalle_reference: undefined }),
      avec({ marquage: undefined }),
      avec({ intervalle_reference: 5 }),
      avec({ marquage: true }),
      avec({ unite: undefined }),
      JSON.stringify({ ...SORTIE, laboratoire: 'x'.repeat(201) }),
      JSON.stringify({ ...SORTIE, lignes: Array.from({ length: 201 }, () => SORTIE.lignes[0]) }),
    ]) {
      expect(analyserSortieExtraction(texte), texte.slice(0, 40)).toEqual({ ok: false, motif: 'reponse_invalide' });
    }
  });
});

describe('faits du laboratoire (D-267) — recopiés tels qu’imprimés, jamais tronqués', () => {
  const avec = (patch: Record<string, unknown>) =>
    JSON.stringify({ ...SORTIE, lignes: [{ ...SORTIE.lignes[0], ...patch }] });

  it('recopie l’intervalle et la marque tels qu’imprimés, rognés comme les autres champs', () => {
    const r = analyserSortieExtraction(avec({ intervalle_reference: '  Homme : 30 à 400 ; Femme : 15 à 150 ', marquage: ' ↑ ' }));
    if (!r.ok) throw new Error('attendu ok');
    expect(r.lignes[0]).toMatchObject({
      intervalle: 'Homme : 30 à 400 ; Femme : 15 à 150', marquage: '↑',
      intervalleNonTranscrit: false, marquageNonTranscrit: false,
    });
  });

  it('un surrogate isolé invalide la sortie ; une paire complète reste admise', () => {
    expect(lireFaitLaboratoire('\uD800', LONGUEUR_MAX_MARQUAGE)).toBeUndefined();
    expect(lireFaitLaboratoire('30 \uDC00 400', LONGUEUR_MAX_INTERVALLE)).toBeUndefined();
    expect(lireFaitLaboratoire('\uD83E\uDC45', LONGUEUR_MAX_MARQUAGE)).toEqual({ texte: '🡅', nonTranscrit: false });
    expect(analyserSortieExtraction(avec({ intervalle_reference: null, marquage: '\uD800' })).ok).toBe(false);
  });

  it('un NUL intérieur se retire : la base le refuserait et l’import entier échouerait', () => {
    expect(lireFaitLaboratoire('30\u0000 – 400', LONGUEUR_MAX_INTERVALLE)).toEqual({ texte: '30 – 400', nonTranscrit: false });
    expect(lireFaitLaboratoire('\u0000H\u0000', LONGUEUR_MAX_MARQUAGE)).toEqual({ texte: 'H', nonTranscrit: false });
  });

  it('absents ou vides : null, sans signal — rien n’a été omis', () => {
    // Sans caractère visible aussi : un NUL ferait échouer tout l'import en base.
    for (const vide of [null, '', '   ', '\u00a0', '\u0000', '\u200b', '\u0085', '\u001c\u001f']) {
      const r = analyserSortieExtraction(avec({ intervalle_reference: vide, marquage: vide }));
      if (!r.ok) throw new Error('attendu ok');
      expect(r.lignes[0]).toMatchObject({
        intervalle: null, marquage: null, intervalleNonTranscrit: false, marquageNonTranscrit: false,
      });
    }
  });

  it('TOUT dépassement pose le signal, et le fait reste null : ni troncature, ni échec de l’import (§10)', () => {
    const r = analyserSortieExtraction(avec({
      intervalle_reference: 'x'.repeat(LONGUEUR_MAX_INTERVALLE + 1),
      marquage: 'y'.repeat(LONGUEUR_MAX_MARQUAGE + 1),
    }));
    if (!r.ok) throw new Error('attendu ok : un fait trop long ne fait pas échouer l’import');
    expect(r.lignes[0]).toMatchObject({
      intervalle: null, marquage: null, intervalleNonTranscrit: true, marquageNonTranscrit: true,
    });
    // La borne elle-même est admise, verbatim.
    const juste = analyserSortieExtraction(avec({
      intervalle_reference: 'x'.repeat(LONGUEUR_MAX_INTERVALLE), marquage: 'y'.repeat(LONGUEUR_MAX_MARQUAGE),
    }));
    if (!juste.ok) throw new Error('attendu ok');
    expect(juste.lignes[0].intervalle).toHaveLength(LONGUEUR_MAX_INTERVALLE);
    expect(juste.lignes[0].intervalleNonTranscrit).toBe(false);
  });

  it('mesure en points de code, comme `char_length` de la base — pas en unités UTF-16', () => {
    // 50 flèches hors plan multilingue de base : 100 unités UTF-16, 50 points de code.
    const fleches = '🡅'.repeat(LONGUEUR_MAX_MARQUAGE);
    expect(fleches.length).toBe(2 * LONGUEUR_MAX_MARQUAGE);
    expect(lireFaitLaboratoire(fleches, LONGUEUR_MAX_MARQUAGE)).toEqual({ texte: fleches, nonTranscrit: false });
    expect(lireFaitLaboratoire(`${fleches}🡅`, LONGUEUR_MAX_MARQUAGE)).toEqual({ texte: null, nonTranscrit: true });
    expect(lireFaitLaboratoire(12, LONGUEUR_MAX_MARQUAGE)).toBeUndefined();
  });

  it('les bornes sont celles des CHECK de la base (migration 20261005150000)', () => {
    expect(LONGUEUR_MAX_INTERVALLE).toBe(300);
    expect(LONGUEUR_MAX_MARQUAGE).toBe(50);
  });
});

describe('extraireCompteRendu — l’appel', () => {
  beforeEach(() => create.mockReset());

  it('envoie le PDF ENTIER au modèle enregistré, en sortie structurée, sans bascule de modèle', async () => {
    create.mockResolvedValue(reponse(JSON.stringify(SORTIE)));
    const pdf = Buffer.from('%PDF-1.7 fixture');
    const r = await extraireCompteRendu(pdf, 'application/pdf');
    expect(r.ok).toBe(true);
    const [params, options] = create.mock.calls[0];
    expect(params.model).toBe(MODELE_EXTRACTION);
    expect(params.model).toBe('claude-sonnet-5-5');
    expect(params.output_config.format.type).toBe('json_schema');
    expect(params).not.toHaveProperty('fallbacks');
    expect(params.messages[0].content[0]).toEqual({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') },
    });
    expect(options).toMatchObject({ timeout: 180_000, maxRetries: 0, signal: expect.any(AbortSignal) });
  });

  it('`bio-extraction-v2` : la consigne amendée par D-267 §4, le schéma sans borne sur les faits (§10)', async () => {
    create.mockResolvedValue(reponse(JSON.stringify(SORTIE)));
    await extraireCompteRendu(Buffer.from('%PDF-1.7 fixture'), 'application/pdf');
    const [params] = create.mock.calls[0];
    expect(VERSION_PROCEDE_EXTRACTION).toBe('bio-extraction-v2');
    // La phrase de D-256 amendée ne survit pas ; « n'interprète rien » reste.
    expect(params.system).not.toContain('ne recopie ni les valeurs de référence');
    expect(params.system).toContain('N’interprète rien');
    expect(params.system).toContain('tels qu’imprimés, sans les compléter ni les reformuler');
    expect(params.system).toContain('Ne déduis jamais une marque d’anomalie en comparant la valeur à l’intervalle');
    expect(params.system).toContain('Ne recopie aucun commentaire');
    const items = params.output_config.format.schema.properties.lignes.items;
    expect(items.required).toEqual(expect.arrayContaining(['intervalle_reference', 'marquage']));
    // Une `maxLength` ferait tronquer le modèle lui-même : le signal ne se poserait jamais.
    for (const cle of ['intervalle_reference', 'marquage']) {
      expect(items.properties[cle]).toEqual({ type: ['string', 'null'] });
    }
  });

  it('envoie une photo ENTIÈRE en bloc image, sous la même consigne (LOT-03)', async () => {
    create.mockResolvedValue(reponse(JSON.stringify(SORTIE)));
    const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const r = await extraireCompteRendu(photo, 'image/jpeg');
    expect(r.ok).toBe(true);
    const [params] = create.mock.calls[0];
    expect(params.messages[0].content[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: photo.toString('base64') },
    });
    expect(params.messages[0].content[1]).toEqual({ type: 'text', text: 'Relève les résultats de ce compte rendu.' });
  });

  it('le pire cas d’une extraction reste sous la péremption d’un import en cours', () => {
    // Sinon une suite encore vivante serait close `delai_depasse` par une relance.
    // Le délai des en-têtes ne borne pas le flux : c'est la durée totale qui compte
    // (sa preuve sur le vrai client : `extraction.borne.test.ts`).
    expect(TENTATIVES_SUPPLEMENTAIRES).toBe(0);
    expect(DELAI_EXTRACTION_MS).toBeLessThan(DUREE_TOTALE_EXTRACTION_MS);
    const MARGE_MS = 30_000; // lecture du document, attente d'une connexion (2 s par défaut)
    expect(DUREE_TOTALE_EXTRACTION_MS + DELAI_TRANSACTION_LIGNES_MS + MARGE_MS).toBeLessThanOrEqual(PEREMPTION_EN_COURS_MS);
  });

  it('classe les échecs en motifs fermés', async () => {
    create.mockRejectedValueOnce(new Anthropic.APIConnectionTimeoutError());
    expect(await extraireCompteRendu(Buffer.from('%PDF-'), 'application/pdf')).toEqual({ ok: false, motif: 'delai_depasse' });
    create.mockRejectedValueOnce(new Error('panne'));
    expect(await extraireCompteRendu(Buffer.from('%PDF-'), 'application/pdf')).toEqual({ ok: false, motif: 'erreur_fournisseur' });
    create.mockResolvedValueOnce(reponse('', 'refusal'));
    expect(await extraireCompteRendu(Buffer.from('%PDF-'), 'application/pdf')).toEqual({ ok: false, motif: 'erreur_fournisseur' });
    create.mockResolvedValueOnce(reponse('{"lisible":', 'max_tokens'));
    expect(await extraireCompteRendu(Buffer.from('%PDF-'), 'application/pdf')).toEqual({ ok: false, motif: 'reponse_invalide' });
  });

  it('motifDErreur ne lit jamais le message', () => {
    expect(motifDErreur(new Anthropic.APIConnectionTimeoutError())).toBe('delai_depasse');
    expect(motifDErreur(new Anthropic.APIUserAbortError())).toBe('delai_depasse');
    expect(motifDErreur(null)).toBe('erreur_fournisseur');
  });
});
