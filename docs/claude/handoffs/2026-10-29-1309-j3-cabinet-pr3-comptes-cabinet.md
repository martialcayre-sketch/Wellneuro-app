# Handoff — 2026-10-29 — J3-cabinet, PR 3 : la page « Comptes du cabinet » (D-385, H58)

## Branche et état du dépôt

- Branche `lot/j3-cabinet-pr3-comptes-cabinet`, partie de `origin/main`
  (a4bb77ee, contient #1762), avancée en `--ff-only` sur 1e5a1279 (docs seules)
  avant la première édition ; worktree `file-d1-suite`, session concurrente,
  cycle en `git`/`gh` direct.
- Code seul : ni migration, ni drapeau, ni release-db, aucun fichier sous
  `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`. Les modules de la
  PR 1 (`statutsPhases.ts`, `etatRuntimeDerive.ts`, fiche, cockpit client) et
  de la PR 2 (`rejeuEpisodeCockpit.ts`, `finDeCycle.ts`) sont inchangés.

## Objectif

PR 3 sur 3 de J3-cabinet (plan
`docs/claude/propositions/2026-10-27-j3-cabinet-plan/README.md`, §2, §3, §5,
§6 point 3, §7) : le chargeur, la route, la page `/dashboard/cabinet` et son
entrée de rail, et les bancs du §5.

## Décisions prises

Pas de D-xxx neuve. Deux arbitrages du responsable du 2026-10-29, sur
question à options :
- **Masquage** : patron de `agregerConstatAvantT0`. Dès qu'une ligne d'un
  tableau compte un à quatre dossiers, toute la répartition de CE tableau est
  masquée, zéros compris ; l'effectif reste affiché. Écartés : « effectif
  seul » (contredit D-298 §2) et le masquage par ligne (il demanderait une
  D-xxx). Le masquage se fait côté serveur, et la route ne rend que l'agrégat.
- **Textes d'écran** validés mot pour mot tels que proposés (titre et rail,
  sous-titre, attente, erreur, vide, titres, lignes, « Dossiers », effectif,
  « masqué », motif du masquage, note sur « Indéterminé »).

Choix d'exécution :
- **L'élection du jalon** est transcrite de `ClinicalRuntimeSection`
  (`electionDuJalon`) : on part de `T0`. Si un jalon de mesure est dû, on lit
  d'abord la carte d'ancre du cycle courant, et le suivi reste retenu tant que
  la diffusion de cette carte rejouée n'est pas approuvée.
- **Le cœur est injectable** (`etapeDuDossier` et ses `LecteursDossier`) : le
  banc de parité nourrit la fiche et la page avec le même scénario.
- **Lecteurs Prisma** transcrits de leurs routes :
  - `lireCockpitAuPresent` vient du GET du cockpit, sans `asOf` et sans
    contradictions ni claims ;
  - `diffusionApprouvee`, `compterVersions` et `compterPointsRenseignes`
    viennent des routes `diffusion`, `versions` et `checkins` ;
  - le tableau Protocole vient de `GET /api/portail/protocole`, jusqu'à
    `estFinDeCycle`.
- **Population** : celle de `chargerTrajectoiresCabinet`, désactivés compris,
  comme arbitré le 2026-10-27.
- **Rail** : l'entrée « Comptes du cabinet » se place sous
  « Fiche-trajectoire », avec l'icône `Tally5`. Le banc du rail compte
  désormais quinze entrées.

## Fichiers modifiés

- Nouveaux :
  - `web/src/lib/praticien/comptesCabinet.ts` et son banc `comptesCabinet.test.ts` ;
  - `web/src/lib/praticien/pariteFichePage.test.tsx` ;
  - `web/src/app/api/praticien/comptes-cabinet/route.ts` et `route.test.ts` ;
  - `web/src/app/dashboard/cabinet/page.tsx` ;
  - `web/src/components/cabinet/ComptesCabinetPanel.tsx` et son banc `.test.tsx` ;
  - `web/e2e/comptes-cabinet.spec.ts`.
