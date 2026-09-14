# Handoff — 2026-09-14 — LOT-01 : quatre rayons de corpus s'ouvrent à la lecture

Premier lot livré de la campagne « 5. Actions — le protocole assisté », ouverte le
même jour (#1104). Livré **avant le LOT-00** parce qu'il n'en dépend pas.

## Branche et état Git

- Branche `lot01-ouvrir-rayons-dormants`, partie d'`origin/main` à `392e0370`.
- La campagne et sa clôture précédente sont déjà sur `main` : `512f631b` (#1103,
  clôture de `D-179`) et `392e0370` (#1104, ouverture de la campagne).

## Ce qui a été livré

`RAYONS_RECHERCHE_CORPUS` passe de **trois à sept** : + sommeil, stress, humeur,
nutrition. Décision `D-188`, fragment
`changelog.d/2026-09-14-ouvrir-les-rayons-dormants.md`.

**Le fait qui a décidé, et il était écrit dans le dépôt.** Les quatre rayons
portaient un verdict `dormante` au **réexamen daté du 2026-09-01, dépassé**, et la
raison inscrite à côté de chacun disait qu'élargir « est une décision praticien ».
Les notebooks sont ingérés et validés ; le mécanisme est en production depuis le
2026-08-22.

**Ce que la liste blanche retenait**, mesuré au registre des sources d'intervention
(instantané du 2026-08-03, **sources de conduite seules**) : trois rayons ouverts
exposaient **60 claims validés**, quatre fermés en retenaient **986** — sommeil 297,
humeur 283, nutrition 291, stress 115.

**Ce que le lot ne fait pas** : aucun claim n'entre dans un protocole. La barrière
`D-003` est inchangée, le filtrage par notebook reste au niveau SQL, aucun claim
n'est recoté.

## Fichiers modifiés

- `web/src/lib/supplement-library/rayonCorpus.ts` — l'allowlist et deux commentaires
  devenus faux.
- `web/src/components/corpus/RechercheCorpusRayonPanel.tsx` — le sélecteur, en
  miroir. **Les trois rayons d'origine gardent leur rang** : le premier élément est
  celui sélectionné au montage, et un banc existant asserte `rayon=cognition` au
  premier appel.
- `docs/claude/corpus/consommation_decisions.json` — quatre verdicts retirés, la
  raison de `rayon:biologie` corrigée (elle citait encore l'ancienne allowlist).
- `docs/claude/MATRICE_CONSOMMATION.md` — régénérée.
- Trois fichiers de bancs ; `docs/DECISIONS.md` ; `changelog.d/` ; le fichier du lot.

## Deux bancs ajoutés qui n'étaient pas au cadrage

1. **Un banc de miroir** entre le sélecteur d'écran et l'allowlist de la route. Ce
   sont deux listes, dans deux fichiers : un rayon proposé à l'écran et absent de
   l'allowlist rendrait un **400 `rayon_invalide` à chaque recherche** — une option
   morte que rien ne signale. J'avais écrit l'invariant en commentaire ; un
   invariant sans banc est un trou.
2. Un banc qui vérifie que chaque rayon de l'allowlist désigne bien un notebook.

Le banc d'allowlist reste **littéral** et ne se dérive pas de `RAYON_VERS_NOTEBOOK` :
le dériver validerait silencieusement tout ajout futur, `micronutrition` compris —
exactement le défaut bloquant qu'une revue avait trouvé le 2026-08-03.

## Deux pièges rencontrés, et ils se reproduiront

1. **`node scripts/wn-matrice-consommation.mjs` sans `--markdown` n'écrit pas le
   fichier.** Il ne rend que le JSON ; la garde de fraîcheur reste rouge, et le
   message d'erreur du banc donne la bonne commande — il faut le lire.
2. **Importer une CONSTANTE depuis `rayonCorpus` dans un test de composant tire
   `@/lib/prisma`**, qui lève sans `DATABASE_URL`. Le `type` seul était effacé à la
   compilation ; une valeur ne l'est pas. Deux `vi.mock` l'évitent, comme le fait
   déjà `rayonCorpus.test.ts`.

## Validations exécutées

- T1 vert (après `npx prisma generate`, obligatoire dans un worktree neuf).
- `node scripts/wn-matrice-consommation.mjs --strict` en code 0.
- T2 — voir le fil de la PR.

## Ce qui reste ouvert

- **Le panneau vit dans la Bibliothèque**, pas dans le constructeur de protocole :
  les claims sont à portée, dans un autre onglet, pas sous les yeux pendant la
  saisie. Consigné à la décision, non traité.
- `rayon:biologie` reste dormant — réexamen au 2026-10-01, non échu.

## Prochaine action exacte

**LOT-00** — la décision de frontière patient, qui gate le LOT-03 et le LOT-04. Elle
est rédactionnelle ; son contenu est fixé par les douze arbitrages du 2026-09-14.
Puis LOT-02, qui ne demande aucune décision.

## Interdits encore actifs

Inchangés : aucune identité patient réelle dans le dépôt ; production en lecture par
`scalingo run -d`, écriture par migration relue puis `release-db` approuvée ; pas de
`schema.prisma` ni de clinique/scoring sans demande explicite.
