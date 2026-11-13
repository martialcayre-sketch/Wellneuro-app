// BANC SUR BASE RÉELLE — l'atelier de la bibliothèque des options ([[D-480]] §3,
// BP-17 PR 5 ; patron de `positions-expert/positionsExpert.pg.test.ts`). Ce que
// les bancs à base simulée ne tiennent pas (`wn-reviewer` sur la PR 5, P1-2) :
//
//   1. L'EMPREINTE JS EST CELLE DE LA BASE : `empreinteTexte` égale
//      `encode(sha256(convert_to(texte, 'UTF8')), 'hex')` sur des textes piégés
//      — sinon le CHECK refuserait la version (500) ; l'acte, qui la recopie,
//      passe le trigger.
//   2. LES REFUS DE LA ROUTE PRÉCÈDENT CEUX DES TRIGGERS : une version vue
//      périmée, un acte sur une version qui n'est plus la dernière rendent un
//      refus nommé, jamais une exception.
//   3. LA CONCURRENCE, FORCÉE : un observateur tient le verrou du couple ; deux
//      versements sur la même dernière version vue, puis un acte et un
//      versement, sont constatés EN ATTENTE dans `pg_locks` avant qu'il le
//      relâche. Un seul versement passe, l'autre est refusé « état divergent »
//      — jamais l'exception du trigger, que rendrait une lecture faite AVANT
//      le verrou (contre-épreuve : verrou du versement retiré ⇒ rouge).
//
// SAUTÉ PAR DÉFAUT : il écrit et commet. Il ne tourne que si
// `WN_BIBLIOTHEQUE_OPTIONS_BANC_BASE` nomme la base de `DATABASE_URL`, sur un
// hôte LOCAL, avec `DB_POOL_MAX` ≥ 4 : avec une seule connexion, le pool
// sérialise les transactions et le cas 3 ne pourrait pas se jouer. Les tables sont en ajout seul : ses lignes (identifiants d'option
// propres au run) restent dans la base locale qui les a reçues.
//
// TEXTES SYNTHÉTIQUES SEULEMENT ([[D-251]] §4) ; aucune option réelle.

import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import type { ContexteAtelier } from './structure';

const URL_BASE = process.env.DATABASE_URL ?? '';
const BASE_ANNONCEE = process.env.WN_BIBLIOTHEQUE_OPTIONS_BANC_BASE ?? '';

function baseAutorisee(): boolean {
  if (!URL_BASE || !BASE_ANNONCEE) return false;
  const url = new URL(URL_BASE);
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error(`REFUS : protocole « ${url.protocol} » ; le banc n'admet que postgres: et postgresql:.`);
  }
  if (url.searchParams.has('host') || url.searchParams.has('hostaddr')) {
    throw new Error('REFUS : DATABASE_URL porte host= ou hostaddr= ; le banc n’écrit que sur une base locale.');
  }
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${url.hostname} », le banc n'écrit que sur une base locale.`);
  }
  if (url.pathname.slice(1) !== BASE_ANNONCEE) {
    throw new Error(`REFUS : DATABASE_URL vise « ${url.pathname.slice(1)} », WN_BIBLIOTHEQUE_OPTIONS_BANC_BASE annonce « ${BASE_ANNONCEE} ».`);
  }
  if (!(Number(process.env.DB_POOL_MAX) >= 4)) {
    throw new Error('REFUS : DB_POOL_MAX doit valoir au moins 4 — une connexion unique sérialise les transactions et la concurrence ne serait pas éprouvée.');
  }
  return true;
}

const ACTIF = baseAutorisee();
const RUN = randomBytes(4).toString('hex').toUpperCase();

