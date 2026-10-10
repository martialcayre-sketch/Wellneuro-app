# Handoff — 2026-10-10 — Lot 10A : idées suicidaires, message au patient et courriel au praticien (D-277)

## Branche et état Git

`feat/securite-10a-alerte-suicide`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, tirée de `origin/main` après le merge de
#1392 (`5111e365`). La copie principale n'a pas été touchée. Hors campagne
(BIO-PARCOURS en pause, `D-276`) : lot de sécurité issu de BP-26.

## Objectif

Compléter `D-275` selon les arbitrages du responsable du 2026-10-10 : un
message au patient dès sa réponse positive, un courriel neutre au praticien à
la transmission, pour les quatre questions sur le suicide et la case
« Idées noires ou suicidaires » de l'anamnèse.

## Décisions prises

- **`D-277`** : textes du message et du courriel **signés** par le
  responsable (« vos réponses » pour couvrir l'anamnèse) ; même règle que
  `SAF-QUEST-01` (toute réponse autre que la première option) ; l'encart
  permanent reste ; échec tracé au journal des correspondances, sans retry.
  Amende `D-275` §1 sur un seul point (un message calculé s'ajoute).
- Courriel décidé par `reponsesSecuriteDeclarees` (lecture du producteur) ;
  le verrou de signature n'est **pas** lu, à dessein — limite écrite dans
  `D-277`, avec celle du dossier clos (la carte du Fil n'y existe pas).
- Revue `wn-reviewer` : GO, trois P2 corrigés (envois en parallèle, échec
  journalisé `EMAIL.ALERTE_SECURITE_PRATICIEN.SEND_FAILED`, verrou documenté).
- Revue Copilot #1393 : ligne de journal réservée avant l'envoi (un seul
  courriel par source, même en concurrence) ; la course sur les réponses,
  antérieure, est routée ci-dessous.
- Fins de ligne : les deux routes étaient en CRLF à HEAD ; `.gitattributes`
  (`eol=lf`) les normalise à l'indexation. Diff réel : 62 lignes (`?w=1`).

## Fichiers modifiés

- `web/src/lib/securite/urgenceSuicide.ts` (règle pure, texte signé),
  `alerteSecuritePraticien.ts` (+ banc), `reponseSuicide.guard.test.ts`
- `web/src/components/patient/MessageReponseSuicide.tsx` (+ banc),
  `GenericQuestionnaire.tsx`, `web/src/app/portail/[token]/page.tsx`
  (+ `anamneseMessageSuicide.test.tsx`)
- `web/src/app/api/patient/submit/route.ts`, `api/portail/valider/route.ts`
  (+ bancs), `lib/correspondance/patient.ts`, `lib/observability/eventCodes.ts`
- `docs/DECISIONS.md` (`D-277`), `changelog.d/2026-10-10-securite-10a-message-et-courriel.md`,
  `docs/claude/MATRICE_CONSOMMATION.md` (régénérée), `docs/claude/SESSION_LOG.md`

## Validations exécutées

- Bancs ciblés : 83 cas verts (accord navigateur/serveur option par option
  sur les quatre questions, options servies + `parseFloat` ; textes mot pour
  mot ; parallélisme alerte/accusé ; échecs tracés ; écrans questionnaire et
  anamnèse).
- `npm run check` vert. T2 `--fast` vert avant les correctifs de revue
  (4 min 49 s) ; rejoué après : voir la PR.

## Problèmes ouverts

- Le banc d'anamnèse joue ses trois états sur un seul rendu : deux rendus
  complets du portail dans un même processus épuisent sa mémoire.
- Après déploiement : constater par conteneur, en agrégats, les lignes
  `alerte_securite_praticien` du journal (attendu : 0 tant qu'aucune réponse
  positive n'arrive).
- **Course antérieure, routée hors lot (revue Copilot #1393)** : deux
  transmissions concurrentes d'un même questionnaire passent toutes deux la
  vérification de `statutReponses` dans `api/patient/submit` et créent deux
  réponses (`idAssignation` seulement indexé), donc deux courriels. Correctif
  attendu dans l'écriture des réponses (transaction + `SELECT … FOR UPDATE`
  sur l'assignation, comme `lib/agenda-sommeil/cloture.ts`) — lot à cadrer.
- Restes de `D-275` non cadrés : geste de lettre sans consultation porteuse ;
  date « depuis » du Fil.

## Prochaine action exacte

PR, CI par `wn-attendre-ci`, commentaires en ligne, merge, constat de
déploiement. Puis l'étape 3 de l'ordre : lots de sécurité 11A (EI
« incertaine », commentaires du laboratoire non transcrits, DASS-21 D ignorée
par l'extinction du stress).

## Interdits encore actifs

- Aucune reformulation des deux textes sans nouvelle signature.
- Aucun nom ni identifiant de dossier dans le courriel ni dans le dépôt.
- Rien du dossier BP-26 par module au dépôt (public).
