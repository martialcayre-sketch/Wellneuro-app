---
id: "LOT-28"
titre: "BP-12b — Positions d'expert signées ; arbitrage de conflit persisté"
statut: "en_cours (2026-11-04) — arbitrages rendus le 2026-11-04 ; D-439 proposée"
dépend_de: "LOT-12"
---

# LOT-28 (BP-12b) — Positions d'expert signées ; arbitrage de conflit persisté

> **Fiche proposée le 2026-11-04.** Les arbitrages du responsable sont
> rendus le même jour et consignés par D-439. Dépôt public : cette fiche ne
> porte aucune identité, aucun texte de position, aucune valeur.

## But

Donner un objet aux positions d'expert que le responsable signe dans ses
dossiers de preuve, au contrat de D-266 §8, et persister ce qu'il décide
d'un conflit de sources déclaré, pour une question. BP-17 (F11) lira les
deux.

## Résultat observable

Après le lot, drapeau allumé : à l'atelier, le responsable enregistre une
position (identifiant `WN-PE-NNNN@vN.M`, claims d'appui, population,
contenu), la signe par un acte daté, la révise ou la retire ; il arbitre un
conflit déclaré pour une fiche d'usage, ou révoque cet arbitrage. Au
cockpit, un conflit déclaré reste affiché avec son escalade, et son
arbitrage daté se lit à côté. Drapeau éteint, rien ne change.
`conflitsSourcesV1` est re-signé avec les conflits des dossiers clos.

## Socle établi (ne se rediscute pas)

- **Rang et contrat de la position** : D-266 §8 (`DC-06` amendée).
- **`DC-54` et `DC-55` actées** (D-103, D-104), avec leurs deux limites
  signées : l'escalade s'arrête au cockpit ; tout conflit déclaré escalade.
- **Aucun texte clinique au dépôt** (D-251 §4) ; texte en base, validé par
  acte daté (D-251 §5).
- **Une migration, deux PR** (D-266 §11), précédées de cette décision ;
  release-db une à la fois (D-248), approuvée par le responsable.
- **Aucune valeur sans déclaration du responsable** (D-195).

## Ce que le code fait aujourd'hui (lu le 2026-11-04)

- **Conflits** : `web/src/lib/clinical/conflitsSourcesV1.ts` déclare un
  conflit publié (`CS-BIO-01`) et deux écartés (`CS-MAG-01`, `CS-MAG-02`),
  signé le 2026-08-24 ; `conflitsSourcesEngine.ts` n'émet un constat que si
  un claim du conflit est épinglé par une règle qui a produit une sortie
  pour le dossier ; `politiqueResolutionConflit.ts` ne compare aucun axe et
  rend toujours `escaladee_praticien`.
- **Fiches d'usage** : `web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts`,
  trente-huit fiches, une par position signée des dossiers clos, ses claims
  ceux que la position cite ; aucun champ ne désigne la position.
  `FicheUsageVersion` et `FicheUsageActe` portent le texte et ses actes ;
  la garde `peutDeciderFichesUsage` réserve les actes au responsable.
- **Positions** : aucune table ni statut ; signées hors dépôt.
- **Voisin qui ne convient pas** : `ArbitrageBiologique`
  (`arbitrages_biologiques`, D-059) tranche une orientation biologique d'un
  dossier, pas un conflit de sources.
- **Corpus** : `rag_corpus_claims` impose un embedding ; une position
  ingérée comme claim remonterait dans la recherche corpus.

## Arbitrages (rendus par le responsable)

Le 2026-11-04, sur questions à options, toutes sur l'option recommandée :

1. **Véhicule** : une table dédiée en base, en ajout seul, sur le patron du
   texte des fiches d'usage ; jamais un claim du corpus.
2. **Portée de l'arbitrage** : par question (une fiche d'usage), à la
   curation ; aucune donnée patient ; la limite de `DC-55` tient.
3. **Re-signature de `conflitsSourcesV1`** : les conflits des dossiers clos
   dont les deux claims sont épinglés par une fiche signée ; les autres aux
   écartés avec motif ; effet au cockpit dès le déploiement, accepté.
4. **Périmètre** : les cinq dossiers clos (fer, vitamine D, zinc,
   magnésium érythrocytaire, B9 et B12) ; iode et sélénium à sa clôture.
5. **Versement (correction de 4, même jour)** : par l'atelier, acte daté,
   relecture intégrale ; jamais par migration, qui publierait le texte au
   dépôt. L'assistant avait d'abord proposé une migration de données ; il
   l'a retirée avant toute écriture.

## Périmètre

- PR 1 : D-439, cette fiche, fragment `changelog.d/`, journal F09.
- PR 2 : migration seule (trois tables, triggers, RLS, contrat négatif,
  ligne de CI, bloc `schema.prisma`), sur demande explicite ; release-db.
- PR 3 : code de l'atelier et de l'affichage praticien sous
  `WN_POSITIONS_EXPERT`, né éteint ; bancs.
- PR 4 : re-signature de `conflitsSourcesV1` sur la déclaration du
  responsable, affichage de l'arbitrage au cockpit ; chemin clinique,
  déploiement retenu jusqu'à release-db (D-389 §5).
- Geste du responsable : versement et signature des positions à l'atelier.

## Hors périmètre

- Iode et sélénium (à sa clôture) ; fer P7 et P8, hors structure.
- BP-17 (bibliothèque des options) et BP-18a (prescription).
- Toute lecture d'une position par une règle, le portail, le courrier,
  l'IA ou la recherche corpus.
- Toute comparaison automatique d'axes (`politique-resolution-conflit-v1`
  inchangée).

## Interdits

- Aucun texte de position, aucune valeur au dépôt, ni dans une migration.
- Aucun pré-remplissage d'arbitrage ; aucune position par défaut.
- Pas de `schema.prisma` ni de migration hors de la PR 2 ; production en
  lecture seule.

## Critères de done

D-439 §7 : release-db constatée ; `conflitsSourcesV1` re-signé ; positions
des cinq dossiers signées, constatées par conteneur en agrégat ; contrat
négatif vert.

## Dépendances

BP-12a (LOT-12) livré (D-401, D-417, D-434). BP-17 (LOT-17) attend ce lot.
