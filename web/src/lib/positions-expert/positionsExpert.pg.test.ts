// BANC SUR BASE RÉELLE — l'atelier des positions d'expert (D-439, BP-12b PR 3).
// Ce que les bancs à base simulée ne tiennent pas :
//
//   1. L'EMPREINTE JS EST CELLE DE `positions_expert_empreinte_contenu`, après
//      l'aller-retour JSONB, sur des textes piégés (accents composés, emoji,
//      `\r\n`, insécables, échappements JSON…). L'acte de signature, qui la
//      recopie, passe le trigger.
//   2. LES REFUS DE LA ROUTE, par les vrais chemins : alternance des actes
//      (question 1), même fiche (question 2), conflit inconnu, fiche hors de la
//      liste curée, claim retenu hors du conflit, claim d'appui absent du
//      corpus, lu « à relire ».
//   3. LA QUESTION 3 SOUS CONCURRENCE : deux brouillons de deux positions sur
//      la même fiche se versent tous deux (un brouillon n'occupe rien, option
//      (a) du 2026-11-06) ; leurs deux signatures, constatées en attente du
//      verrou de la fiche (`pg_locks`), une seule passe.
//   4. UNE ÉCRITURE PAR TRANSACTION (P2-3 de #1871) : un retrait et une pose
//      qui retient la même position, lancés ensemble derrière le verrou de la
//      position, se sérialisent sans interblocage, et l'état final est l'un des
//      deux ordres possibles. BANC DE FUMÉE : il ne rougirait que si une
//      transaction écrivait deux lignes. L'ORDRE des verrous (fiche puis
//      position, couple puis position) est prouvé par `ecriture.test.ts`.
//   5. LA QUESTION 3 À LA SIGNATURE : un brouillon versé sur une fiche fondée
//      ne se signe pas tant que l'autre position est signée ; re-signer une
//      version retirée dont la fiche a été reprise par une autre position
//      SIGNÉE est refusé ; une révision sans fiche de l'autre la libère, et
//      toute révision d'une position signée, même sur sa fiche, aussi (cas 9).
//
// SAUTÉ PAR DÉFAUT : il écrit et commet. Il ne tourne que si
// `WN_POSITIONS_EXPERT_BANC_BASE` nomme la base de `DATABASE_URL`, sur un hôte
// LOCAL, avec `DB_POOL_MAX` ≥ 4. Les tables sont en ajout seul : ses lignes
// (identifiants propres au run) restent dans la base éphémère qui les a reçues.
//
// TEXTES SYNTHÉTIQUES SEULEMENT ([[D-251]] §4) ; aucun texte de position réel.

import { randomBytes, randomInt } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { CONFLITS_SOURCES_V1, type ConflitSourcesDeclare } from '@/lib/clinical/conflitsSourcesV1';
import type { ContexteEcriture } from './ecriture';
import { empreinteEntreeConflit } from './registreConflits';

const URL_BASE = process.env.DATABASE_URL ?? '';
const BASE_ANNONCEE = process.env.WN_POSITIONS_EXPERT_BANC_BASE ?? '';

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
    throw new Error(`REFUS : DATABASE_URL vise « ${url.pathname.slice(1)} », WN_POSITIONS_EXPERT_BANC_BASE annonce « ${BASE_ANNONCEE} ».`);
  }
  return true;
}

const ACTIF = baseAutorisee();
const RUN = randomBytes(4).toString('hex').toUpperCase();

