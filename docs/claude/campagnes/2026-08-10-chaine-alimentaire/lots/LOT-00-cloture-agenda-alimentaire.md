---
id: "LOT-00"
statut: "à faire"
---

# LOT-00 — Clôture technique de l'agenda alimentaire (D-039)

## Objet

Créer `web/src/lib/agenda-alimentaire/cloture.ts`, calqué pièce par pièce sur
`web/src/lib/agenda-sommeil/cloture.ts:20-100` : agrégats du recueil →
`rawAnswers` (pseudo-items) → `QuestionnaireReponse` **standard** pour
`Q_ALI_09`, `scored:false`, idempotente sous verrou de ligne. La compatibilité
fiche / inbox / mini-synthèse est automatique par la forme standard de la
réponse — c'est le maillon qui rend l'agenda visible du dossier.

## Décision qui borne le lot

**D-039** : transmission de **tous les agrégats calculés**
(`AgregatsAgendaAli`, `agregats.ts:27-64`), avec leurs dénominateurs de
couverture. Sans poids, sans seuil, sans sélection. `Q_ALI_09` garde
`scoring:{type:'journal'}` (`scored:false`) — la clôture ne score rien.

## Preuves attendues

- Banc de clôture : agrégats → pseudo-items, bijection avec la liste du
  domaine **dérivée, jamais recopiée** (une clé d'agrégat ajoutée au domaine
  sans pseudo-item ne compile pas ou rougit).
- Idempotence : deux clôtures du même recueil ne créent qu'une réponse.
- Vrai dans les deux positions de `WN_AGENDA_ALI` (D-033).
- T2 avant commit (la fiche affiche une passation de plus).

## Hors périmètre

Aucun barème, aucun indice, aucune migration (la table des réponses existe).
La restitution en synthèse IA au-delà de la forme standard = LOT-01+.
