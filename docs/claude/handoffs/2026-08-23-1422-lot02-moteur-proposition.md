# Handoff — 2026-08-23 — Alliance 6.0-B, LOT-02 : le moteur de proposition

## Branche et état Git

`feat/lot02-moteur-proposition-alliance-6b`, worktree `alliance-6b-lot02`,
depuis `origin/main` 67bd068c (qui contient déjà les arbitrages, PR #775
mergée). Aucune migration, aucun `schema.prisma` touché.

## Objectif

Livrer le module qui assemble des propositions d'objectif à partir de
fragments sourcés, et la route praticien qui les sert et enregistre l'écart
motivé. Déterministe, sans LLM ([[D-094]] §4).

## Décisions prises

**Deux points de conception que la fiche ne tranchait pas.**

1. **Qui écrit `propositions_objectif`.** La `DecisionCard` n'est pas
   persistée (`protocol_drafts` n'en garde que les empreintes d'ancrage) et
   G7 interdit de la recalculer : un GET ne peut pas assembler, et aucun autre
   lot ne portait cette écriture. Arbitré par le responsable : **POST à deux
   gestes** — `assembler` (le cockpit envoie plainte, candidats, SHA ; la
   route lit l'anamnèse EN BASE) et `ecarter`. Idempotent par empreinte.
2. **`assembleeLe` est la clé d'assemblée.** La caducité se dérive : dernier
   assemblage = vivant, précédents = caducs. Ce n'est pas une duplication de
   `creeLe` — un seul `createMany` la pose à l'identique pour toute
   l'assemblée.

**L'anamnèse ne vient jamais du client** — frontière de confiance de la
route. Plainte et candidats, si : la route vérifie forme, longueurs et SHA
hexadécimal, et **ne feint pas** de vérifier l'authenticité du SHA (la table
signée vit sous `lib/clinical/`, que G7 lui interdit).

**Un mot renommé plutôt qu'une garde assouplie.** La source « instrument »
porte `restitution` et non le mot que l'usage attendrait — ce dernier est
refusé comme clé par le balayage. Ce que le fragment cite n'est pas la
mesure mais le libellé publié ; précédent `marqueurPrisma`.

## Fichiers modifiés

- `web/src/lib/praticien/propositionObjectif.ts` (neuf) + `.test.ts` (50 cas)
  + `.guard.test.ts` (15 cas, G7-1 à G7-5)
- `web/src/app/api/praticien/propositions-objectif/route.ts` (neuf) +
  `route.test.ts` (29 cas)
- `web/src/lib/patient/featureFlag.ts` : `isObjectifProposeEnabled` et
  `dossierDansPerimetreProposition` (additif)
- fiche LOT-02 close, fragment `changelog.d/`

## Validations exécutées

- **T1 vert** (`npm run check`, exit 0).
- **Bancs du lot : 94 verts** (50 + 15 + 29).
- **T2 : 155 passés, 1 échec** — `portail-parcours` iPhone 13, `page.goto` en
  timeout de chargement. **Reproduit à l'identique sur un arbre d'où le lot
  avait été retiré** (module, route et drapeaux déposés de côté, `featureFlag`
  rendu à `HEAD`) : blocage WebKit connu de ce Mac, étranger au lot.
- **Quatre gardes vues rouges par mutation réelle**, la cinquième par `tsc` :
  import de `clinical-engine/` (G7-1), propriété `rangCandidat` (G7-2),
  `objectifNegocie.create` dans la route (G7-3), `rangAffichage` ajouté au
  type exposé (G7-4), balayage désarmé (G7-5).
- **Un défaut réel trouvé par un banc** : `return promesse` dans un `try` ne
  l'attend pas, donc un rejet Prisma échappait au `catch` — la route aurait
  propagé un message qui recopie le `data:` du `createMany`, c'est-à-dire les
  mots du patient. Corrigé en `return await`.

## Problèmes ouverts

- **Une assemblée devenue VIDE ne retire pas la précédente** : il n'existe
  aucune ligne à écrire pour dire « désormais, rien ». Fermer ce cas demande
  une colonne ou une table d'assemblée — donc une migration, hors périmètre.
  Le geste `assembler` fait foi ; le LOT-03 doit l'appeler avant d'afficher.
- Le SHA du périmètre signé n'est **pas confrontable** depuis la route (G7).
  Sa forme est vérifiée, son authenticité non.
- La revue `wn-reviewer` n'a pas été jouée.

## Prochaine action exacte

Lancer la revue `wn-reviewer` sur le diff, puis ouvrir la PR. Ensuite le
LOT-03 (cockpit : reprendre, amender, écarter ; diff proposé↔négocié), qui
consomme `PropositionExposee` et ajoute `sourcePropositionId` à la route
objectifs.

## Interdits encore actifs

- Aucun import de `clinical-engine/` ni `clinical/` depuis le module ou la
  route (G7-1) ; aucune écriture sur les tables de 6.0-A (G7-3).
- `enoncePatient` jamais pré-rempli autrement que par citation verbatim
  sourcée ; le moteur ne paraphrase jamais.
- Aucun LLM dans ce lot ; aucun tri, rang, score ou numérotation ([[D-094]]
  §3, [[D-093]]).
- Drapeau `WN_OBJECTIF_PROPOSE` éteint à la livraison — l'allumer est un geste
  du responsable.
