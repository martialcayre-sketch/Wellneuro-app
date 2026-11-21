# Handoff — file D, mise en service du pilote : D-540 amendée pour l'amorçage et le repli de la routine (2026-11-21)

## 1. Branche et état Git

- Branche `claude/exciting-cray-95vkt0`, session cloud, avancée en `--ff-only` sur `origin/main` (288e1b24) avant
  toute édition. Un seul commit, de documentation.
- Hors dépôt, faits dans cette session sur la parole du responsable :
  - six lots inscrits au carnet de la file D (ordres 98 à 103, `lieu: cloud`, `nature: ordinaire`, `risque` P1 ou
    P2), cadrage Fable puis choix du responsable ;
  - routine du pilote `trig_01DjNMRmBw4hQtgBUokHtCrW` (Opus, `CRON_TZ=Europe/Paris 0 7-23 * * *`), active ;
  - `orchestrateur/arret` à `false` (version 4) ;
  - section « Orchestrateur » ajoutée au cockpit (lecture seule du journal, des intentions, de l'interrupteur et
    des lots `cloud`).

## 2. Objectif

Écrire l'amendement de D-540 qui couvre ce que la routine porte désormais hors dépôt : l'amorçage (clone,
contrôle des crochets) et le repli (ligne de journal `erreur_script`, puis arrêt). Le responsable l'a demandé
après la correction de la première passe.

## 3. Décisions prises

- **D-540, amendement du 2026-11-21** (dernière section, ligne d'en-tête ajoutée) :
  - la consigne de la routine porte l'adresse, l'ordre de suivre la consigne du dépôt, l'amorçage et le repli ;
  - une passe ne travaille jamais sans crochets ;
  - le repli n'ouvre aucun droit et ne porte aucune règle de décision ;
  - §7 : la passe suit le défaut de `CLAUDE.md` (Opus), choix du responsable du 2026-11-21 ;
  - un déclenchement manuel se fait sans texte joint (le texte compte comme un second tour).
- Cause de l'échec de 15 h 01 : la routine créée par `create_trigger` n'a aucune source, et cet outil ne sait
  pas en attacher. La routine de l'essai à blanc 2, créée depuis l'interface, a le dépôt mais ne se modifie pas
  depuis une session. D'où l'amorçage par clone direct, constaté fonctionnel.

## 4. Fichiers modifiés

- `docs/decisions/D-540.md` (en-tête et section finale)
- `docs/claude/templates/ORCHESTRATEUR_PASSE.md` (ce que porte la routine)
- `docs/ROLES_MACHINES.md` (même phrase, section des sessions de passe)
- `changelog.d/2026-11-21-orchestrateur-pilote-repli.md`, ce handoff

## 5. Validations exécutées

- Passe de contrôle réelle, déclenchée à la main, interrupteur fermé : clone direct réussi, crochet `/.env`
  refusant `.env.sonde-crochet`, consigne lue sur `origin/main`, export de 127 lots, script en code `2`
  (`interrupteur_ferme`), lignes `20261121-1549-orch` et `20261121-1550-orch` écrites et relues.
- `npm run check:rapide` : code 0 (16 étapes vertes, 3 sautées), après `npx prisma generate` dans ce clone neuf
  (sans lui, `type-check` rougissait faute de client généré). `npm run check` (T1 complet) : code 0.
  `scripts/check_no_secrets.sh` : 0.
- Pas de T2 : ni UI ni API.

## 6. Problèmes ouverts

- Le push de la branche et l'ouverture de la PR depuis une passe restent à constater à la première passe qui
  mène un lot (attendue sur `registres-reponses-controle`).
- La consigne de passe n'a pas de valeur d'`issue` pour une passe arrêtée par l'interrupteur fermé ; le code
  suffit, rien à changer.
- `gh auth status` échoue en cloud (`GH_TOKEN` invalide) ; les lectures REST passent. Déjà noté au §5 de
  l'amendement du 2026-11-20.

## 7. Prochaine action exacte

1. CI de la PR (`node scripts/wn-attendre-ci.mjs <N>`), puis `node scripts/wn-revue-pr-agent.mjs <N>` → 0.
2. Un verdict par commentaire, « prête @<sha> » sur la PR et ligne `prete` à l'`integrateur`.
3. Suivre la première passe qui prend un lot : journal, intention, prise, branche, PR.

## 8. Interdits encore actifs

- Ne pas poser `orchestrateur/arret` sans la parole du responsable ; ne jamais supprimer une ligne des registres.
- Aucune adresse de page privée dans le dépôt.
- Ni migration, ni schéma, ni clinique, ni donnée patient ; aucune écriture en production.
- Un déclenchement manuel de la routine se fait sans texte joint.
- Porte 24 non levée.