describe.skipIf(!ACTIF)('positions d’expert — base réelle (empreintes, refus de la route, concurrence)', () => {
  let m: typeof import('./ecriture') & typeof import('./lecture') & typeof import('./empreinte') & typeof import('./fraicheur');
  let observateur: pg.Client;

  const FICHE_A = `FU_BANC_PE_${RUN}_A`;
  const FICHE_B = `FU_BANC_PE_${RUN}_B`;
  const FICHE_C = `FU_BANC_PE_${RUN}_C`;
  const FICHE_D = `FU_BANC_PE_${RUN}_D`;
  const FICHE_E = `FU_BANC_PE_${RUN}_E`;
  const FICHE_F = `FU_BANC_PE_${RUN}_F`;
  const CONFLIT = `CS-BANC${RUN}`;
  // Claims synthétiques : jamais au corpus de la base de banc.
  const CL_A = `WN-CL-9${String(randomInt(0, 1000)).padStart(3, '0')}-001@v1.0`;
  const CL_B = `WN-CL-9${String(randomInt(0, 1000)).padStart(3, '0')}-002@v1.0`;
  const ENTREE = {
    id: CONFLIT,
    statut: 'publiee',
    objet: 'Objet synthétique du banc ?',
    claims: [
      { claimId: CL_A.split('@')[0], versionClaim: 'v1.0' },
      { claimId: CL_B.split('@')[0], versionClaim: 'v1.0' },
    ],
    positions: ['Position synthétique A.', 'Position synthétique B.'],
    importance: 'moyenne',
    hypotheses: [],
    actionSuggeree: 'Aucune.',
    limitations: [],
    fichesUsage: [FICHE_A, FICHE_B, FICHE_D],
  } as unknown as ConflitSourcesDeclare;
  const EMPREINTE_ENTREE = empreinteEntreeConflit(ENTREE);

  /** Contexte du banc : structure synthétique signée, registre synthétique, tout claim frais. */
  const ctx = (): ContexteEcriture => ({
    registre: [ENTREE],
    empreintesSignees: { [ENTREE.id]: empreinteEntreeConflit(ENTREE) },
    structure: { signee: true, fiches: new Set([FICHE_A, FICHE_B, FICHE_C, FICHE_D, FICHE_E, FICHE_F]), empreinte: 'b'.repeat(64) },
    lireFraicheur: async refs => new Set(refs),
  });
  const AUTEUR = 'responsable@exemple.fr';
  const CONTENU = { enonce: 'Énoncé synthétique.', perimetre: 'Périmètre synthétique.', population: 'Population synthétique.', limites: 'Limites synthétiques.' };

  // Identifiants de position libres dans cette base (les lignes des runs
  // précédents ne s'effacent pas).
  const prises = new Set<string>();
  async function positionLibre(): Promise<string> {
    for (;;) {
      const id = `WN-PE-${String(randomInt(0, 10000)).padStart(4, '0')}`;
      if (prises.has(id)) continue;
      const { rows } = await observateur.query('SELECT 1 FROM positions_expert_versions WHERE position_id = $1', [id]);
      if (rows.length === 0) {
        prises.add(id);
        return id;
      }
    }
  }

  async function verser(positionId: string, ficheId: string | null, contenu = CONTENU) {
    const issue = await m.verserVersion(
      { positionId, version: 'v1.0', dossier: 'fer', ficheId, contenu, claimsAppui: [CL_A], idVersionCouranteVue: null, auteur: AUTEUR },
      ctx(),
    );
    if (issue.issue !== 'ecrite') throw new Error(`versement refusé : ${issue.raison}`);
    return issue.version.id;
  }

  async function signer(idVersion: string, dernierActeVu: string | null = null) {
    const { rows } = await observateur.query('SELECT contenu FROM positions_expert_versions WHERE id = $1', [idVersion]);
    return m.poserActePosition(
      {
        idVersion,
        acte: 'signee',
        empreinteVue: m.empreinteContenuBrut(rows[0].contenu)!,
        dernierActeVu,
        relectureIntegrale: true,
        motif: null,
        auteur: AUTEUR,
      },
      ctx(),
    );
  }

  beforeAll(async () => {
    const [ecriture, lecture, empreinte, fraicheur] = await Promise.all([
      import('./ecriture'),
      import('./lecture'),
      import('./empreinte'),
      import('./fraicheur'),
    ]);
    m = { ...ecriture, ...lecture, ...empreinte, ...fraicheur };
    observateur = new pg.Client({ connectionString: URL_BASE });
    await observateur.connect();
  });

  afterAll(async () => {
    await observateur?.end();
    const { prisma } = await import('@/lib/prisma');
    await prisma.$disconnect();
  });

  const TEXTES_DIFFICILES: Record<string, string> = {
    accents_precomposes: 'Été, cœur, Œuvre — « guillemets » ’apostrophe’.',
    // Décomposé, écrit en échappement pour qu'aucun éditeur ne le recompose :
    // une normalisation NFC côté JS ferait rougir ce cas (revue CodeRabbit).
    accent_combinant: 'E\u0301te\u0301 compose\u0301 par diacritique combinant.',
    emoji_et_zwj: 'Soignante 👩🏽‍⚕️, drapeau 🇫🇷, hors BMP 𝔘𝔫𝔦𝔠𝔬𝔡𝔢.',
    fins_de_ligne: 'Ligne une\r\nligne deux\rligne trois\nligne quatre',
    // Insécable fine (U+202F), insécable (U+00A0), tabulation, chasse nulle (U+200B).
    espaces: 'Insécable\u202ffine,\u00a0insécable et\ttabulation, chasse nulle\u200bici.',
    echappements_json: 'Barre \\ oblique, "guillemets droits", /slash/ et   séparateur.',
    ecritures: 'Ελληνικά, русский, 中文, العربية.',
  };

  it('1. l’empreinte JS est celle que calcule `positions_expert_empreinte_contenu` — et la signature passe', async () => {
    for (const [cas, texte] of Object.entries(TEXTES_DIFFICILES)) {
      const contenu = { enonce: texte, perimetre: `${texte} p`, population: `p ${texte}`, limites: Array.from(texte).reverse().join('') };
      const id = await verser(await positionLibre(), null, contenu);
      const { rows } = await observateur.query(
        'SELECT public.positions_expert_empreinte_contenu(contenu) AS sql, contenu FROM positions_expert_versions WHERE id = $1',
        [id],
      );
      const js = m.empreinteContenuPosition(contenu);
      expect(rows[0].sql, cas).toBe(js);
      // Sur le texte RELU de la base aussi.
      expect(m.empreinteContenuBrut(rows[0].contenu), cas).toBe(js);
      expect((await signer(id)).issue, cas).toBe('ecrite');
    }
  });

  it('2. question 1 : un « signee » répété et un « retiree » jamais signé sont refusés, la base ne les voit pas', async () => {
    const id = await verser(await positionLibre(), null);
    const retrait = await m.poserActePosition(
      { idVersion: id, acte: 'retiree', empreinteVue: m.empreinteContenuPosition(CONTENU), dernierActeVu: null, relectureIntegrale: false, motif: 'm', auteur: AUTEUR },
      ctx(),
    );
    expect(retrait).toEqual({ issue: 'refusee', raison: 'jamais_signee' });
    const s = await signer(id);
    expect(s.issue).toBe('ecrite');
    const jeton = s.issue === 'ecrite' ? s.acte.ordre : null;
    expect(await signer(id, jeton)).toEqual({ issue: 'refusee', raison: 'deja_signee' });
    const { rows } = await observateur.query('SELECT count(*)::int AS n FROM positions_expert_actes WHERE id_version = $1', [id]);
    expect(rows[0].n).toBe(1);
  });

  it('3. un claim d’appui absent du corpus : refusé au versement, et lu « à relire » sur une position déjà versée', async () => {
    const reel = { ...ctx(), lireFraicheur: m.claimsFrais };
    const refus = await m.verserVersion(
      { positionId: await positionLibre(), version: 'v1.0', dossier: 'zinc', ficheId: null, contenu: CONTENU, claimsAppui: [CL_A], idVersionCouranteVue: null, auteur: AUTEUR },
      reel,
    );
    expect(refus).toEqual({ issue: 'refusee', raison: 'appui_non_frais', claims: [CL_A] });
    const p = await positionLibre();
    await verser(p, null);
    const atelier = await m.lireAtelierPositions(reel);
    const lue = atelier.positions.find(x => x.positionId === p)!;
    expect(lue.aRelire).toBe(true);
    expect(lue.courante.appuisNonFrais).toEqual([CL_A]);
  });

  /**
   * Les sessions qui attendent CE verrou-là, dans cette base. Un autre banc qui
   * attendrait un autre verrou consultatif sur la même base ne compte pas
   * (revue CodeRabbit de #1893). `pg_advisory_xact_lock(int4, int4)` se lit
   * dans `pg_locks` en `classid` = 439, `objid` = la clé, `objsubid` = 2.
   */
  async function attendreBloquees(n: number, cle: string) {
    for (let i = 0; i < 400; i++) {
      const { rows } = await observateur.query(
        `SELECT count(*)::int AS n FROM pg_locks l
         JOIN pg_database d ON d.oid = l.database
         WHERE l.locktype = 'advisory' AND NOT l.granted AND d.datname = current_database()
           AND l.classid = 439 AND l.objid = hashtext($1)::oid AND l.objsubid = 2`,
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
      await tenant.query('SELECT pg_advisory_xact_lock(439, hashtext($1))', [cle]);
      const enVol = lancer();
      await attendreBloquees(enVol.length, cle);
      await tenant.query('COMMIT');
      return await Promise.allSettled(enVol);
    } finally {
      await tenant.end();
    }
  }

  it('4. question 3 sous concurrence : deux brouillons sur la même fiche se versent, une seule signature passe', async () => {
    const [p1, p2] = [await positionLibre(), await positionLibre()];
    // Un brouillon n'occupe pas sa fiche : les deux se versent.
    const [v1, v2] = [await verser(p1, FICHE_C), await verser(p2, FICHE_C)];
    const issues = await sousVerrou(`fu|${FICHE_C}`, () => [signer(v1), signer(v2)]);
    const valeurs = issues.map(i => (i.status === 'fulfilled' ? i.value : { issue: 'exception', raison: String(i.reason) }));
    expect(valeurs.filter(v => v.issue === 'ecrite')).toHaveLength(1);
    expect(valeurs.filter(v => v.issue === 'refusee').map(v => ('raison' in v ? v.raison : null))).toEqual(['fiche_deja_fondee']);
    const { rows } = await observateur.query(
      `SELECT count(*)::int AS n FROM positions_expert_actes a JOIN positions_expert_versions v ON v.id = a.id_version
       WHERE v.fiche_id = $1 AND a.acte = 'signee'`,
      [FICHE_C],
    );
    expect(rows[0].n).toBe(1);
  });

  it('5. refus des arbitrages : conflit inconnu, fiche hors liste, claim hors conflit, position d’une autre fiche', async () => {
    const pose = { conflitId: CONFLIT, ficheId: FICHE_A, teteVue: null, entreeVue: EMPREINTE_ENTREE, retenu: { claim: CL_A } as { claim: string } | { idPositionVersion: string }, motif: 'm', auteur: AUTEUR };
    expect(await m.poserArbitrage({ ...pose, conflitId: `CS-INCONNU${RUN}` }, ctx())).toEqual({ issue: 'refusee', raison: 'conflit_inconnu' });
    expect(await m.poserArbitrage({ ...pose, ficheId: FICHE_C }, ctx())).toEqual({ issue: 'refusee', raison: 'fiche_hors_liste' });
    expect(await m.poserArbitrage({ ...pose, retenu: { claim: 'WN-CL-0000-000@v1.0' } }, ctx())).toEqual({ issue: 'refusee', raison: 'claim_hors_conflit' });
    const p = await positionLibre();
    const v = await verser(p, FICHE_B);
    await signer(v);
    expect(await m.poserArbitrage({ ...pose, retenu: { idPositionVersion: v } }, ctx())).toEqual({ issue: 'refusee', raison: 'position_autre_fiche' });
    const { rows } = await observateur.query('SELECT count(*)::int AS n FROM arbitrages_conflits_sources WHERE conflit_id = $1', [CONFLIT]);
    expect(rows[0].n).toBe(0);
  });

  it('6. une écriture par transaction : un retrait et une pose qui retient la même position se sérialisent, sans interblocage', async () => {
    const p = await positionLibre();
    const v = await verser(p, FICHE_D);
    const s = await signer(v);
    const jeton = s.issue === 'ecrite' ? s.acte.ordre : null;
    const issues = await sousVerrou<{ issue: string; raison?: string }>(`pe|${p}`, () => [
      m.poserActePosition(
        { idVersion: v, acte: 'retiree', empreinteVue: m.empreinteContenuPosition(CONTENU), dernierActeVu: jeton, relectureIntegrale: false, motif: 'm', auteur: AUTEUR },
        ctx(),
      ),
      m.poserArbitrage({ conflitId: CONFLIT, ficheId: FICHE_D, teteVue: null, entreeVue: EMPREINTE_ENTREE, retenu: { idPositionVersion: v }, motif: 'm', auteur: AUTEUR }, ctx()),
    ]);
    // Aucune exception (40P01 compris) : chaque transaction écrit une ligne.
    expect(issues.map(i => i.status)).toEqual(['fulfilled', 'fulfilled']);
    const [retrait, pose] = issues.map(i => (i as PromiseFulfilledResult<{ issue: string; raison?: string }>).value);
    expect(retrait.issue).toBe('ecrite');
    // Ordre 1 : la pose passe d'abord, puis le retrait ; ordre 2 : le retrait d'abord, la pose est refusée.
    expect(['ecrite', 'position_hors_vigueur']).toContain(pose.issue === 'ecrite' ? 'ecrite' : pose.raison);

    // Si la pose a passé, la lecture la dit « à relire » : la position retenue est retirée (A3).
    const atelier = await m.lireAtelierPositions(ctx());
    const couple = atelier.couples.find(c => c.conflitId === CONFLIT && c.ficheId === FICHE_D);
    if (pose.issue === 'ecrite') expect(couple?.causesARelire).toEqual(['position_retiree']);
    else expect(couple).toBeUndefined();
  });

  it('8. question 3 à la signature : seule une position signée tient la fiche ; une révision sans fiche la libère', async () => {
    const [p1, p2] = [await positionLibre(), await positionLibre()];
    const v1 = await verser(p1, FICHE_E);
    const s = await signer(v1);
    const jetonSigne = s.issue === 'ecrite' ? s.acte.ordre : null;
    // P1 signée : P2 se verse en brouillon sur la même fiche, mais ne se signe pas.
    const v2 = await verser(p2, FICHE_E);
    expect(await signer(v2)).toEqual({ issue: 'refusee', raison: 'fiche_deja_fondee' });
    const retrait = await m.poserActePosition(
      { idVersion: v1, acte: 'retiree', empreinteVue: m.empreinteContenuPosition(CONTENU), dernierActeVu: jetonSigne, relectureIntegrale: false, motif: 'm', auteur: AUTEUR },
      ctx(),
    );
    expect(retrait.issue).toBe('ecrite');
    const jetonRetire = retrait.issue === 'ecrite' ? retrait.acte.ordre : null;
    // P1 retirée : la fiche est libre, P2 se signe et la tient.
    expect((await signer(v2)).issue).toBe('ecrite');
    expect(await signer(v1, jetonRetire)).toEqual({ issue: 'refusee', raison: 'fiche_deja_fondee' });
    // P2 se révise sans fiche : FICHE_E est libérée, P1 se re-signe.
    const rev = await m.verserVersion(
      { positionId: p2, version: 'v1.1', dossier: 'fer', ficheId: null, contenu: CONTENU, claimsAppui: [CL_A], idVersionCouranteVue: v2, auteur: AUTEUR },
      ctx(),
    );
    expect(rev.issue).toBe('ecrite');
    expect((await signer(v1, jetonRetire)).issue).toBe('ecrite');
  });

  // Conséquence de l'option (a) : « en vigueur » = version courante signée
  // (`etat.ts`). Réviser une position signée, même sur la même fiche, la sort
  // de vigueur et libère sa fiche ; une autre peut s'y signer entre-temps.
  it('9. une révision de la position signée libère sa fiche : une autre s’y signe, la révision ne se signe plus', async () => {
    const [p1, p2] = [await positionLibre(), await positionLibre()];
    const v1 = await verser(p1, FICHE_F);
    expect((await signer(v1)).issue).toBe('ecrite');
    const rev = await m.verserVersion(
      { positionId: p1, version: 'v1.1', dossier: 'fer', ficheId: FICHE_F, contenu: CONTENU, claimsAppui: [CL_A], idVersionCouranteVue: v1, auteur: AUTEUR },
      ctx(),
    );
    if (rev.issue !== 'ecrite') throw new Error(`révision refusée : ${rev.raison}`);
    const v2 = await verser(p2, FICHE_F);
    expect((await signer(v2)).issue).toBe('ecrite');
    expect(await signer(rev.version.id)).toEqual({ issue: 'refusee', raison: 'fiche_deja_fondee' });
  });

  it('7. pose sur un claim, remplacement, révocation : la tête suit, l’historique reste', async () => {
    const lire = async () => (await m.lireAtelierPositions(ctx())).couples.find(c => c.conflitId === CONFLIT && c.ficheId === FICHE_A);
    // L'empreinte que l'atelier affiche, et renvoie avec la pose, est celle de l'entrée (renvoi CodeRabbit de #1908).
    expect((await m.lireAtelierPositions(ctx())).conflits.find(c => c.id === CONFLIT)?.empreinte).toBe(EMPREINTE_ENTREE);
    const p1 = await m.poserArbitrage({ conflitId: CONFLIT, ficheId: FICHE_A, teteVue: null, entreeVue: EMPREINTE_ENTREE, retenu: { claim: CL_A }, motif: 'm1', auteur: AUTEUR }, ctx());
    expect(p1.issue).toBe('ecrite');
    const t1 = (await lire())!.tete!;
    expect(t1.claimRetenu).toBe(CL_A);
    expect((await lire())!.causesARelire).toEqual([]);
    const p2 = await m.poserArbitrage({ conflitId: CONFLIT, ficheId: FICHE_A, teteVue: t1.id, entreeVue: EMPREINTE_ENTREE, retenu: { claim: CL_B }, motif: 'm2', auteur: AUTEUR }, ctx());
    expect(p2.issue).toBe('ecrite');
    const t2 = (await lire())!.tete!;
    expect(t2.claimRetenu).toBe(CL_B);
    // Une tête vue périmée ne révoque rien.
    expect(await m.revoquerArbitrage({ conflitId: CONFLIT, ficheId: FICHE_A, teteVue: t1.id, motif: 'r', auteur: AUTEUR })).toEqual({
      issue: 'refusee',
      raison: 'etat_divergent',
    });
    expect((await m.revoquerArbitrage({ conflitId: CONFLIT, ficheId: FICHE_A, teteVue: t2.id, motif: 'r', auteur: AUTEUR })).issue).toBe('ecrite');
    const fin = (await lire())!;
    expect(fin.tete).toBeNull();
    expect(fin.historique).toHaveLength(3);
    // Avec le registre et la structure du dépôt, signés : l'entrée affichée est
    // la bonne, mais la fiche synthétique n'est pas dans la structure signée.
    const depot = { ...m.contexteDuDepot(), lireFraicheur: ctx().lireFraicheur };
    const bio = CONFLITS_SOURCES_V1.find(c => c.id === 'CS-BIO-01')!;
    expect(
      await m.poserArbitrage(
        { conflitId: 'CS-BIO-01', ficheId: FICHE_A, teteVue: null, entreeVue: empreinteEntreeConflit(bio), retenu: { claim: CL_A }, motif: 'm', auteur: AUTEUR },
        depot,
      ),
    ).toEqual({ issue: 'refusee', raison: 'fiche_hors_structure' });
  });
});
