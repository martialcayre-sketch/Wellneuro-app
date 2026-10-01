# Handoff — 2026-10-01 — BIO-INGEST LOT-01 : saisie groupée d'un bilan, tout ou rien

## Branche et état Git

- Branche `feat/bio-ingest-lot01-saisie-groupee`, créée depuis `origin/main` (0a04ce7c).
  Copie principale. Phase `travail` → clôture écrite avant la PR.
- Diff non encore commité au moment de ce fragment : code, bancs, E2E, fragment
  `changelog.d/`, fiche du lot, tableau de campagne, `.wn/state.json`,
  `ACTIVE_CAMPAIGN.md`, `SESSION_LOG.md`, ce handoff.

## Objectif

LOT-01 de la campagne `2026-09-30-bio-ingest` : saisir un bilan complet (date et heure de
prélèvement communes, N analytes) en une validation, **tout ou rien** (A1 et A3 de `D-256`).

## Décisions prises

- **Route dédiée** `POST /api/praticien/biologie/resultats/bilan`, et non une extension du
  POST unitaire : celui-ci porte déjà la correction (`D-124`) et ses contrôles de fil. La route
  unitaire et sa correction restent inchangées.
- **Préflight complet, tous les refus collectés** (indexés par ligne), puis un seul
  `$transaction` en forme tableau. Une ligne refusée ⇒ `$transaction` n'est pas appelé.
  400 s'il y a au moins un refus de forme, 409 si tous sont d'état. Un `P2002` de course ⇒ 409,
  et le bilan entier est annulé.
- **Un bilan ne corrige rien** : une ligne avec `supersedesResultatId` est refusée
  (`correction_hors_bilan`), jamais ignorée.
- **La date est commune et jugée une fois** (`validerDatePrelevement`, extraite de
  `validerSaisieResultat` sans changer son comportement). Son refus est global, pas par ligne.
- **Le formulaire de bilan REMPLACE la saisie unitaire** (arbitrage du responsable, 2026-10-01) :
  un bilan d'une ligne est la saisie unitaire. La correction reste un geste de la série.
- **Messages partagés en `lib/`** (`saisieMessages.ts`) : un `route.ts` de Next n'exporte que
  ses handlers. Pour la même raison, la borne `BILAN_MAX_LIGNES` (100, technique) n'est pas exportée.
- Au succès, les lignes se vident et la date reste ; en cas de refus, rien n'est vidé.

## Fichiers modifiés

- Nouveaux : `web/src/app/api/praticien/biologie/resultats/bilan/route.ts` (+ `route.test.ts`),
  `web/src/lib/biology-library/saisieMessages.ts`,
  `web/src/components/patient-cockpit/SaisieBilan.tsx`,
  `changelog.d/2026-10-01-bio-ingest-lot01-saisie-groupee.md`.
- Modifiés : `resultats/route.ts` (imports seulement), `biology-library/resultats.ts`
  (+ test), `EstimeMesurePanel.tsx` (+ test), `web/e2e/biologie-saisie-resultats.spec.ts`.
- Clôture : fiche `LOT-01-saisie-groupee.md` (terminé), `CAMPAGNE.md` (LOT-02 courant),
  `.wn/state.json` (`active_lot` LOT-02, `last_completed_lot`, tête de `next_action`),
  `ACTIVE_CAMPAIGN.md`, `SESSION_LOG.md`.

## Validations exécutées

- T1 `npm run check:rapide` : vert.
- Bancs ciblés : route unitaire **non modifiée** et verte ; route bilan verte ; panneau vert.
- **16 mutations manuelles** du préflight, toutes détectées (best-effort, arrêt au premier
  refus, chaque contrôle retiré, clé partielle perdue, ordre, statut, unité, P2002…).
- T2 `npm run test:worktree -- --fast` : vert en 3 min 48 s, 225 E2E passés et 3 ignorés.
  Les 5 E2E biologie passent sur Chromium et iPhone 13, dont « bilan de deux analytes,
  clavier compris » et « tout ou rien, vérifié après rechargement de la page ».
- `/code-review medium` : aucun finding.
- **Non joué** : `npm run check` complet (avant le commit) et T3 (non exigé : ni migration,
  ni scoring, ni clinique).

## Problèmes ouverts

- **Constat d'usage au conteneur (`D-125`)** après déploiement : nombre de lignes
  `resultats_biologiques` et de bilans, par identifiant, jamais par nom. Ligne de base au
  2026-09-30 : 0 ligne sur 28 dossiers actifs. Une fixture ne dit rien d'un parcours.
- L'en-tête de `biologie-saisie-resultats.spec.ts` dit encore que `WN_CB_RESULTS_ENABLED`
  « n'est pas posé en production ». C'est faux depuis le 2026-09-09. Hors périmètre, pas touché.

## Prochaine action exacte

1. `cd web && npm run check`, `bash scripts/check_no_secrets.sh --staged`, commit.
2. PR avec `--body-file`, puis `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond (code 0 seul).
3. Lire les commentaires en ligne (`gh api repos/{owner}/{repo}/pulls/<N>/comments`),
   chacun avec son verdict.
4. **Demander confirmation avant le merge**, qui déclenche le déploiement Scalingo.
   Constater le déploiement.
5. Constat d'usage par conteneur (`scalingo run -d`), plus tard, quand un bilan aura pu être saisi.
6. Avant toute ligne de code du LOT-02 : l'amendement RGPD/TRUST (A4).

## Interdits encore actifs

- Aucune migration ni colonne dans ce lot. Le LOT-02 est **seul dans sa PR**, avec
  confirmation obligatoire et `release-db` approuvée (`D-087`).
- Aucune écriture dans `resultats_biologiques` sans validation humaine explicite.
- Aucune qualification de valeur, aucune conversion d'unité (`D-157`), aucun choix
  d'analyte par LLM.
- Aucun code d'extraction IA avant l'amendement RGPD/TRUST.
- Fixtures neutres seulement (Sophie Nicola, Jennifer Martin, Michel Dogné). Les dossiers réels
  se lisent par identifiant, au conteneur, et ne sont jamais visés par un seed ni par un E2E.
