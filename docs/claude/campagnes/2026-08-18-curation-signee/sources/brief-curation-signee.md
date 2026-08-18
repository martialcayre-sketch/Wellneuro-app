# Brief — Curation signée : peupler ce que la biologie livrée ne peut pas afficher

## Objectif

Deux tables sont à zéro ligne par construction (claim obligatoire au schéma)
et une vérification fiche à fiche reste due : tant qu'elles sont vides, les
47 analytes sortent `non_evalue` en remboursement et aucun lien
biomarqueur↔besoin n'est servi. La campagne organise la curation — un
travail praticien, claim par claim, que « ne se solde pas dans une passe »
(D-071/D-073) — en lui donnant ses surfaces, son ordre et ses preuves.

## État réel au cadrage (2026-08-18)

- `biology_analyte_nabm` : 0 ligne ; `biology_nabm_actes` : 987 actes en base
  depuis le 2026-07-26, aucun appelant (bibliothèque dormante par décision).
- Liens biomarqueur↔besoin : 0 ligne, claim obligatoire au schéma.
- Catalogue niveau 1 : toutes les fiches en `statut_fiche = 'importee'` ; la
  vérification (`verifiee`, signataire + date) est un geste praticien
  ultérieur (D-068 §MI-8) — un lecteur filtrant `verifiee` voit un catalogue
  vide, et c'est exact.
- Question ouverte D-062 jamais tranchée : faut-il des claims VALIDE pour les
  deux motifs d'abstention (provenance aujourd'hui doctrinale DC-12/23,
  DC-24/25) ?

## Lots pressentis (4)

1. **Appariement analyte↔NABM** : curation signée des 47 analytes contre les
   987 actes — réveille la bibliothèque dormante et rend les remboursements
   évalués. Rythme praticien ; l'assistant prépare les rapprochements
   candidats, ne signe jamais.
2. **Liens biomarqueur↔besoin** : mêmes règles — chaque lien exige son claim
   relu.
3. **Vérification par fiche du catalogue** : passage `importee` → `verifiee`
   avec signataire et date, en tenant compte de la lacune MI-8 (prédicat de
   barrière sans `superseded_at`).
4. **Claims d'abstention (question D-062)** : trancher — écrire les claims
   VALIDE ou acter que la provenance doctrinale suffit (décision D-xxx).

## Contraintes et interdits

- Aucun claim, seuil ou appariement inventé (DC-01/02, DC-19/20) : tout
  vient du praticien-signataire ; l'absence de population déclarée est une
  restriction (DC-14).
- Les tables signées ne se modifient que par décision D-xxx + fragment.
- Cette campagne avance PAR SESSIONS COURTES en parallèle des autres — la
  cadence est celle du praticien, pas du dépôt.

## Dépendances

- Rien de technique ; le lot 1 gagne à suivre C2 (surfaces biologie
  consolidées) mais ne l'exige pas.
