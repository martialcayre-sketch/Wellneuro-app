---
id: "2026-08-21-socle-restitution-sure"
titre: "Socle de restitution sûre — la garde avant le récit"
statut: "terminée (2026-08-22 — les trois lots livrés le jour de l'ouverture ; le gate des campagnes 6.0 est posé : carte des chemins prouvée, clinique au niveau demande, gabarits au registre — les validations valideLe et les arbitrages de régimes restent au responsable)"
créée_le: "2026-08-21"
mise_à_jour: "2026-08-22"
lot_courant: "aucun"
branche_campagne: "aucune"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Socle de restitution sûre — la garde avant le récit

## Objectif

Toute campagne d'alliance thérapeutique à venir (6.0-A à 6.0-D) produira du
texte adressé au patient — booklet, portail, courriers, messages.
L'architecture cible (§8 de l'audit du 2026-08-21) pose trois verrous
transverses qui conditionnent ce texte AVANT qu'il n'existe : une garde de
vocabulaire dont la couverture est un **contrat prouvé**, des tables cliniques
protégées à l'écriture, un registre de gabarits de messages versionné et signé
(`DC-26`). Cette campagne pose ces trois verrous. Elle ne produit aucun
récit : elle rend le récit possible sans qu'il puisse franchir la frontière
diagnostique (`DC-27`, `DC-31`, `DC-32`).

## Résultat observable

1. Chaque chemin sortant de texte clinique est couvert par un banc qui
   **rougit quand sa garde est débranchée** — y compris le service du bilan au
   portail, aujourd'hui servi sans re-vérification.
2. Modifier une ligne d'une table clinique signée (ou d'une constante
   clinique) déclenche le verdict « demande » du hook — la confirmation
   `DC-17`/`DC-18` est matérialisée, plus jamais silencieuse.
3. Les gabarits de messages patient vivent dans un registre versionné,
   hash-verrouillé et gardé par test, au patron du registre trust — et l'écart
   de chaque gabarit à « aucune donnée de santé dans un email » est **déclaré**,
   plus jamais implicite.

## État réel au cadrage — 2026-08-22

Le brief (2026-08-21) a été vérifié constat par constat contre le dépôt
(workflow de mesure, citations `fichier:ligne`). **Cinq corrections
substantielles** — le cadrage ci-dessous est écrit sur les mesures, pas sur le
brief :

