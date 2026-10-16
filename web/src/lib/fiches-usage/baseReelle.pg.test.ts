// BANC SUR BASE RÉELLE — les fiches d'usage ([[D-314]], BP-12a, suites de la
// revue : deux promesses qu'aucun banc à base simulée ne tient).
//
//   1. L'EMPREINTE JS ET L'EMPREINTE SQL SONT LA MÊME, APRÈS L'ALLER-RETOUR
//      JSONB. L'écran renvoie l'empreinte que le serveur a calculée en JS sur le
//      texte RELU de la base ; le trigger des actes la recalcule en SQL sur
//      `contenu ->> rubrique`. Si les deux divergeaient pour un caractère
//      (accent composé, emoji, `\r\n`, espace insécable…), aucune rubrique de
//      ce texte ne se validerait jamais. Le banc passe par les VRAIS chemins :
//      contrat, dépôt, lecture, décision.
//   2. DEUX ACTES CONCURRENTS SUR LE MÊME ÉTAT N'EN POSENT QU'UN. La décision
//      prend un verrou consultatif par fiche (par terme) puis relit le dernier
//      acte. Le banc tient le verrou depuis une session tierce, lance deux
//      validations portant le même jeton, CONSTATE que les deux attendent le
//      verrou (`pg_stat_activity`) — sans ce constat, une course « gagnée »
//      aurait pu se jouer en série —, puis relâche : une seule passe, l'autre
//      est refusée « état divergent ».
//
// SAUTÉ PAR DÉFAUT (T1, T2) : il écrit et commet. Il ne tourne que si
// `WN_FICHES_USAGE_BANC_BASE` nomme la base de `DATABASE_URL`, sur un hôte
// LOCAL (patron de `scripts/banc-ecart-validation-deux-sessions.test.mjs`) —
// en CI, après les contrats SQL, avec `DB_POOL_MAX` ≥ 3 (deux transactions
// concurrentes, plus la lecture). Les tables sont en AJOUT SEUL : ses lignes
// (identifiants `FU_BANC_…`, `HYP_BANC_…`, propres au run) restent dans la base
// éphémère qui les a reçues.
//
// TEXTES SYNTHÉTIQUES SEULEMENT ([[D-251]] §4).

import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL ?? '';
const BASE_ANNONCEE = process.env.WN_FICHES_USAGE_BANC_BASE ?? '';

function baseAutorisee(): boolean {
  if (!URL_BASE || !BASE_ANNONCEE) return false;
  const url = new URL(URL_BASE);
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${url.hostname} », le banc n'écrit que sur une base locale.`);
  }
  if (url.pathname.slice(1) !== BASE_ANNONCEE) {
    throw new Error(`REFUS : DATABASE_URL vise « ${url.pathname.slice(1)} », WN_FICHES_USAGE_BANC_BASE annonce « ${BASE_ANNONCEE} ».`);
  }
  return true;
}

const ACTIF = baseAutorisee();
const RUN = randomBytes(4).toString('hex').toUpperCase();

