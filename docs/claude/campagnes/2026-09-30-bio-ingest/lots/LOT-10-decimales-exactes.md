---
id: "LOT-10"
titre: "Décimales exactes de bout en bout"
statut: "terminé"
dépend_de: "LOT-01, LOT-02"
---

# LOT-10 — Décimales exactes de bout en bout

## But

Une valeur biologique arrive en base exactement telle qu'elle a été saisie ou lue, quelle que soit
la voie : aucun passage par un `number` JavaScript entre la saisie ou la ligne lue et la colonne
`Decimal`.

## Résultat observable

Une valeur à plusieurs décimales (par exemple `0,1` + `0,2` ou une valeur à 15 chiffres
significatifs) saisie, validée depuis un import ou corrigée est relue à l'identique, sans arrondi,
dans l'écran et en base.

## Périmètre

Dette nommée au LOT-05 (« la valeur transitait en `number` JSON ») et confirmée au cadrage du
2026-10-07 (`CADRAGE_LOT05_ADAPTATEUR_2026-10-07.md`). Trajet à couvrir : saisie unitaire, saisie
groupée, validation d'une ligne d'import, correction d'une mesure estimée ; écriture et restitution.
Chaîne décimale canonique validée côté serveur, puis `Prisma.Decimal`.

Prérequis de l'ouverture d'un flux laboratoire, indépendant de ce flux.

## Hors périmètre

- Toute conversion d'unité (`D-157`).
- Le comparateur (`<`, `>`) et les résultats qualitatifs : forme décidée avec le modèle de réception
  du LOT-05.
- Le moteur clinique (`D-122`).

## Fichiers probables

- `web/src/lib/biology-library/resultats.ts`
- `web/src/lib/biology-library/import/decisions.ts`
- `web/src/app/api/praticien/biologie/resultats/route.ts`
- `web/src/app/api/praticien/biologie/resultats/bilan/route.ts`
- `web/src/components/patient-cockpit/SaisieBilan.tsx`, `ImportCompteRenduPanel.tsx`,
  `EstimeMesurePanel.tsx`

## Interdits

- Pas de secret, pas de donnée patient réelle (fixtures : Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune écriture dans `resultats_biologiques` sans validation humaine explicite.
- Aucune qualification clinique d'une valeur, aucune conversion d'unité.
- Pas de migration hors d'un lot marqué « confirmation obligatoire » (`D-087`) : si la précision ou
  l'échelle de la colonne doit changer, le lot s'arrête et la migration part seule.
- Pas de refactor hors lot.

## Dépendances

LOT-01, LOT-02

## Étapes

- [x] Cadrage : inventaire des passages en `number`, précision et échelle réelles de la colonne.
- [x] Mode Plan, puis correctif.

## Tests

Aller-retour exact sur des valeurs limites (décimales longues, zéros de tête et de queue, virgule
française) pour chaque voie ; refus d'une chaîne non décimale ; non-régression des doublons.

## Critères de done

Plus aucun `number` sur le trajet de la valeur ; aller-retour exact prouvé par voie ; T2 vert.

## Résultats

Livré le 2026-10-07, sans migration.

- **Colonne** : `DECIMAL(65,30)` — 35 chiffres avant la virgule, 30 après. Au-delà
  de 30 décimales Postgres arrondissait en silence : c'est désormais un refus
  `valeur_hors_capacite`, message précisé. Échelle fixe ⇒ les zéros de queue ne
  sont pas conservables : « à l'identique » = même valeur, forme canonique
  (point, sans zéro de tête ni de queue, ni `+` ni `-0`).
- **Module pur** `web/src/lib/biology-library/valeurDecimale.ts` (sans import,
  partagé écran/serveur) : `lireDecimalSaisi`, `canoniserDecimal`,
  `depasseCapacite`.
- **Trajet** : les trois écrans envoient la chaîne canonique ;
  `validerSaisieResultat` n'accepte qu'une chaîne (un `number` JSON est refusé,
  l'exactitude est déjà perdue) ; `lireValeurQuantitative` rend une chaîne ;
  les trois écrivains posent `new Prisma.Decimal(...)` ; la route rend
  `valeur: string` par `Decimal#toFixed()` (`toString()` passait en
  exponentielle) et compare les faits du laboratoire en chaînes.
- **Écart avec la grammaire d'avant** : `1e3`, `0x10`, `Infinity` étaient
  acceptés par `Number()` à l'écran ; ils sont refusés.
- **Preuves** : aller-retour exact par voie en Vitest (`Decimal` passé à
  `create`, restitution GET en notation normale, corps POST des écrans) ;
  aller-retour en base locale réelle par le client Prisma et l'adaptateur pg,
  8 valeurs limites dont 35 + 30 chiffres, transaction annulée, aucun résidu.
- **Hors périmètre, inchangé** : `portesBiologiquesService.ts` (moteur
  clinique, `D-122`) lit `valeur.toString()` — exact, mais en exponentielle
  pour les très petites ou très grandes valeurs ; à reprendre seulement si ce
  moteur affiche la valeur.
