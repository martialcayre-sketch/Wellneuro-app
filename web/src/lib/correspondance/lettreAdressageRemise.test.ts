import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ORDRE_CONSULTATION_PORTEUSE, whereConsultationPorteuse } from '@/lib/consultation/consultationPorteuse';
import { apercuLettreAdressage, jetonAvecLettre, lettreAdressagePatientOuverte, remettreLettreAdressage } from './lettreAdressageRemise';

// [[D-262]], LOT-02 — la remise de la lettre au clic « Valider pour diffusion ».
// La base tient la règle (contrat `lettres_adressage_remises_v1_negatif.sql`) ;
// ce banc tient ce que le module décide AVANT elle, et qu'un refus de la base
// n'interrompt pas le clic. Données synthétiques.

const ORIENTATION = { actionId: 'orientation-medecin', type: 'medical_referral' };
const AUTRE = { actionId: 'a1', type: 'food' };
const TEXTE = 'Docteur, je vous adresse Sophie Nicola.';

function client(options: {
  porteuse?: { id: string } | null;
  correspondance?: Record<string, unknown> | null;
  createMany?: () => Promise<{ count: number }>;
  enCours?: string;
} = {}) {
  const sql: string[] = [];
  const c = {
    consultation: {
      findFirst: vi.fn(async () => (options.porteuse === undefined ? { id: 'cons_1' } : options.porteuse)),
    },
    adressageSignalAlerte: {
      findFirst: vi.fn(async () => {
        const correspondance = options.correspondance === undefined
          ? { id: 'lettre_1', idPatient: 'PAT_1', sens: 'sortant', ancrageVersion: 'safety-signals-nnpp2-v1', texte: TEXTE, consigneLe: new Date('2026-10-03T08:00:00.000Z') }
          : options.correspondance;
        return correspondance === null ? null : { correspondance };
      }),
    },
    lettreAdressageRemise: {
      createMany: vi.fn(options.createMany ?? (async () => ({ count: 1 }))),
      findFirst: vi.fn(async () => (options.enCours === undefined ? null : { idCorrespondance: options.enCours })),
    },
    $executeRaw: vi.fn(async (gabarit: TemplateStringsArray) => {
      sql.push(gabarit.join('?'));
      return 0;
    }),
  };
  return { c, sql };
}

const ENTREES = { idPatient: 'PAT_1', idApprobation: 'appr_1', actions: [ORIENTATION, AUTRE], bloque: false };

