# Runbook Wellneuro

**Restes versés au plan le 2026-10-14** : les restes à faire nommés dans ce document sont tenus au plan (docs/claude/PLAN_WELLNEURO.md, §8 et file D au §4), qui en porte l'ordre et le sort ; ce document reste tenu à jour.

> Procédures réutilisables d'exploitation et d'incident.
>
> **Réécrit le 2026-08-22 pour l'ère Scalingo** (cutover HDS du 2026-08-22,
> [[D-080]] ; livrable commandé par [[D-085]] §3). La production est l'app
> Scalingo `wellneuro`, région `osc-fr1`, ressources HDS ; la base
> PostgreSQL de l'add-on **n'est pas exposée à Internet** — tout accès passe
> par la plateforme (one-off, tunnel), jamais par une URL publique.
> Vercel/Supabase restent tièdes jusqu'au décommissionnement du 2026-09-01
> ([[D-080]]) : plus un chemin d'exploitation, seulement un filet daté.
> **2026-10-14** : périmé — Vercel et Supabase sont décommissionnés depuis le
> 2026-09-01 ([[D-120]]) ; il n'existe plus de filet hors Scalingo.

## Vérification rapide production

1. Accéder à `https://app.wellneuro.fr`
2. Signin praticien avec compte Google `@wellneuro.fr`
3. Vérifier tableau de bord (≥1 patient visible ou message vierge cohérent)
4. Créer ou consulter une assignation de questionnaire
5. Status OK = navigable sans erreur 500

## Exécuter sur la production — one-off Scalingo

Le motif de référence pour toute commande contre la production (éprouvé le
2026-08-22 ; la base n'étant pas exposée, c'est **le** chemin d'exécution) :

```bash
# Lancer détaché (pas de TTY requis — le TTY n'est nécessaire qu'en interactif)
scalingo --app wellneuro --region osc-fr1 run --detached "npx prisma migrate status"
# → « To follow this execution, run: … logs --filter one-off-NNNN »

# Lire la sortie (relancer jusqu'à fin d'exécution)
scalingo --app wellneuro --region osc-fr1 logs --filter one-off-NNNN -n 100

# Arrêter un one-off qui n'aurait pas dû partir
scalingo --app wellneuro --region osc-fr1 one-off-stop one-off-NNNN
```

- Le one-off tourne **dans l'image du dernier déploiement réussi**, répertoire
  `web/` (Procfile) : `scripts/…` et `prisma/…` s'y résolvent directement.
- `logs --filter` filtre par **motif**, pas par égalité : toujours vérifier
  que les lignes lues portent bien le bon numéro de conteneur.
- Variables : `scalingo env-get <VAR>` pour lire UNE variable (jamais
  `scalingo env`, qui déverse toute la configuration, secrets compris) ;
  `scalingo env-set VAR=valeur` pour poser.
- **Piège `env-set`** : les conteneurs qui tournent gardent l'ancien
  environnement — un `scalingo restart` est nécessaire pour qu'ils voient la
  nouvelle valeur. Le `postdeploy`, lui, lit l'environnement **au déploiement
  suivant**.
- Accès SQL exceptionnel : `scalingo db-tunnel` (ou `scalingo run psql`
  en one-off) — lecture seule par défaut de conduite, agrégats seulement,
  jamais de colonne d'identité dans une sortie de terminal.

## Déploiement

1. Commits sur branche de feature → PR vers `main`
2. Merge sur `main` → quand le CI de `main` conclut **vert**, le workflow
   **Déploiement production** (`.github/workflows/deploiement-production.yml`,
   [[D-248]]) déploie la tête de `main` (`integration-link-manual-deploy
   main`). **L'auto-déploiement Scalingo est coupé depuis le 2026-09-25.**
   - Ce déploiement **automatique** attend le CI vert ; un run dépassé par
     un merge plus récent ne livre jamais son propre commit — seulement la
     tête, si son CI est vert (la production ne recule pas). Revers : si la
     tête rougit, les commits verts qui la précèdent attendent la prochaine
     tête verte — corriger la tête, pas redéployer à la main.
   - **Deux chemins livrent la tête SANS lire son CI** : le dispatch
     `action=deployer` (étape 6) et l'approbation d'un run `release-db`.
     Constater le CI de `main` vert sur la tête avant l'un comme l'autre.
   - Un commit porteur d'un run `release-db` non conclu au vert (en
     attente, rejeté, en échec) est **retenu** — mais seulement tant qu'il
     est la tête : le merge suivant, même sans migration, livre `main`,
     donc le code de la migration avant son schéma ([[D-248]], « Inchangé,
     et à connaître »). **Ne rien merger avant que `release-db` ait conclu
     au vert.** Un run rejeté ou en échec se reprend par un
     `workflow_dispatch` de `release-db` sur `main`, approuvé.
