---
id: "LOT-01"
statut: "à faire"
dépend_de: "— (gaté par confirmation explicite de la migration)"
---

# LOT-01 — La migration du dossier à deux voix (CONFIRMATION OBLIGATOIRE)

## But

À la fin de ce lot, les tables qui portent les objets de l'alliance existent
en base, releasées et vérifiées — et rien d'autre : **aucun code applicatif ne
les lit encore**. La migration est seule dans sa PR ; `release-db` passe entre
elle et tout code qui en dépend (LOT-02, LOT-03, LOT-04).

## Périmètre pressenti (à confirmer au moment du schéma)

Trois familles d'objets, toutes **append-only par référence** et à **deux
dates** (événement ≠ enregistrement) :

1. **Objectif négocié** — énoncé patient, reformulation praticien, priorité
   clinique, « non traité pour l'instant » daté et motivé ; chaque révision
   est une nouvelle entrée qui référence la précédente ; état de ratification
   patient (jamais un score).
2. **« Ce qui compte pour moi aujourd'hui »** — entrées libres patient,
   horodatées (saisie ≠ enregistrement), conservées, jamais agrégées.
3. **Synthèse de compréhension + désaccord** — versions de synthèse
   praticien ; objets désaccord structurés, chacun référençant la version de
   synthèse qu'il conteste ; un désaccord ne se supprime ni ne se moyenne
   (`DC-30`).

**Pas de table EVA** : le cadrage a mesuré que `CabinetInstrument`
(`web/prisma/schema.prisma:1450`) porte déjà le cycle
`brouillon → grille_a_relire → valide` — le LOT-05 tranche sa voie sans
dépendre de ce lot. S'il découvre un besoin de schéma propre, il s'arrête et
le nomme.

## Fichiers probables

- `web/prisma/schema.prisma` (modèles neufs uniquement — aucun modèle
  existant modifié).
- `web/prisma/migrations/` (migration générée, relue ligne à ligne).
- Politique RLS de chaque table neuve dans la même migration (précédent
  biologie : plus aucune table de `public` sans RLS).

## Interdits

- **Ne pas écrire la migration avant la confirmation explicite** dans la
  conversation (règle CLAUDE.md + gate de campagne).
- Aucun champ de score, de seuil ou de bande dans ces tables — l'interdit de
  forme se prouve au LOT-02/04 par garde structurelle, mais il se **conçoit**
  ici.
- Aucune modification d'un modèle existant (`anamnese Json?` reste tel quel).
- Jamais `prisma format` (réaligne tout le schéma).
- Aucun code applicatif, aucune route, aucun écran dans ce lot.
- Aucun SQL destructif.

## Dépendances

Aucune en amont. En aval : LOT-02, LOT-03 et LOT-04 ne démarrent qu'après
`release-db` exécutée et l'état vérifié en production (lecture MCP
`execute_sql`).

## Étapes

1. Proposer le schéma (modèles, index, RLS, deux dates, références
   append-only) — **s'arrêter et demander la confirmation**.
2. Après confirmation : migration seule dans sa branche/PR, T3 local.
3. `release-db` ; vérifier les tables en production par lecture MCP.
4. Fragment `changelog.d/` ; statut du lot mis à jour.

## Tests

- T3 avant la PR (contrats SQL de `prisma/checks` compris).
- Vérification post-release en production : tables présentes, RLS active,
  zéro ligne.

## Critères de done

- [ ] Confirmation explicite obtenue avant toute écriture de migration.
- [ ] Migration seule dans sa PR, releasée, vérifiée en MCP (RLS comprise).
- [ ] Aucun champ de score/seuil dans les tables ; deux dates partout ;
      références append-only en place.
- [ ] Aucun code applicatif embarqué ; fragment `changelog.d/` écrit.
