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
  extraireCompteRendu,
  heureLisible,
  lireDatePrelevement,
  MODELE_EXTRACTION,
  motifDErreur,
  TENTATIVES_SUPPLEMENTAIRES,
} from './extraction';
import { PEREMPTION_EN_COURS_MS } from './verrou';

const SORTIE = {
  lisible: true,
  laboratoire: 'Laboratoire de fixture',
  lignes: [
    { page: 1, libelle: 'Ferritine', valeur: '48', unite: 'ng/mL', date_prelevement: '2026-09-15', heure_prelevement: '08:30' },
    { page: 2, libelle: 'CRP ultrasensible', valeur: '<0,5', unite: 'mg/L', date_prelevement: '2026-09-15', heure_prelevement: null },
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
      heureLue: true,
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
      avec({ unite: undefined }),
      JSON.stringify({ ...SORTIE, laboratoire: 'x'.repeat(201) }),
      JSON.stringify({ ...SORTIE, lignes: Array.from({ length: 201 }, () => SORTIE.lignes[0]) }),
    ]) {
      expect(analyserSortieExtraction(texte), texte.slice(0, 40)).toEqual({ ok: false, motif: 'reponse_invalide' });
    }
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
    expect(options).toMatchObject({ timeout: 180_000, maxRetries: 0 });
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

  it('le pire cas d’un appel reste sous la péremption d’un import en cours', () => {
    // Sinon une suite encore vivante serait close `delai_depasse` par une relance.
    expect(DELAI_EXTRACTION_MS * (1 + TENTATIVES_SUPPLEMENTAIRES)).toBeLessThan(PEREMPTION_EN_COURS_MS);
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
    expect(motifDErreur(null)).toBe('erreur_fournisseur');
  });
});