3. Variables d'environnement : `scalingo env-set` (+ `restart` si des
   conteneurs en cours doivent la voir — piège ci-dessus)
4. **Migrations DB : par le workflow `release-db` exclusivement** ([[D-087]],
   sous `WN_MIGRATIONS_PAR_RELEASE_DB=1`) — proposé automatiquement au merge
   d'une migration, appliqué en one-off **après approbation humaine**.
   Séquence et gardes : `docs/DEPLOIEMENT_RELEASE_DB.md`. Jamais de
   `migrate deploy` à la main contre la production.
5. Attendre le déploiement (CI de `main` ~13 min, puis build de 5 à 14 min)
   puis contrôle post-déploiement
6. **Déployer la tête à la main** (par exemple après un build en échec) :
   Actions → Déploiement production → Run workflow, `action=deployer` (ou
   `gh workflow run deploiement-production.yml --ref main -f
   action=deployer`). **Ce chemin ne lit pas le CI de la tête** : le
   constater vert d'abord. Le run s'abstient, en vert, si la tête est déjà
   en service (`forcer` ne lève que celle-là), retenue par `release-db`
   (verdict « Retenu ») ou dépassée : **lire le verdict, pas la couleur**.
   Jamais de `integration-link-manual-deploy` lancé à la main : il saute la
   retenue `release-db` et l'attente du calme. Dernier recours, workflow
   indisponible : aucun build en vol, aucun run `release-db` non conclu au
   vert sur la tête.
7. **Merge qui change ce que le processus de fond envoie ou exige** (file
   durable de [[D-282]] ; procédure tirée de la revue de #1428, versée le
   2026-10-14). Constater la file vide juste avant le merge ne suffit pas :
   l'ancien web peut encore enfiler un travail, que l'ancien worker
   traiterait selon l'ancien contrat.
   1. `scalingo --app wellneuro scale worker:0` ;
   2. constater par conteneur qu'aucun travail n'est `en_cours` (un travail
      `en_attente` peut rester : le nouveau code doit le faire échouer
      fermé) ;
   3. merger, puis constater le déploiement de la tête ;
   4. `scalingo --app wellneuro scale worker:1` ;
   5. constater par conteneur qu'aucun travail de l'ancienne version n'est
      né après le merge (pour #1428 : aucun import `bio-extraction-v4`).
   La surveillance du signal de vie du worker peut alerter pendant la
   fenêtre : c'est attendu.

## Contrôle post-déploiement

1. Accéder à `https://app.wellneuro.fr` (rafraîchir le cache navigateur)
2. Le run **Déploiement production** du merge conclut « Tête de `main`
   déployée ». Pour lire la production soi-même :
   `scalingo --app wellneuro --region osc-fr1 deployments` — la liste est
   triée par **début** de build ; la version en service est la ligne
   `success` qui **finit** en dernier (DATE + DURATION), pas forcément la
   première. La colonne USER sépare l'auto-déploiement
   (`scalingo-platform-scm`, coupé depuis le 2026-09-25) de tout geste
   fait sous le compte (`wellneuro`) : Actions, `release-db`, mais aussi un
   déploiement lancé à la main (CLI, tableau de bord). Pour attribuer une
   ligne `wellneuro`, chercher son ID dans les journaux des runs
   Déploiement production et `release-db`. Le verdict complet
   (conforme / recul / illisible) : `node scripts/wn-deploiement-observation.mjs`
   depuis le dépôt (CLI Scalingo connecté), ou le même workflow en
   `action=observer`
3. `scalingo --app wellneuro --region osc-fr1 logs -n 200` : pas d'erreur
   500 récente ni de crash de conteneur
4. Tester une assignation simple sur dossier de test ([[D-075]] : les
   dossiers de test se lisent par identifiant, jamais par nom dans un outil)

## Rollback

1. Identifier le commit défaillant
2. **Revert par PR** (`git revert` + PR + merge) — jamais de
   `git reset --hard` sur `main` : l'historique de `main` est la référence
   des déploiements et des releases DB
3. Merge → CI de `main` vert → Déploiement production redéploie ; contrôle
   post-déploiement. Un revert avance `main` : il se déploie comme tout
   merge, sans rien qui ressemble à un recul
4. **Deux avertissements ([[D-087]])** :
   - redéployer un slug **antérieur au 2026-08-22** ré-active
     l'auto-migration du `postdeploy` (ancien `db-deploy.sh`) — un rollback
     de code peut migrer au passage ;
   - un rollback de **schéma** ne se fait jamais par le code : une migration
     DROP appliquée ne se défait que par **restauration de base**
     (sauvegardes Scalingo ; la copie Supabase n'est un filet que jusqu'au
     2026-09-01, [[D-080]]). Décision du responsable, jamais un geste par
     défaut. **2026-10-14** : la copie Supabase n'existe plus ([[D-120]]) ;
     seules restent les sauvegardes Scalingo.
5. **Revenir à l'auto-déploiement** (retour arrière de la bascule
   [[D-248]], décision du responsable) — l'ordre symétrique de la bascule,
   sans aucun autre merge entre les gestes :
   1. merger le revert du **code** de #1222 — workflow, déployeur et son
      banc ramenés à `eb660e3f` ; pas les documents : D-248 est un registre
      append-only, le retour arrière s'y écrit en ajout. L'auto-déploiement
      est encore coupé : `main` retrouve le lot 2 (dispatch seul, garde
      finale active) ;
   2. `scalingo --app wellneuro --region osc-fr1 integration-link-update --auto-deploy` ;
   3. livrer la tête par `action=deployer` — le revert n'a été livré par
      personne ; le run s'abstient si la tête est déjà en service.

   **Jamais l'ordre inverse** : entre les deux gestes, l'auto-déploiement
   tournerait à côté d'un déployeur dont la garde finale est éteinte — un
   run dépassé qui conclut vert pourrait réveiller l'auto-déploiement d'un
   vieux commit (incident 1).

