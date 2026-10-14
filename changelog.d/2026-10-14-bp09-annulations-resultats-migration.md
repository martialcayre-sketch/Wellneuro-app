### Biologie : annuler un résultat saisi par erreur, la migration seule (BP-09, D-294, 2026-10-14)

PR 1 du lot BP-09 (fiche LOT-09) : migration seule. Rien n'écrit ni ne lit
encore la table ; le seul code qui l'accompagne est l'effacement nommé du
dossier (les annulations avant les résultats), exigé par le banc de
complétude de l'effacement, comme pour `lectures_imports_biologiques`. Le code
consommateur (lecteurs de calcul, route, fiche praticien) viendra dans la
PR 2, après la release-db approuvée et constatée par conteneur.

- **Table neuve `annulations_resultats_biologiques`** (migration
  `20261014200000_annulations_resultats_biologiques_v1`), en ajout seul : deux
  actes, `annulation` (motif fermé : mauvais dossier, mauvaise date de
  prélèvement, mauvais analyte) et `revocation` (motif fermé : mauvais
  résultat annulé, résultat vérifié exact, motif d'annulation erroné). Aucune
  valeur, aucun analyte, aucune date recopiés ; aucun texte libre.
- **Refus en base** : résultat d'un autre dossier, acte d'un autre praticien
  que celui du dossier, annulation d'une ligne déjà corrigée, seconde
  annulation active sur un même fil (fourche comprise ; le fil est celui de
  la racine de chaîne), révocation qui ne vise pas une annulation de ce
  résultat, qui vise une annulation déjà révoquée, ou dont la place a été
  reprise ; UPDATE et TRUNCATE refusés ; instant et ordre posés par la base.
  RLS activée sans politique ; clés RESTRICT vers le dossier et le résultat.
- **La place d'un résultat annulé se libère** (arbitrage du 2026-10-14) : la
  garde anti-doublon de `resultats_biologiques` quitte l'index unique partiel
  pour un trigger AFTER qui ignore les fils annulés. Même nom de garde, même
  refus `23505` : le client Prisma de l'application le rend toujours en
  `P2002`, le 409 `doublon_mesure` ne bouge pas (constaté). Ses verrous — le
  dossier `FOR KEY SHARE`, puis un verrou consultatif sur la clé — sont pris
  dans le même ordre que l'effacement : pas d'interblocage avec lui. Aucune colonne
  neuve sur `resultats_biologiques`.
- **Une correction ne s'ajoute pas à un fil annulé**, refus en base
  (relecture CodeRabbit) : trigger avant insertion des corrections, mêmes
  verrous que la saisie et l'acte.
- **Contrats** : `annulations_resultats_biologiques_v1_negatif.sql` (vingt et
  une promesses), branché au CI ; `cb_resultats_biologiques_v1_negatif.sql`
  amendé (la garde est le trigger, aucun index unique hors clé primaire).
  Seize mutations des fonctions font échouer le contrat.
- **REPEATABLE READ refusé en base** (passe Codex, P0-1) : sous ce niveau,
  l'instantané laisserait passer deux mesures courantes, là où l'index ne
  dépendait d'aucun réglage. READ COMMITTED rend le 23505, SERIALIZABLE un
  échec de sérialisation.
- **Banc à deux sessions** `banc-annulations-resultats-deux-sessions.test.mjs`
  (CI et T3) : deux saisies neuves concurrentes, REPEATABLE READ refusé, la
  même course en SERIALIZABLE (une seule mesure), deux annulations
  concurrentes, saisie contre révocation, effacement contre annulation,
  annulation contre correction dans les deux ordres.
- **Banc du client Prisma** `banc-unicite-mesure-prisma.test.ts` (CI et T3) :
  le vrai client de l'application rend le doublon en `P2002`, reprend la
  place annulée, échoue en REPEATABLE READ.
- **D-294** amende D-124 §2 et §3 ; registre RGPD (rubriques 2 ter et 5) mis
  à jour avant la table.
