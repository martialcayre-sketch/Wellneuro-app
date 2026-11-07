# Handoff — 2026-11-07 — BP-12b, PR 5 : seule une position signée occupe sa fiche ; empreinte de l'entrée affichée à la pose

## Branche et état du dépôt

- Branche `b-bp12b-atelier-empreinte`, partie de `origin/main` ded37511,
  avancée en `--ff-only` sur e627e2e9 (#1915, doc, sans recouvrement) avant
  le commit (#1908 mergée en f52202f5 et déployée le 2026-11-07 à 12:48 UTC ; aucune
  autre PR structurelle de la file B ouverte). Worktree
  `.claude/worktrees/b-bp12b-atelier-empreinte`.
- Non clinique : hors `web/src/lib/clinical/**`, sans migration ni
  `schema.prisma`, triggers intacts. Pas de release-db (sonde à jouer).
- `WN_POSITIONS_EXPERT` reste éteint.
- Régime D-373 (adopté par D-454) : la file déclare « prête @sha »,
  l'intégrateur merge.

## Objectif

Clore les deux suites de la PR 4 (D-452) avant l'allumage de
`WN_POSITIONS_EXPERT` (D-439 §3, A3) :

1. seule une position signée occupe sa fiche, avec un contrôle à la
   signature ;
2. la pose d'un arbitrage vérifie l'empreinte de l'entrée du conflit
   affichée (renvoi CodeRabbit de #1908, `ecriture.ts:352`).

## Décisions prises

- **D-458** (numéro réservé par `wn-reserver-decision`) porte la règle et
  l'empreinte à la pose. Le responsable l'a demandée le 2026-11-07, après la
  remarque de PR-Agent sur #1918 (« Décision D-xxx manquante »).
- Option (a), arbitrée le 2026-11-06 (mémoire
  `bp12b-pr4-arbitrages-2026-11-06`, arbitrage 5). `ficheFondeeParUneAutre`
  ne compte que les versions courantes d'une autre position à l'état `signee`
  ou `illisible`. Le second cas est fail-closed et inatteignable : le CHECK
  `acte IN ('signee','retiree')` l'interdit.
- Le contrôle quitte `verserVersion` et ne reste qu'à la signature. Un
  brouillon se verse même sur une fiche fondée (lecture littérale de la
  consigne, sans question au responsable). Le verrou de la fiche est gardé au
  versement : il ne coûte rien et garde l'ordre fiche puis position.
- Conséquence de « en vigueur = version courante signée » (`etat.ts`),
  relevée par wn-reviewer et fixée par le cas 9 du banc réel. Réviser une
  position signée, même sur sa fiche, la sort de vigueur et libère la fiche.
  Si une autre position s'y signe entre-temps, la révision ne se signe plus.
  Le changelog et le journal F09 le disent.
- Nouveau refus de la pose : `entree_divergente`, statut 409. Message : « Ce
  conflit a été re-signé depuis l'affichage : l'entrée n'est plus celle que
  vous avez lue — rechargez l'atelier. » Il est contrôlé après
  `registre_non_signe`.
- La route exige `entreeVue` (`SHA256_RE`) sur une pose, sinon 400. La
  révocation n'en porte pas : c'est le coupe-circuit.
- La clé de `CoupleArbitrage` inclut l'empreinte de l'entrée. Si l'entrée
  change au rechargement, le formulaire (choix et motif) se vide.
- Message de `fiche_deja_fondee` : « … déjà fondée par une autre position en
  vigueur : retirez-la ou révisez-la avant de signer celle-ci. »

## Fichiers modifiés

- `web/src/lib/positions-expert/ecriture.ts` : question 3 à la signature
  seule ; `entreeVue` et `entree_divergente`.
- `web/src/lib/positions-expert/http.ts` : deux messages.
- `web/src/lib/positions-expert/lecture.ts` : `ConflitLu.empreinte`.
- `web/src/app/api/praticien/positions-expert/arbitrages/route.ts` :
  validation de `entreeVue`.
- `web/src/components/positions-expert/AtelierPositionsPanel.tsx` : renvoi de
  l'empreinte, clé.
- Bancs : `ecriture.test.ts`, `routes.test.ts`, `positionsExpert.pg.test.ts`.
- `changelog.d/2026-11-07-positions-expert-signee-occupe-empreinte.md`,
  `docs/claude/plan-journal/F09/2026-11-07-02-signee-occupe-empreinte-pose.md`
  (rang relu sur `origin/main` ded37511 : 01 pris).

## Validations exécutées

- T1 (`npm run check:rapide`) : vert, 16 étapes.
- Bancs `positions-expert` : 125/125, dont le banc sur base réelle
  (`positionsExpert.pg.test.ts`, 9 cas), joué sur une base locale migrée
  (`scripts/wn-dev-db.sh --migrate`, 138 migrations). Ce banc ne tourne pas
  dans T2, seulement au CI.
- T2 (`npm run test:worktree -- --fast`) : vert sur l'état d'avant les
  corrections P2 (965 fichiers Vitest, 355 E2E, 8 min 7 s). Rejoué sur
  l'état final : Vitest vert, E2E 354 réussis et 1 échec hors périmètre
  (`agenda-sommeil-praticien.spec.ts:106`, iPhone 13 seulement : le clic sur
  « Agenda du sommeil » n'ouvre pas le panneau). Le même cas passait à la
  première passe, et le diff ne touche que `positions-expert` : échec traité
  comme intermittent WebKit, le CI tranche. T1 complet (`npm run check`) et
  anti-secrets verts.
- wn-reviewer : GO, sans P0 ni P1. Six P2 :
  - P2-1 (empreinte non couverte de bout en bout) : corrigé, assertion sur
    `lireAtelierPositions` au cas 7 ;
  - P2-2 (assertion `CS-BIO-01` creuse) : corrigé, empreinte de l'entrée du
    dépôt et raison exacte `fiche_hors_structure` ;
  - P2-3 (message incomplet) : corrigé ;
  - P2-5 (révision qui libère la fiche) : corrigé, cas 9 et texte des
    fragments ;
  - P2-4 : ouvert, voir plus bas ;
  - P2-6 (ordre `registre_non_signe` / `entree_divergente` sans banc) :
    écarté, seul le message changerait, sans effet sur la sécurité.

## Problèmes ouverts

- P2-4 de wn-reviewer : le formulaire de versement propose aussi les fiches
  déjà fondées par une position signée, sans avertissement. Le refus n'arrive
  qu'à la signature. C'est accepté par l'option (a) ; à revoir si l'atelier
  sert souvent (ergonomie, hors périmètre).
- Aucun test de composant ni E2E de l'atelier (`entreeVue` dans le corps,
  clé). Le drapeau est éteint et l'atelier sans E2E depuis la PR 3. La lecture
  et le module sont couverts.
- Revue CodeRabbit sur la tête : à lire (trois sorties), un verdict par
  remarque.

## Prochaine action exacte

1. PR, CI (`node scripts/wn-attendre-ci.mjs <N>` en fond), revue CodeRabbit
   sur la tête : en quota, `@coderabbitai review`, sinon PR-Agent prouvé par
   `node scripts/wn-revue-pr-agent.mjs <N>`, sinon wn-reviewer (D-448). Puis
   « prête @sha », sans merger.
2. Après le déploiement, gestes du responsable, dans l'ordre :
   - allumer `WN_POSITIONS_EXPERT=true` ;
   - verser et signer à l'atelier les positions des dossiers clos (D-439 §5) ;
   - arbitrer les conflits fiche par fiche.

## Interdits encore actifs

- Ni migration ni `schema.prisma` sans demande ; triggers intacts.
- Production en lecture seule.
- Aucun texte de position au dépôt : il est public, la forme reste opaque
  (D-251 §4).
- D-373 : déclarer « prête @sha », ne pas merger.
- Un verdict par commentaire de revue : corrigé, écarté avec motif, ou routé
  avec adresse.