## Essai de restauration (G-7)

Portée et procédure : [[D-289]]. Une sauvegarde de l'hébergeur est restaurée
dans une base **temporaire**, dans la même région que la production, puis
contrôlée et détruite le jour même. Jamais de restauration sur place, jamais
sur le poste de travail : l'archive ne quitte pas l'hébergeur (elle se
télécharge dans le conteneur, pas sur le Mac).

**Avant** : approbation du responsable (l'essai crée une ressource et
manipule une copie de données de santé). Le téléchargement de l'archive
exige une authentification **dans** le conteneur : le responsable crée un
jeton API temporaire (tableau de bord Scalingo, profil, jetons API, nom
`g7-essai-AAAA-MM-JJ`) et le révoque à la fin. Le jeton ne s'écrit ni dans
le dépôt ni dans une commande visible : il se saisit masqué (`read -rs`).

1. **Sauvegarde** : relever l'identifiant et l'heure (UTC) de la dernière
   sauvegarde `done`.

   ```bash
   scalingo --app wellneuro --region osc-fr1 --addon postgresql backups
   ```

2. **Base temporaire**, depuis un répertoire **hors du dépôt** (`create`
   ajoute sinon un remote Git) :

   ```bash
   cd /tmp && scalingo --region osc-fr1 create wellneuro-g7-essai
   scalingo --app wellneuro-g7-essai --region osc-fr1 addons-add postgresql postgresql-starter-1024
   scalingo --app wellneuro-g7-essai --region osc-fr1 addons   # attendre « running »
   ```

3. **Conteneur interactif** de `wellneuro`, script téléversé (le
   téléversement exige le mode interactif : `--detached` et `--file` ne se
   combinent pas) :

   ```bash
   scalingo --app wellneuro --region osc-fr1 run --file scripts/wn-g7-restauration.sh bash
   ```

4. **Dans le conteneur** (remplacer `<ID>` et `<HEURE_UTC>` par les valeurs
   de l'étape 1) :

   ```bash
   install-scalingo-cli
   read -rs JETON && scalingo login --api-token "$JETON" && unset JETON
   scalingo --app wellneuro --region osc-fr1 --addon postgresql backups-download --backup <ID> --output /tmp/g7.tar.gz
   export CIBLE_URL="$(scalingo --app wellneuro-g7-essai --region osc-fr1 env-get SCALINGO_POSTGRESQL_URL)"
   SAUVEGARDE_A='<HEURE_UTC>' bash /tmp/uploads/wn-g7-restauration.sh /tmp/g7.tar.gz
   exit
   ```

   Le script refuse une cible égale à la production ou non vide ; il écrit
   dans la seule cible et lit la production en lecture seule. Il rend :
   code et durée de `pg_restore`, nombre d'erreurs (ligne d'erreur seule,
   jamais DETAIL ni CONTEXT) ; dernière migration de la copie contre celle de
   la production à l'heure de la sauvegarde ; tables présentes ; comptes de
   lignes rapprochés table par table (un écart se lit contre les écritures
   postérieures à la sauvegarde). Il efface l'archive et ses fichiers de
   travail ; le conteneur est détruit à la sortie.

