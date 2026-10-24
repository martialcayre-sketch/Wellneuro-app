// BANC DE REJEU — la migration des dix-sept liens analyte-axe signés
// ([[D-351]] §5, F79, migration `20261024160000_biology_liens_axe_signes_v1`).
//
// POURQUOI CE FICHIER EXISTE. La base du CI est construite par `migrate
// deploy` seul et ne porte aucun claim : la migration n'y écrit rien (corpus
// vide = aucun lien, arbitrage du responsable du 2026-10-24), et le contrat de
// la liste exacte (`prisma/checks/biology_liens_axe_v1.sql`) n'y voit qu'une
// cible vide. Sans ce banc, le chemin d'insertion et le contrat complet ne
// tourneraient pour la première fois qu'en production. Ici, chaque cas :
//   1. ouvre une transaction et pose les seize claims cités en fixture
//      (`VALIDE`, actifs, non supplantés, v1.0 ; texte, source et embedding
//      fictifs) ;
//   2. rejoue le fichier de migration TEL QU'IL EST COMMITTÉ — lu sur le
//      disque, jamais recopié ;
//   3. joue le contrat de la liste exacte, ou constate l'échec attendu ;
//   4. annule tout.
// Les cas qui doivent rougir sont reconnus à leur motif, pas au seul échec :
// un échec pour une autre raison laisserait le banc vert sans rien prouver.
// Le message reçu n'est jamais imprimé, seul son code SQLSTATE l'est.
//
// RIEN N'EST COMMIS. La base visée doit quand même être NOMMÉE et locale
// (patron des bancs à deux sessions) : `WN_LIENS_AXE_BANC_BASE` doit égaler le
// nom de la base de `DATABASE_URL`. Et le banc refuse une base qui porte déjà
// un corpus : il n'a de sens que sur une base sans claim.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_LIENS_AXE_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
const HOTE = new URL(URL_BASE).hostname;
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc ne joue que sur une base locale.`);
}
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_LIENS_AXE_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = readFileSync(
  join(WEB, 'prisma/migrations/20261024160000_biology_liens_axe_signes_v1/migration.sql'),
  'utf8',
);
const CONTRAT = readFileSync(join(WEB, 'prisma/checks/biology_liens_axe_v1.sql'), 'utf8');

// Une migration qui porterait son propre BEGIN/COMMIT validerait les
// fixtures : le rejeu n'aurait plus rien d'annulé.
if (/^\s*(BEGIN|COMMIT|START TRANSACTION)\s*;/im.test(MIGRATION)) {
  throw new Error('REFUS : la migration porte un contrôle de transaction, le rejeu ne serait plus annulé.');
}

// Les seize claims distincts cités par D-351 §2 (WN-CL-0294-004 porte deux
// liens). La liste exacte, elle, n'est écrite que dans la migration et dans
// le contrat : le banc ne la recopie pas, il les confronte.
const CLAIMS = [
  'WN-CL-0025-010', 'WN-CL-0041-061', 'WN-CL-0042-005', 'WN-CL-0043-014',
  'WN-CL-0043-030', 'WN-CL-0107-031', 'WN-CL-0107-033', 'WN-CL-0110-012',
  'WN-CL-0125-046', 'WN-CL-0125-047', 'WN-CL-0161-070', 'WN-CL-0161-081',
  'WN-CL-0291-015', 'WN-CL-0293-013', 'WN-CL-0294-004', 'WN-CL-0390-010',
];

const PRELUDE = `
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM rag_corpus_claims) THEN
    RAISE EXCEPTION 'banc F79 : la base porte déjà un corpus, refus';
  END IF;
  IF EXISTS (SELECT 1 FROM biology_analyte_links WHERE cible_type = 'axe') THEN
    RAISE EXCEPTION 'banc F79 : la base porte déjà des liens d''axe, refus';
  END IF;
END $$;
-- Le trigger existe déjà (migration appliquée par migrate deploy) : la
-- migration rejouée le recrée.
DROP TRIGGER biology_analyte_links_nutriment_axe_exclusifs ON public.biology_analyte_links;
INSERT INTO public.rag_corpus_claims
  (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
   typologie_lecture, prescriptif, statut, validateur, valide_at, active,
   metadata, embedding_model, embedding_dimensions, embedding)
SELECT '__f79_' || c.claim_id, c.claim_id, 'WN-SRC-0000', 'v1.0',
       'Fixture de banc — rejeu F79.', md5(c.claim_id) || md5('v1.0'),
       'déclaré', false, 'VALIDE', 'banc', now(), true,
       '{"fixture": "f79"}'::jsonb, 'banc', 1536,
       ('[' || repeat('0,', 1535) || '0]')::extensions.vector
