# Handoff — 2026-11-01 — File D, séance de gestes du responsable n° 1 : gestes courts

## Branche et état Git

`docs/file-d-gestes-courts-s1`, worktree `.claude/worktrees/file-d1-suite`,
partie de `origin/main` 969662cf (#1797). Documentation seule : aucun code,
aucune migration, aucun drapeau. PR ouverte avec ce handoff.

## Objectif

Six lignes de la file D, une à la fois : la session prépare le geste, le
responsable le fait (ou le délègue en lecture), la session consigne. Lignes
k09, D/18, D/14, D/28, D/30 et k11 de la page de suivi.

## Décisions prises

- k09 (D.2) : case « Autofix » disparue des synthèses CodeRabbit depuis #1784 ;
  aucun geste daté n'est consigné.
- D/18 : constaté conforme par le responsable ; libellé « autorisation de
  Copilot » corrigé (D-290).
- D/14 : deux lignes reportées à la feuille privée le 2026-10-31 ; la
  troisième y était déjà absorbée (J1-base, H43).
- D/28 : constat à l'écran fait par la session, dans la session du praticien,
  sans clic, sur les dossiers relus par conteneur ; conforme.
- D/30 : arbitrage du responsable « empilée, la ligne de liens » : E11 close
  sur les blocs, lot d'écran ouvert au §8 (file A).
- k11 : arbitrage du responsable du 2026-11-01 « attendre, ne pas valider ».
  Valider une version neuve envoie l'e-mail « protocole diffusé » (D-317 §2),
  sans option pour s'en passer ; le programme est à compléter. Écartés : un
  lot « valider sans annoncer » (amenderait D-317 §2), et couper
  `WN_ANNONCE_PROTOCOLE` le temps des clics (fenêtre sans annonce pour tous
  les dossiers, « document remis » toujours envoyé). La session n'a pas fait
  la rediffusion à la place du praticien : c'est son attestation clinique.

## Fichiers modifiés

- `docs/claude/PLAN_WELLNEURO.md` : ligne « Autofix » de D.2 ; D/14, D/18,
  D/28, D/30 de D.4 ; une ligne neuve à la fin du §8 « Dettes techniques
  vivantes » (accueil du portail, file A).
- Neufs : `docs/claude/plan-journal/F66/2026-11-01-01-rediffusions-retenues.md`,
  ce handoff.

## Validations exécutées

- Lectures de production par conteneur `scalingo run -d`, en
  `BEGIN TRANSACTION READ ONLY … ROLLBACK` : ancres et priorités (D/28),
  approbations de diffusion, signalements et avis, versions et
  correspondances (k11). Aucun identifiant ni aucune mesure par dossier versés.
- Lecture des synthèses CodeRabbit de #1541 à #1791 (k09).
- Lectures à l'écran par le navigateur, sans clic d'action : cockpit (D/28),
  accueil du portail d'un dossier de test (D/30).
- T1 et revue : voir la PR.

## Problèmes ouverts

- k11 : deux programmes restent « indisponibles » au portail ; une version
  neuve enregistrée sur l'un des deux, non validée. Sortie : décision du
  responsable (compléter puis valider avec l'annonce, ou demander le lot
  « valider sans annoncer »).
- Lot file A de l'accueil du portail (§8) : à cadrer.

## Prochaine action exacte

Séance de gestes n° 4 (sources et signatures cliniques), dans l'ordre
proposé par le responsable. Pour k11 : relire par conteneur les approbations
des deux dossiers quand le responsable dit « fait ».

## Interdits encore actifs

- Aucune écriture en production par la session ; aucune rediffusion ni
  validation pour diffusion à la place du praticien.
- Aucun identifiant de dossier accompagné de mesures dans le dépôt ; aucune
  identité réelle.
- Aucune D-xxx sans arbitrage du responsable.
