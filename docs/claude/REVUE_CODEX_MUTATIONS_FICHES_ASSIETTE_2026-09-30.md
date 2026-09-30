# Contre-revue adverse, seconde passe — les bancs de la fiche d'assiette mordent-ils ?

Date : 2026-09-30. Cible : `3d49537a`. Énoncé :
`PROMPT_CONTRE_REVUE_CODEX_FICHES_ASSIETTE_MUTATIONS_2026-09-30.md`. Jouée
par Codex, lancée par le responsable, dans un worktree jetable supprimé à la
fin. Première passe (sur lecture) :
`REVUE_CODEX_ADVERSE_FICHES_ASSIETTE_2026-09-29.md`.

**Verdict du contre-relecteur : les seize invariants ont chacun au moins un
banc qui mord.** Une trouvaille P1 est déclarée pour M7, et elle est écartée
ci-dessous, avec son motif. Aucun invariant n'est `NON VÉRIFIABLE`.

## 1. Mutations jouées (contre-relecteur)

| # | Fichier:ligne muté | Mutation | Bancs désignés et résultat | Verdict |
|---|---|---|---|---|
| M1 | `diffusion/route.ts:431` | `classeEtCode(err)` → `err.message` / `String(err)` | `journaux.guard` rouge 1/3 ; `route.test` rouge 1/43 | MORD |
| M2 | `registreGabarits.ts:552` | message neutre → « fiche d'assiette » | `registreGabarits.test` rouge 3/20 ; `email.test` vert 18/18 | MORD |
| M3 | `diffusion/route.ts:332` | comparaison du jeton neutralisée | `route.fiches.test` rouge 2/3 ; `route.test` rouge 2/43 | MORD |
| M4 | migration M2 `:243` | garde de la version de référence neutralisée | contrat SQL négatif rouge (brouillon non refusé) | MORD |
| M5 | `diffusion/route.ts:320` | verrou de chaîne → `Promise.resolve()` | `route.test` rouge 1/43 | MORD |
| M6 | `diffusion/route.ts:205` | `payload: envoiFichesOuvert()` → `payload: true` | `route.test` rouge 1/43 | MORD |
| M7a | `diffusion/route.ts:109` | suppression de `!accepteNouvelEnvoi(dossier)` | `route.fiches.test` **vert 3/3** | NE MORD PAS |
| M7a′ | même mutation | banc complémentaire | `route.test` rouge 1/43 | MORD |
| M7b | `apercuRemise.ts:143` | blocage `dossier_non_suivi` ignoré | `apercuRemise.test` rouge 1/13 | MORD |
| M8 | `servicePatient.ts:86` | `where: { idPatient }` → `where: {}` | `servicePatient.test` rouge 1/27 | MORD |
| M9 | `ficheServie.ts:87` | remise maximale → minimale | `ficheServie.test` rouge 3/21 ; `servicePatient.test` rouge 2/27 | MORD |
| M10 | `servicePatient.ts:123` | anomalies ignorées, contenu servi | `servicePatient.test` rouge 1/27 | MORD |
| M11 | portail fiches `route.ts:37` | drapeau de lecture neutralisé | `route.test` rouge 7/16 | MORD |
| M12 | portail lectures `route.ts:281` | appartenance aux objets servis neutralisée | `route.test` rouge 10/38 | MORD |
| M13 | `FicheRemiseLecture.tsx:85` | texte React → `dangerouslySetInnerHTML` | `FichesRemises.test` rouge 1/17 | MORD |
| M14 | `annonce.ts:109` | échec absorbé → exception relancée | `annonce.test` rouge 2/14 | MORD |
| M15 | `effacement.ts:75` | suppression des remises → des approbations | `effacement.test` rouge 2/14 ; `remises.guard` rouge 1/4 | MORD |
| M16 | `etat.ts:100` | « validée » → « non retirée » | `etat.test` rouge 1/8 | MORD |

Contrôles finaux du contre-relecteur :

- code restauré, 246 tests ciblés verts, et 13/13 pour `apercuRemise` ;
- `npm run check` vert ;
- `test:worktree -- --fast` sans mutation vert (SQL, build, E2E) ;
- statut Git vide, puis worktree supprimé.

## 2. La trouvaille M7a — `ÉCARTÉE`, avec motif

**Contre-relecteur.** Supprimer `!accepteNouvelEnvoi(entrees.dossier)` dans
`blocageEtActionsDesFiches` laisse `route.fiches.test.ts` vert. Le même banc
de `route.test.ts` rougit.

**Vérification.** L'invariant « un dossier clos ne reçoit aucune fiche »
est gardé en deux moitiés, qui mordent toutes deux :

- `route.test.ts:608` (« un dossier clos bloque toutes les fiches — lu DANS
  la transaction, verrouillé en partage ») : la route transmet bien le
  blocage `dossier_non_suivi` à l'aperçu, sur l'état lu sous verrou. Il rougit
  sous M7a ;
- `apercuRemise.test.ts` : un blocage empêche toute remise. Il rougit sous
  M7b.

`route.fiches.test.ts` a un autre objet, l'invariant du jeton de bout en bout
(en-tête du fichier), et n'emploie jamais un dossier clos. **Le défaut est
dans l'énoncé**, dont la ligne M7 omettait `route.test.ts`. Ce n'est pas un
trou de protection. Aucun banc n'est ajouté.

## 3. Ce que la passe établit, et ses limites

- Chaque invariant de `D-251` a au moins un banc qui rougit quand un tiers,
  qui n'a pas écrit le code, casse l'invariant à l'endroit de son choix.
- Une mutation par invariant, parfois deux : cela montre que les bancs
  mordent, pas qu'ils mordent sur **toute** mutation possible.
- `email.test.ts` est resté vert sous M2 : la mutation portait sur le
  registre, dont les trois contrôles dédiés ont rougi. Le contre-relecteur ne
  le classe pas comme trouvaille, et l'auteur non plus.
