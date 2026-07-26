/**
 * CB-02a — import de la nomenclature NABM depuis le Serveur Multi-Terminologies
 * de l'ANS (Licence Ouverte v2, API anonyme).
 *
 * Sans argument, le script récupère les six pages, les vérifie, imprime un
 * rapport et s'arrête SANS toucher à la base.
 *
 * L'écriture exige simultanément :
 *   --apply
 *   --confirmation CB-02A-IMPORT-NABM-V105-MC-2026-07-26-v1
 *   WN_CB_NABM_IMPORT_CONFIRMATION=CB-02A-IMPORT-NABM-V105-MC-2026-07-26-v1
 *   MIGRATE_DATABASE_URL=<connexion PostgreSQL de migration>
 *   --base <hôte>          l'hôte visé, qui doit correspondre à celui de
 *                          MIGRATE_DATABASE_URL
 *
 * POURQUOI `--base` PLUTÔT QU'UN CONTRÔLE DE `VERCEL_ENV`. La première version
 * de ce script recopiait le garde de l'import Ciqual : « hors Vercel
 * Production, exiger --allow-non-production ». La revue du 2026-07-26 a montré
 * qu'il ne gardait rien : le drapeau qui annonce « pas la production » était
 * celui qu'on aurait tapé POUR écrire en production. Un garde qu'on désarme
 * systématiquement est pire qu'aucun garde — il rassure.
 *
 * `--base` demande à l'opérateur de NOMMER la base qu'il vise, et refuse si ce
 * nom ne se retrouve pas dans la chaîne de connexion. On ne peut plus se
 * tromper de base sans l'avoir écrit. Ce garde reste le bon depuis que
 * `scripts/vercel-build.sh` appelle cet import (2026-07-26) : il ne dépend
 * d'aucune variable de plateforme, donc il vaut aussi bien pour le build que
 * pour un lancement à la main, et il vaudra encore après le cutover Scalingo.
 *
 * Épingles de contenu, employées par `scripts/vercel-build.sh` :
 *   --version <millésime>  échoue si la source n'en rend pas exactement celui-là
 *   --sha256 <empreinte>   échoue si le contenu canonique n'a pas cette
 *                          empreinte. Les deux ensemble rendent l'import
 *                          REPRODUCTIBLE : il écrit ce qui a été relu en PR, ou
 *                          rien. Sans elles, un import câblé dans un build
 *                          suivrait la source sans que personne l'ait décidé.
 *
 * Quand les deux épingles sont posées ET que la base sert déjà ce millésime
 * avec cette empreinte, l'import SORT SANS APPELER LA SOURCE. Ce n'est pas une
 * optimisation : sans elle, une variable d'armement oubliée en place ferait
 * interroger l'ANS à chaque déploiement de production, et ferait échouer tous
 * les déploiements le jour où la nomenclature changerait de millésime.
 *
 * Options de mise au point :
 *   --source <répertoire>  lit les pages depuis des fixtures au lieu du réseau
 *   --allow-shrink         accepte un millésime sous le plancher de volumétrie
 *   --remplace-pointeur <version_actuelle>
 *                          autorise le pointeur à quitter un millésime pour un
 *                          millésime DÉJÀ connu (retour arrière) ; il faut
 *                          nommer la version que l'on remplace
 *   --accepte-orphelines   autorise un import qui prive des correspondances
 *                          signées de leur acte
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';
import { stripSslParams, supabasePoolSsl } from '@/lib/postgres';
import {
  construireImport,
  NABM_EXPAND_ENDPOINT,
  NABM_IMPORT_CONFIRMATION,
  NABM_LICENCE,
  NABM_PAGE_SIZE,
  NABM_PROPRIETES,
  NABM_SOURCE_PROVENANCE,
  NABM_VALUESET_URL,
  type ActeNabm,
  type ImportNabm,
  type PageExpand,
} from './nabmImport';

const NOMBRE_PAGES = 6;
const TAILLE_LOT = 200;

function argument(nom: string): string | undefined {
  const index = process.argv.indexOf(nom);
  if (index === -1) return undefined;
  const valeur = process.argv[index + 1];
  if (!valeur || valeur.startsWith('--')) throw new Error(`Valeur absente pour ${nom}`);
  return valeur;
}

async function recupererPage(offset: number): Promise<PageExpand> {
  const parametres = new URLSearchParams();
  parametres.set('url', NABM_VALUESET_URL);
  parametres.set('count', String(NABM_PAGE_SIZE));
  parametres.set('offset', String(offset));
  for (const propriete of NABM_PROPRIETES) parametres.append('property', propriete);

  let derniereErreur: unknown;
  for (let tentative = 1; tentative <= 3; tentative += 1) {
    try {
      const reponse = await fetch(`${NABM_EXPAND_ENDPOINT}?${parametres}`, {
        headers: { accept: 'application/fhir+json' },
        signal: AbortSignal.timeout(120_000),
      });
      if (!reponse.ok) {
        throw new Error(`Réponse ${reponse.status} de la source à l'offset ${offset}`);
      }
      return (await reponse.json()) as PageExpand;
    } catch (erreur) {
      derniereErreur = erreur;
      if (tentative < 3) await new Promise(r => setTimeout(r, tentative * 500));
    }
  }
  throw derniereErreur;
}

async function recupererPages(): Promise<PageExpand[]> {
  const repertoire = argument('--source');
  if (repertoire) {
    const fichiers = (await readdir(repertoire)).filter(f => f.endsWith('.json')).sort();
    if (fichiers.length === 0) throw new Error(`Aucune fixture .json dans ${repertoire}`);
    return Promise.all(
      fichiers.map(async f => JSON.parse(await readFile(join(repertoire, f), 'utf8')) as PageExpand),
    );
  }

  // Séquentiel et non parallèle : six requêtes sur une API publique gratuite
  // de l'État. Rien ici n'est pressé, et la source n'a pas à absorber une
  // rafale à chaque rejeu.
  const pages: PageExpand[] = [];
  for (let page = 0; page < NOMBRE_PAGES; page += 1) {
    pages.push(await recupererPage(page * NABM_PAGE_SIZE));
  }
  return pages;
}

// Titre NEUTRE, à dessein. Ce rapport s'imprime avant le contrôle d'empreinte,
// avant le garde des signatures et avant l'écriture : il décrit ce que la
// SOURCE contient, pas ce qui sera fait. « dry-run » mentait sur un run qui
// écrit — c'était le défaut d'origine, dans le log de build, seule trace d'une
// écriture en production ; « import » mentirait sur un run refusé. Le succès
// n'a qu'un marqueur, la ligne « import NABM validé ».
function imprimerRapport(resultat: ImportNabm, ecritureDemandee: boolean): void {
  console.log('=== CB-02a — lecture de la source NABM ===');
  console.log(JSON.stringify(resultat.rapport, null, 2));
  if (resultat.rapport.incompatibilitesAsymetriques > 0) {
    console.warn(
      `⚠ ${resultat.rapport.incompatibilitesAsymetriques} incompatibilité(s) déclarée(s) d'un ` +
        'seul côté par la source. Signalé, non bloquant : la V105 n\'en avait aucune.',
    );
  }
  if (!ecritureDemandee) console.log('Aucune écriture PostgreSQL effectuée.');
}

async function insererLot(client: Client, actes: ActeNabm[], version: string): Promise<void> {
  const colonnes = 17;
  const valeurs: Array<string | number | boolean | string[] | null> = [];
  const gabarits = actes.map((acte, rang) => {
    valeurs.push(
      `nabm-${version}-${acte.codeActe}`,
      acte.codeActe,
      version,
      acte.libelle,
      acte.coefficientB,
      acte.codeParent,
      acte.ententePrealable,
      acte.examenSanguin,
      acte.indicationMedicale,
      acte.nombreMaxParFacturation,
      acte.initiativeBiologistePossible,
      acte.rmo,
      acte.remboursementTotal,
      acte.acteReserve,
      acte.inactif,
      acte.codeIncompatible,
      acte.regleApplicable,
    );
    const decalage = rang * colonnes;
    return `(${Array.from({ length: colonnes }, (_, i) => `$${decalage + i + 1}`).join(', ')}, now())`;
  });

  await client.query(
    `INSERT INTO biology_nabm_actes
       (id, code_acte, version_source, libelle, coefficient_b, code_parent,
        entente_prealable, examen_sanguin, indication_medicale,
        nombre_max_par_facturation, initiative_biologiste_possible, rmo,
        remboursement_total, acte_reserve, inactif, code_incompatible,
        regle_applicable, updated_at)
     VALUES ${gabarits.join(', ')}`,
    valeurs,
  );
}

// Rend la connexion de migration une fois toutes les preuves réunies. Extraite
// de `ecrire` pour que la sortie anticipée de `main` les exige AVANT d'ouvrir
// la moindre connexion : un contrôle qui refuse la mauvaise base ne doit pas
// être précédé d'une lecture sur cette mauvaise base.
function verifierPreuves(): string {
  const confirmation = argument('--confirmation');
  if (confirmation !== NABM_IMPORT_CONFIRMATION) {
    throw new Error(`Confirmation CLI invalide ; attendu ${NABM_IMPORT_CONFIRMATION}`);
  }
  if (process.env.WN_CB_NABM_IMPORT_CONFIRMATION !== NABM_IMPORT_CONFIRMATION) {
    throw new Error('Variable WN_CB_NABM_IMPORT_CONFIRMATION absente ou invalide');
  }
  const url = process.env.MIGRATE_DATABASE_URL;
  if (!url) throw new Error('MIGRATE_DATABASE_URL est absente');

  // L'opérateur doit nommer la base qu'il vise. Voir l'en-tête : le contrôle
  // de VERCEL_ENV recopié de l'import Ciqual n'avait ici aucun sens.
  const baseAnnoncee = argument('--base');
  const hote = new URL(url).hostname;
  if (!baseAnnoncee) {
    throw new Error(
      `--base est requis avec --apply. La connexion vise « ${hote} » ; ` +
        'nommer cet hôte pour confirmer que c\'est bien la base voulue.',
    );
  }
  if (hote !== baseAnnoncee) {
    throw new Error(
      `--base annonce « ${baseAnnoncee} » mais MIGRATE_DATABASE_URL vise « ${hote} ». ` +
        'Import refusé — ce sont deux bases différentes.',
    );
  }

  // Le jeton doit NOMMER le millésime importé. Sans ce contrôle, la présence du
  // millésime dans le jeton n'était qu'une convention de nommage : une PR qui
  // aurait épinglé un millésime suivant sans toucher au jeton aurait laissé
  // valide une variable d'armement oubliée dans Vercel, et l'import serait
  // reparti au déploiement suivant. C'est ici que la convention devient
  // mécanique — et hors build, pas seulement dedans.
  const version = argument('--version');
  if (version && !NABM_IMPORT_CONFIRMATION.includes(`-${version}-`)) {
    throw new Error(
      `Le jeton ${NABM_IMPORT_CONFIRMATION} ne nomme pas le millésime ${version}. ` +
        'Épingler un millésime sans renouveler le jeton laisserait valide une ' +
        'autorisation donnée pour un autre contenu — import refusé.',
    );
  }
  return url;
}

// Le catalogue sert-il DÉJÀ ce millésime, avec exactement ce contenu ?
//
// Le prédicat est délibérément AU MOINS AUSSI FORT que le contrat rejoué juste
// après par `vercel-build.sh` : il vérifie le pointeur, son empreinte, son
// compte d'entrées, ET que ce compte est bien celui des actes réellement en
// base. Un prédicat plus faible ferait sortir l'import sur « rien à faire »
// devant un état que le contrat déclare aussitôt invalide — transformant un
// catalogue tronqué, aujourd'hui réparé par un simple rejeu, en déploiements
// de production bloqués jusqu'à intervention manuelle.
async function millesimeDejaServi(
  url: string,
  version: string,
  empreinte: string,
): Promise<boolean> {
  const client = new Client({
    connectionString: stripSslParams(url),
    ssl: supabasePoolSsl(url),
  });
  await client.connect();
  try {
    const { rows } = await client.query<{ servi: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM biology_catalog_versions_courantes c
           JOIN biology_source_snapshots s
             ON s.source_provenance = c.source_provenance
            AND s.version_source = c.version_source
          WHERE c.source_provenance = $1
            AND c.version_source = $2
            AND s.contenu_sha256 = $3
            AND c.contenu_sha256 = $3
            AND c.nombre_entrees > 0
            AND c.nombre_entrees = (
              SELECT count(*) FROM biology_nabm_actes
               WHERE version_source = c.version_source
            )
       ) AS servi`,
      [NABM_SOURCE_PROVENANCE, version, empreinte],
    );
    return rows[0]?.servi === true;
  } finally {
    await client.end();
  }
}

async function ecrire(resultat: ImportNabm): Promise<void> {
  const url = verifierPreuves();

  const { rapport, actes, snapshot } = resultat;
  const version = rapport.versionSource;

  const client = new Client({
    connectionString: stripSslParams(url),
    ssl: supabasePoolSsl(url),
  });
  await client.connect();
  let transactionOuverte = false;
  try {
    await client.query('BEGIN');
    transactionOuverte = true;
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '180s'");
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `cb-02a-import-nabm:${version}`,
    ]);
    await client.query(
      'LOCK TABLE biology_nabm_actes, biology_source_snapshots, ' +
        'biology_catalog_versions_courantes IN SHARE ROW EXCLUSIVE MODE',
    );

    // ── Le millésime a-t-il déjà été importé ? ────────────────────────────
    const existant = await client.query<{
      actes: string;
      sha: string | null;
      pointeur: string | null;
    }>(
      `SELECT
         (SELECT count(*) FROM biology_nabm_actes WHERE version_source = $1) AS actes,
         (SELECT contenu_sha256 FROM biology_source_snapshots
          WHERE source_provenance = $2 AND version_source = $1) AS sha,
         (SELECT version_source FROM biology_catalog_versions_courantes
          WHERE source_provenance = $2) AS pointeur`,
      [version, NABM_SOURCE_PROVENANCE],
    );
    const dejaPresents = Number(existant.rows[0]?.actes ?? 0);
    const shaExistant = existant.rows[0]?.sha ?? null;
    const pointeurAvant = existant.rows[0]?.pointeur ?? null;

    // Une source qui change SOUS LE MÊME NUMÉRO DE VERSION est le seul cas
    // que cet import ne sait pas trancher seul : soit la nomenclature a été
    // corrigée sans changer d'étiquette, soit notre sérialisation a bougé.
    // Écraser reviendrait à modifier un millésime déjà cité par des
    // correspondances signées.
    if (shaExistant !== null && shaExistant !== rapport.contenuSha256) {
      throw new Error(
        `Le millésime ${version} est déjà en base avec une empreinte DIFFÉRENTE ` +
          `(${shaExistant.slice(0, 12)}… en base, ${rapport.contenuSha256.slice(0, 12)}… reçue). ` +
          'La source a changé sans changer de version, ou la sérialisation canonique a évolué. ' +
          'Arbitrage humain requis — aucun écrasement automatique.',
      );
    }

    if (dejaPresents !== 0 && dejaPresents !== actes.length) {
      throw new Error(
        `Millésime ${version} partiellement présent : ${dejaPresents} actes en base ` +
          `pour ${actes.length} attendus. Import refusé.`,
      );
    }

    // ── LE POINTEUR NE RECULE PAS TOUT SEUL ───────────────────────────────
    // Défaut trouvé en revue le 2026-07-26. Le plancher de volumétrie refuse
    // un catalogue MUTILÉ ; il n'a rien à dire d'un catalogue COMPLET mais
    // ANTÉRIEUR. Rejouer les pages d'un millésime déjà remplacé ramenait donc
    // le pointeur en arrière sans un mot — et l'effet n'est pas cosmétique :
    // un acte désactivé au millésime récent redevient actif, donc
    // `deriverRemboursement` le rend « remboursable », donc `regimeDocumentaire`
    // bascule sur `courrier_medecin`. Un courrier serait parti au médecin
    // traitant en citant un acte que la nomenclature a retiré.
    //
    // LE GARDE EST SYMÉTRIQUE, ET C'EST ASSUMÉ. Aucun ordre n'est garanti
    // entre les numéros de version — « V106 > V105 » ne repose sur rien de
    // vérifiable, la source pouvant changer de convention. Impossible, donc,
    // de reconnaître la seule direction dangereuse. Le critère porte sur un
    // fait, pas sur une comparaison : ce millésime est DÉJÀ intégralement en
    // base et le pointeur est ailleurs, donc l'import n'apporte aucune donnée
    // et ne fait que CHANGER LE CATALOGUE SERVI.
    //
    // Le banc d'intégration a d'ailleurs pris cette symétrie en défaut dans la
    // première version du correctif, qui parlait de « retour arrière » : après
    // un retour, réavancer était refusé sous un motif faux. Un premier import
    // reste sans friction (`dejaPresents === 0`) ; seul un re-pointage exige
    // de nommer le millésime que l'on quitte.
    const changeDeMillesime =
      pointeurAvant !== null && pointeurAvant !== version && dejaPresents === actes.length;
    if (changeDeMillesime && argument('--remplace-pointeur') !== pointeurAvant) {
      throw new Error(
        `Changement de millésime servi refusé : le pointeur est sur ${pointeurAvant} et ` +
          `${version} est déjà intégralement en base. Cet import n'ajoute aucune donnée — ` +
          'il ne fait que changer le catalogue servi. Si le millésime visé est ANTÉRIEUR, ' +
          'y revenir réactive des actes désactivés depuis, donc fait repartir des courriers ' +
          'au médecin traitant sur des actes retirés de la nomenclature. ' +
          `Pour le faire : --remplace-pointeur ${pointeurAvant}`,
      );
    }

    // ── Aucune signature du praticien n'est orphelinée en silence ─────────
    // Une correspondance signée porte un CODE d'acte, qui traverse les
    // millésimes. Si le millésime entrant ne contient plus cet acte, la
    // signature ne se résout plus — et le contrat du dépôt déclare cet état
    // invalide. L'import ne doit pas écrire sans le dire un état que le projet
    // refuse. Vide aujourd'hui (`biology_analytes` l'est), mais c'est
    // exactement le genre de garde qu'on n'ajoute plus une fois qu'il mord.
    //
    // La comparaison porte sur le CHARGEMENT ENTRANT, et non sur les lignes
    // déjà en base pour ce millésime. Interroger la base ici — ce que faisait
    // la première version — revenait à interroger un ensemble VIDE au premier
    // import d'un millésime, l'insertion n'ayant pas encore eu lieu : toute
    // correspondance signée y était déclarée orpheline, et la seule issue
    // devenait `--accepte-orphelines`, qui désarme la vraie protection. Un
    // garde qu'il faut désarmer pour avancer ne garde rien. Défaut trouvé le
    // 2026-07-26 par le cas 11 du banc, qui joue enfin le chemin nominal.
    const codesEntrants = actes.map(acte => acte.codeActe);
    const orphelines = await client.query<{ analyte_code: string; code_acte: string }>(
      `SELECT c.analyte_code, c.code_acte
       FROM biology_analyte_nabm c
       WHERE c.verifie_par IS NOT NULL
         AND NOT (c.code_acte = ANY($1::text[]))
       ORDER BY c.analyte_code, c.code_acte`,
      [codesEntrants],
    );
    if (orphelines.rowCount && !process.argv.includes('--accepte-orphelines')) {
      const apercu = orphelines.rows
        .slice(0, 10)
        .map(o => `${o.analyte_code}→${o.code_acte}`)
        .join(', ');
      throw new Error(
        `${orphelines.rowCount} correspondance(s) signée(s) par le praticien ne se ` +
          `résoudraient plus dans le millésime ${version} : ${apercu}` +
          (orphelines.rowCount > 10 ? ', …' : '') +
          '. Ces analytes basculeraient en « hors nomenclature », donc en document ' +
          'patient au lieu du courrier médecin. Reprendre ces signatures, ou forcer ' +
          'avec --accepte-orphelines.',
      );
    }

    let inseres = 0;
    if (dejaPresents === 0) {
      for (let depart = 0; depart < actes.length; depart += TAILLE_LOT) {
        const lot = actes.slice(depart, depart + TAILLE_LOT);
        await insererLot(client, lot, version);
        inseres += lot.length;
      }
    }

    // ── Le snapshot : ce qui prouve d'où vient le catalogue ───────────────
    await client.query(
      `INSERT INTO biology_source_snapshots
         (id, source_provenance, version_source, url_source, licence, contenu,
          contenu_sha256, nombre_concepts, nombre_actes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
       ON CONFLICT (source_provenance, version_source) DO NOTHING`,
      [
        `snapshot-${NABM_SOURCE_PROVENANCE}-${version}`,
        NABM_SOURCE_PROVENANCE,
        version,
        NABM_VALUESET_URL,
        NABM_LICENCE,
        snapshot,
        rapport.contenuSha256,
        rapport.nombreConcepts,
        rapport.nombreActes,
      ],
    );

    // ── Le pointeur de version, dans la MÊME transaction ──────────────────
    // Le contrat de migration vérifie que `nombre_entrees` compte bien les
    // actes du millésime pointé : déplacer le pointeur ailleurs qu'ici
    // casserait le CI au déploiement suivant.
    await client.query(
      `INSERT INTO biology_catalog_versions_courantes
         (id, source_provenance, version_source, contenu_sha256, nombre_entrees, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (source_provenance) DO UPDATE
         SET version_source = EXCLUDED.version_source,
             contenu_sha256 = EXCLUDED.contenu_sha256,
             nombre_entrees = EXCLUDED.nombre_entrees,
             updated_at = now()`,
      [
        `version-courante-${NABM_SOURCE_PROVENANCE}`,
        NABM_SOURCE_PROVENANCE,
        version,
        rapport.contenuSha256,
        actes.length,
      ],
    );

    // ── Relecture : on ne fait pas confiance à ce qu'on vient d'écrire ────
    //
    // Ce bloc rejoue, DANS LA TRANSACTION, les invariants de DONNÉES du
    // contrat `cb_biologie_catalogue_v1.sql`. La revue du 2026-07-26 a montré
    // que ces invariants-là ne s'exécutent jamais là où des données existent :
    // en CI le contrat tourne sur une base construite par `migrate deploy`,
    // donc vide, et `vercel-build.sh` ne l'invoque pas. Ils y renvoient 0 par
    // vacuité, toujours. Ici ils portent — et une violation annule l'import au
    // lieu de le constater après coup.
    const controle = await client.query<{
      actes: string;
      inattendus: string;
      pointeur: string;
      snapshots: string;
      pendantes: string;
      signatures_non_resolues: string;
    }>(
      `SELECT
         (SELECT count(*) FROM biology_nabm_actes WHERE version_source = $1) AS actes,
         (SELECT count(*) FROM biology_nabm_actes
           WHERE version_source = $1 AND code_acte !~ '^[0-9]{4}$') AS inattendus,
         (SELECT count(*) FROM biology_catalog_versions_courantes
           WHERE source_provenance = $2 AND version_source = $1
             AND nombre_entrees = $3) AS pointeur,
         (SELECT count(*) FROM biology_source_snapshots
           WHERE source_provenance = $2 AND version_source = $1
             AND encode(sha256(convert_to(contenu, 'UTF8')), 'hex') = contenu_sha256) AS snapshots,
         (SELECT count(*) FROM biology_nabm_actes a
           CROSS JOIN LATERAL unnest(coalesce(a.code_incompatible, ARRAY[]::text[])) AS ref(code)
           WHERE a.version_source = $1
             AND NOT EXISTS (
               SELECT 1 FROM biology_nabm_actes cible
               WHERE cible.code_acte = ref.code AND cible.version_source = $1
             )) AS pendantes,
         (SELECT count(*) FROM biology_analyte_nabm c
           WHERE c.verifie_par IS NOT NULL
             AND NOT EXISTS (
               SELECT 1 FROM biology_nabm_actes a
               WHERE a.code_acte = c.code_acte AND a.version_source = $1
             )) AS signatures_non_resolues`,
      [version, NABM_SOURCE_PROVENANCE, actes.length],
    );
    const c = controle.rows[0];
    if (
      Number(c?.actes) !== actes.length ||
      Number(c?.inattendus) !== 0 ||
      Number(c?.pointeur) !== 1 ||
      Number(c?.snapshots) !== 1 ||
      Number(c?.pendantes) !== 0
    ) {
      throw new Error(`Relecture incohérente après écriture : ${JSON.stringify(c)}`);
    }

    await client.query('COMMIT');
    transactionOuverte = false;

    const pointeurADeplace = pointeurAvant !== version;
    console.log('=== CB-02a — import NABM validé ===');
    console.log(
      JSON.stringify(
        {
          confirmation: NABM_IMPORT_CONFIRMATION,
          versionSource: version,
          inseres,
          // `rejeuSansEffet` ne peut PAS se déduire du seul comptage d'actes :
          // un rejeu qui n'insère rien mais déplace le pointeur change le
          // catalogue servi. Les deux conditions, sinon le rapport ment sur
          // l'exécution même qui vient de tout changer.
          rejeuSansEffet: dejaPresents === actes.length && !pointeurADeplace,
          pointeurAvant,
          pointeurApres: version,
          pointeurDeplace: pointeurADeplace,
          changementDeMillesimeForce: changeDeMillesime,
          actesEnBase: Number(c?.actes),
          snapshotVerifieEnBase: true,
          signaturesNonResolues: Number(c?.signatures_non_resolues),
        },
        null,
        2,
      ),
    );
    if (Number(c?.signatures_non_resolues) > 0) {
      console.warn(
        `⚠ ${c?.signatures_non_resolues} correspondance(s) signée(s) ne se résolvent plus ` +
          'dans le millésime courant (import forcé avec --accepte-orphelines). Ces ' +
          'analytes basculent en « hors nomenclature » : document patient, plus de ' +
          'courrier médecin. À reprendre en revue praticien.',
      );
    }
  } catch (erreur) {
    if (transactionOuverte) await client.query('ROLLBACK');
    throw erreur;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const ecritureDemandee = process.argv.includes('--apply');
  const versionEpinglee = argument('--version');

  // Normalisée et vérifiée de forme ici : une empreinte en majuscules ou avec
  // une espace parasite ferait échouer TOUS les imports en accusant la source
  // d'avoir changé, message exact et diagnostic faux.
  //
  // La validation se déclenche sur la PRÉSENCE de l'argument, jamais sur la
  // vérité de sa forme normalisée : `--sha256 "   "` se réduit à la chaîne
  // vide, qui est falsy — l'épingle aurait disparu sans un mot et l'import
  // aurait suivi la source.
  const empreinteBrute = argument('--sha256');
  const empreinteEpinglee = empreinteBrute?.trim().toLowerCase();
  if (empreinteBrute !== undefined && !/^[0-9a-f]{64}$/.test(empreinteEpinglee ?? '')) {
    throw new Error(`--sha256 attend 64 caractères hexadécimaux ; reçu « ${empreinteBrute} »`);
  }

  // Épingles posées ET catalogue déjà à jour : on ne dérange pas la source.
  // Voir l'en-tête — c'est ce qui rend une variable d'armement oubliée dans
  // Vercel inoffensive plutôt que bruyamment nuisible.
  if (ecritureDemandee && versionEpinglee && empreinteEpinglee) {
    const url = verifierPreuves();
    if (await millesimeDejaServi(url, versionEpinglee, empreinteEpinglee)) {
      console.log(
        `=== CB-02a — rien à faire ===\nLe catalogue sert déjà ${versionEpinglee} ` +
          `avec l'empreinte épinglée ${empreinteEpinglee}. La source n'a pas été interrogée.`,
      );
      return;
    }
  }

  const pages = await recupererPages();
  const resultat = construireImport(pages, {
    versionAttendue: versionEpinglee,
    autoriserReduction: process.argv.includes('--allow-shrink'),
  });
  imprimerRapport(resultat, ecritureDemandee);

  // Vérifiée APRÈS le rapport, pour que la sortie montre l'empreinte réellement
  // lue quand elle diverge — sans quoi il faudrait relancer pour la connaître.
  if (empreinteEpinglee && empreinteEpinglee !== resultat.rapport.contenuSha256) {
    throw new Error(
      `Empreinte attendue ${empreinteEpinglee}, source lue ${resultat.rapport.contenuSha256}. ` +
        `Le millésime ${resultat.rapport.versionSource} ne porte plus le contenu relu — ` +
        'arbitrage humain requis, aucun import automatique.',
    );
  }

  if (!ecritureDemandee) {
    console.log(
      `Mode dry-run. Pour écrire, les deux preuves ${NABM_IMPORT_CONFIRMATION} sont requises.`,
    );
    return;
  }
  await ecrire(resultat);
}

main().catch(erreur => {
  console.error('Import CB-02a interrompu :', erreur instanceof Error ? erreur.message : erreur);
  process.exit(1);
});
