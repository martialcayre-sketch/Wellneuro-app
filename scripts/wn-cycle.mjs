#!/usr/bin/env node
// Rend la phase du cycle de lot et le geste suivant.
//
// Pourquoi ce script existe : le merge d'une PR de lot est un squash
// (`gh pr merge --squash --delete-branch`). Tout ce qui s'écrit après lui n'est
// plus dans l'ascendance de `main` — la clôture (`SESSION_LOG.md`) et le
// handoff (un fragment de `docs/claude/handoffs/`) doivent alors repartir de
// `main` dans une seconde PR. L'ordre correct est déjà écrit dans `/wn-lot`
// (clôture en étape 6, PR en étape 7) ; ce qui manquait, c'est de le *vérifier*.
// Une règle qu'on oublie deux fois ne se réécrit pas une troisième : elle
// devient exécutable.
//
// Le verdict est chargé par le bloc `!` de `/wn-finish` et `/wn-handoff` — il
// arrive donc dans le contexte avant que quoi que ce soit ne soit écrit. Un
// skill ne peut pas en invoquer un autre (`disable-model-invocation: true`,
// contrôle CI `scripts/lib/skill-cross-invocation.mjs`) : le script est le seul
// chaînage réellement exécutable entre deux étapes du cycle.
//
// La logique est une fonction pure `diagnostiquer()` prenant des faits déjà
// collectés (testable sans dépôt ni réseau) ; le bas du fichier est le câblage
// CLI, qui collecte ces faits avec git et `gh`.

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readCampaignTruth, readMachineState, writeMachineState } from './wn-state.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

const SESSION_LOG = 'docs/claude/SESSION_LOG.md';
const HANDOFFS = 'docs/claude/handoffs/';

/**
 * Le handoff n'est plus un chemin littéral mais un **fragment daté** posé dans
 * `docs/claude/handoffs/` (voir le README du dossier). Le contrôle passe donc de
 * « ce chemin a-t-il été touché ? » à « un fragment a-t-il été ajouté ? » —
 * question qu'un chemin unique ne pouvait pas poser, et dont l'absence de
 * réponse coûtait un conflit de merge à chaque lot parallèle.
 *
 * `README.md` est exclu : c'est la convention du dossier, pas un handoff. Le
 * toucher dans un lot ne clôt rien.
 *
 * **L'horodatage est EXIGÉ, pas conseillé.** Le README du dossier désigne le
 * handoff courant comme « le dernier au tri » ; sans contrainte de nom, un
 * `notes.md` déposé là serait accepté comme handoff et, les lettres passant
 * après les chiffres en tri C, désigné comme le plus récent. La règle du README
 * n'était donc vraie que tant que personne ne posait un autre fichier — c'est
 * ce motif-ci qui la rend vraie par construction.
 */
const NOM_DE_FRAGMENT = /^\d{4}-\d{2}-\d{2}-\d{4}-.+\.md$/;

export function estFragmentDeHandoff(chemin) {
  if (!chemin.startsWith(HANDOFFS)) return false;
  const nom = chemin.slice(HANDOFFS.length);
  if (nom === '' || nom.includes('/')) return false;
  if (nom === 'README.md') return false;
  return NOM_DE_FRAGMENT.test(nom);
}

export const SORTIE_OK = 0;
export const SORTIE_FENETRE_RATEE = 1;
export const SORTIE_PRECONDITION = 2;

/**
 * État de synchronisation avec `origin`, analysé à part de la phase : la sync
 * s'ajoute au verdict, elle ne le remplace jamais. Deux invariants :
 *
 * - **Le verdict ne dépend pas du réseau.** Un fetch échoué (hors-ligne, proxy)
 *   est signalé, pas fatal — sinon le script devient inutilisable sans réseau.
 * - **Constat seulement, jamais de réconciliation.** Un `main` à la fois en
 *   avance et en retard sur `origin/main` est une décision de fusion, pas une
 *   sync : le script alerte, l'humain arbitre. Pas de `pull`, `merge` ni
 *   `rebase` automatique ici.
 */