describe('Remise de la lettre d’adressage au patient (D-262, LOT-02)', () => {
  beforeEach(() => {
    vi.stubEnv('WN_LETTRE_ADRESSAGE_PATIENT', 'true');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('le drapeau est fail-closed : seule la chaîne exacte « true » ouvre', () => {
    expect(lettreAdressagePatientOuverte('true')).toBe(true);
    for (const v of ['', '1', 'TRUE', 'true ', 'oui']) expect(lettreAdressagePatientOuverte(v)).toBe(false);
  });

  it('drapeau fermé : rien n’est lu ni écrit', async () => {
    vi.stubEnv('WN_LETTRE_ADRESSAGE_PATIENT', '');
    const { c } = client();
    expect(await remettreLettreAdressage(c as never, ENTREES)).toBe(0);
    expect(c.consultation.findFirst).not.toHaveBeenCalled();
    expect(c.lettreAdressageRemise.createMany).not.toHaveBeenCalled();
  });

  it('dossier bloqué pour les envois du clic : rien ne part', async () => {
    const { c } = client();
    expect(await remettreLettreAdressage(c as never, { ...ENTREES, bloque: true })).toBe(0);
    expect(c.consultation.findFirst).not.toHaveBeenCalled();
  });

  it('protocole qui ne s’ouvre pas sur l’orientation (ou sans action) : rien ne part, aucune lecture', async () => {
    for (const actions of [[AUTRE, ORIENTATION], [{ actionId: 'a1', type: 'medical_referral' }], []]) {
      const { c } = client();
      expect(await remettreLettreAdressage(c as never, { ...ENTREES, actions })).toBe(0);
      expect(c.consultation.findFirst).not.toHaveBeenCalled();
    }
  });

  it('remet la lettre de la couverture active la plus récente, texte recopié et empreinte UTF-8', async () => {
    const { c, sql } = client();
    expect(await remettreLettreAdressage(c as never, ENTREES)).toBe(1);
    // La porteuse par la sélection PARTAGÉE — validée, anamnèse non nulle, la
    // validation d'abord : la moitié de la règle que le trigger opposera.
    expect(c.consultation.findFirst).toHaveBeenCalledWith({
      where: whereConsultationPorteuse('PAT_1'),
      orderBy: ORDRE_CONSULTATION_PORTEUSE,
      select: { id: true },
    });
    expect(c.adressageSignalAlerte.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { idPatient: 'PAT_1', acte: 'adressage', idConsultation: 'cons_1', revocations: { none: {} } },
      orderBy: { ordre: 'desc' },
    }));
    expect(c.lettreAdressageRemise.createMany).toHaveBeenCalledWith({
      data: [{
        idPatient: 'PAT_1',
        idApprobation: 'appr_1',
        idCorrespondance: 'lettre_1',
        texte: TEXTE,
        texteSha256: createHash('sha256').update(TEXTE, 'utf8').digest('hex'),
      }],
    });
    expect(sql).toEqual(['SAVEPOINT lettre_adressage_remise', 'RELEASE SAVEPOINT lettre_adressage_remise']);
  });

  it('aucune porteuse, aucune couverture active, ou lettre non conforme : rien n’est écrit', async () => {
    const cas = [
      client({ porteuse: null }),
      client({ correspondance: null }),
      client({ correspondance: { id: 'l', idPatient: 'PAT_2', sens: 'sortant', ancrageVersion: 'safety-signals-v1', texte: TEXTE } }),
      client({ correspondance: { id: 'l', idPatient: 'PAT_1', sens: 'entrant', ancrageVersion: 'safety-signals-v1', texte: TEXTE } }),
      client({ correspondance: { id: 'l', idPatient: 'PAT_1', sens: 'sortant', ancrageVersion: 'indications-biologie-v1', texte: TEXTE } }),
      client({ correspondance: { id: 'l', idPatient: 'PAT_1', sens: 'sortant', ancrageVersion: null, texte: TEXTE } }),
      client({ correspondance: { id: 'l', idPatient: 'PAT_1', sens: 'sortant', ancrageVersion: 'safety-signals-v1', texte: '  ' } }),
    ];
    for (const { c } of cas) {
      expect(await remettreLettreAdressage(c as never, ENTREES)).toBe(0);
      expect(c.lettreAdressageRemise.createMany).not.toHaveBeenCalled();
    }
  });

  it('la remise en cours porte déjà cette lettre : zéro ligne, sans erreur', async () => {
    const { c } = client({ createMany: async () => ({ count: 0 }) });
    expect(await remettreLettreAdressage(c as never, ENTREES)).toBe(0);
  });

  it('refusée par la base : annulée SEULE au point de sauvegarde, le clic continue', async () => {
    const refus = Object.assign(new Error('remise refusée : …'), { code: 'P0001' });
    const { c, sql } = client({ createMany: async () => { throw refus; } });
    expect(await remettreLettreAdressage(c as never, ENTREES)).toBe(0);
    expect(sql).toEqual(['SAVEPOINT lettre_adressage_remise', 'ROLLBACK TO SAVEPOINT lettre_adressage_remise']);
    // La classe et le code au journal, jamais le message (il cite la lettre).
    expect(console.warn).toHaveBeenCalledWith(expect.any(String), 'Error', 'P0001');
  });

  it('LOT-03b — l’aperçu dit la lettre due, et si la remise en cours la porte déjà', async () => {
    const neuve = client();
    expect(await apercuLettreAdressage(neuve.c as never, ENTREES)).toEqual({
      idCorrespondance: 'lettre_1', consigneLe: '2026-10-03T08:00:00.000Z', dejaRemise: false,
    });
    const deja = client({ enCours: 'lettre_1' });
    expect(await apercuLettreAdressage(deja.c as never, ENTREES)).toEqual(expect.objectContaining({ dejaRemise: true }));
    // Mêmes refus que la remise : sans orientation, ou dossier bloqué, aucun aperçu.
    expect(await apercuLettreAdressage(client().c as never, { ...ENTREES, actions: [AUTRE] })).toBeNull();
    expect(await apercuLettreAdressage(client().c as never, { ...ENTREES, bloque: true })).toBeNull();
  });

  it('LOT-03b — le jeton couvre la lettre ; drapeau fermé, il est celui des fiches, inchangé', () => {
    const avec = (id: string | null, deja = false) =>
      jetonAvecLettre('jeton_fiches', id ? { idCorrespondance: id, consigneLe: '', dejaRemise: deja } : null);
    expect(new Set([avec(null), avec('lettre_1'), avec('lettre_2'), avec('lettre_1', true)]).size).toBe(4);
    expect(avec('lettre_1')).not.toBe('jeton_fiches');
    vi.stubEnv('WN_LETTRE_ADRESSAGE_PATIENT', '');
    expect(avec('lettre_1')).toBe('jeton_fiches');
    expect(avec(null)).toBe('jeton_fiches');
  });
});
