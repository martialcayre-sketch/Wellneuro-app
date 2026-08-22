---
id: "LOT-05"
statut: "livré à la PR (2026-08-22) — famille `sum_no_interpretation` admise au validateur (D-087), garde anti-seuil et garde anti-bande-par-défaut vues rouges puis vertes, moteur de scoring et schéma Prisma intacts"
dépend_de: "— (indépendant du LOT-01 — cf. cadrage : la voie CabinetInstrument existe)"
---

# LOT-05 — L'EVA voie instrument cabinet : piloter sans classer

## But

À la fin de ce lot, une EVA (échelle visuelle analogique) se crée, se relit et
s'assigne par la voie instrument cabinet existante — cycle
`brouillon → grille_a_relire → valide` — et ses passations pilotent la
conversation sans jamais classer : **aucun seuil, aucune bande, aucune
interprétation inventée** (`DC-19`, `DC-20`) ; un pilotage n'est jamais un
diagnostic (`DC-27`, `DC-28`).

## La voie mesurée (2026-08-22)

`CabinetInstrument` (`web/prisma/schema.prisma:1450`) porte déjà le cycle
complet : `statutRelecture` (`brouillon | grille_a_relire | valide`),
`definitionJson`, `scoringJson`, assignation après publication, scoring à la
soumission par le resolver commun `@/lib/instruments`, surfaces
`api/praticien/instruments/route.ts` et `BibliothequePanel.tsx`. **Première
question du lot** : cette voie accepte-t-elle une EVA *sans* grille
d'interprétation (un `scoringJson` qui rend la valeur brute sans bande) ?

- Si oui : le lot est une affaire de définition d'instrument + garde de forme,
  **sans migration**.
- Si non : le lot s'arrête, nomme le manque précis, et la décision (étendre
  `scoringJson` ou voie propre) revient au responsable — jamais une bande
  « neutre » inventée pour passer.

## Verdict d'instruction (2026-08-22)

**Réponse à la première question : oui — au prix d'une décision, sans
migration.** Mesuré sur pièces :

- Le **moteur** connaît déjà la famille : `sum_no_interpretation`
  (`web/src/lib/questions.ts`) rend le total, `maxTotal` et
  `interpretation: null` ; deux instruments du catalogue Drive s'en servent
  (`Q_PED_01` — Matinalité-Vespéralité Enfant, `questions.ts:939` — et
  `Q_MOD_02`, `questionnaires/mode-de-vie.ts:140` ; `Q_MOD_01` est `subscore`,
  pas cette famille). **Zéro ligne modifiée** — l'interdit du lot tient.
- Le blocage n'était pas au moteur mais au **validateur**
  (`web/src/lib/instruments.ts`, distinct) : trois types admis, et une grille
  de 1 à 6 bandes contiguës et couvrantes exigée de tout instrument. Relâcher
  cette garde pour une famille déclarée est un geste clinique → `D-087`
  (`DC-17`, `DC-18`), avec sa contrepartie : **aucune bande admise** sur cette
  famille.
- **Le piège n'était pas la grille absente, mais la grille par défaut.** Trois
  sites posent une bande unique « Grille à définir — relecture requise »,
  colorée `warning`, quand la grille manque : `scoringParDefaut`, l'amorce de
  l'éditeur (`BibliothequePanel`) et l'import. Sur un instrument qui ne classe
  pas, ce libellé d'attente est un verdict de fait — d'où la garde nommée
  `interditTouteBande`.
- **Saisie patient : rien à écrire.** L'item `number` borné
  (`min`/`max`/`unit`) est déjà rendu par `QuestionField` et déjà gardé côté
  serveur par `api/patient/submit` (refus hors bornes, jamais de troncature).
  Aucun composant curseur neuf.
- **Restitution : déjà propre, désormais assertée.** `interpretRanges` rend
  `null` sur grille vide, la colonne `interpretation` reste nulle, la fiche
  affiche `—`, la mini-synthèse rend `''`, le badge dit « Cabinet — scoring
  non vérifié ». Aucune surface nouvelle : le lot pose des bancs, pas des
  écrans.
- **Réserve fermée par banc** : `sum_no_interpretation` n'émet ni `missing` ni
  `repondus` (contrairement à `sum`). La complétude d'un recueil de cette
  famille n'est donc tenue que par la garde d'`api/patient/submit` — asserté,
  et rouge à son débranchement.

## Périmètre

- Rendre l'EVA créable et assignable par la voie cabinet (relecture de grille
  comprise — le cycle existant ne se contourne pas).
- Restitution praticien : la **valeur et sa trajectoire** (les passations
  successives, deux dates), jamais une bande, une couleur de sévérité ni un
  libellé interprétatif.
- Garde structurelle par test : une EVA ne porte aucun seuil — le banc rougit
  si une interprétation apparaît dans sa définition ou sa restitution.

## Fichiers probables

- `web/src/app/api/praticien/instruments/route.ts` (+ banc) — si extension
  nécessaire.
- `web/src/components/BibliothequePanel.tsx` (création/relecture).
- `web/src/lib/instruments` (resolver — lecture d'abord ; toute modification
  est un geste sur le scoring, décision propre).

## Interdits

- **Aucun seuil, bande, borne ou libellé interprétatif** — ni dans la
  définition, ni dans le scoring, ni dans l'affichage.
- Ne pas modifier le moteur de scoring des instruments du catalogue ; si le
  resolver commun doit bouger, s'arrêter et le nommer (décision + fragment).
- Ne pas contourner `grille_a_relire` : une EVA se publie relue, comme tout
  instrument cabinet.
- Aucun credit clinique inventé : l'EVA est un instrument de pilotage déclaré
  comme tel, sans provenance fabriquée.

## Dépendances

Aucune — peut se mener en parallèle du LOT-01. (Si la réponse à la première
question impose un schéma propre, le lot rejoint la discipline migration du
LOT-01 : confirmation obligatoire, migration seule dans sa PR.)

## Étapes

1. Instruire la première question sur pièces (resolver, definitionJson,
   scoringJson) — verdict écrit dans le lot.
2. Voie retenue : définition EVA + parcours création → relecture →
   assignation → passation, joué de bout en bout.
3. Garde anti-seuil vue rouge puis verte.
4. T2 ; fragment `changelog.d/`.

## Tests

- Parcours complet par bancs de route (création, relecture, publication,
  assignation, soumission).
- Garde anti-seuil : mutation qui introduit une bande → rouge.
- Restitution : valeur + trajectoire asserties, absence de tout libellé
  interprétatif assertée.
- T2 avant commit.

## Critères de done

- [x] Une EVA se crée, se relit, s'assigne et se passe par la voie cabinet
      (création API et import JSON, cycle `brouillon → grille_a_relire →
      valide`, passation scorée et persistée).
- [x] Aucun seuil nulle part — gardes vues rouges au débranchement
      (anti-seuil : 5 bancs ; anti-bande-par-défaut : 1 ; refus d'édition : 1 ;
      complétude : 2).
- [x] Moteur de scoring intact — `web/src/lib/questions.ts` non modifié ;
      seul le validateur `web/src/lib/instruments.ts` bouge, sous `D-087`.
- [x] T2 vert ; fragment `changelog.d/` écrit ; `D-087` au registre.