export function analyserSync(sync) {
  if (!sync) return { sync: null, avertissements: [] };

  const avertissements = [];
  if (sync.fetchOk === false) {
    avertissements.push(
      "Fetch origin impossible (hors-ligne ?) — verdict rendu sur l'origin du dernier réseau.",
    );
  }

  const ahead = sync.ahead ?? null;
  const behind = sync.behind ?? null;
  const desynchronise = (ahead ?? 0) > 0 || (behind ?? 0) > 0;
  if (desynchronise) {
    avertissements.push(
      `La branche par défaut locale diverge d'origin (ahead ${ahead} / behind ${behind}) — ` +
        "ne pas s'en servir comme base ; la base de comparaison reste origin. " +
        'Réconcilier est un arbitrage humain, pas un geste automatique.',
    );
  }

  return { sync: { ...sync, desynchronise }, avertissements };
}

/**
 * Le registre `docs/DECISIONS.md` s'append en tête : les premières entrées
 * `### D-NNN` sont les plus récentes. C'est la seule structure du fichier sur
 * laquelle on s'appuie — le reste est de la prose humaine.
 */
export function extraireDecisionsRecentes(texte, limite = 5) {
  if (!texte) return [];
  return [...texte.matchAll(/^### (D-\d+)\b/gm)].map((m) => m[1]).slice(0, limite);
}

/**
 * Déduit la phase du cycle et le geste suivant à partir de faits déjà collectés.
 *
 * @param {object} faits
 * @param {boolean} faits.dansUnDepot
 * @param {string|null} faits.branche            Branche courante.
 * @param {string} faits.brancheParDefaut        Généralement `main`.
 * @param {boolean} faits.arbrePropre
 * @param {string[]} faits.fichiersDuLot         `git diff --name-only <base>...HEAD`.
 * @param {{numero: number}|null} faits.prOuverte
 * @param {{numero: number, fichiers: string[]|null}|null} faits.prMergee
 * @param {boolean} faits.ghDisponible
 * @param {{fetchOk: boolean|null, ahead: number|null, behind: number|null}|null} [faits.sync]
 * @returns {{phase: string, cloture: {sessionLog: boolean, handoff: boolean},
 *           fenetreRatee: boolean, suivant: string[], sortie: number,
 *           sync: object|null, avertissements: string[]}}
 */
export function diagnostiquer(faits) {
  const phase = diagnostiquerPhase(faits);
  return { ...phase, ...analyserSync(faits.sync) };
}

function diagnostiquerPhase(faits) {
  const {
    dansUnDepot,
    branche,
    brancheParDefaut = 'main',
    arbrePropre = true,
    fichiersDuLot = [],
    prOuverte = null,
    prMergee = null,
    ghDisponible = true,
  } = faits;

  if (!dansUnDepot) {
    return {
      phase: 'hors-depot',
      cloture: { sessionLog: false, handoff: false },
      fenetreRatee: false,
      suivant: ['Hors dépôt git — aucun verdict de cycle possible.'],
      sortie: SORTIE_PRECONDITION,
    };
  }

  const cloture = {
    sessionLog: fichiersDuLot.includes(SESSION_LOG),
    handoff: fichiersDuLot.some(estFragmentDeHandoff),
  };
  const clotureComplete = cloture.sessionLog && cloture.handoff;

  // La preuve de merge prime sur tout le reste : sous squash-merge la branche
  // locale survit intacte au merge, et rien dans git seul ne la distingue d'une
  // branche de travail. C'est la PR qui fait foi.
  if (prMergee) {
    // Les fichiers de la PR mergée disent si la clôture est partie *avec* le
    // lot. `null` = information indisponible (gh muet) : on ne conclut pas.
    const portes = prMergee.fichiers;
    const clotureEmbarquee =
      portes === null ? null : portes.includes(SESSION_LOG) && portes.some(estFragmentDeHandoff);

    if (clotureEmbarquee === true) {
      return {
        phase: 'apres-merge',
        cloture,
        fenetreRatee: false,
        suivant: [
          `PR #${prMergee.numero} mergée, clôture et handoff embarqués — rien à reprendre.`,
          'Lot suivant : repartir de `main`, jamais de cette branche squashée.',
        ],
        sortie: SORTIE_OK,
      };
    }

    if (clotureEmbarquee === null) {
      return {
        phase: 'apres-merge',
        cloture,
        fenetreRatee: false,
        suivant: [
          `PR #${prMergee.numero} mergée ; ses fichiers sont inconnus (gh muet).`,
          'Vérifier à la main que SESSION_LOG.md et un fragment docs/claude/handoffs/ y étaient.',
        ],
        sortie: SORTIE_OK,
      };
    }

    return {
      phase: 'apres-merge',
      cloture,
      fenetreRatee: true,
      suivant: [
        `Fenêtre de clôture ratée : PR #${prMergee.numero} mergée en squash sans la clôture.`,
        'Écrire depuis `main` — SESSION_LOG.md et le fragment de handoff en PR de doc séparée.',
        'Ne pas rebrancher sur cette branche : son contenu ne remonte plus vers `main`.',
      ],
      sortie: SORTIE_FENETRE_RATEE,
    };
  }

  if (branche === brancheParDefaut) {
    return {
      phase: 'hors-lot',
      cloture,
      fenetreRatee: false,
      suivant: arbrePropre
        ? ['Ouvrir un worktree pour le lot (EnterWorktree), puis `/wn-lot`.']
        : ['Arbre sale sur la branche par défaut — déplacer ce travail dans un worktree de lot.'],
      sortie: SORTIE_OK,
    };
  }

  if (prOuverte) {
    return {
      phase: 'pr-ouverte',
      cloture,
      fenetreRatee: false,
      suivant: clotureComplete
        ? [
            `PR #${prOuverte.numero} ouverte, clôture embarquée.`,
            'Attendre le CI sans le sonder, vérifier que `verify` a tourné, puis `/wn-merge apply`.',
          ]
        : [
            `PR #${prOuverte.numero} ouverte SANS la clôture — dernière fenêtre avant le squash.`,
            'Clôture : `/wn-finish` puis `/wn-handoff write`, poussés sur cette branche.',
            'Le merge ferme la fenêtre : après lui, il faudra une seconde PR depuis `main`.',
          ],
      sortie: SORTIE_OK,
    };
  }

  if (clotureComplete) {
    return {
      phase: 'pret-pr',
      cloture,
      fenetreRatee: false,
      suivant: ['`/wn-pr apply`, puis `/wn-merge apply` une fois `verify` lu.'],
      sortie: SORTIE_OK,
    };
  }

  return {
    phase: 'travail',
    cloture,
    fenetreRatee: false,
    suivant: [
      'Palier de test de la classe du lot, sortie redirigée une fois puis relue.',
      'Clôture : `/wn-finish` puis `/wn-handoff write` — **avant** la PR.',
      'Ensuite seulement : `/wn-pr apply` puis `/wn-merge apply`.',
    ],
    sortie: SORTIE_OK,
  };
}

// ── Collecte des faits ──────────────────────────────────────────────────────

function git(args, cwd = RACINE) {
  const brut = gitBrut(args, cwd);
  return brut === null ? null : brut.trim();
}

/**
 * Sans `.trim()`. Indispensable pour `status --porcelain`, dont la première
 * ligne commence par un espace quand le fichier n'est pas indexé (` M chemin`) :
 * le trim global l'emportait et décalait le découpage d'un caractère, rendant
 * `docs/…` en `ocs/…`. La clôture devenait alors invisible au verdict.
 */
function gitBrut(args, cwd = RACINE) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

function gh(args, cwd = RACINE) {
  try {
    return execFileSync('gh', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function jsonOuNull(texte) {
  if (!texte) return null;
  try {
    return JSON.parse(texte);
  } catch {
    return null;
  }
}

function brancheParDefaut() {
  // `origin/HEAD` n'existe pas dans tous les clones ; `main` est la valeur du
  // dépôt et le repli assumé.
  const ref = git(['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']);
  return ref ? ref.replace('refs/remotes/origin/', '') : 'main';
}

/**
 * `originVerifie` vient de `synchroniserOrigin`, qui a déjà fait le
 * `rev-parse --verify origin/<defaut>` : on réutilise ce résultat au lieu de
 * refaire le même appel git deux lignes plus loin dans la collecte.
 */
function baseDeComparaison(defaut, originVerifie) {
  if (originVerifie) return `origin/${defaut}`;
  return git(['rev-parse', '--verify', '--quiet', defaut]) ? defaut : null;
}

/**
 * Rafraîchit `origin/<defaut>` puis mesure l'écart local/distant. Le fetch est
 * borné (15 s) et son échec n'est qu'un fait parmi d'autres : sans réseau, le
 * verdict se rend sur l'origin du dernier réseau, et le dit. `fetch` seulement —
 * jamais `pull`, `merge` ni `rebase` : un défaut divergent (ahead ET behind) est
 * une décision de fusion qui ne se prend pas dans un script d'état.
 */
const FETCH_TTL_S = 300;

/**
 * Un fetch de moins de FETCH_TTL_S secondes rend un nouveau fetch inutile :
 * plusieurs outils enchaînés dans la même fenêtre (`/wn-pr` puis `/wn-merge`)
 * refaisaient chacun le leur. Le mtime seul ne suffit pas : `FETCH_HEAD`
 * (dans le git-dir commun que les worktrees partagent) est réécrit par
 * N'IMPORTE quel fetch — une autre branche, un tag. Son contenu ne décrit que
 * le dernier fetch : exiger qu'il mentionne la branche par défaut garantit
 * qu'on ne déclare jamais frais le fetch d'une autre ref. Un FETCH_HEAD vide
 * (observé sur certains environnements) désactive simplement l'optimisation —
 * coût : un fetch, jamais un état faux.
 */
function fetchRecent(defaut) {
  const commun = git(['rev-parse', '--git-common-dir']);
  if (!commun) return false;
  const dossier = isAbsolute(commun) ? commun : join(RACINE, commun);
  try {
    const chemin = join(dossier, 'FETCH_HEAD');
    const age = (Date.now() - statSync(chemin).mtimeMs) / 1000;
    if (!(age >= 0 && age < FETCH_TTL_S)) return false;
    return readFileSync(chemin, 'utf8').includes(`branch '${defaut}' of`);
  } catch {
    return false;
  }
}

// Exportée pour le banc : le contrat « --local ⇒ fetchOk = null, jamais un
// faux “origin rafraîchi” » ne se lit nulle part ailleurs qu'ici.
export function synchroniserOrigin(defaut, { local = false } = {}) {
  let fetchOk;
  if (local) {
    // Mode --local : le fetch n'est pas TENTÉ — même si FETCH_HEAD est frais,
    // ce serait le fetch d'un AUTRE run, et « origin rafraîchi » affirmerait un
    // geste que celui-ci n'a pas fait. `null` (non tenté), pas `false` (tenté
    // et échoué) — l'avertissement « hors-ligne ? » serait un mensonge.
    fetchOk = null;
  } else if (fetchRecent(defaut)) {
    fetchOk = true;
  } else {
    try {
      execFileSync('git', ['fetch', '--quiet', 'origin', defaut], {
        cwd: RACINE,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 15_000,
      });
      fetchOk = true;
    } catch {
      fetchOk = false;
    }
  }

  // Vérifié UNE fois ici (après l'éventuel fetch, qui peut créer la ref), puis
  // transmis à `baseDeComparaison` — qui refaisait exactement le même appel.
  const originVerifie = Boolean(git(['rev-parse', '--verify', '--quiet', `origin/${defaut}`]));

  let ahead = null;
  let behind = null;
  if (originVerifie && git(['rev-parse', '--verify', '--quiet', defaut])) {
    const brut = git(['rev-list', '--left-right', '--count', `${defaut}...origin/${defaut}`]);
    if (brut) {
      const [a, b] = brut.split(/\s+/).map(Number);
      if (Number.isInteger(a) && Number.isInteger(b)) {
        ahead = a;
        behind = b;
      }
    }
  }

  return { sync: { fetchOk, ahead, behind }, originVerifie };
}

/**
 * Preuve de merge sous squash. Reprise de `scripts/nettoyage-branches.sh` :
 * sous squash-merge aucun tip local n'est ancêtre de `main`, donc
 * `git branch --merged` ne détecte jamais rien. La preuve se prend au niveau de
 * la PR — le tip local doit être contenu dans le `headRefOid` d'une PR mergée.
 */
function chercherPrMergee(branche, tip) {
  const liste = jsonOuNull(gh(['pr', 'list', '--state', 'merged', '--head', branche, '--json', 'number,headRefOid']));
  if (!Array.isArray(liste) || liste.length === 0) return null;

  const candidat = liste.find(
    (pr) => pr.headRefOid === tip || git(['merge-base', '--is-ancestor', tip, pr.headRefOid]) !== null,
  );
  if (!candidat) return null;

  const vue = jsonOuNull(gh(['pr', 'view', String(candidat.number), '--json', 'files']));
  const fichiers = Array.isArray(vue?.files) ? vue.files.map((f) => f.path) : null;
  return { numero: candidat.number, fichiers };
}

/**
 * Chemins modifiés dans l'arbre de travail, indexés ou non. `/wn-finish` et
 * `/wn-handoff` écrivent *avant* le commit : s'en tenir au diff committé
 * rendrait « clôture absente » une seconde après l'avoir écrite.
 */
export function cheminsDuPorcelain(porcelain) {
  if (!porcelain) return [];
  return porcelain
    .split('\n')
    .filter((ligne) => ligne.trim() !== '')
    .map((ligne) => {
      // Le bloc de statut fait deux caractères puis un espace. On le retire par
      // motif plutôt que par position : une ligne dont l'espace de tête a été
      // rogné en amont resterait sinon décalée d'un caractère, en silence.
      const chemin = ligne.replace(/^[ MADRCU?!]{1,2} /, '');
      // Renommage : `R  ancien -> nouveau`. Seule la destination compte.
      const fleche = chemin.indexOf(' -> ');
      return fleche === -1 ? chemin : chemin.slice(fleche + 4);
    })
    .map((chemin) => chemin.replace(/^"|"$/g, ''));
}

function collecterFaits(options = {}) {
  const local = options.local === true;
  if (!git(['rev-parse', '--git-dir'])) return { dansUnDepot: false };

  const defaut = brancheParDefaut();
  const { sync, originVerifie } = synchroniserOrigin(defaut, { local });
  const branche = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const tip = git(['rev-parse', 'HEAD']);
  const base = baseDeComparaison(defaut, originVerifie);

  const diff = base && branche !== defaut ? git(['diff', '--name-only', `${base}...HEAD`]) : '';
  const committes = diff ? diff.split('\n').filter(Boolean) : [];
  // `--untracked-files=all` et non le défaut `normal` : ce dernier COLLAPSE un
  // répertoire entièrement non suivi en une seule ligne — `?? docs/claude/handoffs/`
  // au lieu des fragments qu'il contient. Le verdict rendait alors « handoff
  // absent » sur un handoff fraîchement écrit, exactement le silence que ce
  // script existe pour supprimer. Vu sur le lot qui a créé le dossier.
  const porcelain = gitBrut(['status', '--porcelain', '--untracked-files=all']);
  const fichiersDuLot = [...new Set([...committes, ...cheminsDuPorcelain(porcelain)])];

  // La disponibilité de `gh` se déduit du premier appel réel — plus de sonde
  // `gh --version`. Un retour non-liste (binaire absent, non authentifié,
  // sortie illisible) est « gh indisponible », jamais un faux « aucune PR ».
  // En mode --local, aucun appel gh : l'état PR est NON VÉRIFIÉ (le rendu le
  // dit tel quel), ce qui n'est ni « aucune PR » ni « gh indisponible ».
  let ghDisponible = true;
  let prOuverte = null;
  let prMergee = null;
  if (!local && branche && branche !== defaut) {
    const ouvertes = jsonOuNull(gh(['pr', 'list', '--state', 'open', '--head', branche, '--json', 'number']));
    if (!Array.isArray(ouvertes)) {
      ghDisponible = false;
    } else {
      if (ouvertes.length > 0) prOuverte = { numero: ouvertes[0].number };
      if (!prOuverte && tip) prMergee = chercherPrMergee(branche, tip);
    }
  }

  return {
    dansUnDepot: true,
    branche,
    brancheParDefaut: defaut,
    // Dérivé du porcelain déjà lu : `--untracked-files=all` ne change jamais
    // la vacuité de la sortie, seulement l'éclatement des répertoires.
    arbrePropre: (porcelain || '') === '',
    fichiersDuLot,
    prOuverte,
    prMergee,
    ghDisponible,
    modeLocal: local,
    sync,
  };
}

// ── Réparation d'état (`--appliquer`) ───────────────────────────────────────

/**
 * Deux réparations, et rien d'autre. `SESSION_LOG.md` et le fragment de handoff
 * ne sont jamais écrits ici : leur contenu est du raisonnement, il reste du
 * ressort des skills.
 *
 * **Le bloc `git` n'est plus écrit, ni lu, ni conservé.** Il l'a été jusqu'au
 * 2026-08-07 et n'a jamais pu être vrai : `--appliquer` s'exécute *avant* le
 * commit, donc `dirty` valait toujours `true` — démenti par le commit suivant —
 * et `branch`/`last_commit` décrivaient la dernière session à l'avoir lancé,
 * parfois le worktree d'une autre (`worktree-lot00-…` committé sur une PR sans
 * rapport). Le LOT-01 (#575) avait vu le piège et l'avait contourné en
 * repoussant le geste après le merge ; on le supprime à la source. Ce qui se
 * recalcule en une commande ne se stocke pas.
 *
 * Exporté pour être testable : la fonction qui écrivait ces champs n'était
 * couverte par aucun banc.
 *
 * @param {{maintenant?: string}} [options] Horodatage injectable — sans lui, le
 *   banc ne pourrait pas asserter `updated_at`.
 */
export function reparer(racine = RACINE, options = {}) {
  const lignes = [];

  // 1. L'état machine d'abord. L'ordre compte — la vue se génère depuis cet
  //    état, la synchroniser avant l'écriture la ferait porter la date du run
  //    précédent.
  const etat = readMachineState(racine);
  delete etat.git;
  etat.updated_at = (options.maintenant ?? new Date().toISOString()).replace(/\.\d{3}Z$/, 'Z');

  // `recent_decision_ids` était `[]` depuis sa création : personne ne le
  // remplit à la main dans un commit de clôture. Le registre fait foi.
  let decisions = [];
  try {
    decisions = extraireDecisionsRecentes(readFileSync(join(racine, 'docs', 'DECISIONS.md'), 'utf8'));
  } catch {
    decisions = [];
  }
  if (decisions.length > 0) etat.recent_decision_ids = decisions;

  writeMachineState(racine, etat);
  lignes.push('.wn/state.json      updated_at renseigné, bloc git retiré (il ne se stocke plus)');
  if (decisions.length > 0) {
    lignes.push(`.wn/state.json      recent_decision_ids ← docs/DECISIONS.md (${decisions.join(', ')})`);
  }

  // 2. La vue `ACTIVE_CAMPAIGN.md` est générée depuis `.wn/state.json` ; elle
  //    dérive dès que l'état bouge sans que personne ne relance la synchro.
  try {
    // Le script vit dans le dépôt (RACINE) ; c'est le répertoire de travail qui
    // suit `racine`, pour qu'un banc puisse pointer ailleurs. Un échec ici est
    // rapporté, jamais fatal.
    execFileSync('node', [join(RACINE, 'scripts', 'wn-campaign.mjs'), 'sync'], {
      cwd: racine,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    lignes.push('ACTIVE_CAMPAIGN.md  resynchronisé depuis .wn/state.json');
  } catch (err) {
    lignes.push(`ACTIVE_CAMPAIGN.md  NON resynchronisé (${err.message.split('\n')[0]})`);
  }

  return lignes;
}

// ── Rendu ───────────────────────────────────────────────────────────────────

// Exportée pour le banc : c'est ici, pas dans `diagnostiquer`, que le mode
// --local doit rendre la PR « non vérifiée » plutôt qu'un faux « aucune ».
export function rendre(faits, verdict) {
  const out = [];
  const etatBranche = {
    'hors-lot': 'branche par défaut',
    travail: 'vivante, non mergée',
    'pret-pr': 'vivante, clôture embarquée',
    'pr-ouverte': 'vivante, PR ouverte',
    'apres-merge': 'mergée en squash',
  }[verdict.phase];

  out.push(`PHASE    ${verdict.phase}${verdict.fenetreRatee ? '  ⚠ fenêtre de clôture ratée' : ''}`);
  out.push(`branche  ${faits.branche || '(inconnue)'}${etatBranche ? ` (${etatBranche})` : ''}`);

  // En mode --local, l'état PR n'a pas été interrogé : dire « aucune » serait
  // un faux constat — pr-ouverte, apres-merge et la fenêtre de clôture ratée
  // ne se jugent que sans --local. Sur la branche par défaut, gh n'est jamais
  // interrogé de toute façon : le rendu normal reste juste.
  const pr =
    faits.modeLocal && faits.branche !== faits.brancheParDefaut
      ? 'non vérifiée (mode local) — relancer sans --local pour le verdict PR'
      : faits.prOuverte
        ? `#${faits.prOuverte.numero} ouverte`
        : faits.prMergee
          ? `#${faits.prMergee.numero} mergée`
          : faits.ghDisponible
            ? 'aucune'
            : 'inconnue (gh indisponible — verdict partiel)';
  out.push(`PR       ${pr}`);

  if (verdict.sync) {
    const s = verdict.sync;
    const fraicheur =
      s.fetchOk === true
        ? 'origin rafraîchi'
        : s.fetchOk === null
          ? 'origin non rafraîchi (mode local — fetch non tenté)'
          : 'origin NON rafraîchi (fetch échoué)';
    const ecart =
      s.ahead === null || s.behind === null
        ? 'écart local/distant non mesurable'
        : `${faits.brancheParDefaut} ahead ${s.ahead} / behind ${s.behind}`;
    out.push(`sync     ${s.desynchronise ? '⚠ ' : ''}${fraicheur} — ${ecart}`);
  }

  const verite = readCampaignTruth(RACINE);
  if (verite.activeCampaignId || verite.activeLot) {
    out.push(`lot      ${verite.activeCampaignId || '(campagne inconnue)'} / ${verite.activeLot || '(lot non fixé)'}`);
  }

  if (faits.branche !== faits.brancheParDefaut) {
    out.push('');
    const marque = (ok) => (ok ? '✓' : '✗');
    out.push(`fait     ${marque(faits.fichiersDuLot.length > 0)} diff du lot (${faits.fichiersDuLot.length} fichier(s))`);
    out.push(`         ${marque(verdict.cloture.sessionLog)} SESSION_LOG.md`);
    out.push(`         ${marque(verdict.cloture.handoff)} fragment docs/claude/handoffs/`);
  }

  if (verdict.avertissements.length > 0) {
    out.push('');
    for (const ligne of verdict.avertissements) out.push(`⚠        ${ligne}`);
  }

  out.push('');
  out.push(`SUIVANT  ${verdict.suivant[0]}`);
  for (const ligne of verdict.suivant.slice(1)) out.push(`         ${ligne}`);

  return out.join('\n');
}

// ── CLI ─────────────────────────────────────────────────────────────────────

/**
 * Analyse des arguments CLI. Fonction pure, exportée pour le banc : `--local`
 * décide de sauter le réseau et gh, une erreur de parsing rendrait donc un
 * verdict incomplet en silence.
 */
export function analyserArguments(argv) {
  return {
    local: argv.includes('--local'),
    appliquer: argv.includes('--appliquer'),
    aide: argv.includes('--help') || argv.includes('--aide') || argv.includes('-h'),
  };
}

const AIDE = `Usage : node scripts/wn-cycle.mjs [--local] [--appliquer]

  --local      Aucun réseau : saute le git fetch et tout appel gh. Les phases
               purement locales (hors-lot, travail, pret-pr) et les faits de
               clôture rendent leur verdict normal ; l'état PR n'est PAS
               vérifié — la ligne PR le dit tel quel, relancer sans --local
               pour le verdict PR (pr-ouverte, apres-merge, fenêtre ratée).
  --appliquer  Resynchronise .wn/state.json et ACTIVE_CAMPAIGN.md après le
               constat (voir reparer()).
  --help       Affiche cette aide.`;

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const options = analyserArguments(process.argv.slice(2));

  if (options.aide) {
    process.stdout.write(`${AIDE}\n`);
    process.exit(SORTIE_OK);
  }

  const faits = collecterFaits(options);
  const verdict = diagnostiquer(faits);

  if (verdict.phase === 'hors-depot') {
    console.error('Hors dépôt git — aucun verdict de cycle possible.');
    process.exit(SORTIE_PRECONDITION);
  }

  process.stdout.write(`${rendre(faits, verdict)}\n`);

  if (options.appliquer) {
    console.error('');
    for (const ligne of reparer(RACINE)) console.error(ligne);
    console.error(
      'SESSION_LOG.md et les fragments de handoff ne sont pas touchés — relire le diff avant de committer.',
    );
  }

  process.exit(verdict.sortie);
}
