# Handoff — BIO-INGEST, préalable du LOT-02 : amendement RGPD/TRUST (A4 de D-256)

## Branche et état Git

- `docs/bio-ingest-rgpd-ia-vision`, partie de `origin/main` à bf35e7af (#1276).
- Sept fichiers modifiés, commit et PR à suivre ce handoff (phase `travail`,
  fenêtre de clôture ouverte).
- Le LOT-01 est déployé : bf35e7af en `success` le 2026-10-01 à 11:54 UTC, aucun
  commit plus ancien déployé après lui (`D-248`).

## Objectif

Poser la condition de sortie A4 de `D-256` : déclarer, **avant** toute
activation et sans code d'extraction, l'envoi des comptes rendus biologiques au
sous-traitant IA (Anthropic). La déclaration va au registre RGPD et aux
documents patient TRUST.

## Décisions prises (responsable, 2026-10-01, consignées dans l'amendement de D-256)

1. **`donnees_confidentialite` v11, avec accusé.** La v10 devenait fausse
   (« saisis par votre praticien ») et incomplète : elle taisait la
   transmission, et sa ligne Anthropic omettait le relevé. Sans accusé, celui
   de la v10 encore dû s'effaçait.
2. **Le compte rendu est déclaré envoyé EN ENTIER**, identité comprise. Le
   LOT-02 ne promet ni n'écrit aucun masquage.
3. **Formulation durable**, sans « avant sa mise en service ».
4. **La demande de DPA Anthropic doit être ENVOYÉE** avant la pose du drapeau,
   sa date établie au fil. La signature n'est pas exigée.
5. **Information par le document, pas par la personne** (P1 de la revue,
   écarté avec motif) : aucun garde n'exige l'accusé de la v11 avant une
   extraction.

Écarté : masquer l'en-tête avant envoi (non garantissable sur des documents
hétérogènes) ; un garde « accusé v11 requis » par dossier (arbitrage 5) ; ne
pas faire de v11 (elle aurait laissé une phrase fausse servie).

## Fichiers modifiés

- `web/src/lib/trust/contenus/registre.ts` : `USAGE_IA_V4` (sans accusé) et
  `DONNEES_CONFIDENTIALITE_V11` (avec accusé). Ajouts seuls, empreintes
  calculées par `canonicalSha256`.
- `web/src/lib/trust/contenus/registre.test.ts` : vingt versions. Les bancs v3
  et v10 lisent leur propre version. Un banc A4 couvre la transmission entière,
  l'ordre des paragraphes, la conservation, et l'exclusion des fiches de la
  ligne Anthropic courante.
- `docs/DOSSIER_RGPD.md` : §2 ter (nouveau), rubriques 5, 6, 7 (quatrième
  flux), 8 et 14 (ligne DPA Anthropic).
- `docs/DECISIONS.md` : amendement du 2026-10-01 en tête de D-256.
- `docs/claude/campagnes/2026-09-30-bio-ingest/lots/LOT-02-staging-et-pdf.md` :
  préalable coché ; conditions de pose, promesses de la v4 à tenir, tests
  ajoutés.
- `docs/claude/campagnes/CADRAGE_BIO_INGEST_2026-09-30.md` : §5 point 3 barré.
- `changelog.d/2026-10-01-bio-ingest-rgpd-ia-vision.md`.

## Validations exécutées

- `npx vitest run src/lib/trust` vert (70 tests), rejoué après les corrections
  de la revue.
- T1 `check:rapide` vert. T1 complet `npm run check` vert, après les
  corrections.
- T2 `test:worktree -- --fast` vert : 225 E2E, 3 sautés, 3 min 46 s. Joué
  **avant** les corrections de la revue, qui ne touchent que des chaînes de
  bancs, un `changeSummary` (hors empreinte) et de la doc.
- Revue `wn-reviewer` : GO, un P1 et six P2. Les six P2 sont corrigés : le
  « désormais » du `changeSummary`, « fausse » devenu « incomplète » sur
  l'hébergement, la date du prélèvement et le modèle et la version à tenir au
  LOT-02, les trous du banc, « pièce d'état civil », la limite de l'accusé. Le
  P1 est arbitré (décision 5).

## Problèmes ouverts

- **Demande de DPA Anthropic non envoyée.** C'est un geste du responsable, qui
  conditionne la pose du drapeau du LOT-02.
- **Aucun document patient n'informe d'un transfert hors UE vers Anthropic.**
  Le trou est antérieur à ce lot (question de la revue), mais il porte
  désormais sur des documents d'identité. Il n'a pas été traité ici et relève
  du §7 et du conseil.
- La source de la rubrique 6 dit encore « v5 depuis le 2026-09-07 », un énoncé
  périmé et antérieur à ce lot, laissé tel quel (changement minimal).
- Durée de conservation du document source : trou de la rubrique 8.

## Prochaine action exacte

Committer, ouvrir la PR (`--body-file`), lancer `node scripts/wn-attendre-ci.mjs
<N>` en fond, lire les commentaires en ligne, merger, puis constater le
déploiement (`D-248`). Après le déploiement : compter par conteneur, en
agrégats, les dossiers actifs qui devront accuser la v11. Ensuite : le LOT-02
en mode Plan, modèle de staging, migration seule dans sa PR.

## Interdits encore actifs

- Aucun code d'extraction et aucun drapeau avant les conditions du §2 ter :
  v4 et v11 déployées et constatées, §2 ter validé, demande de DPA envoyée et
  datée.
- Ne jamais écrire de masquage d'identité dans le LOT-02, ni le promettre.
- Migration seule dans sa PR, `release-db` approuvée par un humain (`D-087`).
- Aucune écriture dans `resultats_biologiques` sans validation humaine ; aucune
  conversion d'unité (`D-157`) ; aucun choix final d'analyte par LLM.
- Aucune donnée patient réelle dans le dépôt ; lecture de production par
  identifiant et en conteneur seulement.
