# Handoff — 2026-09-24 — LOT-03 du chantier 6 : la biologie des assiettes à l'écran (D-247)

## 1. Branche et état Git

`wn-chantier6-lot03-ecran-2026-09-24`, worktree
`.claude/worktrees/porte-biologique`, partie de `origin/main` à `85f46621`
(LOT-02 en production).

## 2. Objectif

Faire atteindre la carte à la table signée des portes biologiques : claims cités
entiers et dernier résultat par marqueur, côte à côte, sans verdict (`D-245`).

## 3. Décisions prises

- `D-247` : section sous la carte, verrou à trois termes, élection du dernier
  résultat par prélèvement après le fil de correction, valeur en texte exact.
- Sentinelle de vocabulaire **hors citations** : les sources disent « élevée »,
  la machine ne dit rien.
- Écarté : un E2E (corpus vide en CI — il n'éprouverait que l'absence).

## 4. Fichiers modifiés

Créés : `web/src/lib/biology-library/derniersResultats.ts` (+ test) ·
`web/src/lib/clinical/portesBiologiquesService.ts` ·
`web/src/app/api/praticien/assiettes-indiquees/portes-biologiques/route.ts`
(+ test) · `web/src/components/patient-cockpit/PortesBiologiquesSection.tsx`
(+ test). Modifiés : `AssiettesIndiqueesPanel.tsx` (montage) et son banc ·
`scripts/wn-matrice-consommation.mjs` · `docs/claude/MATRICE_CONSOMMATION.md`
(régénérée) · `docs/DECISIONS.md` · `changelog.d/2026-09-24-portes-biologiques-ecran.md`
· `docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

- Bancs : élection pure 5/5, route 12/12, section 11/11, carte parente et garde
  du paquet client verts. Mutation : « valeur normale » ajouté au texte machine
  → la sentinelle rougit ; restauré → vert.
- Premier T3 ROUGE, deux causes, corrigées : une taille typographique arbitraire
  (`text-[11px]`, garde du design system) ; et `AssiettesIndiqueesPanel.test.tsx`
  — la requête de la section consommait les réponses enchaînées des cas de la
  carte. La section y est une doublure, et deux cas gardent son montage.
- Second T3 rouge sur le LINT seul (`module` réassigné dans un banc, règle
  Next `no-assign-module-variable`) — renommé.
- T3 final avant la PR (résultat au corps de PR).

## 6. Problèmes ouverts

- Aucun E2E (corpus vide en CI).
- La section est une lecture de plus par ouverture de la carte : une requête
  corpus + deux requêtes dossier. Non mesuré en production.
- LOT-04 : bilan d'usage au conteneur, puis la décision sur la porte automatique.

## 7. Prochaine action exacte

PR, CI, revue lue, merge **seul** → `release-db` (fichiers sous `lib/clinical/`)
à approuver ; constat au conteneur ; puis regarder la section sur un dossier
réel qui porte un résultat.

## 8. Interdits encore actifs

Aucun mot de verdict écrit par la machine. Ne pas toucher `indicationsAssiettesV1.ts`.
Aucun autre merge pendant l'attente de `release-db`.
