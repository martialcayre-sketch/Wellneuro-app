# Handoff — Portail « Mon bilan » (LOT-01, reprise d'un chantier en suspens)

- Date : 2026-08-05, 10:03
- Campagne : `docs/claude/campagnes/2026-08-04-reprise-chantiers-en-suspens/`
- Lot : `lots/LOT-01-portail-mon-bilan.md` — **livré**
- Branche : `worktree-lot01-portail-bilan`
- Décision posée : **D-026**
- Fragment de changelog : `changelog.d/2026-08-05-portail-bilan.md`
- Migration : `20260805070000_booklet_note_transmise` (additive, backfill) — **à vérifier en base après merge**

## Ce que le lot livre

Le patient relit dans son espace le bilan que le praticien lui a **transmis**
(`/portail/<token>/bilan`). Ce qu'il lit est `booklet_envois.note_transmise`, un
instantané figé au moment de l'envoi — jamais `syntheses_ia.notes_praticien`, qui
reste modifiable après un envoi réussi.

La branche `feat/portail-bilan` (fin juillet, 81 commits de retard) a été **rejouée**
sur `main` par cherry-pick, sans un seul conflit : les trois fichiers touchés des deux
côtés avaient des hunks disjoints. La branche d'origine n'a pas été mergée et peut être
supprimée.

## Les six choses à savoir avant de toucher à ce code

1. **L'absence de garde sur `annoter` est un choix, pas une dette.** La garde qui
   paraît évidente — refuser dès qu'un envoi existe, par symétrie avec `effacer` —
   **casserait le renvoi corrigé** (`forceSend` → opération `Renvoi`), qui consiste
   précisément à corriger une note puis à la renvoyer. C'est l'instantané qui ferme le
   défaut ; un renvoi en écrit un frais. Voir D-026.
2. **La visibilité s'écrit à un seul endroit** : `whereEnvoiVisible`
   (`lib/documents/bilanPatient.ts`). Le hub et la page la servaient différemment, et
   avaient déjà divergé. Toute nouvelle surface qui montre un bilan passe par elle.
3. **Mais l'accès et la frise sont deux signaux distincts.** `bilanConsultable` suit le
   rejet ; `bookletEnvoye` reste acquis et alimente la frise du parcours. Les brancher
   ensemble faisait reculer le patient de l'étape « restitution disponible » à
   « votre praticien les prépare », contre l'invariant « jamais rétrograde » de
   `lib/trajectoire-partagee/contrat.ts`. Le corollaire est désormais écrit à côté de
   l'invariant.
4. **Le backfill repose sur un invariant, pas sur un comptage.** `updated_at <=
   date_envoi` ne recopie que les envois dont la synthèse n'a provablement pas bougé.
   Il compare deux horloges (PostgreSQL pour `date_envoi`, applicative pour
   `updated_at`) : le sens de l'échec est sûr — NULL plutôt qu'un texte faux.
5. **Le narratif n'est pas snapshotté.** Il n'est figé que par le refus d'`enregistrer`
   sur toute synthèse qui n'est plus un brouillon — un invariant qui vit dans une autre
   route (`api/praticien/synthese`). Désormais épinglé par un test ; il ne l'était par
   rien.
6. **`booklet_envois` n'est plus un journal d'audit** : elle porte du texte clinique
   libre. L'effacement patient la couvre déjà (supprimée avant `syntheseIA`, FK
   `RESTRICT`), mais toute règle de conservation qui la traiterait comme de la
   métadonnée est devenue fausse.

## Ce qui reste ouvert, nommé et non corrigé

- **Dossier clos : annoter reste possible, renvoyer ne l'est plus.** La note du dossier
  peut diverger définitivement de ce que le patient a reçu, sans moyen de réconcilier.
  Sans conséquence pour le patient — le portail sert l'instantané — mais c'est une
  question de tenue de dossier.
- **Aucun code d'événement ne vise le bilan patient.** `PORTAIL_SESSION_EXCEPTION` est
  le moins faux des existants ; un lecteur qui filtrerait cette famille y trouvera des
  échecs de lecture de bilan.
- **`bilanConsultable` implique `bookletEnvoye`** par construction, mais rien ne
  l'oppose : l'invariant est commenté, pas testé.
