---
id: "LOT-00"
statut: "livré (2026-08-10)"
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

## Preuves livrées (2026-08-10)

- **Banc de clôture 14/14 + route 6/6** (`cloture.test.ts`,
  `api/praticien/agenda-alimentaire/cloture/route.test.ts`). La liste D-039
  est **écrite à la main dans le banc** (23 pseudo-items `AGA_*`) et confrontée
  aux clés réellement transmises — la production, elle, dérive la liste de
  l'objet calculé : une clé ajoutée ou renommée au domaine rougit le banc.
- **Mutation jouée** : une curation silencieuse (`jeuneMedian` écarté de la
  transmission) rend **3 rouges** ; témoin 14/14 vert après restauration.
- Idempotence et concurrence prouvées (verrou de ligne, aucun doublon) ;
  refus nommés : annulée, mauvais instrument, recueil vide, **quarantaine**
  (les lignes illisibles bloquent la clôture en nommant leurs dates —
  fail-closed absent du jumeau sommeil, imposé par le modèle de quarantaine du
  domaine).
- **Aucune garde de drapeau sur la route praticien, et c'est écrit** : même
  arbitrage que le lecteur LOT-05 (le drapeau gouverne la collecte, jamais la
  consolidation d'un recueil existant) — D-033 tenue, chemin identique dans
  les deux positions.
- T1 vert ; Vitest complet **4 253 verts** dans les deux positions du drapeau
  (`WN_ALI_01_SIIN57`). E2E injouables dans le conteneur distant — la preuve
  du palier est le job `verify` de la PR du lot.

## Hors périmètre — livré tel quel, résidus nommés

Aucun barème, aucun indice, aucune migration (la table des réponses existe).
La restitution en synthèse IA au-delà de la forme standard = LOT-01+.
**Résidus** : le bouton « Clôturer » du lecteur praticien (l'API existe, le
geste UI et son E2E restent à poser) ; la clôture automatique côté portail à
la fin des 21 jours (le jumeau sommeil l'a — décision d'activation à part,
le recueil étant piloté).
