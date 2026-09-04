---
id: "LOT-00"
titre: "extension-moteur-cb03"
statut: "recouvert (clôture campagne 2026-09-04)"
dépend_de: "CB-02b (fait) ; lots 8-9 de la campagne certification-corpus-questionnaires (table NNPP2 stabilisée et signée)"
---

# LOT-00 (CB-03) — Extension du moteur d'orientation aux cibles biologie

> **Requalifié à la clôture de campagne (2026-09-04, arbitrage du
> responsable).** Jamais construit tel que cadré — et le blocage initial
> (lots 8-9 certification) a été dépassé par un autre chemin : les règles
> biologie vivent dans la table signée `indicationsBiologieV1.ts` (D-069,
> verrou à cinq termes D-063), servies par `propositionService` (D-071), sans
> extension d'`evaluerOrientation`. Faire parler le **mesuré** au moteur
> d'orientation reste une frontière explicitement fermée (D-122) : ce sera
> une campagne future, avec sa décision et ses claims (FILE_ATTENTE).

## But

Étendre `evaluerOrientation` (`web/src/lib/clinical/orientationEngine.ts`) aux
deux nouvelles variantes de cible sans dupliquer le moteur, et poser une table
de règles biologie séparée, vide, signée-sha, sous double verrou.

## Résultat observable

- L'union `CibleExploration` gagne `{ type: 'analyse'; analyteCode }` et
  `{ type: 'panel_bio'; panelCode }` ; `OrientationSuggestion` porte les champs
  correspondants.
- Un fichier `orientationBiologieRulesV1.ts` existe, **vide**, avec métadonnées,
  empreinte sha-256 et statut de signature indépendants de la table NNPP2.
- Route dédiée sous double verrou fail-closed : `WN_CB_ENABLED` **et** table
  signée — réponse neutre tant qu'inactif.
- Tout le reste du moteur (déclencheurs zone/comparaison, `justificationClaims`
  jamais vide, niveau le plus fondamental gagnant, tri déterministe, filtre
  dur, jamais d'auto-assignation) est hérité sans modification.

## Périmètre

- `web/src/lib/clinical/orientationEngine.ts` (extension de l'union, pas de
  moteur frère).
- Nouveau fichier `web/src/lib/clinical/orientationBiologieRulesV1.ts` (table
  vide).
- Route API dédiée (miroir de `GET /api/praticien/orientation`), double verrou.
- Tests : union étendue, table vide ⇒ réponse neutre, filtre dur inchangé.

## Hors périmètre

- Toute règle non vide dans la table biologie (dépend de CB-04).
- Le compilateur `tools/corpus/biologie/compile.mjs` (lot CB-04).
- Toute lecture de résultat biologique réel (étage 2, CB-09).

## Fichiers probables

- `web/src/lib/clinical/orientationEngine.ts`
- `web/src/lib/clinical/orientationRulesV1.ts` (référence de patron, non modifié)
- `web/src/lib/clinical/orientationBiologieRulesV1.ts` (nouveau)
- `web/src/app/api/praticien/orientation-biologie/route.ts` (nouveau, nom indicatif)
- `web/src/lib/biology-library/**` (lecture des types catalogue existants)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte (ce lot
  n'a **aucune** migration prévue — la table de règles est un fichier TS, pas
  une table SQL).
- Pas de refactor hors lot.
- Ne pas démarrer avant que le gate ci-dessous soit levé.

## Gate bloquant (à vérifier avant tout code)

Ce lot est **explicitement subordonné** aux lots 8 et 9 de la campagne
certification-corpus-questionnaires (table de règles NNPP2 stabilisée et
signée). État au 2026-08-01 (`.wn/state.json`) : lot 8 cadré, orientation
adaptative lancée sur son premier lot (Sommeil complet, 17 fiches) ; lot 9
(compilation + signature praticien) pas encore atteint. **Ne pas commencer
CB-03 tant que ce lot 9 n'est pas clos** — vérifier `.wn/state.json` et le
dossier de la campagne certification avant d'ouvrir la moindre PR ici.

## Étapes

- [ ] Vérifier dans `.wn/state.json` que la table NNPP2 (lot 9 certification)
  est signée et stable.
- [ ] Vérifier les hypothèses (lecture de `orientationEngine.ts` et
  `orientationRulesV1.ts` à jour).
- [ ] Implémenter le changement minimal (extension d'union + fichier de règles
  vide + route + double verrou).
- [ ] Exécuter les validations (T1 puis T2).
- [ ] Relire le diff.
- [ ] Documenter les résultats (fragment `changelog.d/`).

## Tests

- T1 (`npm run check`) après chaque édition.
- T2 (`npm run test:worktree -- --fast`) avant tout commit — nouvelle route API.
- Tests unitaires : union étendue compile, réponse neutre tant que la table
  est vide ou non signée, filtre dur toujours actif.

## Critères de done

- Gate certification lot 9 vérifié levé avant le premier commit.
- Double verrou fail-closed démontré par un test (flag off **ou** table non
  signée ⇒ réponse neutre).
- Aucune régression sur le moteur d'orientation NNPP2 existant.

## Résultats

À compléter à la clôture.