describe.skipIf(!ACTIF)('atelier de la bibliothèque des options — base réelle (empreintes, refus, concurrence)', () => {
  let m: typeof import('./ecriture') & typeof import('@/lib/fiches-usage/empreintes');
  let observateur: pg.Client;
  const AUTEUR = 'responsable@exemple.fr';
  const OPTIONS = ['A', 'B', 'C', 'D'].map(s => `OPT_BANC_${RUN}_${s}`);
  const ctx = (): ContexteAtelier => ({
    empreinteStructure: 'b'.repeat(64),
    etatStructure: 'signee',
    options: OPTIONS.map(id => ({ id, hypothese: 'HYP_BANC', populations: ['POP_BANC'], renvois: {} as never })),
  });

  const verser = (optionId: string, texte: string, derniereVersionVue: string | null, rubrique: 'dose' | 'duree' = 'dose') =>
    m.verserTexte({ optionId, rubrique, texte, derniereVersionVue, auteur: AUTEUR }, ctx());
  const valider = (idTexte: string, texte: string) =>
    m.poserActeTexte(
      { idTexte, acte: 'validee', empreinteVue: m.empreinteTexte(texte), dernierActeVu: null, relectureIntegrale: true, motif: null, validateur: AUTEUR },
      ctx(),
    );

  beforeAll(async () => {
    const [ecriture, empreintes] = await Promise.all([import('./ecriture'), import('@/lib/fiches-usage/empreintes')]);
    m = { ...ecriture, ...empreintes };
    observateur = new pg.Client({ connectionString: URL_BASE });
    await observateur.connect();
  });

  afterAll(async () => {
    await observateur?.end();
    const { prisma } = await import('@/lib/prisma');
    await prisma.$disconnect();
  });

  it('1. l’empreinte JS est celle de la base sur des textes piégés ; l’acte qui la recopie passe le trigger', async () => {
    const TEXTES = [
      'é composé, é précomposé',
      'emoji 🧪 et ZWJ 👩‍🔬',
      'retour\r\nchariot',
      'insécable et fine !',
      'guillemets « » \\ échappement " et \t tabulation',
    ];
    const vues: Record<string, string | null> = { dose: null, duree: null };
    for (const [i, texte] of TEXTES.entries()) {
      const rubrique = i % 2 === 0 ? 'dose' : 'duree';
      const issue = await verser(OPTIONS[0], texte, vues[rubrique], rubrique);
      expect(issue.issue, texte).toBe('versee');
      if (issue.issue !== 'versee') continue;
      vues[rubrique] = issue.version.id;
      expect(await valider(issue.version.id, texte), texte).toMatchObject({ issue: 'posee', etat: { etat: 'validee' } });
    }
  });

  it('2. une version vue périmée, un acte sur une version dépassée : refus nommés, jamais une exception', async () => {
    const optionId = OPTIONS[1];
    const v1 = await verser(optionId, 'Version une, synthétique.', null);
    if (v1.issue !== 'versee') throw new Error('versement refusé');
    expect(await verser(optionId, 'Autre texte.', null)).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
    const v2 = await verser(optionId, 'Version deux, synthétique.', v1.version.id);
    if (v2.issue !== 'versee') throw new Error('versement refusé');
    expect(v2.version.numero).toBe(2);
    expect(await valider(v1.version.id, 'Version une, synthétique.')).toEqual({ issue: 'refusee', raison: 'version_depassee' });
    expect(await verser(optionId, 'Version deux, synthétique.', v2.version.id)).toEqual({ issue: 'refusee', raison: 'texte_inchange' });
  });

  /** Attend que `n` sessions attendent le verrou consultatif du couple (espace 480, clé à deux entiers). */
  async function attendreBloquees(n: number, cle: string) {
    for (let i = 0; i < 400; i++) {
      const { rows } = await observateur.query(
        `SELECT count(*)::int AS n FROM pg_locks l
         JOIN pg_database d ON d.oid = l.database
         WHERE l.locktype = 'advisory' AND NOT l.granted AND d.datname = current_database()
           AND l.classid = 480 AND l.objid = hashtext($1)::oid AND l.objsubid = 2`,
        [cle],
      );
      if (rows[0].n >= n) return;
      await new Promise(r => setTimeout(r, 25));
    }
    throw new Error(`${n} sessions n’ont jamais attendu le verrou : la course s’est jouée en série.`);
  }

  async function sousVerrou<T>(cle: string, lancer: () => Promise<T>[]): Promise<PromiseSettledResult<T>[]> {
    const tenant = new pg.Client({ connectionString: URL_BASE });
    await tenant.connect();
    try {
      await tenant.query('BEGIN');
      await tenant.query('SELECT pg_advisory_xact_lock(480, hashtext($1))', [cle]);
      const enVol = lancer();
      await attendreBloquees(enVol.length, cle);
      await tenant.query('COMMIT');
      return await Promise.allSettled(enVol);
    } finally {
      await tenant.end();
    }
  }

  const valeurs = <T>(issues: PromiseSettledResult<T>[]) =>
    issues.map(i => (i.status === 'fulfilled' ? i.value : { issue: 'exception', raison: String(i.reason) }));

  it('3. concurrence forcée : deux versements sur la même vue, un seul passe ; acte et versement se sérialisent', async () => {
    const issues = valeurs(
      await sousVerrou(`bo|${OPTIONS[2]}|dose`, () => [verser(OPTIONS[2], 'Concurrent A.', null), verser(OPTIONS[2], 'Concurrent B.', null)]),
    );
    expect(issues.map(i => i.issue).sort()).toEqual(['refusee', 'versee']);
    expect(issues.find(i => i.issue !== 'versee')).toEqual({ issue: 'refusee', raison: 'etat_divergent' });

    const v1 = await verser(OPTIONS[3], 'Texte à valider.', null);
    if (v1.issue !== 'versee') throw new Error('versement refusé');
    const [acte, v2] = valeurs(
      await sousVerrou(`bo|${OPTIONS[3]}|dose`, () => [
        valider(v1.version.id, 'Texte à valider.') as Promise<{ issue: string; raison?: string }>,
        verser(OPTIONS[3], 'Texte neuf.', v1.version.id) as Promise<{ issue: string; raison?: string }>,
      ]),
    );
    expect(v2.issue).toBe('versee');
    // Acte d'abord : posé. Versement d'abord : l'acte vise une version dépassée.
    expect(acte.issue === 'posee' || (acte.issue === 'refusee' && acte.raison === 'version_depassee')).toBe(true);
  });
});
