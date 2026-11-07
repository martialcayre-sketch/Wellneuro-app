// d25-b2 : vrai chemin d'écriture et rollback PostgreSQL, sans changer de trigger.
// Opt-in : base locale explicitement nommée, comme les autres bancs .pg.test.ts.
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@/generated/prisma';

const URL_BASE = process.env.DATABASE_URL ?? '';
const BASE_ANNONCEE = process.env.WN_BIO_DECISIONS_BANC_BASE ?? '';
function baseAutorisee(): boolean {
  if (!BASE_ANNONCEE) return false;
  if (!URL_BASE) throw new Error('DATABASE_URL est requise pour le banc de décisions.');
  const url = new URL(URL_BASE);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)
    || url.searchParams.has('host') || url.searchParams.has('hostaddr')) {
    throw new Error('REFUS : le banc de décisions exige une base locale.');
  }
  if (url.pathname.slice(1) !== BASE_ANNONCEE) {
    throw new Error('REFUS : WN_BIO_DECISIONS_BANC_BASE doit nommer la base de DATABASE_URL.');
  }
  return true;
}

const ACTIF = baseAutorisee();
const RUN = randomBytes(6).toString('hex');
const PATIENT = `PAT_BANC_DECISIONS_${RUN}`;
const ANALYTE = `BIO_BANC_DECISIONS_${RUN.toUpperCase()}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const id = (nom: string) => `${nom}_banc_decisions_${RUN}`;

describe.skipIf(!ACTIF)('deciderLignes — atomicité sur PostgreSQL (M2)', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let deciderLignes: typeof import('./decisions').deciderLignes;
  let observateur: pg.Client;

  beforeAll(async () => {
    ({ prisma } = await import('@/lib/prisma'));
    ({ deciderLignes } = await import('./decisions'));
    observateur = new pg.Client({ connectionString: URL_BASE });
    await observateur.connect();
    await observateur.query('BEGIN');
    try {
      await observateur.query(
        `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
         VALUES ($1, $2, $3, 'Sophie', 'Nicola', $4, CURRENT_TIMESTAMP)`,
        [id('pat'), PATIENT, `sophie.nicola+banc-${RUN}@example.test`, PRATICIEN],
      );
      await observateur.query(
        `INSERT INTO biology_analytes (id, code, libelle, unite, type_prelevement, source_provenance, niveau_completude, updated_at)
         VALUES ($1, $2, 'Analyte de banc', 'mg/L', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP)`,
        [id('bio'), ANALYTE],
      );
      for (const cas of ['succes', 'echec']) {
        await observateur.query(
          `INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, origine)
           VALUES ($1, $2, convert_to($3, 'UTF8'), 'application/pdf', encode(sha256(convert_to($3, 'UTF8')), 'hex'), 'patient')`,
          [id(`cr_${cas}`), PATIENT, `banc ${RUN} ${cas}`],
        );
        await observateur.query(
          `INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
           VALUES ($1, $2, $3, 'modele-banc', 'bio-extraction-v3', $4)`,
          [id(`imp_${cas}`), PATIENT, id(`cr_${cas}`), PRATICIEN],
        );
        for (const rang of [1, 2]) {
          await observateur.query(
            `INSERT INTO lignes_biologiques_candidates
             (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, unite_lue, preleve_le_lu, heure_lue, statut_mapping)
             VALUES ($1, $2, $3, $4, 1, 'Libellé', '1', 'mg/L', TIMESTAMP '2026-09-01 08:00:00', true, 'inconnu')`,
            [id(`lig_${cas}_${rang}`), PATIENT, id(`imp_${cas}`), rang],
          );
        }
        await observateur.query(
          `UPDATE imports_biologiques SET statut = 'extrait', termine_le = CURRENT_TIMESTAMP WHERE id = $1`,
          [id(`imp_${cas}`)],
        );
      }
      await observateur.query('COMMIT');
    } catch (err) {
      await observateur.query('ROLLBACK');
      throw err;
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    try {
      if (observateur) {
        await observateur.query('BEGIN');
        await observateur.query('DELETE FROM lignes_biologiques_candidates WHERE id_patient = $1', [PATIENT]);
        await observateur.query('DELETE FROM imports_biologiques WHERE id_patient = $1', [PATIENT]);
        await observateur.query('DELETE FROM comptes_rendus_biologiques WHERE id_patient = $1', [PATIENT]);
        await observateur.query('DELETE FROM resultats_biologiques WHERE id_patient = $1', [PATIENT]);
        await observateur.query('DELETE FROM patients WHERE id_patient = $1', [PATIENT]);
        await observateur.query('DELETE FROM biology_analytes WHERE code = $1', [ANALYTE]);
        await observateur.query('COMMIT');
      }
    } finally {
      await observateur?.end();
      await prisma?.$disconnect();
    }
  });

  function decisions(cas: string, jour: number) {
    return {
      idPatient: PATIENT, idImport: id(`imp_${cas}`), traitePar: PRATICIEN,
      decisions: [1, 2].map(rang => ({
        idLigne: id(`lig_${cas}_${rang}`), decision: 'valider', analyteCode: ANALYTE,
        valeur: '1', preleveLe: `2026-09-${String(jour + rang).padStart(2, '0')}T08:00:00.000Z`,
      })),
    };
  }

  async function etat(cas: string) {
    const document = await observateur.query(
      'SELECT contenu, motif_purge FROM comptes_rendus_biologiques WHERE id = $1', [id(`cr_${cas}`)],
    );
    const lignes = await observateur.query(
      'SELECT statut, id_resultat, traite_par FROM lignes_biologiques_candidates WHERE id_import = $1 ORDER BY rang',
      [id(`imp_${cas}`)],
    );
    return { document: document.rows[0], lignes: lignes.rows };
  }

  it('témoin positif : les deux résultats, les lignes validées et la purge sont commis', async () => {
    expect(await deciderLignes(decisions('succes', 1)))
      .toEqual({ ok: true, validees: 2, ecartees: 0, documentPurge: true });
    const apres = await etat('succes');
    expect(apres.document).toEqual({ contenu: null, motif_purge: 'lignes_decidees' });
    expect(apres.lignes).toHaveLength(2);
    for (const ligne of apres.lignes) {
      expect(ligne).toMatchObject({ statut: 'validee', traite_par: PRATICIEN });
      expect(await prisma.resultatBiologique.findUnique({ where: { id: ligne.id_resultat } }))
        .toMatchObject({ idPatient: PATIENT, analyteCode: ANALYTE });
    }
  });

  it('un échec après la première création annule les résultats, les lignes et la purge', async () => {
    const avant = await etat('echec');
    expect(avant.document.contenu).toEqual(Buffer.from(`banc ${RUN} echec`));
    expect(avant.document.motif_purge).toBeNull();
    expect(avant.lignes).toEqual(Array.from({ length: 2 }, () => ({ statut: 'proposee', id_resultat: null, traite_par: null })));
    const resultatsAvant = await prisma.resultatBiologique.findMany({ where: { idPatient: PATIENT }, orderBy: { id: 'asc' } });
    const transaction = prisma.$transaction.bind(prisma);
    let premiereEcrite = false;
    // Le vrai callback et ses vraies écritures PostgreSQL sont conservés.
    // Seul le second rattachement est interrompu, après le premier résultat ET
    // sa ligne : le retour en erreur ne suffit pas, l'observateur doit voir le rollback.
    const espion = vi.spyOn(prisma, '$transaction').mockImplementation((async (
      callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options?: { timeout?: number },
    ) => transaction(async tx => {
      const update = tx.ligneBiologiqueCandidate.updateMany.bind(tx.ligneBiologiqueCandidate);
      const rattachement = vi.spyOn(tx.ligneBiologiqueCandidate, 'updateMany').mockImplementation((async (args: Prisma.LigneBiologiqueCandidateUpdateManyArgs) => {
        if (premiereEcrite) throw new Error('Échec simulé du second rattachement.');
        const issue = await update(args);
        expect(issue.count).toBe(1);
        expect(await tx.resultatBiologique.count({ where: { idPatient: PATIENT } }))
          .toBe(resultatsAvant.length + 1);
        premiereEcrite = true;
        return issue;
      }) as unknown as typeof tx.ligneBiologiqueCandidate.updateMany);
      try { return await callback(tx); } finally { rattachement.mockRestore(); }
    }, options)) as typeof prisma.$transaction);
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(await deciderLignes(decisions('echec', 10))).toMatchObject({ ok: false, reason: 'server_error', status: 500 });
      expect(premiereEcrite).toBe(true);
      expect(await etat('echec')).toEqual(avant);
      expect(await prisma.resultatBiologique.findMany({ where: { idPatient: PATIENT }, orderBy: { id: 'asc' } }))
        .toEqual(resultatsAvant);
    } finally {
      espion.mockRestore();
      journal.mockRestore();
    }
  });
});
