# Handoff — 2026-09-12 — Le rejeu d'un acte confirmé, et les deux rideaux

## Ce qu'il faut savoir avant tout le reste

**Quatre des sept épisodes `T0` confirmés en production n'étaient plus servis.**
Leur fiche affichait « Décision clinique non préparée » sur un acte signé et
intact en base. La carte de décision n'est pas stockée — elle est **rejouée** —
et le rejeu exigeait que le dossier n'ait pas bougé d'un octet. Deux causes
indépendantes : une passation de plus, et la chute de la borne haute de l'ancre
initiale ([[D-156]], déployée le 2026-09-08) qui a fait diverger **tous** les
épisodes signés avant elle.

C'est [[D-173]] qui ferme cela. La leçon est générale et vaut au-delà de ce
lot : **un acte signé ne se compare jamais à une dérivation qui a le droit de
changer.**

## État Git

Six PR fusionnées : **#1053** (rejeu, `D-173`), **#1054** (sorties de la phase 3
et assemblage redemandable), **#1056** (borne et rappel du second rideau),
**#1057** (la génération quitte sa route), **#1059** (déclencheur par rideau,
`D-174`). Rien en cours.

## État de la production — trois drapeaux neufs, tous ÉTEINTS

| drapeau | ce qu'il ouvre |
|---|---|
| `WN_RELANCE_QUESTIONNAIRE` | le rappel patient d'un questionnaire en retard |
| `WN_ECHEANCE_OBLIGATOIRE` | refuse une assignation sans échéance sur un dossier déjà synthétisé |
| `WN_SYNTHESE_PAR_RIDEAU` | la génération automatique d'un brouillon à la fermeture d'un rideau |

**Aucun n'est posé**, et leur allumage se demande — séparément : le premier
ajoute un courrier, le deuxième arrête un geste du praticien, le troisième fait
produire une machine sans qu'aucun humain l'ait demandé.

## Ce qui reste à faire

1. **Allumer, ou non.** Les trois drapeaux, un par un. `WN_SYNTHESE_PAR_RIDEAU`
   demande en plus la mise à jour du **registre des traitements** : passer d'un
   traitement déclenché par le praticien à un traitement automatique change la
   description de la finalité, même si aucune décision automatisée n'atteint le
   patient (art. 22 non applicable — un humain valide).
2. **Le dossier `PAT006` reste bloqué à la confirmation**, et pas à cause du
   rejeu : `synthese_validee` échoue (la dernière synthèse validée du 29/08
   précède une passation du rideau du 12/09) et `second_rideau` échoue
   (`Q_ALI_09`, assignée le 05/08, est toujours *En attente*). Geste praticien :
   annuler `Q_ALI_09` ou la faire rendre, puis générer et valider une synthèse
   neuve.
3. **Le goulot n'est pas la génération, c'est l'envoi.** Lecture par conteneur
   du 2026-09-12 : 44 synthèses validées, **24 envoyées**, **0 renvoi**. Vingt
   synthèses validées n'ont jamais atteint leur patient. Une carte « synthèse
   validée, patient jamais servi » attraperait ce trou — elle n'existe pas.

## Ce qui a été mesuré, et qui vaut d'être conservé

- **Next.js refuse tout export de valeur depuis un `route.ts`** (build rouge,
  sonde posée puis retirée). C'est ce qui a imposé le déménagement de la chaîne
  de génération, pas une préférence de style.
- **Coût d'une génération** : 11 761 tokens d'entrée, 5 055 de sortie en moyenne
  sur 42 générations — l'ordre du dixième de dollar. Le coût n'a jamais été
  l'argument.
- **12 dossiers sur 19 seulement ont le rideau `T0` complet** : sept ne
  déclencheront jamais rien, et c'est pourquoi la carte du Fil reste.
