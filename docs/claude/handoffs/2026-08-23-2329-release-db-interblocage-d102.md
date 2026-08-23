# Handoff — 2026-08-23 — L'interblocage qui rendait `D-087` inapplicable (D-102)

Branche `docs/handoff-release-db-d102`, écrite depuis `main` : la fenêtre de la
PR #781 était fermée au moment de la clôture.

## Ce que la session a trouvé, et qui n'était pas le sujet

Le LOT-05 était mergé (#780) et sa release approuvée. Elle a été **refusée** —
troisième refus de la journée, même message : `❌ <sha> jamais déployé en
success après 20 min`.

La première hypothèse — deux merges rapprochés, Scalingo saute le commit — était
**fausse**, et le dépôt la portait déjà : la garde traite ce cas (coalescence) et
le traite bien. La cause réelle est un **interblocage** :

> Scalingo est en auto-déploiement après CI, mais il n'attend pas « le workflow
> CI » : il attend que **tous les checks du commit** aient conclu. Or
> `release-db` est lui-même un check de ce commit. Il attendait un déploiement
> que Scalingo n'aurait déclenché qu'une fois `release-db` terminé.

**Le régime `D-087` ne pouvait donc pas aboutir**, sur aucune migration, quelle
que soit la rapidité d'approbation.

## Comment le faisceau est devenu une preuve

Trois observations concordaient sans conclure : les trois commits portant un run
`release-db` ce jour-là (`43705ea1`, `59c16e62`, `c2210355`) n'ont jamais été
déployés d'eux-mêmes ; le seul commit sans migration l'a été **deux secondes**
après sa CI ; et sur `c2210355`, aucun commit concurrent, CI verte depuis
19:41:45, aucun build en quinze minutes.

Ce qui a tranché est **un test décisif disponible après coup** : la release
rejouée a conclu au vert à **20:08:58**, et l'auto-déploiement Scalingo a démarré
à **20:09:02**. Quatre secondes après le dernier check. Il attendait bien
`release-db`.

Leçon transférable : quand un faisceau ne conclut pas, chercher l'observation qui
**sépare** les hypothèses plutôt que d'en accumuler qui les confirment toutes.

## Décision et livraison

`D-102` — la release **déclenche** le déploiement qu'elle attend
(`integration-link-manual-deploy`), avant sa boucle d'attente inchangée. La
coalescence disparaît du même geste : le commit approuvé obtient *son* build.

Trois garde-fous fail-closed : un déploiement déjà existant ne déclenche rien ;
la tête de `origin/main` doit **être** le commit approuvé (la commande déploie
une branche, pas un SHA) ; et **le déclenchement reste dans le job protégé** —
le sortir en amont gagnerait cinq minutes de build et rendrait le jeton Scalingo
atteignable sans approbation, ce que `D-087` construit pour empêcher.

Fichiers : `.github/workflows/release-db.yml`,
`scripts/release-db-invariants.test.mjs` (trois invariants),
`docs/DECISIONS.md`, `changelog.d/2026-08-23-release-db-declenche-le-deploiement.md`.

## Validations

T1 vert. Trois invariants **vus rouges en mutation**. Vérifié hors banc, le
texte YAML ne l'étant pas : le fichier s'analyse, l'ordre des étapes est
« déclencher puis attendre », les deux blocs shell passent `bash -n`.

**Épreuve réelle, la seule qui compte pour un workflow** : répétition à vide
(run 32666839819, `workflow_dispatch`, `migrate-only`) — le déclenchement s'est
**abstenu en une seconde** (`✓ un déploiement de 4806bf6c… existe déjà`), la
garde a conclu aussitôt au lieu de sonder quarante fois, et
`No pending migrations to apply` : rien écrit.

## Deux défauts trouvés en écrivant

- **Des backticks dans une chaîne à guillemets doubles** auraient exécuté
  `git fetch origin main` au lieu de le citer dans un message d'erreur.
- **Une faiblesse du banc lui-même** : l'ancre `indexOf` trouvait le commentaire
  citant la commande, pas la commande ; et l'invocation retirée, la tranche
  devenait arbitraire et les assertions passaient pour de mauvaises raisons. Les
  ancres sont désormais vérifiées avant usage.

## État de la production à la clôture

LOT-05 déployé, migration `20260823210000` appliquée et constatée en base.
`WN_EI_INTERRUPTION=1` posé : la **capture** des effets indésirables rattachés
tourne. **`DC-42` n'est pas armée** — `SAFETY_EI_METADATA` reste non signée.

Régime `D-087` éprouvé de bout en bout : une vraie migration puis une répétition
à vide. `MIGRATE_DATABASE_URL` **constaté absent partout** (dépôt, `Production`,
`Preview`, `release-db`).

## Ce qui reste, et l'ordre

1. **Signature de `SAFETY_EI_METADATA`** — revue posée au **2026-08-30**. Acte de
   praticien, jamais un verdict de test. C'est une PR (quatre champs, SHA de
   périmètre auto-porteur), pas un clic. Le délai est utile : `DC-42` inhibe
   **totalement**, pas graduellement.
2. **2026-09-01** — annexe HDS (`G-TRUST-04`) et décommissionnement `D-080` :
   effacement Supabase avec preuve écrite, dump `~/wn-migration`.
3. **Avant chaque PR portant une migration** — rejouer une répétition à vide.
   Celle du 2026-08-23 éprouve la chaîne telle qu'elle était ce jour-là, et
   `D-102` vient d'en changer une étape.

## Interdits encore actifs

Approbation `release-db` = geste humain, jamais programmatique. Signature d'une
table clinique = acte de praticien. Aucune identité réelle au dépôt. Pas de
`prisma format`. Jamais de `git stash` nu entre worktrees.
