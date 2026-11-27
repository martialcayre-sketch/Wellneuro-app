# Handoff — 2026-11-27 — Inventaire des instruments des 12 besoins (lot besoins-inventaire-instruments, file D)

## Branche et état Git

- Branche `claude/clever-mayer-q95dmp`, à `origin/main` (`7751caad`) au départ.
- Un commit de documentation, poussé ; PR ouverte par la passe de
  l'orchestrateur cloud (journal `20261127-2309-orch`).

## Objectif

Écrire `docs/claude/besoins/INSTRUMENTS_12_BESOINS.md` : (1) tableau par
besoin des instruments servis, visés par le guide, écarts, niveaux de
preuve, psychométrie, seuils, droits et statut ; (2) instruments sortis du
calcul et repères hors score, avec leurs étapes ouvertes ; (3) instruments
nommés et non servis, chacun avec sa décision ou « aucune ». Troisième des
six lots inscrits sur la réponse à `20261127-2046-b`.

## Décisions prises

- « Instrument visé par le guide » = les « Variables d'entrée » de la
  section du guide sur `origin/main`, pas d'une version antérieure ; les
  versions antérieures ne servent qu'à la partie 3 (EVA de bien-être,
  questionnaire Mélatonine, guide avant `97e0d72`).
- Le tableau de la partie 1 est coupé en deux (mesure ; psychométrie,
  seuils, droits) pour rester lisible ; une ligne par instrument servi.
- Références abrégées `C:`, `IR:`, `ME:`, `G:` définies en tête du document.
- TFI et NAP : aucune décision ne les nomme ; leurs seules occurrences au
  dépôt sont citées (deux documents de travail pour TFI, lu sur `Q_GAS_01` ;
  un fragment du journal H15 pour NAP). Aucun rapprochement conjecturé.
- Les seuils ne sont jamais recopiés : seul leur sort (retiré, non évalué,
  lecture du cabinet, deux lectures) est rapporté avec sa décision.

## Fichiers modifiés

- `docs/claude/besoins/INSTRUMENTS_12_BESOINS.md` (nouveau)
- `changelog.d/2026-11-27-besoins-inventaire-instruments.md` (nouveau)
- ce handoff

## Validations exécutées

- Numéros de ligne de `constants.ts` et du registre des instruments relevés
  par `grep -n` et relus sur les lignes citées.
- `npm run check:rapide` et `npm run check` : codes de sortie rapportés dans
  le commentaire de la PR.
- Pas de T2 ni de T3 (passe cloud, `D-540`).

## Problèmes ouverts

- Le besoin 2 garde dans le guide la règle de décision d'origine, avec un
  seuil biologique (`G:64-66`) : déjà relevé « sans suite » par
  `RECONCILIATION_AUDIT_12_BESOINS.md` (R-02), non traité ici.
- Aucune ligne G-10 pour la PSS-10, l'Epworth, la fatigue générale du MFI-20
  ni `RELATION_AUX_AUTRES` (besoin 12) : le complément est dû par `D-402`
  après J3-12f ; aucun lot inscrit trouvé.
- Le registre des instruments date son audit du 2026-09-14 ; ses champs
  `cosmin` et `droits` sont rapportés sans vérification à la source.

## Prochaine action exacte

Intégrateur : servir la PR après « prête @<sha> » (documentation seule, P2).
File D : les lots suivants de la réconciliation, quand le carnet les sert.

## Interdits encore actifs

- Aucune décision, aucun code, ni guide ni registres touchés par ce lot ou
  ses suites sans lot propre.
- Aucune identité réelle, aucun compte de production au dépôt.
- La passe cloud ne merge pas, ne répond à aucune question, ne prend pas de
  second lot.
