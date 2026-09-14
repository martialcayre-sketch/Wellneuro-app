---
id: "LOT-01"
titre: "Ouvrir les quatre rayons de corpus dormants"
statut: "terminé"
dépend_de: "—"
---

# LOT-01 — Ouvrir les quatre rayons dormants

## But

Le plus petit lot de la campagne, indépendant de tous les autres, et le seul qui
mette de la matière sous les yeux du praticien dès le jour de sa livraison.

Quatre rayons de corpus sont marqués `dormante` dans `consommation_decisions.json`
avec un **réexamen daté au 2026-09-01, dépassé**. Leurs notebooks sont ingérés et
validés ; le mécanisme est en production depuis le 2026-08-22
(`WN_RECHERCHE_CORPUS_ENABLED`, `D-081`) ; ce qui les retient est une allowlist de
trois mots, et leur raison écrite dit elle-même que l'élargir est « une décision
praticien ».

**Mesure au registre** (instantané du 2026-08-03, sources de conduite seules) :

| Rayon | Sources de conduite | Claims validés |
|---|---|---|
| ouvert — cognition | 11 | 60 |
| ouvert — douleur | 5 | 0 |
| ouvert — intestin | 2 | 0 |
| **fermé — sommeil** | 11 | **297** |
| **fermé — humeur** | 14 | **283** |
| **fermé — nutrition** | 20 | **291** |
| **fermé — stress** | 5 | **115** |

L'allowlist expose 60 claims de conduite et en retient 986.

## Résultat observable

Le sélecteur de la recherche corpus clinique propose sept rayons au lieu de trois,
et une recherche sur « réveils nocturnes » rend des claims validés du notebook 02.

## Périmètre

- `web/src/lib/supplement-library/rayonCorpus.ts` — `RAYONS_RECHERCHE_CORPUS` passe
  de trois à sept ; `RAYON_VERS_NOTEBOOK` porte déjà les quatre (notebooks 02, 03,
  04, 09) ; le commentaire qui les déclare « inertes » est corrigé.
- `web/src/components/corpus/RechercheCorpusRayonPanel.tsx` — `RAYONS_DISPONIBLES`
  reçoit les quatre libellés.
- `docs/claude/corpus/consommation_decisions.json` — les quatre verdicts `dormante`
  sont retirés, avec la date et le motif de leur ouverture.
- `docs/claude/MATRICE_CONSOMMATION.md` — régénérée.
- Décision praticien datée + fragment `changelog.d/`.

## Hors périmètre

- **`rayon:biologie` reste dormant** : son réexamen est au 2026-10-01, non échu, et
  ce rayon a son propre navigateur depuis CB-08.
- Aucun claim n'entre dans un protocole. Ouvrir un rayon met des claims **sous les
  yeux**, il n'en fait entrer aucun dans une action.
- `micronutrition` reste hors de cette allowlist : il est gardé par `WN_C4_ENABLED`,
  et l'y ajouter contournerait ce drapeau — c'est le motif écrit de l'allowlist.

## Réserve à consigner au lot

Le panneau vit dans la Bibliothèque (`app/dashboard/bibliotheque/page.tsx`), **pas
dans le constructeur**. Ouvrir met les claims à portée, dans un autre onglet — pas
sous les yeux pendant la saisie. C'est un fait à écrire, pas un défaut à corriger ici.

## Fichiers probables

`rayonCorpus.ts` · `RechercheCorpusRayonPanel.tsx` · `rayonCorpus.test.ts` ·
`app/api/praticien/corpus/rayons/route.test.ts` · `consommation_decisions.json` ·
`MATRICE_CONSOMMATION.md` · `docs/DECISIONS.md` · `changelog.d/`

## Interdits

- Pas de secret, pas de donnée patient réelle, pas de migration.
- Ne pas toucher à `servirRayonCorpus` : il ne gate plus sur aucun drapeau produit,
  et chaque route reste responsable de restreindre à SES rayons.
- Ne pas élargir l'allowlist à `RAYON_VERS_NOTEBOOK` entier.

## Étapes

- [ ] Étendre l'allowlist et le sélecteur.
- [ ] Retourner les deux bancs qui épinglent « cognition, douleur, intestin »
      (`rayonCorpus.test.ts`, `corpus/rayons/route.test.ts`).
- [ ] Retirer les quatre verdicts de `consommation_decisions.json`.
- [ ] Régénérer la matrice ; `node scripts/wn-matrice-consommation.mjs --strict` = 0.
- [ ] Décision datée + fragment.

## Tests

T1 puis T2. Les deux bancs d'allowlist doivent être vus ROUGES sur l'ancienne
assertion avant d'être réécrits.

## Critères de done

Sept rayons servis ; `--strict` en code 0 ; matrice à jour ; décision au registre.

## Résultats

Clos le **2026-09-14**, `D-187`. Livré **avant le LOT-00** parce qu'il n'en dépend
pas : c'est le seul lot de la campagne qui change quelque chose le jour même.

- `RAYONS_RECHERCHE_CORPUS` à sept ; `RAYONS_DISPONIBLES` en miroir, les trois
  rayons d'origine gardant leur rang — **le premier élément est le rayon
  sélectionné au montage**, et un banc existant asserte `rayon=cognition` au
  premier appel.
- Les quatre verdicts `dormante` retirés ; `rayon:biologie` est désormais le seul
  du registre. `--strict` en code 0 ; matrice régénérée (quatre lignes passent de
  « aucune — dormante » à la route).
- **Deux bancs ajoutés, non prévus au cadrage.** (1) Un **banc de miroir** entre le
  sélecteur d'écran et l'allowlist : ce sont deux listes dans deux fichiers, et un
  rayon proposé mais refusé rendrait un 400 `rayon_invalide` à chaque recherche —
  une option morte que rien ne signale. (2) Un banc qui vérifie que chaque rayon de
  l'allowlist désigne bien un notebook. Le banc d'exclusion de `micronutrition` est
  rendu explicite plutôt que déduit.
- **Deux pièges rencontrés, à retenir.** `node scripts/wn-matrice-consommation.mjs`
  **sans `--markdown` n'écrit pas le fichier** — il ne rend que le JSON, et la garde
  de fraîcheur reste rouge. Et importer la constante (et non plus seulement le
  *type*) depuis `rayonCorpus` dans un test de composant **tire `@/lib/prisma`**,
  qui exige `DATABASE_URL` : deux `vi.mock` l'évitent, comme le fait déjà le test du
  service.

**Ce qui n'est pas fait, et reste vrai** : le panneau vit dans la Bibliothèque, pas
dans le constructeur.
