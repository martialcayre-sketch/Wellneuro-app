# Handoff — 2026-09-16 — Campagne Correspondance : trois lots livrés, le verrou reste devant

Handoff **de session**, au-dessus des trois handoffs de lot ([[D-209]], [[D-210]],
[[D-212]]) qui portent chacun son détail. Il dit où en est la campagne, ce qui a
été appris en chemin, et ce qu'il ne faut pas re-corriger.

## Branche et état Git

Tout est sur `main` : `520e89c8` (D-209), `89ff5c33` (D-210), `d68fc9f5` (D-212),
`670d6bee` (ce handoff). Les branches de lot ont été supprimées après vérification
de l'**état des PR** — jamais de l'ascendance, qui ment après un squash. Registre
contigu D-001 → D-212. Une PR de reprise de revue suit, et corrige quatre constats
de Copilot retenus après vérification.

## Fichiers touchés par la campagne

Le domaine tient en six fichiers, et c'est là qu'il faut regarder d'abord :

- `lib/praticien/correspondanceMedecin.ts` — seul lecteur de `sens` du produit.
- `api/praticien/correspondance-medecin/route.ts` — le fil (GET+POST), ses gardes
  et l'ordre de lecture.
- `api/praticien/correspondance-medecin/recentes/` — la liste transversale et,
  dans `compteur/`, le badge du rail.
- `components/correspondance/CorrespondanceMedecinPanel.tsx` — la surface où le
  geste se fait.
- `components/fil/CorrespondanceRecente.tsx` et `components/ui/SidebarRail.tsx` —
  les deux consommateurs de l'accueil.
- `app/dashboard/correspondance/page.tsx` — la page de rayon, qui oriente.

## Validations exécutées

T1 à chaque édition ; T2 avant chaque PR ; CI attendu en un seul appel bloquant,
`0` étant le seul code qui autorise à annoncer une PR prête. Quatre mutations
jouées, quatre mutants tués — dont deux qui ont révélé des bancs creux avant
qu'ils ne partent. **T3 n'a pas été joué** : aucun lot ne touchait migration,
scoring ni clinique.

Deux rouges T2 rencontrés, tous deux classés par `wn-diagnostic-e2e.mjs` : un
vrai défaut dans un spec neuf (violation de mode strict, corrigé), et la
signature [[D-049]] sur WebKit — navigation expirée sans qu'aucune requête de
page soit émise. Le second ne se rejoue pas : le CI Linux fait foi sur ce palier.

## Interdits encore actifs

Aucun n'a été levé par ces trois lots, et aucun ne doit l'être en passant :

- **Aucun canal sortant réel** vers le médecin — base légale non instruite, pas
  d'AIPD, DPA non archivé.
- **Aucune pièce jointe** ([[D-122]]) — l'interdit a changé de motif au HDS, il
  n'a pas été levé, et il est structurel : aucun champ fichier au modèle.
- **Aucun lien signé médecin** — `PortailMagicLink` porte une FK patient
  obligatoire et ouvre l'espace patient entier.
- **Aucune messagerie de santé** — fermée par la qualification du signataire, pas
  par le calendrier.
- **Aucun `localStorage` pour le brouillon de transcription** — ce serait de la
  parole clinique hors base, hors effacement du dossier, hors rubrique RGPD.

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

**Un plan vérifié en chemin change.** Deux propositions du cadrage ont été
écartées **avec leur motif écrit** : monter `PanneauRail` sur la page du rayon
(dimensionné pour l'aside de 300 px, il se replie en une ligne quand il est
vide), et pré-remplir le champ médecin (la ligne consignée est définitive).

**Un banc se vérifie avant d'y croire.** Deux écrits ici étaient creux : le banc
de fuseau passait dans les deux sens, l'instant choisi ne traversant pas minuit ;
et le banc du compteur servait à un mock une liste déjà dédupliquée, simulant la
déduplication au lieu de la prouver. Le second n'a été vu que par la revue.

**Le registre a collisionné trois fois** (D-207, D-208, D-211) : **rebase avant
le premier push, merge après** — replayer un historique poussé demanderait un
force-push, que l'autorisation exclut.

## Réserves qui survivent aux trois lots

- **`supersedes_*` n'existe toujours pas**, et ce trou a déjà coûté une
  fonctionnalité : `D-212` a refusé le pré-remplissage à cause de lui.
- **`/recentes` nomme cinq dossiers sans journaliser** ([[D-209]] §3). `D-210`
  s'est délibérément interdit d'allonger cette liste pour ne pas rouvrir la
  question une PR après l'avoir refermée.
- **L'énoncé de la pastille n'est éprouvé par aucun banc**, et **la nav mobile
  vers le rayon est sans garde**. Les deux se ferment ensemble par une fixture de
  consignation dans `e2e/helpers/db.ts` : l'état où la contradiction devient
  visible est celui que le dépôt ne sait pas produire. Propre PR.