5. **Fin, le jour même** :

   ```bash
   scalingo --region osc-fr1 destroy wellneuro-g7-essai   # confirmation par le nom
   scalingo --region osc-fr1 apps | grep g7-essai          # doit être vide
   ```

   Puis révoquer le jeton `g7-essai-AAAA-MM-JJ` au tableau de bord.

6. **Verdict** : réussi si `pg_restore` finit sans erreur, si les deux
   migrations sont égales, si aucune table ne manque et si chaque écart de
   comptes s'explique par une écriture postérieure à la sauvegarde.
   Consignation au handoff du lot G-7 et au plan (fiche F04) : date,
   sauvegarde employée, durée, verdict, **en agrégats** — ni identité, ni
   compte rattaché à un dossier ([[D-298]]). Échec : la porte 8 reste
   fermée et le défaut s'instruit avant un nouvel essai ([[D-289]] §2.6).

## Incident : Scalingo / DNS / Configuration

- `scalingo --app wellneuro --region osc-fr1 deployments` puis
  `logs -n 500` : cerner build raté vs crash runtime vs configuration
- Vérifier les variables une à une par `env-get` (jamais `env`)
- DNS : `app.wellneuro.fr` pointe vers Scalingo depuis le cutover — vérifier
  registrar et domaine côté dashboard Scalingo
