# Handoff — 2026-09-16 — Campagne Correspondance : trois lots livrés, le verrou reste devant

Handoff **de session**, au-dessus des trois handoffs de lot ([[D-209]], [[D-210]],
[[D-212]]) qui portent chacun son détail. Il dit où en est la campagne, ce qui a
été appris en chemin, et ce qu'il ne faut pas re-corriger.

## Ce qui a été fait

Un audit du rayon Correspondance, puis trois lots, tous mergés le même jour.

| Lot | PR | Décision | Ce qu'il ferme |
|---|---|---|---|
| LOT-01 | #1146 | [[D-209]] | le sens se lit une seule fois ; l'accueil cesse de citer le dossier |
| LOT-00 | #1148 | [[D-210]] | la page sort du différé ; le badge désigne une tâche |
| LOT-02 | #1151 | [[D-212]] | le geste de transcription cesse de perdre en silence |

Suivi publié, tenu à jour à chaque PR :
`~/Developer/suivi-rayon-correspondance.html` — **14 tâches sur 32**.

## Le fait qui commande la suite, et qu'aucune lecture rapide ne donne

La seule raison **cliniquement obligatoire** d'écrire à un médecin existe déjà
dans le produit et **n'a aucun chemin** vers la correspondance.
`safetySignalsV1.ts:75-77`, rang `adressage` : « avis médical à évaluer en
priorité, avant toute proposition ». Il **inhibe** la chaîne C1, le cockpit nomme
le blocage à l'écran, et le commentaire signé mesure la demande — **6 dossiers
sur 25** (production, 2026-08-23).

Aucune surface n'offre le geste, et rien ne consigne qu'il a eu lieu : donc
l'abstention ne se lève par aucune preuve. **Le produit sait dire qu'il faut
écrire au médecin, et ne sait pas écrire au médecin.**

Les trois lots livrés n'ont pas touché à cela. Ils ont rendu le rayon **vrai** —
c'était le préalable, pas le but.

## Ce qui reste, et l'ordre imposé

`LOT-03` d'abord, parce qu'il est le **verrou technique** de `LOT-04` :
`verdictAncrage` compare en dur au SHA de la table d'indications, et un second
écrivain ancré sur une autre table signée ferait lire « ancrage périmé » sur
**chacune** des lettres d'adressage — une fausse alerte sur toute la chaîne.

Puis `LOT-04`, cœur de la campagne. Puis `LOT-05` (le registre rattrape le code)
et `LOT-06` (la mesure, parallèle et non bloquante).

## Ce qui a été appris, et qui vaut au-delà de cette campagne

**Un plan vérifié en chemin change.** Le cadrage disait « monter le composant qui
existe déjà » sur la page du rayon : `PanneauRail` est dimensionné pour l'aside de
300 px et se replie en une ligne quand il est vide. Il disait « le médecin se
pré-remplit » : une ligne consignée est définitive, et un champ rempli par défaut
se valide sans être lu. Les deux ont été écartés **avec leur motif écrit**.

**Un banc de fuseau se vérifie avant d'y croire.** Le premier écrit ici passait
dans les deux sens — l'instant choisi ne traversait pas minuit. Un banc de fuseau
doit porter un instant **discriminant**, et sa vérification se fait sous
`TZ=UTC` : cette machine partage le décalage de Paris, donc il ne mord qu'en CI.

**Le registre a collisionné trois fois en une session** (D-207, D-208, D-211). La
règle qui s'en dégage : **rebase avant le premier push, merge après** — replayer
un historique déjà poussé demanderait un force-push, que l'autorisation exclut.

## Réserves qui survivent aux trois lots

- **`supersedes_*` n'existe toujours pas**, et ce trou a déjà coûté une
  fonctionnalité : `D-212` a refusé le pré-remplissage à cause de lui.
- **`/recentes` nomme cinq dossiers sans journaliser** ([[D-209]] §3). `D-210`
  s'est délibérément interdit d'allonger cette liste pour ne pas rouvrir la
  question une PR après l'avoir refermée.
- **L'énoncé de la pastille n'est éprouvé par aucun banc** : `SidebarRail` n'en a
  aucun, et aucun E2E ne peut voir une pastille que le seed ne sait pas produire.
- **La nav mobile vers le rayon est sans garde.**

Ces deux dernières se ferment ensemble, par une fixture de consignation dans
`e2e/helpers/db.ts` — l'état où la contradiction devient visible est précisément
celui que le dépôt ne sait pas produire. Diff d'une autre finalité, propre PR.
