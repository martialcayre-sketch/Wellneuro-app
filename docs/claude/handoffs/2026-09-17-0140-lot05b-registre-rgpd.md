# Handoff — 2026-09-17 — LOT-05b : la correspondance entre au registre RGPD

Conformité documentaire et correction d'un texte patient faux. Décision [[D-222]].
Clôt le LOT-05, ouvert par [[D-219]].

## Branche et état Git

`correspondance-lot05b-rgpd`, branchée sur `origin/main` (`4eb69bdb`, tête après le
merge de [[D-219]]). Aucune migration, aucun drapeau. **Un seul fichier de code**, et
c'est une chaîne de texte : `MesChoix.tsx`.

## Objectif, et pourquoi il existe

[[D-219]] §3 pose que le choix `partage_medecin_traitant` est **exposé au praticien,
jamais opposé à lui**. Deux documents disaient l'inverse : la rubrique 6 du
`DOSSIER_RGPD` (« aucun partage à un tiers sans choix explicite ») et le centre
TRUST du portail (« le partage effectif de documents **arrivera dans une prochaine
version** » — faux depuis le 2026-07-22). Le second est celui que le **patient lit
avant de consentir**.

## Décisions prises

- **Ce qui s'écrit à la place d'une garde qui n'existe pas** : l'application n'envoie
  rien, le document part par les canaux du praticien, le garde-fou est
  **déontologique**. C'est la seule formulation qui survive à une lecture du code.
- **La correspondance médecin entre au registre comme traitement** — finalité,
  données, destinataire tiers, durée. La **qualification juridique appartient au
  responsable** ; ce qui est écrit est le fait. Même régime que le médecin traitant
  à la rubrique 5.
- **La messagerie de santé est un périmètre fermé**, pas un lot repoussé : aucun
  canal sortant, un sous-traitant de plus sur des données de santé, une identité
  médecin non authentifiée ([[D-219]] §1, option C).

## Fichiers modifiés

- `docs/DOSSIER_RGPD.md` — rubrique 6 : le destinataire tiers, le traitement, et la
  réserve.
- `web/src/components/patient/trust/MesChoix.tsx` — la finalité `partage_medecin_traitant`.
- `docs/DECISIONS.md` — [[D-222]].
- `docs/claude/campagnes/FILE_ATTENTE.md` — deux entrées : la messagerie fermée, et
  la réserve du registre TRUST.
- `changelog.d/2026-09-17-correspondance-au-registre-rgpd.md`.

## Validations exécutées

T1 vert. T2 joué — le diff touche une surface patient, et une suite Vitest verte ne
prouve rien sur un parcours. Aucun banc n'épinglait l'ancien texte : le grep sur
`web/e2e` et les bancs de composant ne rend rien.

## Problèmes ouverts

**Les huit versions publiées** de `donnees_confidentialite` portent la même promesse
que la rubrique 6 portait — « aucun partage avec un tiers … sans un choix explicite
de votre part », écrite quatre fois et reprise par composition dans les quatre
autres — et l'effet du refus annoncé dans « Mes choix » dit « aucun document ne sera
partagé ». Le logiciel ne garantit ni l'un ni l'autre. **Nommé au registre et en
file d'attente, non touché** : la ligne tenue est qu'on corrige un **fait faux sur
l'état du produit**, on ne dégrade pas une **promesse faite au patient**.

**Un trou de traçabilité se voit au passage**, et il est antérieur : la formulation
des finalités de cet écran n'est couverte par **aucune version** — l'événement de
choix n'enregistre que celle du document `droits_patient`. Deux consentements donnés
sur deux formulations différentes sont indiscernables. Un banc de composant
verrouille au moins la formulation servie ; le versionner est en file d'attente.

**`.wn/state.json` n'a pas été modifié** — motif écrit au handoff de LOT-05a.

## Prochaine action

`LOT-06` — la mesure, en parallèle et non bloquante. Elle se lit sur la production
par conteneur `scalingo run -d`, en agrégats, et le classifieur de sécurité a déjà
refusé ce geste en session autonome : à faire par le responsable, ou en session
attelée.

## Interdits encore actifs

Inchangés, plus celui posé au LOT-05a : **ne pas réécrire une version publiée du
registre TRUST patient** sans arbitrage explicite du responsable. Et toujours :
aucun canal sortant réel, aucune pièce jointe ([[D-122]]), aucune messagerie de
santé — ce dernier point est désormais **écrit**, pas seulement pratiqué.
