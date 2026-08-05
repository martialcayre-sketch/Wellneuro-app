#!/usr/bin/env node
// Rapporte l'état RÉEL du dépôt sur six dimensions et le compare à
// `.wn/state.json`, entretenu à la main et donc sujet à dériver silencieusement
// (branche de worktree mort, `dirty` figé, date de validation vieille de deux
// semaines — le cas constaté le 2026-08-05 sur `worktree-signature-table-orientation`).
//
// Ce script ne corrige RIEN : il observe et signale. La réparation d'état
// existe déjà (`node scripts/wn-cycle.mjs --appliquer`) et n'est ni remplacée
// ni appelée ici.
//
// Contrainte de sûreté : CLAUDE.md réserve la lecture de la base de production
// à l'outil MCP Supabase (« jamais psql, ni une commande Bash »). La dimension
// « migrations » se limite donc à lister les dossiers sous
// `web/prisma/migrations/` — aucune connexion `pg` ni Prisma n'est ouverte ici,
// la vérification en base reste un geste de session, pas de script.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readCampaignTruth, readMachineState } from './wn-state.mjs';

const SEPT_JOURS_MS = 7 * 24 * 60 * 60 * 1000;

// Racine du dépôt dérivée de l'EMPLACEMENT du script, jamais du cwd d'appel —
// même pattern que `scripts/wn-cycle.mjs`. `process.cwd()` rendait un rapport
// « 0 écart » en code 0 dès que la commande était lancée depuis `web/` (le cwd
// par défaut de toute session sur ce dépôt, `CLAUDE.md` § « Commandes
// utiles ») : `.wn/` n'existe pas sous `web/`, `readMachineState` y rend `{}`,
// et `comparerEtat` ne trouve alors rien à comparer. Régression trouvée par la
// revue adversariale du 2026-08-05 (N1) — un faux vert qu'un critère de
// clôture de campagne (`LOT-07-cloture.md`) lit littéralement.
const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// La requête reprise telle quelle de CLAUDE.md (« Lire la base de
// production ») : à exécuter en session via l'outil MCP Supabase, jamais par
// ce script.
export const COMMANDE_DE_VERIFICATION_MIGRATIONS = `SELECT migration_name,
       bool_or(finished_at IS NOT NULL AND rolled_back_at IS NULL) AS appliquee,
       count(*) AS tentatives, max(started_at) AS derniere
FROM _prisma_migrations GROUP BY migration_name
ORDER BY max(started_at) DESC LIMIT 5;`;

// ── Collecte, dimension par dimension ───────────────────────────────────────
// Chaque collecteur est tolérant à sa propre absence de résultat : une
// dimension indisponible ne doit jamais faire échouer les cinq autres.

