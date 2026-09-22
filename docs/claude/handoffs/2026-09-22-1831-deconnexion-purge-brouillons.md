# Handoff — 2026-09-22 — « Se déconnecter » purge les brouillons locaux (D-242)

## 1. Branche et état Git

- Branche : `wn-deconnexion-brouillons-2026-09-22`, partie d'`origin/main` à
  `b24cd206` (D-241).
- Worktree : `.claude/worktrees/reste-ouvert`.
- **Aucune migration, aucun `schema.prisma` touché, aucun drapeau neuf, aucune
  règle clinique.**

## 2. Objectif de la session

« Termine ce qui reste ouvert » — les trois limites nommées par `D-241` §6. Ce
lot en ferme une, en corrige une deuxième qui était **fausse**, et laisse la
troisième explicitement ouverte.

## 3. Décisions prises

- **`D-242`** — la déconnexion purge les brouillons locaux, après avertissement.
  Trois choix de conception y sont motivés : avertir **seulement** s'il y a
  quelque chose à perdre ; purger **après** la confirmation du serveur ; ne pas
  toucher au confort de lecture.
- **`D-241` §6 amendé en place, sur deux de ses trois puces.** « Rien n'alerte le
  praticien qu'un patient rebondit » **était faux** — l'état `entree_refusee`
  existe (`lib/fil/nouveauxPatients.ts`). Ce qui est vrai est plus étroit : il ne
  s'affiche que si `!source.connecteLe`, donc le rebond d'un patient **déjà
  entré** est avalé. Affirmation posée sans avoir lu le fichier ; corrigée plutôt
  que laissée.

## 4. Fichiers modifiés

- `web/src/lib/portail/stockageAppareil.ts` *(neuf)* — l'INVENTAIRE des sept
  familles de clés du portail, `localStorage` **et** `sessionStorage` ;
  `aDesDonneesPatientLocales()`, `effacerDonneesPatientLocales()`, exemptions
  motivées.
- `web/src/lib/portail/stockageAppareil.guard.test.ts` *(neuf)* — garde de
  CLASSE : toute clé `wellneuro:` des surfaces patient doit être déclarée.
- `web/src/components/patient/BoutonDeconnexion.tsx` — `PatientConfirmDialog`
  (et non un panneau maison), purge après confirmation serveur.
- `web/src/components/patient/BoutonDeconnexion.test.tsx` — 8 bancs neufs.
- `web/e2e/portail-deconnexion.spec.ts` *(neuf)* — 4 cas, dont la traversée du
  dialogue ; le parcours manquait à `D-241`.
- `web/src/lib/questionnaire-draft.ts` — **inchangé** : la première version y
  avait ajouté la purge, remontée depuis dans `stockageAppareil.ts`.
- `docs/DECISIONS.md`, `changelog.d/2026-09-22-deconnexion-purge-brouillons.md`.

## 5. Validations exécutées

- **T1 vert.** **T3 vert** : 9928 + 1623 bancs, **213 E2E** (205 avant — quatre
  cas neufs × deux navigateurs). Les quatre ont réellement tourné.
- **Quatre mutations jouées, quatre tuées** : purge déplacée avant l'appel
  serveur ; `wellneuro:portail:` ajouté aux préfixes PURGÉS (tue « le confort
  survit » — cette mutation SURVIVAIT à la première version, le banc gardant une
  clé que rien n'écrit) ; `estSubstantielle` retirée (tue « pas de dialogue sur
  du vide ») ; une famille retirée de l'inventaire (tue le garde de classe).
- **UNE REVUE ADVERSARIALE A RENDU NO-GO SUR LA PREMIÈRE VERSION**, quatre
  bloquants, tous fondés et tous vérifiés à la main avant correction.
- **Une mutation a échoué à s'appliquer et la garde a ARRÊTÉ** au lieu de rendre
  un faux verdict — puis le fichier a été restauré explicitement, `set -e` ayant
  sauté le `cp` de restauration. Vérifié par md5.

## 6. Problèmes ouverts

- **Le rebond d'un patient déjà connecté ne remonte pas.** `entree_refusee` est
  conditionné à `!source.connecteLe`. Le correctif demande une comparaison de
  RÉCENCE (`portailMagicLink.derniereTentative` > dernière connexion), pas une
  simple levée de condition : `rejeuxRefuses > 0` est « refusé un jour », et
  afficher un incident résolu enverrait relancer un patient déjà servi. **C'est
  le lot suivant, et il est cadré.**
- **Les refus Google sur adresse inconnue sont indécidables** — `id_patient =
  NULL`, aucun dossier à nommer. Propriété de non-oracle, pas un défaut. Seul un
  compteur agrégé serait possible.
- **La déconnexion ne coupe pas les autres appareils** (`D-241` §6, inchangé).
- **Aucun banc ne couvre `aDesDonneesPatientLocales()` en mode privé**
  (stockage qui lève) : le code renvoie `false`, mais rien ne le tient.
- **La purge peut échouer partiellement en silence** : `removeItem` qui lève en
  milieu de famille laisse le reste en place, et la page part quand même. Aucune
  post-condition ne le constate.
- **Le texte du dialogue dit « il faudra les ressaisir »** — juste pour le
  patient qui se déconnecte, faux pour celui dont le travail d'un AUTRE patient
  du même appareil est emporté. La purge est délibérément tous-patients.

## 7. Prochaine action exacte

Ouvrir la PR `--base main --body-file`, attendre le CI, lire la revue Copilot,
merger en squash avec `--subject` portant `(D-242)`. Puis attaquer le lot du
rebond, cadré en §6 ci-dessus.

## 8. Interdits encore actifs

- **Force-push exclu** de l'autorisation (jusqu'au 2026-09-24).
- **Aucune identité réelle ni donnée d'usage individuelle dans le dépôt** —
  horaires, compteurs, discordances de compte comprises.
- **`D1` de la campagne IDP2 tient** : aucun fournisseur d'identité, aucun mot de
  passe patient.
- **Le confort de lecture ne se purge pas** — frontière posée par `D-242` §4, et
  gardée par un banc.
- **`D-241` est sur `main`** : la PR #1210, qui réclame le même numéro, devra
  renuméroter en `D-243` (D-242 étant pris par ce lot).
