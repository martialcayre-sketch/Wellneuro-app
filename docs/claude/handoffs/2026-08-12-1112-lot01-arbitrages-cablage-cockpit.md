# LOT-01 — les trois arbitrages exécutés, câblage cockpit, abstention `Q_ALI_01`

- **Branche** : `campaign/2026-08-10-chaine-t0/lot-01-etapes-3-6`, vivante, non
  mergée. Arbre propre, `origin/main` contenu (ahead 0 / behind 0).
- **Campagne** : chaîne T0 opérationnelle — LOT-01.
- **Tête** : `c14984fc`. Douze commits au-dessus d'`a83adfac`, 51 fichiers.

## Objectif du lot, et où il en est

Étapes 3 à 6 du LOT-01. Les étapes 4 et 6 étaient livrées ; les étapes 3 et 5
étaient bloquées sur des arbitrages que le code ne pouvait pas trancher. Ils ont
été rendus le 2026-08-12 et sont exécutés.

## Décisions prises

- **`D-050`** — la conversion cockpit va vers un modèle d'**affichage**
  (`ContradictionAffichee`), pas vers `DiscordanceFinding` : ce dernier hérite
  d'un `confidence` dont l'énumération ne propose aucune valeur « non
  applicable », et convertir un constat déterministe vers ce type obligerait à
  lui inventer un degré de certitude (garde de `D-041`). `D-044` avait laissé la
  cible **ouverte** ; `D-050` la nomme et **complète** `D-044` — il ne l'amende
  pas, contrairement à ce qu'une première rédaction affirmait.
- **`D-050`, second volet** — le câblage est fait dans ce lot :
  `POST /api/praticien/cockpit` rend les constats, `ClinicalRuntimeSection` les
  passe au panneau. Le critère de sortie **sur le panneau cockpit** est tenu ;
  la réserve de `D-048` sur ce point est fermée par la ligne `Statut`.
- **`D-051`** — `Q_ALI_01` résout vers deux questionnaires distincts (14 items
  /42, ou SIIN 57 /90) selon `WN_ALI_01_SIIN57`. Le repère de passation courante
  s'abstient dès **deux passations exploitables**, et la ligne porte le motif
  (`formeInstrumentAmbigue`). Consigne `synthese-v24`, empreinte
  `799b15ff47955b39`.

## Ce qui a été écarté, et pourquoi

- **Filtrer la passation écartée** dans le service de contradictions : retirer
  la ligne fait de la passation **antérieure** « la dernière » — le repli
  qu'`orientationService` refuse en toutes lettres. Son score est nullé, la
  ligne reste. Cela violait de surcroît le contrat écrit de
  `statutExcluDuRaisonnement` (« à n'utiliser que pour DÉSIGNER, jamais pour
  FILTRER »).
- **Abstention systématique sur `Q_ALI_01`**, passation unique comprise : avec
  une seule, il n'y a rien à départager et le repère reste vrai.
- **Déduire la forme depuis les identifiants d'items** (`AL1`…`AL14`) : plus
  fin, mais cela ferait dépendre un repère clinique d'une heuristique sur des
  clés de réponses brutes.

## Fichiers principaux

- `web/src/lib/clinical/contradictionsService.ts` — `contradictionsPourPatient`,
  double verrou **avant** toute lecture, recalcul depuis `rawAnswers`.
- `web/src/lib/clinical/orientationService.ts` — `scoresPourOrientation` renommé
  `scoresRecalculesPourRaisonnement` et exporté (fermeture partagée, non
  recopiée).
- `web/src/app/api/praticien/cockpit/route.ts`,
  `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` — le câblage.
- `web/src/app/api/praticien/synthese/route.ts`, `web/src/lib/anthropic.ts`,
  `web/src/lib/questionnaires/alimentaire.ts` — l'abstention et la consigne v24.
- `scripts/version-prompt-documents.test.mjs` — **nouveau garde**.
- `web/src/lib/formeCroiseeQAli01.guard.test.ts` — **nouveau garde**.

## Validations exécutées

- **T1** vert après chaque étape (dernier run : sortie 0).
- **T3 complet vert deux fois** : 09:24 et 10:37, E2E compris (136 tests, WebKit
  inclus), aucune occurrence du diagnostic de blocage navigateur.
- **Mutations vues rouges**, une par garde neuf : abstention retirée, marquage
  retiré, seuil ramené à « une passation », recalcul remplacé par le score
  stocké, verrou déplacé après la lecture, ligne retirée au lieu du score nullé,
  réponse de route codée en dur, liaison du composant coupée, garde de passation
  vide désactivée, version et empreinte périmées dans le fragment puis dans le
  registre.
- **Quatre revues adversariales `wn-reviewer`, quatre NO-GO, tous corrigés.**

## Problèmes ouverts

- **Le volet « vigilances de synthèse » de l'étape 5 n'est pas câblé** — les
  constats déterministes n'alimentent pas `vigilanceDeterministe`, qui ne vient
  toujours que de l'anamnèse. L'étape 5 n'est donc pas close, sa moitié cockpit
  l'est.
- **Périmètre asymétrique** : `snapshot`/`review` sont calculés sur les réponses
  incluses dans l'épisode T0 confirmé, les contradictions sur le **dossier
  entier**. Un constat peut reposer sur une passation laissée hors de l'épisode.
  Aligner les deux est un arbitrage clinique **non rendu**.
- **`D-051` ne répare pas le catalogue** : un identifiant qui désigne deux
  instruments reste une ambiguïté. L'orientation n'est protégée que par une
  garde indirecte (une forme relue contre l'autre définition sort
  `scored: false`), désormais tenue par un banc — mais une règle qui
  déclencherait sur autre chose que l'interprétation retrouverait le piège.
- **`D-049`** : deux séquences T3 complètes sans blocage (09:24, 10:37). La
  condition de sortie que la décision s'est donnée est remplie à la lettre.
  **Fermeture proposée, non prise** — elle rétablirait une ligne de `CLAUDE.md`
  et appelle sa propre entrée ; elle ne doit pas voyager dans une PR clinique.
- **Compaction de `SESSION_LOG.md` bloquée** : deux branches distantes vivantes
  y touchent (`origin/copilot/fix-ci-verify-check`,
  `origin/lot/handoff-skills-agents-copilot`), et le fichier est `merge=union`.
  Le journal est de plus **désordonné chronologiquement** (six ruptures) : une
  coupe doit se faire par date d'entrée, jamais par numéro de ligne.

## Interdits encore actifs

- **Rien ne s'allume** : la table de contradictions est livrée **non signée**.
  Le double verrou rend une liste vide quel que soit le drapeau. Signer est un
  geste distinct, qui n'appartient pas à ce lot.
- Aucune migration Prisma, aucun SQL destructif, aucune écriture en production.
- Revue, merge et suppression de branche appartiennent à Copilot, sauf
  autorisation transitoire en cours.

## Prochaine action exacte

`/wn-pr apply` — la clôture est complète (`SESSION_LOG.md` et ce fragment sont
dans le diff). Puis `/wn-merge apply` une fois `verify` lu par
`node scripts/wn-attendre-ci.mjs <N>`, dont **`0` est le seul code** qui
autorise à annoncer la PR prête.

Le diff porte deux finalités séparées en commits distincts : le lot lui-même, et
`ce7be21b` — un test de brouillon qui expirait de lui-même le 2026-08-12 à 11 h
(fixture du 13 juillet, durée de vie 30 jours), étranger au lot mais qui aurait
bloqué le CI de tout le monde.
