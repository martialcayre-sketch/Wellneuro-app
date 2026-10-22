# Handoff — rubrique 4 des mineurs, version provisoire (D-344)

## Branche et état Git

`lot/rubrique4-mineurs` (worktree `act5-mineurs`), main fusionnée après #1642
(D-343) ; conflit de `DECISIONS.md` résolu en gardant les deux décisions
(D-344 au-dessus). PR de documents seuls.

## Objectif

Écrire les trois arbitrages du 2026-10-22 rendus sur l'avis préparatoire
(Codex) relatif aux mineurs de 15 à 17 ans, et consulter l'avocat.

## Décisions prises

D-344 : texte 2B gardé jusqu'à l'avis (§2) ; rubrique 4 réécrite sur l'avis,
relue, resserrée et corrigée sur trois faits (2B servi, droits du jeune déjà
ouverts au portail, notice existante mais adulte) ; « un seul titulaire
suffit » et « aucun secret opposable » suspendus (§3) ; trois demandeurs à
l'étape 7 (§4) ; avocat consulté maintenant (§5). Second avis intégré (§6) :
architecture hybride (accord parental = admission, consentement du jeune dès
15 ans), proportionnalité des seuils d'âge (loi de 2008), retrait du jeune
jamais retardé, transition dès 15 ans ; note réduite à six questions plus les
faits du contrat. Constat au code : le mineur s'arrête à la pause avant
l'étape du consentement.

## Fichiers modifiés

`docs/DECISIONS.md` (D-344) ; `docs/DOSSIER_RGPD.md` (rubrique 4 version
provisoire, historique conservé ; rubrique 9 étape 7 ; tableau des trous) ;
`docs/claude/PLAN_WELLNEURO.md` (F45, H79) ; fragment.

## Validations exécutées

`decisions-check` : 344 décisions sans trou ; T1 complet et T2 `--fast` avant
commit.

## Problèmes ouverts

Réponse de l'avocat (note d'une page, dix questions, hors dépôt) ; puis
texte 2B, formules suspendues, âge plancher, transition à 18 ans, notice
adaptée, AIPD avant le premier mineur.

## Prochaine action exacte

CI, revue CodeRabbit de la tête, merge, déploiement constaté ; envoi de la
note par le responsable.

## Interdits encore actifs

Aucune fenêtre, aucun seuil, aucune règle clinique changés ; aucune migration
ni `schema.prisma` sans accord ; fixtures neutres seulement ; production lue
par identifiant depuis un conteneur, agrégats seuls dans les fichiers
durables ; un merge à la fois, déploiement constaté.