- Modifiés : `web/src/components/ui/SidebarRail.tsx` (l'entrée) et
  `SidebarRail.test.tsx` (l'ordre, quinze entrées).
- Clôture :
  - `changelog.d/2026-10-29-j3-cabinet-pr3-comptes-cabinet.md` ;
  - `docs/claude/plan-journal/H58/2026-10-29-01-j3-cabinet-pr-3.md` ;
  - ce handoff.

## Validations exécutées

- T1 (`check:rapide`) vert, `tsc --noEmit` et ESLint propres.
- Bancs du lot, verts :
  - `comptesCabinet.test.ts`, 17 cas : « sous cinq » par tableau, élection
    (dont le cycle T1 et un `maintenant` passé), « rien n'attend » contre
    « indéterminé », écart des plus de 40 envois ;
  - `pariteFichePage.test.tsx`, 4 scénarios sur les trois fixtures. Même
    phase et même suite de jalons de part et d'autre, l'élection comprise.
    Une mutation (libellé attendu inversé) rougit deux scénarios : le banc
    mesure ;
  - le banc de la route, celui du panneau (dont les libellés de phase égaux à
    `PHASES` de la fiche) et celui du rail ;
  - la garde « un seul rejeu » reste verte.
- T2 (`test:worktree --fast`) :
  - premier passage rouge sur `scripts/specs-drapeau-ali01.test.mjs`. Le banc
    de parité citait `Q_ALI_01`, remplacé par `Q_NEU_11` : seul le nombre
    d'envois compte. Le banc repasse seul ;
  - second passage vert en 7 min 15 s : 303 E2E passés, 7 sautés, dont
    `comptes-cabinet.spec.ts` sur Desktop Chromium et iPhone 13 (le cas du
    rail est réservé au desktop). Le correctif de journalisation de la revue
    est arrivé pendant ce passage ; il a été rejoué ensuite par Vitest, `tsc`
    et ESLint.
- `/code-review medium` : huit remarques.
  - Une corrigée : les exceptions du chargeur se journalisent désormais,
    message seul, sans dossier.
  - Sept écartées avec motif :
    - coût et parallélisme : le plan §7 interdit d'optimiser avant la mesure ;
    - le repli du rejeu sur la proposition est celui de la fiche, et la
      parité l'exige ;
    - l'inférence croisée entre tableaux est impossible : ce sont deux
      partitions indépendantes, masquées chacune pour elle-même (D-385 §6) ;
    - la case vide de l'en-tête de tableau : les lignes portent leur
      `th scope="row"`, et un libellé de plus serait un texte non validé ;
    - `r.ok` : le garde `!comptes` couvre ce cas ;
    - `prefixesActifs` : l'entrée s'allume par préfixe par défaut ;
    - `Tally5` existe dans lucide-react 1.24.0.

- **CI de la PR** :
  - premier passage rouge sur trois bases visuelles Desktop de la fiche
    (entrée du rail). Elles ont été régénérées par `visual-baselines` (run
    40873998113), relues image par image, et seules les trois refusées ont
    été committées ;
  - second passage vert sur 07d2cff7.
- **Revue CodeRabbit sur 07d2cff7**, trois remarques :
  - **corrigée** : la journalisation ne donne plus que le nom de l'erreur.
    Une erreur de validation Prisma recopie ses arguments, `idPatient`
    compris ;
  - **écartées avec motif**, les deux remarques sur l'échec d'une lecture
    groupée (chargeur partagé, `Promise.all`). Une panne de lecture groupée
    est une panne technique, pas l'état d'un dossier. La page le dit par son
    message d'erreur validé, au lieu de compter tout le cabinet en
    « Indéterminé ». L'arbitrage du 2026-10-27 vise les lectures et le rejeu
    d'UN dossier.
- **PR-Agent**, deux remarques écartées avec motif :
  - charge en production : le plan §7 demande la mesure d'abord, voir
    Problèmes ouverts ;
  - absence de drapeau : ni D-385 ni le plan n'en prévoient pour une page
    interne en lecture seule.

## Problèmes ouverts

- **Le coût réel n'est pas mesuré** sur des données de production. La ligne
  `[comptes-cabinet] N dossiers comptés en X ms` le donnera après le
  déploiement. Pour un dossier, l'élection fait jusqu'à trois lectures du
  cockpit, plus une lecture patient par `loadRuntimeInputs`. Toute
  optimisation (parallélisme interne, lecture unique des ancres, cache)
  attend cette mesure (plan §7).
- **Lectures transcrites, non partagées** : la diffusion, les versions, les
  check-ins et le portail jusqu'à la fin de cycle sont relus dans le chargeur
  selon leurs routes, sans être extraits. Si l'une de ces routes change, la
  page peut diverger en silence. Le banc de parité ne couvre pas cette couche
  (Prisma contre routes).
- **Écarts connus avec la fiche, assumés ou mineurs** :
  - plus de 40 envois : écart arbitré le 2026-10-27, éprouvé par un banc ;
  - un échec de `equilibre` ou des contradictions du GET ferait passer la
    fiche en erreur, alors que la page range le dossier ;
  - `preconditionsT0PourPatient` lit l'horloge serveur (l.326), comme le
    cockpit.
- **Bases visuelles** : l'entrée de rail change le rendu Desktop des bases
  `fiche-cockpit`, `fiche-tiroir-besoins` et `fiche-trajectoire-onglet`.
  Si `verify` rougit sur `visual.spec.ts`, il faut relancer le workflow
  `visual-baselines` et committer seulement les bases refusées (mémoire
  « Régénérer les bases visuelles »).

## Prochaine action exacte

Ouvrir la PR (`--body-file`), attendre le CI par `wn-attendre-ci` en fond,
régénérer les bases visuelles si elles rougissent, obtenir la revue
CodeRabbit ou PR-Agent (`wn-revue-pr-agent.mjs` à 0) sur la tête, et donner
un verdict à chaque commentaire. Pendant l'essai de D-373, poster ensuite
« prête @<sha> » avec le chemin de ce handoff, puis `/clear`. Après le
déploiement : lire la durée du comptage dans les journaux.

## Interdits encore actifs

- Aucune migration sans accord (G-7, porte 9) ; aucun seuil, dose, poids ou
  borne inventé ; aucun texte d'écran nouveau sans validation mot pour mot.
- Aucun fichier sous `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`
  (D-044, D-389 §5).
- Production en lecture seule, depuis un conteneur ; aucun identifiant de
  dossier dans le dépôt ; aucune liste de dossiers sur la page ; aucun
  journal d'accès par dossier.
- Ne pas toucher aux modules des PR 1 et 2 sans arbitrage.
- Pendant l'essai de D-373, l'intégrateur merge seul ; un merge à la fois,
  avec `wn-sonde-release-db.mjs` à `0`.
