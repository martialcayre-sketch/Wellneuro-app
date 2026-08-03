---
id: "LOT-04"
titre: "Structuration de l'intake de consultation"
statut: "livré"
dépend_de: "aucun"
palier: "T2"
---

# LOT-04 — Structuration de l'intake de consultation

## But

Rendre le motif de consultation, la fiche signalétique et l'anamnèse exploitables
par un moteur déterministe, sans migration de schéma.

## Le défaut à corriger

`web/prisma/schema.prisma`, modèle `Consultation` :

```prisma
motif             String? @map("motif")
ficheSignaletique Json?   @map("fiche_signaletique")
anamnese          Json?   @map("anamnese")
```

Texte libre et JSON sans schéma. Un moteur indexé là-dessus ne serait plus
reproductible, et sa table de règles ne serait plus signable — ce qui défait la
gouvernance entière du moteur d'orientation.

## Résultat observable

Une consultation saisie via l'UI produit un motif énuméré et des drapeaux
d'anamnèse nommés, lisibles par une fonction pure et testable. Une consultation
saisie **avant** ce lot reste lisible et ne produit aucun drapeau — jamais une
erreur.

## Périmètre

- Définir le schéma applicatif : liste fermée de motifs, drapeaux d'anamnèse
  nommés, champs de fiche signalétique pertinents pour l'orientation.
- Poser ce schéma **dans les colonnes `Json` existantes**.
- Parsing tolérant : une consultation historique sans structure rend « aucun
  drapeau », pas une exception.
- Adapter la saisie praticien (textes en français).

## Hors périmètre

- **Toute migration Prisma.** Si le lot en révèle le besoin, il s'arrête et le
  geste fait l'objet d'un lot distinct marqué « confirmation obligatoire ».
- L'extraction IA depuis le texte libre — écartée au cadrage : elle
  réintroduirait une source non déterministe en amont de la décision.
- L'usage de ces drapeaux par le moteur (c'est le LOT-05).

## Fichiers probables

- `web/src/lib/consultation/` (schéma et parsing)
- surface de saisie de consultation
- tests unitaires du parsing

## Interdits

- Pas de secret.
- Pas de donnée patient réelle — exemples limités à Sophie Nicola, Jennifer
  Martin, Michel Dogné.
- Pas de migration Prisma.
- Pas de texte UI en anglais.
- Pas de refactor hors lot.

## Étapes

- [ ] Recenser les motifs réellement saisis pour construire l'énuméré sur l'usage.
- [ ] Définir les drapeaux d'anamnèse utiles à l'orientation, et eux seuls.
- [ ] Écrire le parsing tolérant et ses tests.
- [ ] Adapter la saisie.
- [ ] Vérifier la rétrocompatibilité sur des consultations existantes.
- [ ] `npm run check` puis `npm run test:worktree -- --fast`.

## Tests

- Consultation historique sans structure → aucun drapeau, aucune exception.
- Consultation avec JSON partiel ou inattendu → dégradation propre.
- Motif hors énuméré → traité comme non renseigné, jamais deviné.

## Critères de done

- [ ] Schéma défini, documenté, testé.
- [ ] Rétrocompatibilité vérifiée sur des cas réels historiques.
- [ ] Aucune migration introduite.
- [ ] Revue adversariale `wn-reviewer` passée.

## Résultats

**Recadré au cadrage.** L'essentiel du « schéma applicatif » demandé existait déjà
(`motifs.ts`, `anamnese.ts` à options fermées, `contexteClinique.ts` en parsing
défensif vers du texte). Ce qui manquait réellement pour LOT-05 : une extraction
**typée et nommée**, pas de la prose. Livré sur ce périmètre résiduel :
`web/src/lib/consultation/drapeauxAnamnese.ts` (`extraireDrapeauxAnamnese`), 8
drapeaux (5 `checkbox-multi` + 3 `radio`) filtrés contre les options actuelles de
`ANAMNESE_SECTIONS`, lues **dynamiquement** — jamais recopiées — pour éliminer le
risque de divergence de libellé. `asRecord`/`texte` exportés depuis
`contexteClinique.ts` (3 mots, comportement inchangé) pour éviter de dupliquer le
parsing défensif du champ le plus sensible (`signaux_alerte`).

**Décision motif** : ni `Consultation.motif` (peut être `null`) ni
`anamnese.motif_principal` (texte libre, seul champ obligatoire du formulaire) ne
deviennent des drapeaux — restent hors périmètre, le texte libre continue
d'alimenter `buildContexteClinique` seul.

**Revue adversariale `wn-reviewer` passée**, deux défauts majeurs trouvés et
corrigés avant clôture :

- Tests initiaux tautologiques (dérivaient l'attendu du même code que
  l'extraction) → remplacés par des libellés **figés en dur** dans
  `drapeauxAnamnese.test.ts`, qui cassent bruyamment si `anamnese.ts` dérive —
  contrepartie assumée du choix de dérivation dynamique côté production.
- Ordre de sortie dépendait de l'ordre de stockage, et le filtrage passait par
  un helper borné à 50 éléments bruts (risque théorique de perte d'un signal
  valide) → `listeFiltree` réécrite pour itérer sur l'énuméré clinique
  (ordre canonique, dédup de fait, pas de troncature avant filtrage).

**Point documenté, pas corrigé (hors périmètre)** : `extraireDrapeauxAnamnese`
filtre `signaux_alerte` contre l'énuméré ; `extraireVigilanceDeterministe`
(existant) ne filtre pas et remonte tout signal brut en texte au praticien. Ce
drapeau n'est donc **pas** une garantie de sécurité — commenté dans le type
`DrapeauxAnamnese`. À trancher explicitement au cadrage de LOT-05 si ce drapeau
sert une décision d'orientation liée à un signal d'alerte.

**Validation** : T1 (`npm run check`) et T2 (`npm run test:worktree -- --fast`,
108 tests E2E) verts après corrections. Aucune migration, aucune route touchée.