function git(args, racine) {
  return execFileSync('git', args, { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

/**
 * `git grep -ohE 'WN_[A-Z0-9_]+' web/src | sort -u`, sans shell : le tri et la
 * déduplication se font côté JS pour ne jamais interpoler de chaîne dans un
 * shell. Motif élargi à `WN_` (pas seulement `WN_ENABLE_`) : le dépôt porte
 * une vingtaine de commutateurs (`WN_C4_ENABLED`, `WN_CB_ENABLED`,
 * `WN_G4_LIEN_MAGIQUE`…), pas seulement ceux préfixés `WN_ENABLE_` (constat de
 * la revue du 2026-08-05, C1).
 *
 * Ce que rend cette fonction, ce sont des RÉFÉRENCES dans le code — jamais des
 * valeurs lues en environnement. `WN_ENABLE_ORIENTATION_NNPP2` est référencé
 * ici alors qu'il reste fail-closed en production aujourd'hui (« poser en
 * prod » est encore un geste à faire, `docs/claude/handoffs/2026-08-04-1830-
 * signature-table-orientation.md`) : l'appeler « actif » serait faux. D'où le
 * nom de champ `referencesDansLeCode` côté rapport, et `valeurEnvironnement:
 * null` en regard — la même asymétrie honnête que la dimension migrations
 * (`verifieEnBase: null`).
 */
export function collecterFlagsReferences(racine) {
  try {
    const sortie = git(['grep', '-ohE', 'WN_[A-Z0-9_]+', 'web/src'], racine);
    return [...new Set(sortie.split('\n').filter(Boolean))].sort();
  } catch (err) {
    // Code 1 = aucune correspondance, ce n'est pas une erreur. Tout le reste
    // (chemin absent, dépôt invalide…) ne doit pas non plus interrompre le
    // rapport global : cette dimension retombe sur une liste vide.
    if (err.status === 1) return [];
    return [];
  }
}

/**
 * Les noms de dossiers sous `web/prisma/migrations/` — rien de plus. Aucune
 * connexion base ici ; `verifieEnBase` reste `null` par construction, avec la
 * requête à rejouer en session.
 */
export function collecterMigrations(racine) {
  const dossier = path.join(racine, 'web', 'prisma', 'migrations');
  let noms = [];
  try {
    noms = fs
      .readdirSync(dossier, { withFileTypes: true })
      .filter((entree) => entree.isDirectory())
      .map((entree) => entree.name)
      .sort();
  } catch {
    noms = [];
  }
  return {
    noms,
    verifieEnBase: null,
    commandeDeVerification: COMMANDE_DE_VERIFICATION_MIGRATIONS,
  };
}

/**
 * `docs/claude/corpus/instrument_registry.json` — le registre MAÎTRE des
 * instruments, désigné « source de vérité retenue pour le `64/64` » par
 * `docs/claude/campagnes/2026-08-03-cloture-certification-questionnaires-integration/AUDIT_64_64.md`
 * (65 entrées sous sa clé `instruments`). Une première version de ce script
 * lisait `docs/claude/corpus/source_registry.json` par erreur (N3, revue du
 * 2026-08-05) : ce fichier existe bien, mais c'est un registre de 507 SOURCES
 * BIBLIOGRAPHIQUES du corpus clinique — un objet disjoint qui n'a jamais porté
 * de statut de certification par questionnaire.
 *
 * Forme du fichier : `{ version, dateAudit, commentaire, instruments: [...] }`,
 * pas un tableau au premier niveau — d'où le passage par `registre.instruments`
 * plutôt qu'`Array.isArray(registre)`. La tolérance aux erreurs ne lève jamais
 * (registre absent ou JSON invalide → statut explicite, jamais une exception).
 */
const CHEMIN_REGISTRE_CERTIFICATION = ['docs', 'claude', 'corpus', 'instrument_registry.json'];

export function lireRegistreCertification(racine) {
  const cheminRelatif = path.join(...CHEMIN_REGISTRE_CERTIFICATION);
  const cheminAbsolu = path.join(racine, ...CHEMIN_REGISTRE_CERTIFICATION);
  if (!fs.existsSync(cheminAbsolu)) {
    return { status: 'missing', chemin: cheminRelatif, entries: 0 };
  }
  let brut;
  try {
    brut = fs.readFileSync(cheminAbsolu, 'utf8');
  } catch {
    return { status: 'missing', chemin: cheminRelatif, entries: 0 };
  }
  try {
    const registre = JSON.parse(brut);
    const instruments = Array.isArray(registre) ? registre : registre?.instruments;
    const entries = Array.isArray(instruments) ? instruments.length : 0;
    return { status: 'loaded', chemin: cheminRelatif, entries };
  } catch {
    return { status: 'invalid', chemin: cheminRelatif, entries: 0 };
  }
}

/**
 * PR ouvertes via `gh`. `gh` absent, non authentifié, ou en erreur réseau ne
 * doit jamais se confondre avec « aucune PR ouverte » — d'où la valeur
 * explicite `{ disponible: false, raison }` plutôt qu'un tableau vide.
 */
export function collecterPrOuvertes(racine) {
  try {
    const sortie = execFileSync('gh', ['pr', 'list', '--json', 'number,title,isDraft,updatedAt'], {
      cwd: racine,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return { disponible: true, prs: JSON.parse(sortie) };
  } catch (err) {
    const raison = String(err && err.message ? err.message : 'gh indisponible').split('\n')[0];
    return { disponible: false, raison };
  }
}

/**
 * `git worktree list --porcelain` : un bloc par worktree, séparé par une ligne
 * vide, chaque bloc commençant par `worktree <chemin>` puis (sauf worktree
 * détaché) `branch refs/heads/<nom>`.
 */
export function collecterWorktreesVivants(racine) {
  let sortie;
  try {
    sortie = git(['worktree', 'list', '--porcelain'], racine);
  } catch {
    return [];
  }
  const worktrees = [];
  let courant = null;
  for (const ligne of sortie.split('\n')) {
    if (ligne.startsWith('worktree ')) {
      if (courant) worktrees.push(courant);
      courant = { branche: null, chemin: ligne.slice('worktree '.length) };
    } else if (ligne.startsWith('branch ') && courant) {
      courant.branche = ligne.slice('branch '.length).replace(/^refs\/heads\//, '');
    }
  }
  if (courant) worktrees.push(courant);
  return worktrees;
}

export function collecterBranchesDistantes(racine) {
  let sortie;
  try {
    sortie = git(['branch', '-r'], racine);
  } catch {
    return [];
  }
  return sortie
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne !== '' && !ligne.includes('->'))
    .map((nom) => ({ nom }));
}

/**
 * `git status --porcelain` au répertoire racine du dépôt observé — pas un
 * sous-répertoire ni un autre worktree que celui où tourne ce script.
 */
export function estArbreSale(racine) {
  try {
    return git(['status', '--porcelain'], racine) !== '';
  } catch {
    return null;
  }
}

/**
 * Répertoires de premier niveau sous `web/src/app` (et `web/src/app/api`) dont
 * le nom contient `patient` ou `portail`. Aucun jugement sur lequel est « le
 * bon » — LOT-04 tranchera ; ce collecteur liste seulement.
 */
export function collecterParcoursPatient(racine) {
  const motif = /patient|portail/i;
  const base = path.join(racine, 'web', 'src', 'app');

  function scannerNiveau(sousChemin) {
    const dirAbsolu = path.join(base, sousChemin);
    if (!fs.existsSync(dirAbsolu)) return [];
    return fs
      .readdirSync(dirAbsolu, { withFileTypes: true })
      .filter((entree) => entree.isDirectory() && motif.test(entree.name))
      .map((entree) => ({
        chemin: path.posix.join('web/src/app', ...sousChemin.split(path.sep).filter(Boolean), entree.name),
      }));
  }

  return [...scannerNiveau(''), ...scannerNiveau('api')];
}

// ── Comparaison à `.wn/state.json` ──────────────────────────────────────────

/**
 * Compare l'état machine déclaré aux faits réellement observés. Fonction pure
 * (aucun appel git/fs) : testable en injectant des faits.
 *
 * @param {object} etatMachine   Retour de `readMachineState()`.
 * @param {{worktreesVivants: {branche: string|null}[], dirty: boolean|null, maintenant: Date}} reel
 * @returns {{champ: string, valeurStockee: unknown, valeurReelle: unknown, verdict: string}[]}
 */
export function comparerEtat(etatMachine, reel) {
  const ecarts = [];

  const brancheEnregistree = etatMachine?.git?.branch ?? null;
  if (brancheEnregistree) {
    const vivante = reel.worktreesVivants.some((w) => w.branche === brancheEnregistree);
    if (!vivante) {
      ecarts.push({
        champ: 'git.branch',
        valeurStockee: brancheEnregistree,
        valeurReelle: 'aucun worktree vivant pour cette branche',
        verdict: 'mort',
      });
    }
  }

  const dirtyEnregistre = etatMachine?.git?.dirty;
  if (typeof dirtyEnregistre === 'boolean' && typeof reel.dirty === 'boolean' && dirtyEnregistre !== reel.dirty) {
    ecarts.push({
      champ: 'git.dirty',
      valeurStockee: dirtyEnregistre,
      valeurReelle: reel.dirty,
      verdict: 'périmé',
    });
  }

  const derniereValidation = etatMachine?.validation?.last_checked_at ?? null;
  if (derniereValidation) {
    const date = new Date(derniereValidation);
    if (!Number.isNaN(date.getTime())) {
      const ageMs = reel.maintenant.getTime() - date.getTime();
      if (ageMs > SEPT_JOURS_MS) {
        ecarts.push({
          champ: 'validation.last_checked_at',
          valeurStockee: derniereValidation,
          valeurReelle: `${Math.floor(ageMs / (24 * 60 * 60 * 1000))} jour(s) d'écart avec la date système`,
          verdict: 'périmé',
        });
      }
    }
  }

  return ecarts;
}

// ── Orchestration ────────────────────────────────────────────────────────────

export function construireRapport(racine) {
  const etatMachine = readMachineState(racine);
  const verite = readCampaignTruth(racine);

  const worktreesVivants = collecterWorktreesVivants(racine);
  const dirty = estArbreSale(racine);

  const ecarts = comparerEtat(etatMachine, { worktreesVivants, dirty, maintenant: new Date() });

  return {
    genereLe: new Date().toISOString(),
    etatMachine: {
      branche: etatMachine?.git?.branch ?? null,
      dirty: etatMachine?.git?.dirty ?? null,
      derniereValidation: etatMachine?.validation?.last_checked_at ?? null,
      campagneActive: verite.activeCampaignId,
      lotActif: verite.activeLot,
    },
    // Jamais « actifs » : ce sont des références trouvées dans le code, pas des
    // valeurs lues en environnement (voir le commentaire de
    // `collecterFlagsReferences`, C1).
    flags: { referencesDansLeCode: collecterFlagsReferences(racine), valeurEnvironnement: null },
    migrations: collecterMigrations(racine),
    certification: lireRegistreCertification(racine),
    prOuvertes: collecterPrOuvertes(racine),
    branchesEtWorktrees: {
      worktreesVivants,
      branchesDistantes: collecterBranchesDistantes(racine),
    },
    parcoursPatient: collecterParcoursPatient(racine),
    ecarts,
  };
}

function resumerSurStderr(rapport) {
  const lignes = [];
  lignes.push(
    `wn-etat-reel : 6 dimensions observées, ${rapport.ecarts.length} écart(s) avec .wn/state.json`,
  );
  lignes.push(`  flags référencés     : ${rapport.flags.referencesDansLeCode.length} (valeur d'environnement non lue)`);
  lignes.push(`  migrations (disque)  : ${rapport.migrations.noms.length} (base non vérifiée ici)`);
  lignes.push(`  certification        : ${rapport.certification.status}`);
  lignes.push(
    `  PR ouvertes          : ${rapport.prOuvertes.disponible ? rapport.prOuvertes.prs.length : `indisponible (${rapport.prOuvertes.raison})`}`,
  );
  lignes.push(
    `  worktrees / branches : ${rapport.branchesEtWorktrees.worktreesVivants.length} vivant(s) / ${rapport.branchesEtWorktrees.branchesDistantes.length} distante(s)`,
  );
  lignes.push(`  parcours patient     : ${rapport.parcoursPatient.length} répertoire(s)`);
  for (const ecart of rapport.ecarts) {
    lignes.push(`  ÉCART ${ecart.champ} : ${JSON.stringify(ecart.valeurStockee)} → ${JSON.stringify(ecart.valeurReelle)} (${ecart.verdict})`);
  }
  console.error(lignes.join('\n'));
}

// ── CLI ─────────────────────────────────────────────────────────────────────
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const racine = RACINE;
  try {
    const rapport = construireRapport(racine);
    process.stdout.write(`${JSON.stringify(rapport, null, 2)}\n`);
    resumerSurStderr(rapport);
    process.exit(0);
  } catch (err) {
    // Un échec ICI empêche de produire un rapport du tout (ex. `.wn/` illisible
    // pour une raison qui dépasse la simple absence de fichier) : pas de JSON
    // partiel présenté comme complet, un message clair et un code non nul.
    console.error(`wn-etat-reel : échec — ${err && err.message ? err.message : err}`);
    process.exit(1);
  }
}
