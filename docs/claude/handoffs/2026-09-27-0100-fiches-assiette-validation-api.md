# Handoff — 2026-09-27 — Fiche d'assiette, lot 6a : lecture et décision côté serveur

## 1. Branche et état Git

`wn-fiche-assiette-validation-api`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à `af5e7af0`
(#1235, lot 5, en service).

## 2. Objectif

Lot 6 de `D-251`, découpé en deux PR mergées l'une après l'autre :

- **6a (ce lot)** : la lecture et la décision côté serveur ;
- **6b** : l'écran du rayon « Fiches conseils » et son E2E.

## 3. Décisions prises

- **Pas de drapeau.** `WN_FICHES_ASSIETTE` garde l'émission, pas la relecture
  (§7), et ne s'ouvre qu'une fois des fiches validées ici (§10).
- **Qui pose un acte : le praticien de la session.** Son e-mail est le
  validateur, jamais une valeur du corps, comme à l'Atelier corpus. Aucun rôle
  « responsable » n'existe dans le code, et je n'en crée pas (hypothèse
  mono-praticien, `appartenance.ts`). À confirmer par le responsable.
- **Transitions** :
  - valider depuis « à valider » ou « retirée » ;
  - retirer depuis « validée » ou « à valider » ;
  - refus `deja_dans_cet_etat` pour un acte qui ne change rien ;
  - refus `version_depassee` pour valider une version plus ancienne qu'une
    version validée.
- **Concurrence** :
  - un verrou consultatif par fiche (`fiches_assiette_actes:<sourceId>`) ;
  - le jeton du dernier acte vu (`ordre`, en chaîne) ;
  - l'empreinte du contenu vu.
  - Si l'un bouge, rien n'est écrit (409).
- **Contrôles** :
  - valider rejoue tout (§6) : contrat sur le JSON rangé, empreinte canonique,
    appariement, claims VALIDE, `controlerFiche` ;
  - le détail les rejoue aussi, à la lecture ;
  - retirer ne contrôle rien.
- **L'état d'une version** est son dernier acte au sens d'`ordre`. Un acte
  inconnu, une empreinte divergente ou un retrait sans motif donnent
  **illisible** (`DC-24`).
- **`ordre` sort en chaîne exacte** (`toString`), jamais en `Number` : c'est le
  jeton de concurrence.
- **DC-16** :
  - `decision.ts` porte l'unique création d'acte ;
  - les contrôles partagés avec le dépôt sortent d'`ingestion.ts` vers deux
    modules neutres, `controle.ts` et `claimsCites.ts` ;
  - la garde exige que dépôt et décision ne s'importent pas l'un l'autre.
- `confirmationRegistre` reste toujours à faux : aucune garde de registre
  anxiogène n'est câblée pour les fiches.
- **Revue adverse** : 4 angles, dont un par l'agent `wn-reviewer`, et une
  réfutation par angle. Deux constats confirmés, tous deux P2, corrigés :
  - la garde ne voyait pas l'**écriture imbriquée** Prisma, par exemple une
    version créée avec son acte dans `ingestion.ts`. Un motif la couvre
    désormais, et une mutation le prouve ;
  - un corps JSON `null` sortait en 500 : il rend désormais 400, avec un banc.
  - Onze autres constats ont été réfutés : délais de transaction, états
    illisibles que la base interdit par CHECK et trigger, imports indirects,
    double lecture des claims.

## 4. Fichiers modifiés

- `web/src/lib/fiches-assiette/` :
  - nouveaux : `claimsCites.ts`, `controle.ts`, `etat.ts`, `lecture.ts`,
    `decision.ts` (+ `etat.test.ts`, `decision.test.ts`, `lecture.test.ts`) ;
  - modifiés : `contrat.ts` (`lireContenuFiche` exporté), `ingestion.ts`
    (contrôles déplacés), `ingestion.test.ts` (parité des prédicats sur
    `claimsCites.ts`), `catalogue.guard.test.ts`.
- `web/src/app/api/praticien/fiches-assiette/route.ts`, `version/route.ts`,
  `actes/route.ts`, et leurs tests.
- `docs/claude/MATRICE_CONSOMMATION.md` (régénérée).
- `changelog.d/2026-09-27-fiches-assiette-validation-api.md`.
- `docs/claude/SESSION_LOG.md`, ce handoff.

## 5. Validations exécutées

- Vitest, suites concernées : 128 verts.
- Mutations jouées, chacune attrapée :
  - la garde d'état divergent retirée ;
  - la relecture acceptée sans être strictement `true`.
- T1 vert. T2 vert : 610 fichiers Vitest (10 189 tests), build, 213 E2E.

## 6. Problèmes ouverts

- **« Qui est le responsable »** : aujourd'hui, tout praticien authentifié.
- **Retirer la version servie remet en service la version validée
  précédente.** Trois angles de la revue l'ont relevé, et tous l'ont écarté
  comme défaut : c'est la règle de §5, « dernière version validée ». Mais
  l'écran de 6b doit l'annoncer au moment du retrait (« vN redeviendra
  servie »), et le responsable peut vouloir la règle inverse.
- **Garde d'écran de 6b** : sur le patron de `booklet/confirmations.guard`, un
  banc exigeant que l'écran envoie `relectureIntegrale` arrivera avec 6b. Sans
  écran, il serait rouge.
- **Toujours ouverts depuis le lot 5** : les bornes d'âge (§6), et l'accord de
  dépôt des brouillons en production.

## 7. Prochaine action exacte

Merge de 6a et constat du déploiement, puis 6b : le rayon « Fiches conseils »,
la relecture côte à côte, la déclaration et les deux gestes, l'E2E synthétique.

## 8. Interdits encore actifs

- Aucun texte de Fiche MY au dépôt, en PR, au journal : bancs synthétiques.
- « Un merge à la fois » (D-248).
- Aucun dépôt en production sans l'accord du responsable.
