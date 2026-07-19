---
id: "2026-07-19-sp-spi-ma-spirale-patient"
titre: "SP-SPI — « Ma spirale » et reprise patient"
statut: "cadrée"
créée_le: "2026-07-19"
mise_à_jour: "2026-07-19"
lot_courant: "LOT-01"
---

# SP-SPI — « Ma spirale » et reprise patient

## Objectif

Donner au patient un point d'arrivée qui **raconte son parcours** plutôt que de
lui présenter une liste de questionnaires : où il en est, ce qu'il a déjà fait,
ce qui vient ensuite. Et, lorsqu'il revient après une longue absence, une
**reprise en douceur** — « voici où vous vous étiez arrêté » — assortie d'un
**pack de réévaluation pré-composé qu'on lui propose, jamais qu'on lui assigne**.

## Frontières

**Possède** : l'accueil patient trajectoire (« Ma spirale »), l'écran de
reprise, et la proposition de pack de réévaluation.

**Consomme** : les composants patient déjà livrés en Vague 1
(`web/src/components/patient/ui/*`, `PatientJourneyProgress`,
`ReadingComfortControl`, `MonEquilibreAccueil.tsx`) ; l'identité durable
**IDP** ; les épisodes C2A. Le signal de reprise du Fil praticien réserve déjà
cette campagne (`web/src/lib/fil/cartes.ts:160-163`, « sans pack pré-composé …
arrive avec SP-SPI »).

**Ne possède pas** : l'authentification (**IDP**) ; la météo d'adhésion, qui
reste **praticien seul** (**SP-MET**) ; toute donnée réservée au praticien
(discordances, objets cliniques, momentum chiffré) ; l'assignation elle-même,
qui reste un geste praticien.

## Décisions actées

- **Zéro score chiffré côté patient**, aucune gamification, aucun pronostic
  nominatif, aucun classement — invariants 5.0 non négociables.
- **Construction, jamais dégradation** : le récit montre ce qui se construit ;
  il ne signale pas un recul comme un échec.
- Le statut n'est **jamais porté par la seule couleur**.
- Le pack de réévaluation est **proposé et refusable** : aucune auto-assignation,
  aucun envoi automatique.
- La reprise n'exerce **aucune pression** : pas de compte à rebours, pas de
  relance culpabilisante, pas de « vous avez manqué X jours ».
- Vocabulaire réglementaire verrouillé (« recommandation », « protocole
  personnalisé » ; jamais « prescription », « diagnostic », « NeuroScore »).

## Dépendances

**IDP** (identité patient durable) — sans elle, la reprise à plusieurs mois
repose sur un lien permanent, ce que la campagne refuse. C2A ✓.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-01 | Accueil « Ma spirale » + reprise en douceur + pack de réévaluation proposé (jamais assigné) | à_faire | IDP / LOT-01 |

## Définition de done

- Le patient voit son parcours sans qu'aucun chiffre de score n'apparaisse.
- La reprise propose, n'impose pas, et reste refusable sans conséquence.
- Accessibilité : contraste AA, cibles ≥ 44 px, focus visible, aucune fonction
  critique au seul survol.
- Vérifications : anti-secrets, type-check, lint, Vitest, E2E (`test:worktree`).
- Recette sur patients fictifs uniquement.
