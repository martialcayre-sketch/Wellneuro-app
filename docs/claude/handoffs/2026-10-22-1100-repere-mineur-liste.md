# Handoff — repère du mineur dans la liste des patients (D-342 §2)

## Branche et état Git

`lot/repere-mineur` (worktree `act5-mineurs`), main fusionnée après le merge
de #1638 (D-342, a9e93d5c) ; lot de code sans migration ni drapeau.

## Objectif

Prévenir le praticien d'un mineur en attente de l'accord parental, pour que la
prise de contact avec la famille ne dépende pas de l'ouverture de la fiche.

## Décisions prises

D-342 §2 (arbitrage du 2026-10-22) : repère dans la liste, 2B inchangé. Même
règle que le portail : dossier en suivi (`phaseDossier` = `en_suivi`, celle
d'`accepteNouvelEnvoi`) et `statutAge` = `mineur`. Badge `warning`, libellé
exporté (`LIBELLE_MINEUR_EN_ATTENTE`).

## Fichiers modifiés

`web/src/components/ui/PatientRow.tsx` (champ `dateNaissance` facultatif,
badge) ; `web/src/components/ui/PatientRow.test.tsx` (neuf cas) ; plan F45 ;
fragment `changelog.d/2026-10-22-repere-mineur-liste.md`.

## Validations exécutées

Banc `PatientRow.test.tsx` : 9 verts (mineur, veille et jour des 18 ans,
majeur, date manquante, illisible, non servie, clos, désactivé, passage de la
date par la liste). T1 complet vert ; T2 `--fast` vert (E2E 282 passés).

## Problèmes ouverts

Lot de la date au masquage (D-342 §3), prêt sur `lot/date-masquage`, à
mettre en PR après ce merge. Rubrique 4 : 15–17 ans, avec J3-mineurs.
`DeclarationsPatient.test.tsx` (BP-13, #1631) a rougi une fois sous charge
pendant un T2 de cette session, vert seul et au passage suivant : instable,
non instruit ici.

## Prochaine action exacte

CI, revue CodeRabbit de la tête, merge, déploiement constaté ; puis la PR de
la date au masquage.

## Interdits encore actifs

Aucune fenêtre, aucun seuil, aucune règle clinique changés ; aucune migration
ni `schema.prisma` sans accord ; fixtures neutres seulement ; production lue
par identifiant depuis un conteneur, agrégats seuls dans les fichiers
durables ; un merge à la fois, déploiement constaté.