| Le brief disait | Mesuré le 2026-08-22 |
|---|---|
| « Le booklet HTML, le courrier médecin et le bilan du portail sortent sans passer par la garde » | **Faux pour deux des trois.** Le booklet passe par `termeAnxiogene` avec refus confirmable (`booklet/route.ts:238`, depuis le 2026-07-25) ; le courrier médecin biologie passe par `assertRenduMedecinNonPrescriptif` au chokepoint `rendu.ts:78` (`courrier.ts:159`) ; `correspondance-medecin` n'émet aucun texte applicatif (consignation praticien). **Les dettes réelles** : `verifierRestitutionOrientation` n'a qu'un point d'appel (`synthese/route.ts:560`) et il est **journalisant** (`logger.warn`, jamais bloquant) ; le bilan portail sert le dernier envoi sans re-vérification (`api/portail/bilan/route.ts`) ; aucune carte ne prouve quelle garde couvre quel chemin. |
| « Tables cliniques signées : `orientationRulesV1`, `stopRulesV1`, `priorityRulesV1`, `equilibre/constants`, `questions.ts` » | Trois signées (`validationExterne: true` — `orientationRulesV1:1450`, `stopRulesV1:238`, `priorityRulesV1:371`), **deux omises** (`contradictionsV1:212`, `indicationsBiologieV1:537`), une **sixième signée pendant l'ouverture même** (`corpusSyntheseV1:65`, `D-082`, PR #734 du 2026-08-22 ; ancrée `shaPerimetre` le même jour, `D-084`), et `equilibre/constants.ts` + `questions.ts` ne portent **aucune** signature — constantes cliniques sous décisions `D-014`/`D-055`/`D-060`. Le hook n'a aujourd'hui que `prisma/` en « demande » (`protect-wellneuro-files.mjs:49-53`) : le constat central tient. |
| « La correction d'en-tête d'`orientationRulesV1` est déjà actée (DECISIONS.md:2832) » | **Non.** `D-042` (aujourd'hui `DECISIONS.md:2876`) acte un *banc de fraîcheur* en compensation — aucune décision n'ordonne la réécriture de l'en-tête, toujours mensonger (`orientationRulesV1.ts:11-12`, pipeline `tools/corpus/orientation/` inexistant, audit doctrine §E). Et la corriger est un **geste clinique** : le sha épinglé (`SHA_SIGNE`, discipline `D-018`) rougit sur un diff de commentaire. |
| « Patron trust : versions hash-verrouillées, chaîne append-only, deux dates » | Hash-verrouillage et immutabilité prouvés (`registre.ts:7-11`, garde `registre.test.ts`), **mais** une seule date en donnée (`publieLe` — la validation n'existe qu'en commentaire) et **aucun chaînage cryptographique** (append-only par convention + test de liste figée). Le patron a servi une 2ᵉ fois le 2026-08-22 (`DONNEES_CONFIDENTIALITE_V2`) : mécanisme prouvé en usage. |
| « Les gabarits de messages patient sont des modules ad hoc, un par usage » | **8 gabarits patient** inventoriés, dont 5 **inline dans des handlers de route** (pas des modules) ; « aucune donnée de santé » n'est tenu que par le banc de `relanceEmail` — quatre gabarits embarquent le titre d'instrument, deux une note libre praticien. `trust/notification.ts` vise le praticien : hors périmètre patient. Aucun registre existant : pas de doublon à craindre. |

## Les lots

| Lot | Titre | Statut | Dépend de |
|---|---|---|---|
| LOT-01 | La couverture des chemins sortants devient un contrat prouvé | terminé (2026-08-22 — 4 gardes prouvées par mutation, bilan re-vérifié au service, arbitrage des régimes instruit) | — |
| LOT-02 | Les tables cliniques s'écrivent au niveau « demande » — et l'en-tête cesse de mentir | terminé (2026-08-22 — 8 fichiers, banc neuf, revue adversariale ACCEPTER, D-083) | — |
| LOT-03 | Le registre de gabarits de messages patient (`DC-26`) | terminé (2026-08-22 — 8 gabarits versionnés et hashés, fidélité prouvée par bancs inchangés) | LOT-01 ou LOT-02 (l'un des deux livré) |

## Gates

Aucun en entrée. **Cette campagne EST le gate des suivantes** : aucune
campagne d'alliance n'ouvre un chemin de texte patient avant que les trois
verrous tiennent.

## Invariants de campagne

- Les hooks de sécurité ne s'affaiblissent jamais : ajouter au niveau
  « demande » n'abaisse aucun verdict existant, ne retire aucun motif ; toute
  modification de `protect-wellneuro-files.mjs` passe une relecture
  adversariale avant merge (`.claude/rules/hooks-garde-fous.md`) et repasse
  son banc (`node --test .claude/hooks/*.test.mjs`).
- Toute modification d'un fichier clinique = décision `D-xxx` + fragment
  `changelog.d/` (`DC-17`, `DC-18`) — y compris un diff de commentaire dans un
  fichier au sha épinglé.
- Aucun verdict de garde existant ne change (journalisant → bloquant,
  confirmable → refus dur) sans décision explicite du responsable.
- Une garde qui passerait au vert en permanence sans sujet ne se pose pas :
  chaque banc du LOT-01 doit rougir quand la garde est débranchée.
- Identités de fixture uniquement (Sophie Nicola, Jennifer Martin, Michel
  Dogné) ; aucune donnée patient réelle dans bancs et exemples.
- Aucune migration Prisma pressentie ; si un lot en découvre le besoin, il
  s'arrête et le nomme.

## Hors périmètre

- Aucun récit, aucun écran, aucun contenu patient nouveau — c'est l'objet des
  campagnes 6.0, gâtées par celle-ci.
- La correction du **contenu** des gabarits existants (titres d'instrument
  dans les emails, notes libres) : l'écart se déclare au registre, sa
  correction est une décision praticien hors campagne.
- La fusion des deux modules `vocabulaire` (`documents/` et
  `supplement-library/`) : deux objets sans rapport, nommés pour lever
  l'ambiguïté, pas pour les fondre.
