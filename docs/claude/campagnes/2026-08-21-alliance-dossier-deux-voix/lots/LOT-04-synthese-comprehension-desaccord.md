---
id: "LOT-04"
statut: "terminé (2026-08-22, mergé #757) — synthèse versionnée publiée sous garde confirmable, désaccord structuré indestructible, accusé de lecture sans colonne neuve (journal + état dérivé), cinquième chemin inscrit à la carte du Socle en deux entrées (D-090) ; aucune migration"
dépend_de: "LOT-01 (migration appliquée par one-off release-db après approbation humaine — D-087, qui supplante D-086 §1-2 ; constatée par conteneur : 58 migrations up to date) ; Socle de restitution sûre (livré le 2026-08-22)"
---

# LOT-04 — « Ce que j'ai compris de vous » : synthèse gardée et désaccord structuré

## But

À la fin de ce lot, le praticien rédige une **synthèse de compréhension**
versionnée, présentée au patient par le circuit de textes gardés du Socle, et
le patient dispose d'un bouton « Ce n'est pas exactement ça » qui crée un
**objet désaccord structuré**. Un désaccord est une discordance : il se
signale, reste visible, ne s'écrase et ne se moyenne jamais (`DC-30`). Il
remplace le détournement actuel du déverrouillage de questionnaire comme
canal de contestation — sans retirer le déverrouillage, qui garde son rôle de
re-saisie.

## Le circuit du Socle, mesuré (2026-08-22)

Le « circuit de textes gardés » du brief est désormais concret :

- tout texte patient porté par un message part d'un gabarit **au registre**
  (`correspondance/registreGabarits.ts` — version, hash, deux dates,
  déclaration de conformité « aucune donnée de santé ») ; un message neuf
  s'y **ajoute**, jamais inline (handoff du 2026-08-22 12:49) ;
- la restitution affichée passe les gardes de vocabulaire dont la couverture
  est prouvée par la carte du Socle LOT-01 (PR #736) — une surface neuve qui
  montre du texte praticien **s'inscrit à cette carte** avec son banc de
  débranchement.

## Périmètre

- Versions de synthèse (table LOT-01) : rédaction praticien, publication au
  patient — chaque révision est une nouvelle version, l'historique reste.
- Objet désaccord : créé par le patient depuis la synthèse affichée,
  référençant la version contestée ; visible au praticien, avec accusé de
  lecture praticien (pas de résolution qui l'efface — une réponse est une
  nouvelle version de synthèse).
- Surfaces : rédaction côté cockpit ; affichage patient (portail) derrière
  les gardes ; le désaccord visible des deux côtés.
- Gardes structurelles : la synthèse ne porte ni code diagnostique ni
  classification (`DC-31`, `DC-32`) ; le désaccord n'a pas d'état
  « supprimé » ; banc de débranchement de la garde d'affichage.

## Fichiers probables

- `web/src/lib/` (module synthèse/désaccord + bancs).
- `web/src/app/api/praticien/` et `web/src/app/api/portail/` (routes).
- `web/src/lib/correspondance/registreGabarits.ts` (ajout d'un gabarit si un
  message est nécessaire — avec déclaration de conformité).
- La carte de couverture des chemins sortants du Socle (ajout du chemin neuf).

## Interdits

- Aucun texte praticien montré au patient hors circuit gardé.
- Aucune modification des gabarits existants ni de leur contenu.
- Un désaccord ne se supprime pas, ne se ferme pas silencieusement, ne se
  transforme pas en note privée.
- Ne pas toucher au déverrouillage de questionnaire existant.
- Aucun affaiblissement d'une garde du Socle (verdicts inchangés).

## Dépendances

LOT-01 releasé. Le Socle est livré — dépendance satisfaite au cadrage.

## Étapes

1. Contrat (cycle de version, états du désaccord, qui voit quoi) + bancs.
2. Module + routes ; surfaces cockpit puis portail derrière les gardes.
3. Chemin neuf inscrit à la carte de couverture, banc de débranchement vu
   rouge ; gabarit ajouté au registre si besoin.
4. T2 ; fragment `changelog.d/` ; revue `wn-reviewer` (surface patient).

## Tests

- Bancs de route des deux côtés (droits, session).
- Append-only prouvé : réviser = nouvelle version ; le désaccord référence la
  version exacte contestée et survit à toute révision ultérieure.
- Banc de débranchement de la garde d'affichage (vu rouge).
- Gardes anti-diagnostic vues rouges ; T2 avant commit.

## Critères de done

- [ ] Synthèse versionnée, publiée au patient par le circuit gardé, chemin
      inscrit à la carte de couverture avec banc rouge au débranchement.
- [ ] Désaccord structuré créable par le patient, visible des deux côtés,
      indestructible, référencé à la version contestée.
- [ ] Tout message neuf au registre avec déclaration de conformité.
- [ ] Revue `wn-reviewer` passée ; T2 vert ; fragment écrit.
