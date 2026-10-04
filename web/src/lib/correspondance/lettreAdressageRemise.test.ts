import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lettreAdressagePatientOuverte, remettreLettreAdressage } from './lettreAdressageRemise';

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
} = {}) {
  const sql: string[] = [];
  const c = {
    consultation: {
      findFirst: vi.fn(async () => (options.porteuse === undefined ? { id: 'cons_1' } : options.porteuse)),
    },
    adressageSignalAlerte: {
      findFirst: vi.fn(async () => {
        const correspondance = options.correspondance === undefined
          ? { id: 'lettre_1', idPatient: 'PAT_1', sens: 'sortant', ancrageVersion: 'safety-signals-nnpp2-v1', texte: TEXTE }
          : options.correspondance;
        return correspondance === null ? null : { correspondance };
      }),
    },
    lettreAdressageRemise: {
      createMany: vi.fn(options.createMany ?? (async () => ({ count: 1 }))),
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
    const { c, sql } = client({ createMany: async () => { throw new Error('remise refusée : …'); } });
    expect(await remettreLettreAdressage(c as never, ENTREES)).toBe(0);
    expect(sql).toEqual(['SAVEPOINT lettre_adressage_remise', 'ROLLBACK TO SAVEPOINT lettre_adressage_remise']);
    // La classe au journal, jamais le message (il cite la lettre).
    expect(console.warn).toHaveBeenCalledWith(expect.any(String), 'Error');
  });
});
