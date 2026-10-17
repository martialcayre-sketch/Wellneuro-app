# Handoff — Bibliothèque biologie : recherche NABM par libellé, bilans retirés, analyses groupées cadrées (D-320)

## Branche et état Git

- Branche `feat/bibliotheque-nabm-recherche`, depuis `origin/main` 73f898a3
  (#1519), dans le worktree `.claude/worktrees/file-d1-suite` (session
  concurrente, cycle en git/gh). Un commit (code, bancs, docs) ; PR de ce lot
  ouverte depuis cette branche.

## Objectif

Retour du responsable du 2026-10-17, sur captures du cockpit :
1. trouver un acte NABM sans en connaître le code ;
2. réfléchir aux analyses groupées non répertoriées ;
3. retirer les packs d'analyses (les 15 bilans), devenus redondants depuis la proposition par analyse.

Le tout sans migration.

## Décisions prises

- D-320, trois arbitrages du responsable (tous sur la recommandation) :
  - bilans retirés de la Bibliothèque seule ; le moteur, la table signée et les documents restent sur les bilans jusqu'à F53 (D-296 §5) ;
  - les deux explorations non indiquées (`BIO-NIA-01`, `BIO-NIA-02`, bilans sans analyte) vont sur la fiche de l'alternative que leur motif nomme : magnésium érythrocytaire, CAR. Une première question supposait à tort que ces deux bilans avaient une fiche d'analyte ; elle a été corrigée et reposée ;
  - analyses groupées : fiche F80 au plan (rang 4 proposé, file A), livraison après arbitrage.
- Recherche par libellé :
  - c'est le praticien qui cherche, choisit, relit l'acte par son code et signe ; l'arbitrage du 2026-10-05 (« candidats jamais inférés d'un libellé ») reste entier, il vise l'assistant ;
  - filtrage en mémoire, côté serveur, du millier d'actes d'un millésime : ni index ni extension SQL ;
  - champ vide par défaut, sans préremplissage par le nom de l'analyte.
- Le mot « prescriptif » du retour ne change pas le registre : D-311 tient.

## Fichiers modifiés

- `web/src/lib/biology-library/` :
  - `rechercheTexte.ts` (nouveau, pur) ;
  - `correspondancesNabm.ts` (`chercherActesNabmParLibelle`) ;
  - `nonIndiquesBibliotheque.ts` (nouveau) ;
  - `catalogue.ts` (plus de bilans, `nonIndiques` par fiche) ;
  - les bancs de ces fichiers.
- `web/src/app/api/praticien/biologie/nabm/recherche/route.ts` (nouveau, et son banc). En-tête de `nabm/acte/route.ts` amendé.
- `web/src/components/biologie/` : `CorrespondancesNabmSection.tsx`, `RayonBiologiePanel.tsx`, `FicheAnalytePanel.tsx` (`LABEL_NIVEAU` retiré, mort), et leurs bancs.
- Textes : `dashboard/bibliotheque/page.tsx`, `dashboard/biologie/page.tsx`, `BibliothequePanel.tsx`.
- Docs :
  - `docs/DECISIONS.md` (D-320) ;
  - `docs/claude/PLAN_WELLNEURO.md` (ligne et fiche F80 au rang 4, mise à jour de F54) ;
  - `docs/claude/MATRICE_CONSOMMATION.md` (régénérée) ;
  - `changelog.d/2026-10-17-bibliotheque-nabm-recherche.md`.

## Validations exécutées

- Vitest ciblé (recherche, route, écran de signature, catalogue, rayon, rattachement, page Bibliothèque) : vert.
- Contre-épreuve : huit mutations jouées une à une, toutes rougissent :
  - jeton ignoré ;
  - millésime non filtré ;
  - borne retirée ;
  - accents gardés ;
  - pas de remise à zéro au changement d'analyte ;
  - motif reformulé ;
  - rattachement retiré ;
  - table non signée affichée.
- T1 `check:rapide` : vert. `check` complet et T2 `test:worktree -- --fast` : voir la PR (joués avant ouverture).
- E2E : aucune spec ne vise les textes retirés (grep).

## Problèmes ouverts

- F80 attend les arbitrages du responsable : groupe proposé en une ligne ou par ses composants, recalage des `isole` vers des actes de groupe (NFS 1104, ionogramme 1609, profil lipidique 0996), remboursement d'un calculé, groupes absents à ajouter.
- Le LDL calculé est classé « à juger » (0996) alors que les sept autres calculés sont « valeur calculée » ; à trancher dans F80.
- La recherche d'analytes du rayon (nom ou code) reste sensible aux accents ; elle n'a pas été touchée (hors périmètre).
- `consommation_decisions.json` range toujours `rayon:biologie` comme « dormante » (déjà noté au lot f).

## Prochaine action exacte

Après le merge :
1. constater le déploiement (`node scripts/wn-deploiement-observation.mjs`) ;
2. en production, chercher « homocystéine » dans une fiche d'analyte et ouvrir la fiche du magnésium érythrocytaire ;
3. mettre à jour les pages de suivi file A (r2_13) et BioFlow (nouvelle ligne pour F80).

Les constats CAR et acides gras, puis G-3, restent des gestes du responsable ; la recherche par libellé les facilite.

## Interdits encore actifs

- Aucune signature ni aucun constat écrit par script ou migration.
- Aucune migration ni modification de `schema.prisma` sans demande explicite (F80 en demandera une).
- Aucune règle d'indication modifiée sans D-xxx.
- Aucune identité réelle dans le dépôt.
- Aucun lien d'artefact dans le dépôt.
- Jamais de pull, merge ou rebase automatique.
