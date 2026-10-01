### Biologie : saisie d'un bilan complet en une validation, tout ou rien — BIO-INGEST LOT-01 (2026-10-01)

- **Pourquoi.** Depuis le 2026-09-09, la saisie unitaire (un geste par valeur)
  n'a produit aucune ligne sur 28 dossiers. Le responsable la juge trop
  coûteuse pour un bilan complet (A1 de `D-256`).
- **Route `POST /api/praticien/biologie/resultats/bilan`.** Elle reçoit une date
  et une heure de prélèvement communes et N lignes `{ analyteCode, valeur }`.
  Le préflight juge toutes les lignes avant d'écrire : forme de la valeur,
  analyte absent, inconnu ou inactif, analyte en double dans le bilan, doublon
  en base sur la clé de l'unicité partielle. Il rend **tous** les refus, chacun
  avec l'index de sa ligne. L'écriture n'a lieu que si toutes les lignes passent,
  dans un seul `$transaction` : avec 9 lignes valides et une 10e refusée, rien
  n'est écrit (A3). Un `P2002` dans la transaction, en cas de course, annule le
  bilan entier.
- **Ce que le serveur pose, et lui seul**, comme pour la saisie unitaire :
  l'unité, relue sur l'analyte au catalogue ; la source `saisie_praticien` ;
  l'auteur, tiré de la session. Une ligne qui porte `supersedesResultatId` est
  refusée : un bilan ne corrige rien, la correction reste un geste de la série
  (`D-124`). Aucune qualification, aucune conversion d'unité (`D-157`). Le
  plafond de 100 lignes est une borne technique.
- **Cockpit.** Le formulaire « Saisir un bilan » remplace « Consigner une
  mesure » : une date commune, des lignes analyte et valeur, « Ajouter une
  analyse », « Retirer la ligne N ». En cas de refus, l'erreur s'affiche sous la
  ligne fautive (`aria-invalid`, `aria-describedby`), avec une alerte globale.
  Rien n'est vidé. Au succès, les lignes se vident et la date reste.
- **Extraction sans changement de comportement.** `MESSAGES_REFUS_SAISIE` et
  `signature` passent dans `lib/biology-library/saisieMessages.ts`, partagé par
  les deux routes. `validerDatePrelevement` sort de `validerSaisieResultat`,
  qui l'appelle. Le banc de la route unitaire reste vert sans modification.
- **Bancs.** Le banc de la route bilan détecte les 16 mutations du préflight.
  Le panneau a un banc dédié au bilan. L'E2E `biologie-saisie-resultats` passe
  par le bilan et ajoute deux cas : un bilan de deux analytes, et le tout ou
  rien vérifié après rechargement de la page.
- Aucune migration ni colonne. Toujours derrière `WN_CB_RESULTS_ENABLED`.