- **Le repli sur un bilan antérieur est délibéré** : après le rejet du dernier bilan, un
  envoi antérieur dont la synthèse reste valide redevient visible. Décision de
  l'utilisateur — il n'a jamais été repris au patient.
- **Sortie des données de santé du flux SMTP** : cette page est la destination, mais le
  corps de l'e-mail porte toujours le nom du patient et son narratif en clair à travers
  un relais non certifié HDS. Le retrait du contenu clinique de l'e-mail est un lot
  distinct, à faire une fois cette page en production.

## Validation au moment du handoff

- **T3 complet joué trois fois**, vert à chaque passe (dernière : après les correctifs
  de contre-revue) — migration `migrate deploy` sur PostgreSQL éphémère et drift check
  `migrate diff` inclus, E2E Playwright inclus.
- **Trois passes adversariales**, deux GO et un GO conditionné. Ce qu'elles ont trouvé :
  le backfill recopiait le champ vivant sur la foi d'une mesure vieille de cinq jours ;
  le hub proposait un bilan retiré ; le correctif de ce défaut faisait reculer la frise ;
  et le garde des bancs, qui prétendait détecter toute condition non émulée, ne voyait
  rien au-delà du premier niveau — remis en version premier-niveau, une condition
  imbriquée ajoutée au `where` passait **36/36 verte**.
- **Lecture de la production le 2026-08-05** : 6 envois réussis, 1 portant une note,
  0 synthèse modifiée depuis son envoi. Le backfill recopiera **1 ligne**, l'invariant
  n'en exclut **aucune**.

## Après le merge — la migration ne s'applique PLUS toute seule

**Attention, la règle a changé sous ce lot.** Depuis #435, mergé le 2026-08-05 pendant
que ce lot était en revue, `web/scripts/vercel-build.sh` **n'applique plus les
migrations** : le build est redevenu un `next build` sans effet de bord. L'écriture en
production passe par le workflow **`release-db`**, déclenché **à la main**
(`workflow_dispatch`, mode `migrate-only`) et gaté par l'environnement protégé
`release-db` — un second gate humain en plus de la revue de PR.

Conséquence directe : **merger cette PR ne fait rien en base.** Tant que `release-db`
n'a pas été déclenché, la colonne `note_transmise` n'existe pas en production, et la
route portail échouera sur une colonne absente. Runbook :
`docs/DEPLOIEMENT_RELEASE_DB.md`.

**Et cette page n'est derrière aucun drapeau.** Elle est vivante dès que Vercel a
déployé `main`, c'est-à-dire *avant* que `release-db` ait pu tourner. Entre les deux, un
patient qui suit le lien « Consulter mon bilan » — le lien, lui, s'affiche : sa requête
ne touche pas la colonne manquante — obtient une erreur technique. La fenêtre se compte
en minutes si `release-db` est déclenché dans la foulée du merge, mais elle existe. Deux
façons de la fermer, à trancher avant de merger :

1. **Déclencher `release-db` immédiatement après le merge**, avant d'annoncer quoi que
   ce soit — la migration est additive, elle ne casse aucun code déjà déployé.
2. **Poser un drapeau sur la page** dans un lot de suivi, et ne l'allumer qu'une fois la
   colonne vérifiée en base. C'est le motif retenu pour l'agenda alimentaire ([[D-025]]).

Rien de tout cela n'était vrai quand ce lot a été cadré : `vercel-build.sh` appliquait
alors les migrations, et l'ordre était garanti par le build lui-même.

Puis, et seulement ensuite, lire la base :

```sql
SELECT migration_name,
       bool_or(finished_at IS NOT NULL AND rolled_back_at IS NULL) AS appliquee,
       count(*) AS tentatives
FROM _prisma_migrations
WHERE migration_name = '20260805070000_booklet_note_transmise'
GROUP BY migration_name;

SELECT count(*) FILTER (WHERE note_transmise IS NOT NULL) AS notes_figees,
       count(*) AS lignes
FROM booklet_envois;
```

Attendu : migration appliquée, `notes_figees = 1`, `lignes = 8`. C'est la seule preuve
que `release-db` a fait ce qu'il annonçait — le déploiement applicatif, lui, réussira
que la migration soit passée ou non.
