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
import { dirname, join } from 'node:path';
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
 * @returns {{phase: string, cloture: {sessionLog: boolean, handoff: boolean},
 *           fenetreRatee: boolean, suivant: string[], sortie: number}}
 */
export function diagnostiquer(faits) {
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

function baseDeComparaison(defaut) {
  for (const ref of [`origin/${defaut}`, defaut]) {
    if (git(['rev-parse', '--verify', '--quiet', ref])) return ref;
  }
  return null;
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

function collecterFaits() {
  if (!git(['rev-parse', '--git-dir'])) return { dansUnDepot: false };

  const defaut = brancheParDefaut();
  const branche = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const tip = git(['rev-parse', 'HEAD']);
  const base = baseDeComparaison(defaut);

  const diff = base && branche !== defaut ? git(['diff', '--name-only', `${base}...HEAD`]) : '';
  const committes = diff ? diff.split('\n').filter(Boolean) : [];
  // `--untracked-files=all` et non le défaut `normal` : ce dernier COLLAPSE un
  // répertoire entièrement non suivi en une seule ligne — `?? docs/claude/handoffs/`
  // au lieu des fragments qu'il contient. Le verdict rendait alors « handoff
  // absent » sur un handoff fraîchement écrit, exactement le silence que ce
  // script existe pour supprimer. Vu sur le lot qui a créé le dossier.
  const porcelain = gitBrut(['status', '--porcelain', '--untracked-files=all']);
  const fichiersDuLot = [...new Set([...committes, ...cheminsDuPorcelain(porcelain)])];

  const ghDisponible = gh(['--version']) !== null;
  let prOuverte = null;
  let prMergee = null;
  if (ghDisponible && branche && branche !== defaut) {
    const ouvertes = jsonOuNull(gh(['pr', 'list', '--state', 'open', '--head', branche, '--json', 'number']));
    if (Array.isArray(ouvertes) && ouvertes.length > 0) prOuverte = { numero: ouvertes[0].number };
    if (!prOuverte && tip) prMergee = chercherPrMergee(branche, tip);
  }

  return {
    dansUnDepot: true,
    branche,
    brancheParDefaut: defaut,
    arbrePropre: (git(['status', '--porcelain']) || '') === '',
    fichiersDuLot,
    prOuverte,
    prMergee,
    ghDisponible,
  };
}

// ── Réparation d'état (`--appliquer`) ───────────────────────────────────────

/**
 * Deux réparations, et rien d'autre. `SESSION_LOG.md` et le fragment de handoff
 * ne sont jamais écrits ici : leur contenu est du raisonnement, il reste du
 * ressort des skills.
 */
function reparer(faits) {
  const lignes = [];

  // 1. L'état machine d'abord : les champs `git.*` sont restés `null` depuis
  //    leur création, personne ne les écrit à la main dans un commit de
  //    clôture. L'ordre compte — la vue se génère depuis cet état, la
  //    synchroniser avant l'écriture la ferait porter la date du run précédent.
  const etat = readMachineState(RACINE);
  etat.git = {
    branch: faits.branche ?? null,
    last_commit: git(['rev-parse', '--short', 'HEAD']),
    dirty: !faits.arbrePropre,
  };
  etat.updated_at = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  writeMachineState(RACINE, etat);
  lignes.push('.wn/state.json      git.branch, git.last_commit, git.dirty, updated_at renseignés');

  // 2. La vue `ACTIVE_CAMPAIGN.md` est générée depuis `.wn/state.json` ; elle
  //    dérive dès que l'état bouge sans que personne ne relance la synchro.
  try {
    execFileSync('node', [join(RACINE, 'scripts', 'wn-campaign.mjs'), 'sync'], {
      cwd: RACINE,
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

function rendre(faits, verdict) {
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

  const pr = faits.prOuverte
    ? `#${faits.prOuverte.numero} ouverte`
    : faits.prMergee
      ? `#${faits.prMergee.numero} mergée`
      : faits.ghDisponible
        ? 'aucune'
        : 'inconnue (gh indisponible — verdict partiel)';
  out.push(`PR       ${pr}`);

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

  out.push('');
  out.push(`SUIVANT  ${verdict.suivant[0]}`);
  for (const ligne of verdict.suivant.slice(1)) out.push(`         ${ligne}`);

  return out.join('\n');
}

// ── CLI ─────────────────────────────────────────────────────────────────────
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const faits = collecterFaits();
  const verdict = diagnostiquer(faits);

  if (verdict.phase === 'hors-depot') {
    console.error('Hors dépôt git — aucun verdict de cycle possible.');
    process.exit(SORTIE_PRECONDITION);
  }

  process.stdout.write(`${rendre(faits, verdict)}\n`);

  if (process.argv.includes('--appliquer')) {
    console.error('');
    for (const ligne of reparer(faits)) console.error(ligne);
    console.error(
      'SESSION_LOG.md et les fragments de handoff ne sont pas touchés — relire le diff avant de committer.',
    );
  }

  process.exit(verdict.sortie);
}