- Statut plateforme : <https://scalingostatus.com>
- (Jusqu'au 2026-09-01 seulement : l'ancienne pile Vercel existe encore —
  `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md` pour l'historique.)
  **2026-10-14** : échéance passée, la pile Vercel est décommissionnée
  ([[D-120]]).

## Incident : OAuth Google

1. Vérifier `GOOGLE_CLIENT_ID` posée (`scalingo env-get GOOGLE_CLIENT_ID`)
   et le secret présent (par sa longueur, jamais par sa valeur :
   `scalingo env-get GOOGLE_CLIENT_SECRET | wc -c`)
2. Vérifier application OAuth Google Console : domaine autorisé
   `app.wellneuro.fr`
3. Révoquer session test et retester signin frais

## Incident : base PostgreSQL / Prisma

1. La base n'est **pas joignable depuis Internet** : diagnostiquer par
   one-off — `scalingo run --detached "npx prisma migrate status"` puis
   `logs --filter one-off-NNNN`
2. Erreurs `PrismaClientInitializationError` dans `scalingo logs` :
   vérifier `SCALINGO_POSTGRESQL_URL` **présente** (`env-get … | wc -c`,
   jamais la valeur) et l'état de l'add-on dans le dashboard
3. Schéma suspect : `scalingo run --detached "npx prisma db execute --stdin"`
   n'est PAS le chemin — passer par un one-off `psql` en lecture, ou par le
   contrat `release-db-statut.sh` si la question est « la base est-elle à
   jour ? »
4. En local seulement : `cd web && npx prisma generate` après modification
   du schéma

## Suspicion fuite secret

1. Lancer `bash scripts/check_no_secrets.sh` immédiatement
2. Vérifier `scalingo logs` (pas d'affichage accidentel de clé — l'incident
   type : une URL de base avec identifiants dans un log)
3. Si confirmé : révoquer tokens/clés compromis dans les services (jeton
   d'API Scalingo : dashboard → révoquer le jeton dédié, le workflow
   `release-db` échouera fail-closed jusqu'à repose)
4. Committer un fix sans jamais coller le secret lui-même

## Révocation accès patient

> Corrigé le 2026-07-22 (exercice sur table, constat EX-1) : l'ancienne
> version référençait `Patient.portailToken`, champ qui n'existe pas, et
> ignorait la route applicative prévue pour ce cas. Recalé le 2026-08-22
> après la purge [[D-085]] §5 : le jeton permanent n'existe plus en base,
> `accessTokenRevoked` est le drapeau de révocation du **compte**.

1. Depuis le tableau de bord praticien, révoquer l'accès du patient
   (panneau patients) — ou `DELETE /api/praticien/token?idPatient=...`.
   La route ferme **les trois portes en une transaction** : compte
   (`accessTokenRevoked`), sessions déjà ouvertes (`sessionsInvalidesAvant`),
   liens magiques encore en vol (horizon `expireLe` ramené à la date de
   révocation — `consommeLe` n'est PAS touché, `D-128`).
2. Vérifier le refus côté patient : ancien lien → message d'indisponibilité,
   session `wn_portail` existante refusée.
3. Si l'accès doit être rétabli : réémettre et envoyer un nouveau lien
   (`POST /api/praticien/token`, bouton « Renvoyer le lien »). La réémission
   ne rouvre pas les sessions antérieures (`sessionsInvalidesAvant` survit).

### Désactiver n'est pas révoquer, et les deux ferment les liens

Désactiver un dossier (`PATCH /api/praticien/patients`, menu « Désactiver le
dossier ») ferme aussi les liens magiques encore en vol — mais **par
`expireLe`, jamais par `consommeLe`** ([[D-126]]). Les deux gestes se
distinguent donc en base :

| Geste | `accessTokenRevoked` | `sessionsInvalidesAvant` | Liens en vol | `consomme_le` |
|---|---|---|---|---|
| Révoquer | `true` | daté | `expire_le` avancé à cette date | **jamais touché** |
| Désactiver | inchangé | inchangé | `expire_le` avancé à maintenant | **jamais touché** |

Depuis `D-128`, aucun geste praticien n'écrit `consomme_le` : **une date de
consommation est une entrée du patient, et rien d'autre** — pour toute ligne
écrite depuis. Les lignes antérieures, elles, restent ambiguës (`D-128`, écart
résiduel n° 1).

En forensique, un lien non fermé porte `expire_le = cree_le + 24 h` EXACTEMENT
(`DUREE_VALIDITE_MS`). Un écart plus court signe une fermeture praticien — mais
depuis `D-128` il ne signe plus la seule désactivation : les deux gestes ferment
par l'horizon. Pour les SÉPARER, comparer `expire_le` à
`patients.sessions_invalides_avant` : égalité à la milliseconde = révocation
(même objet `Date`, même transaction).

ATTENTION, CETTE ÉGALITÉ NE VAUT QUE POUR LA DERNIÈRE RÉVOCATION DU DOSSIER.
`sessions_invalides_avant` n'a qu'un emplacement : une révocation postérieure
l'écrase, et les liens fermés par une révocation ANTÉRIEURE ne correspondent
alors plus. Ne pas conclure « désactivation » d'une non-égalité — c'est le
défaut même que `D-128` retire de l'encart, et il subsisterait ici. Un tel lien
n'est pas départageable en l'état. Le prédicat d'écart reste celui-ci :

    abs(extract(epoch from (expire_le - cree_le)) - 86400) > 60

La tolérance de 60 s absorbe la dérive d'horloge entre l'application, qui
calcule `expire_le`, et Postgres, qui pose `cree_le` par défaut ; sans elle, un
lien parfaitement normal satisferait le prédicat. Angle mort résiduel, à
connaître : une désactivation survenue dans la MINUTE qui suit l'émission du
lien reste indiscernable. Ne pas retenir de seuil large (`23 hours` par
exemple) : il manquerait toute désactivation survenue dans la dernière heure de
vie du lien — un faux négatif silencieux, au pire moment.

Réactiver ne rouvre aucun lien déjà fermé : il faut en réémettre un. Réserve :
un lien né pendant la fermeture elle-même peut y échapper (course nommée en
écart résiduel n° 3 de `D-126`) et redevenir utilisable si le dossier est
réactivé sous 24 h.

## Violation de données personnelles

Si un incident touche des données patient (divulgation, altération, perte —
même sans certitude), suivre `docs/PROCEDURE_VIOLATION_DONNEES.md` :
**horodater la prise de connaissance immédiatement** (le délai CNIL de 72 h
court à partir de là), ouvrir une fiche au registre, endiguer via les
procédures ci-dessus, puis qualifier le risque avant de décider notification
et information des personnes. Le registre physique des violations est ouvert
depuis le 2026-08-22 ([[D-085]] §3), tenu hors dépôt par le responsable.

## Contrôles avant commit

```bash
bash scripts/check_no_secrets.sh
cd web && npm run type-check
```
