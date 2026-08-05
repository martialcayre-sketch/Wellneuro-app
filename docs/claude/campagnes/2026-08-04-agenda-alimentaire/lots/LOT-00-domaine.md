---
id: "LOT-00"
titre: "Domaine pur du recueil 21 jours (Q_ALI_09)"
statut: "livré"
dépend_de: "—"
---

# LOT-00 — Domaine pur du recueil 21 jours (Q_ALI_09)

Anciennement « L1 » dans la série agenda alimentaire (PR #481).

Statut : livré. Domaine pur — aucun import Prisma, aucune route, aucune
surface, aucun branchement au score. Rien de ce lot n'est atteignable par un
utilisateur : délibéré, pour que le reste soit vérifiable pièce par pièce.

## Livré

- `web/src/lib/agenda-alimentaire/` : contrat de recueil, validation d'une
  journée, fenêtre de 21 emplacements, agrégats.
- Transposition du patron `agenda-sommeil/` : fenêtre ancrée sur le **premier
  jour saisi** (pas la date d'assignation), correction par **chaînage** jamais
  par écrasement, emplacement vide = trou visible.
- Écarts volontaires par rapport au sommeil : ancre de journée à 04:00 (une
  prise à 00:30 appartient à la veille) ; saisie bornée à aujourd'hui et la
  veille (un rappel au-delà de 24 h est une reconstruction de mémoire) ; jeûne
  nocturne compté en **paires** de jours consécutifs, jamais en jours bruts.
- Ce que le domaine mesure : heures réelles des prises (pas de 15 min),
  structuration repas/hors-repas, présence de trois catégories du besoin 1.
  Ce qu'il refuse : quantité, kcal, gramme, aliment identifié au-delà de ces
  présences.

## Constats majeurs

- Sous sept jours, `calculerAgregatsAli` rend `null` et jamais un objet de
  zéros — chaque grandeur porte sa propre couverture.
- Une passe `wn-reviewer` a rendu un GO conditionnel sur le commit initial :
  sept constats corrigés, dont trois qui auraient été lus comme des mesures
  par le lot suivant (fenêtre hors bornes n'excluant plus la journée entière,
  borne haute du jeûne nocturne à 24 h, `couvertureSuffisante` exigeant des
  journées porteuses de prises, dénominateur explicite de la fenêtre
  alimentaire, tri en lecture vs contrôle strict en écriture, trois gardes
  manquantes dans `resolveJoursActifs`, validation des arguments de
  `estDateSaisissable`).
- La borne des 18 h (soir plus copieux) reste une décision clinique non tranchée
  ici.

## Tests et validations

- 57 tests initiaux, portés à 72 après la revue adversariale.
- Mutations vérifiées : `null` → `0` sur les fréquences fait tomber deux
  tests ; appariement des jeûnes par position (au lieu de la date) en fait
  tomber un ; `moyenneOuNull`/`medianeOuNull` remis à `0`, et le ET des trois
  présences inversé en OU, tuent chacun un test.