FROM unnest(ARRAY[${CLAIMS.map((c) => `'${c}'`).join(', ')}]) AS c(claim_id);
`;

// Chaque cas : `avant` s'exécute après les fixtures et avant la migration,
// `apres` entre la migration et le contrat ; `motif` est le fragment du
// message attendu (null = le cas doit passer).
const CAS = [
  { nom: 'positif : 17 liens, liste exacte, claims certifiés', motif: null },

  // ── La migration refuse tout, faute d'un claim conforme ─────────────────
  {
    nom: 'claim REJETE',
    avant: `UPDATE rag_corpus_claims SET statut = 'REJETE' WHERE claim_id = 'WN-CL-0043-014';`,
    motif: 'D-351 §5 : 16 lien(s) sur 17',
  },
  {
    nom: 'claim inactif',
    avant: `UPDATE rag_corpus_claims SET active = false WHERE claim_id = 'WN-CL-0161-081';`,
    motif: 'D-351 §5 : 16 lien(s) sur 17',
  },
  {
    nom: 'claim supplanté',
    avant: `UPDATE rag_corpus_claims SET superseded_at = now() WHERE claim_id = 'WN-CL-0107-033';`,
    motif: 'D-351 §5 : 16 lien(s) sur 17',
  },
  {
    nom: 'claim dans une autre version que v1.0',
    avant: `UPDATE rag_corpus_claims SET version_claim = 'v1.1' WHERE claim_id = 'WN-CL-0291-015';`,
    motif: 'D-351 §5 : 16 lien(s) sur 17',
  },
  {
    nom: 'claim porteur de deux liens, absent',
    avant: `DELETE FROM rag_corpus_claims WHERE claim_id = 'WN-CL-0294-004';`,
    motif: 'D-351 §5 : 15 lien(s) sur 17',
  },
  {
    nom: 'cible axe déjà peuplée',
    avant: `INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim)
            VALUES ('__f79_prealable', 'BIO_HOMOCYSTEINE', 'axe', 'methylation', 'haut_evocateur', 'WN-CL-0043-014', 'v1.0');`,
    motif: 'la table porte déjà des liens d\'axe',
  },

  // ── Le contrat rougit sur un lien en plus, en moins ou modifié ──────────
  {
    nom: 'un lien en moins',
    apres: `DELETE FROM biology_analyte_links WHERE id = 'bal_f79_05';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'un lien en plus',
    apres: `INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim)
            VALUES ('__f79_en_trop', 'BIO_CRP_US', 'axe', 'stress_oxydant', 'haut_evocateur', 'WN-CL-0125-047', 'v1.0');`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'sens modifié',
    apres: `UPDATE biology_analyte_links SET direction = 'haut_evocateur' WHERE id = 'bal_f79_11';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'niveau de preuve inscrit',
    apres: `UPDATE biology_analyte_links SET niveau_preuve = 'C' WHERE id = 'bal_f79_01';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'lien désactivé',
    apres: `UPDATE biology_analyte_links SET actif = false WHERE id = 'bal_f79_02';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'claim échangé',
    apres: `UPDATE biology_analyte_links SET claim_id = 'WN-CL-0043-014' WHERE id = 'bal_f79_09';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'axe échangé',
    apres: `UPDATE biology_analyte_links SET cible_code = 'inflammation' WHERE id = 'bal_f79_16';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },

  // ── Le contrat rougit quand un claim cité cesse d'être certifié ─────────
  {
    nom: 'claim supplanté après la migration',
    apres: `UPDATE rag_corpus_claims SET superseded_at = now() WHERE claim_id = 'WN-CL-0110-012';`,
    motif: 'D-351 §5 : 1 lien(s) d\'axe citent un claim',
  },
];

let echecs = 0;
for (const cas of CAS) {
  const script = [PRELUDE, cas.avant ?? '', MIGRATION, cas.apres ?? '', CONTRAT].join('\n');
  const client = new pg.Client({ connectionString: URL_BASE });
  await client.connect();
  let erreur = null;
  try {
    await client.query(script);
  } catch (e) {
    erreur = e;
  }
  // Le contrat finit par ROLLBACK ; un script interrompu laisse une
  // transaction avortée. Dans les deux cas, rien ne survit.
  await client.query('ROLLBACK').catch(() => {});
  await client.end();

  if (cas.motif === null) {
    if (erreur) {
      echecs += 1;
      console.error(`ÉCHEC  ${cas.nom} : refusé (SQLSTATE ${erreur.code ?? '?'}) alors qu'il doit passer.`);
    } else {
      console.log(`ok     ${cas.nom}`);
    }
  } else if (!erreur) {
    echecs += 1;
    console.error(`ÉCHEC  ${cas.nom} : ACCEPTÉ alors qu'il doit rougir.`);
  } else if (!String(erreur.message).includes(cas.motif)) {
    echecs += 1;
    console.error(`ÉCHEC  ${cas.nom} : refusé pour un autre motif (SQLSTATE ${erreur.code ?? '?'}).`);
  } else {
    console.log(`ok     ${cas.nom} (refusé pour le bon motif)`);
  }
}

if (echecs > 0) {
  console.error(`banc F79 : ${echecs} cas sur ${CAS.length} en échec.`);
  process.exit(1);
}
console.log(`banc F79 : ${CAS.length} cas conformes.`);