describe.skipIf(!ACTIF)('fiches d’usage — base réelle (empreintes, concurrence)', () => {
  // Importés seulement si le banc tourne : `@/lib/prisma` exige DATABASE_URL.
  let m: {
    lireBrouillonVersionUsage: typeof import('./contrat').lireBrouillonVersionUsage;
    lireBrouillonLibelle: typeof import('./contrat').lireBrouillonLibelle;
    deposerBrouillonVersionUsage: typeof import('./ingestion').deposerBrouillonVersionUsage;
    deposerBrouillonLibelle: typeof import('./ingestion').deposerBrouillonLibelle;
    lireVersionFicheUsage: typeof import('./lecture').lireVersionFicheUsage;
    lireRayonFichesUsage: typeof import('./lecture').lireRayonFichesUsage;
    poserActeRubrique: typeof import('./decision').poserActeRubrique;
    poserActeLibelle: typeof import('./decision').poserActeLibelle;
    empreinteTexte: typeof import('./empreintes').empreinteTexte;
    sha256: typeof import('@/lib/clinical/corpusSyntheseV1').sha256;
  };
  let observateur: pg.Client;

  // Une structure synthétique, propre au run, qu'on déclare signée : le
  // contexte de contrôle et de décision est passé explicitement — la structure
  // du dépôt, elle, reste vide et non signée.
  const FICHE_EMPREINTE = `FU_BANC_EMPREINTE_${RUN}`;
  const FICHE_COURSE = `FU_BANC_COURSE_${RUN}`;
  const TERME_COURSE = `HYP_BANC_COURSE_${RUN}`;
  const fiche = (id: string) => ({
    id,
    question: `QC_BANC_${RUN}`,
    besoins: [2],
    nature: 'mesure_directe' as const,
    usageDecisionnel: 'confirmer_hypothese' as const,
    securiteAdmissibilite: false,
    statutUsage: 'etaye_valide' as const,
    population: `POP_BANC_${RUN}`,
    hypotheses: [TERME_COURSE],
    codesAnalyte: [],
    claims: [],
    rubriques: ['question', 'limites'] as ('question' | 'limites')[],
  });
  const STRUCTURE = {
    fiches: [fiche(FICHE_EMPREINTE), fiche(FICHE_COURSE)],
    questions: [`QC_BANC_${RUN}`],
    hypotheses: [TERME_COURSE],
    populations: [`POP_BANC_${RUN}`],
  };
  let controle: { structure: typeof STRUCTURE; empreinte: string };
  const signee = () => ({ controle, signee: true });

  const modeles = { modeleRedaction: 'modele-banc-a', modeleContreLecture: 'modele-banc-b', versionConsigne: 'consigne-banc' };

  beforeAll(async () => {
    const [contrat, ingestion, lecture, decision, empreintes, corpus] = await Promise.all([
      import('./contrat'),
      import('./ingestion'),
      import('./lecture'),
      import('./decision'),
      import('./empreintes'),
      import('@/lib/clinical/corpusSyntheseV1'),
    ]);
    m = { ...contrat, ...ingestion, ...lecture, ...decision, ...empreintes, sha256: corpus.sha256 };
    controle = { structure: STRUCTURE, empreinte: m.sha256(JSON.stringify(STRUCTURE)) };
    observateur = new pg.Client({ connectionString: URL_BASE });
    await observateur.connect();
  });

  afterAll(async () => {
    await observateur?.end();
    const { prisma } = await import('@/lib/prisma');
    await prisma.$disconnect();
  });

  /** Dépose une version par les vrais chemins (contrat, ingestion) et rend son id. */
  async function deposer(ficheId: string, contenu: Record<string, string>): Promise<string> {
    const brouillon = m.lireBrouillonVersionUsage({ ficheId, contenu, structureSha256: controle.empreinte, ...modeles });
    const issue = await m.deposerBrouillonVersionUsage(brouillon, controle);
    if (issue.issue === 'refusee') throw new Error(`dépôt refusé : ${JSON.stringify(issue.anomalies)}`);
    return issue.id;
  }

  // Les caractères qui ont un comportement propre à JSON, à JSONB ou à UTF-8.
  const TEXTES_DIFFICILES: Record<string, string> = {
    accents_precomposes: 'Été, cœur, Œuvre — « guillemets » ’apostrophe’.',
    accent_combinant: 'Été composé par diacritique combinant.',
    emoji_et_zwj: 'Soignante 👩🏽‍⚕️, drapeau 🇫🇷, hors BMP 𝔘𝔫𝔦𝔠𝔬𝔡𝔢.',
    fins_de_ligne: 'Ligne une\r\nligne deux\rligne trois\nligne quatre',
    espaces: 'Insécable fine et\ttabulation, chasse nulle​ici.',
    echappements_json: 'Barre \\ oblique, "guillemets droits", /slash/ et  séparateur.',
    ecritures: 'Ελληνικά, русский, 中文, العربية.',
  };

  it('1. l’empreinte calculée en JS sur le texte relu est celle que la base recalcule — et l’acte passe', async () => {
    for (const [cas, texte] of Object.entries(TEXTES_DIFFICILES)) {
      const ficheId = `${FICHE_EMPREINTE}`;
      const id = await deposer(ficheId, { question: texte, limites: `Limites synthétiques ${cas}.` });

      // L'empreinte que l'écran recevra : JS, sur le texte relu de la base.
      const detail = await m.lireVersionFicheUsage(id, controle, true);
      const rubrique = detail?.rubriques.find(r => r.rubrique === 'question');
      expect(rubrique?.texte, cas).toBe(texte);
      expect(rubrique?.empreinte, cas).toBe(m.empreinteTexte(texte));

      // La même, recalculée par la base sur le JSONB rangé.
      const { rows } = await observateur.query(
        `SELECT encode(sha256(convert_to(contenu ->> 'question', 'UTF8')), 'hex') AS sql FROM fiches_usage_versions WHERE id = $1`,
        [id],
      );
      expect(rows[0].sql, cas).toBe(rubrique?.empreinte);

      // Et l'acte, dont le trigger refuserait une empreinte divergente.
      const issue = await m.poserActeRubrique(
        {
          idVersion: id,
          rubrique: 'question',
          acte: 'validee',
          empreinteVue: rubrique!.empreinte,
          dernierActeVu: rubrique!.dernierActe,
          relectureIntegrale: true,
          validateur: 'responsable@exemple.fr',
        },
        signee(),
      );
      expect(issue.issue, `${cas} : ${JSON.stringify(issue)}`).toBe('posee');
    }
  });

  /** Attend que `n` sessions attendent un verrou consultatif. */
  async function attendreBloquees(n: number) {
    const limite = Date.now() + 10_000;
    while (Date.now() < limite) {
      const { rows } = await observateur.query(
        `SELECT count(*)::int AS n FROM pg_stat_activity
         WHERE wait_event_type = 'Lock' AND wait_event = 'advisory' AND datname = current_database()`,
      );
      if (rows[0].n >= n) return;
      await new Promise(r => setTimeout(r, 25));
    }
    throw new Error(`${n} sessions n’ont jamais attendu le verrou : la course s’est jouée en série.`);
  }

  /** Une session tierce tient le verrou de la décision pendant que `lancer` démarre. */
  async function sousVerrou<T>(cle: string, lancer: () => Promise<T>[]): Promise<T[]> {
    const tenant = new pg.Client({ connectionString: URL_BASE });
    await tenant.connect();
    try {
      await tenant.query('BEGIN');
      await tenant.query('SELECT pg_advisory_xact_lock(hashtext($1))', [cle]);
      const enVol = lancer();
      await attendreBloquees(enVol.length);
      await tenant.query('COMMIT');
      return await Promise.all(enVol);
    } finally {
      await tenant.end();
    }
  }

  it('2a. deux validations concurrentes d’une rubrique, sur le même état : une seule est posée', async () => {
    const id = await deposer(FICHE_COURSE, { question: 'Question synthétique de course.', limites: 'Limites synthétiques.' });
    const rubrique = (await m.lireVersionFicheUsage(id, controle, true))!.rubriques.find(r => r.rubrique === 'question')!;
    const demande = {
      idVersion: id,
      rubrique: 'question',
      acte: 'validee' as const,
      empreinteVue: rubrique.empreinte,
      dernierActeVu: rubrique.dernierActe,
      relectureIntegrale: true,
      validateur: 'responsable@exemple.fr',
    };
    const issues = await sousVerrou(`fiches_usage_actes:${FICHE_COURSE}`, () => [
      m.poserActeRubrique(demande, signee()),
      m.poserActeRubrique(demande, signee()),
    ]);
    expect(issues.filter(i => i.issue === 'posee')).toHaveLength(1);
    expect(issues.filter(i => i.issue === 'refusee').map(i => (i.issue === 'refusee' ? i.raison : null))).toEqual(['etat_divergent']);
    const { rows } = await observateur.query(
      `SELECT count(*)::int AS n FROM fiches_usage_actes WHERE id_version = $1 AND rubrique = 'question'`,
      [id],
    );
    expect(rows[0].n).toBe(1);
  });

  it('2b. deux validations concurrentes d’un libellé, sur le même état : une seule est posée', async () => {
    const brouillon = m.lireBrouillonLibelle({
      termeId: TERME_COURSE,
      libelle: 'Libellé synthétique de course.',
      structureSha256: controle.empreinte,
      ...modeles,
    });
    const depot = await m.deposerBrouillonLibelle(brouillon, controle);
    if (depot.issue === 'refusee') throw new Error(`dépôt refusé : ${JSON.stringify(depot.anomalies)}`);
    const demande = {
      idLibelle: depot.id,
      acte: 'validee' as const,
      empreinteVue: m.empreinteTexte('Libellé synthétique de course.'),
      dernierActeVu: null,
      relectureIntegrale: true,
      validateur: 'responsable@exemple.fr',
    };
    const issues = await sousVerrou(`fiches_usage_libelles_actes:${TERME_COURSE}`, () => [
      m.poserActeLibelle(demande, signee()),
      m.poserActeLibelle(demande, signee()),
    ]);
    expect(issues.filter(i => i.issue === 'posee')).toHaveLength(1);
    expect(issues.filter(i => i.issue === 'refusee').map(i => (i.issue === 'refusee' ? i.raison : null))).toEqual(['etat_divergent']);
    const { rows } = await observateur.query(`SELECT count(*)::int AS n FROM fiches_usage_libelles_actes WHERE id_libelle = $1`, [
      depot.id,
    ]);
    expect(rows[0].n).toBe(1);
  });
});
