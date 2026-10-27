# J3-cabinet — plan d'extraction et d'architecture (2026-10-27)

Lot J3-cabinet (file A, `docs/claude/PLAN_WELLNEURO.md`, fiche H58), décidé par
[[D-385]] : la page « Comptes du cabinet ». Elle a deux tableaux. Le premier
range les dossiers par prochaine étape : les sept phases du rail, plus « rien
n'attend ». Le second les range par état du protocole. L'effectif est toujours
affiché, et la répartition est masquée sous cinq dossiers distincts ([[D-298]]).

Ce dossier porte trois choses :
- le plan rendu par une passe d'architecte en lecture seule ;
- les arbitrages du responsable du 2026-10-27 ;
- le découpage en PR.

Le lot se code dans une session dédiée. Les lignes citées datent du relevé du
2026-10-27 et se revérifient en tête de lot. Aucun texte de cette page n'est un
texte d'écran.

## 1. Arbitrages du responsable (2026-10-27)

Sur la procédure :

- **Approche hybride, module partagé.** Le moteur `statutPhase` sort de la
  fiche et devient un module pur, lu par la fiche et par la page : un seul
  calcul. Les lectures simples se font en requêtes groupées, et le rejeu
  clinique se fait dossier par dossier, par les fonctions serveur du cockpit.
  Toute lecture en échec rend le dossier « indéterminé ». Un banc tient la
  parité entre la fiche et la page.
- **Une page et une entrée de rail.** La page vit à `/dashboard/cabinet`, avec
  une entrée dans `SidebarRail`, près de « Trajectoires ». Elle n'ouvre aucun
  dossier, donc elle n'écrit aucun journal d'accès par dossier.
- **Architecte d'abord.** Ce plan, puis une session dédiée.

Sur les points que D-385 ne tranche pas :

| Question | Arbitrage |
|---|---|
| Les dossiers désactivés comptent-ils ? | **Oui, tous.** C'est la même population que la page Trajectoires (`chargerTrajectoiresCabinet` ne filtre pas sur `actif`), et D-385 §4 dit « tous les dossiers du cabinet ». |
| Quand un dossier compte-t-il « indéterminé » ? | **Dans deux cas** : une lecture ou le rejeu échoue ; ou `phaseDue` ne rend aucune phase alors qu'un statut est « inconnu ». Autrement, « rien n'attend » s'affirmerait sur de l'inconnu (`DC-24`). Quand une phase est due, le dossier se range sous elle, comme sur la fiche, même si un autre statut reste inconnu. |
| Quelle population pour le tableau 2 ? | **Tous les dossiers.** Les deux tableaux ont le même effectif ; un dossier sans T0 compte « sans protocole diffusé ». |
| Un dossier à plus de 40 envois ? | **Écart accepté et documenté.** La fiche rend ce dossier « indéterminé » parce que sa route tronque la liste ; la page lit la liste complète et lui donne un statut. Le banc de parité écrit l'écart et ne couvre que les dossiers sous 40 envois. |

Ce qui découle de D-385 sans arbitrage neuf :

- Un dossier neuf, sans réponse ni assignation, se range en « Décision 21 j » :
  un épisode non confirmé est une action exigible
  (`FichePatientPanel.tsx:2562`). D-385 exige le même calcul que la fiche, et
  aucune case « nouveau » ne s'invente.
- Le message d'attente pendant le comptage est un texte d'écran praticien. Il
  se propose au responsable dans le lot, mot pour mot.

## 2. Modules purs

### a) `web/src/lib/trajectoire-partagee/statutsPhases.ts`

C'est le moteur, extrait de `FichePatientPanel.tsx:1191-1333`. Son corps est
repris à l'identique.

```ts
/** Sous-ensemble exact d'EtatRuntimeClinique que les statuts consomment. */
export type EtatRuntimePourPhases = {
  chargement: boolean;
  erreur: 'session' | 'patient' | 'technical' | null;
  episodeConfirme: boolean;
  nombreVersions: number;
  versionsLues: boolean;
  suiviRenseigne: boolean | null;
  suiviOuvert: boolean | null;
  trajectoireErreur: boolean;
  trajectoireEnLecture: boolean;
  reevaluationMesuree: boolean;
  decisionBloquee: boolean;
  rideauT0Satisfait: boolean | null;
  selectionPrioriteDue: boolean | null;
};

export type EntreesStatutsPhases = {
  lecturesDeBase: 'ok' | 'indisponible';
  corrections: { etat: 'chargement' | 'chargees' | 'erreur'; enAttente: number };
  passations: { etat: 'chargement' | 'chargees' | 'tronque' | 'erreur'; assignees: number };
  phase3: {
    lu: 'chargement' | 'lu' | 'erreur';
    etat: { objectifsActifs: number; synthesePubliee: boolean; demandesCorrectionEnAttente: number } | null;
  };
  runtime: EtatRuntimePourPhases | null;
};

export function statutPhase(id: IdPhaseContrat, e: EntreesStatutsPhases): StatutPhaseContrat;
export function statutsDesPhases(e: EntreesStatutsPhases): Record<IdPhaseContrat, StatutPhaseContrat>;
/** Compose les bloqueurs et les actions exigibles comme FichePatientPanel:2557-2565,
 *  puis appelle phaseDue (contrat.ts:100). Sert aussi la phase initiale (l.1357-1384). */
export function phaseDueDuDossier(e: EntreesStatutsPhases): IdPhaseContrat | null;
```

Ce que le relevé a constaté, et qui se reproduit tel quel, sans correction :

- Le `data` de la fiche est la réponse de `/api/praticien/equilibre`
  (`FichePatientPanel.tsx:832`), et non celle de `/api/praticien/reponses`.
- `statutPhase` n'en lit que le garde `!data || 'unavailable' in data`.
- `const priorites` y est une variable morte, et `reponses` y figure en
  dépendance sans être lu.

Le commentaire de frontière de `contrat.ts:8-10` (« le moteur reste dans
FichePatientPanel ») est amendé : c'est précisément ce que D-385 déplace.

### b) `web/src/lib/trajectoire-partagee/etatRuntimeDerive.ts`

Il dérive les champs runtime, en transcription de
`ClinicalRuntimeSection.tsx:1410-1453`, `1518-1528` et `1542`.

```ts
export type EntreesRuntimeDerive = {
  cockpit:
    | { statut: 'ready'; decisionCard: DecisionCard }
    | { statut: 'proposal_required'; preconditions: PreconditionsT0 | null }
    | { statut: 'chargement' }
    | { statut: 'erreur'; erreur: 'session' | 'patient' | 'technical' };
  versions: { luesPourLaCarte: boolean; nombre: number };
  checkins: { lusPourLaCarte: boolean; pointsRenseignes: number };
  trajectoire:
    | { statut: 'chargee'; cycles: readonly { jourZero: string | null; jalons: readonly { jalon: JalonMomentum; mesure: boolean }[] }[] }
    | { statut: 'erreur' } | { statut: 'en_lecture' };
};
export function deriverEtatRuntimePourPhases(e: EntreesRuntimeDerive): EtatRuntimePourPhases;
```

Seul le rejeu donne trois champs :
- `decisionBloquee` et `selectionPrioriteDue` viennent de la carte rejouée,
  `rejouerChaine` dans `cockpit/route.ts:546-575`. Ce rejeu dépend de
  `episodePersisteRejouable` (l.527-537), de `proposeRuntimeEpisode` et de
  `loadRuntimeInputs` (l.278-323) ;
- `rideauT0Satisfait` vient de `preconditionsT0PourPatient`
  (`clinical-engine/preconditionsT0Prisma.ts:130`), comme dans le script de
  constat `web/scripts/constatAvantT0.ts`.

Les lectures groupées donnent `episodeConfirme`, `suiviOuvert` et
`reevaluationMesuree`. `nombreVersions` et `suiviRenseigne` demandent seulement
l'identité de la carte, qui se dérive de l'ancre rejouée.

**Parité critique : l'élection du jalon.** La fiche part du jalon T0, puis se
resynchronise (`ClinicalRuntimeSection.tsx:544`, `1079-1099`) : elle prend
d'abord la carte de l'ancre courante, et ne bascule vers le jalon de mesure
que si la diffusion de l'ancre est approuvée. Le chargeur reproduit cette
élection, sinon la parité casse à cet endroit.

## 3. Chargeur serveur : `web/src/lib/praticien/comptesCabinet.ts`

Il suit le patron de `chargerTrajectoiresCabinet`
(`lib/praticien/chargementCabinet.ts`) et du constat avant T0.
- `compterCabinet(emailPraticien, maintenant)` charge les comptes.
- `agregerComptesCabinet(lignes, seuil)` est un agrégateur pur. Il reprend le
  patron de `agregerConstatAvantT0` (`lib/constats/avantT0.ts:60-92`) : un
  `Compte` vaut un nombre ou `'masqué'`, aucune différence ne permet de
  reconstituer un compte masqué, et un zéro s'affiche. Le seuil vient de
  `SEUIL_COHORTE_CABINET` (`lib/protocol/cabinet.ts:18`).
- **Environ treize requêtes groupées** (`idPatient in ids`) :
  1. les patients, par `filtrePatientsDuPraticien`, sans filtre sur `actif` ;
  2. les épisodes ;
  3. les réponses, avec les mêmes `select` que `cockpit/route.ts:286-289` ;
  4. les jours zéro ;
  5. les assignations : corrections et envois, annulées exclues ;
  6. les objectifs, fins, synthèses et demandes de correction de la phase 3,
     avec les mêmes `select` que `objectifs/etat-phase/route.ts:95-124` ;
  7. la consultation porteuse ;
  8. les brouillons de protocole ;
  9. les check-ins ;
  10. les approbations de diffusion.
- **Boucle par dossier**, avec une concurrence bornée (de l'ordre de 4) :
  - rejeu : élection du jalon, `proposeRuntimeEpisode`,
    `episodePersisteRejouable`, puis `rejouerChaine` ; sans épisode,
    `preconditionsT0PourPatient` ;
  - tableau 2 : `resolveProtocoleDiffuse` (`portailProtocol.ts:48`), le signal
    même du portail, à ne pas réimplémenter en groupé, puis
    `calendrierDuProtocoleDiffuse` et `estFinDeCycle` ;
  - un `try/catch` englobe chaque dossier et chaque tableau : une exception
    rend ce dossier « indéterminé » pour ce tableau, jamais rangé ailleurs ;
  - aucun journal d'accès par dossier.
- **Coût estimé** pour environ 40 dossiers : 400 à 550 requêtes, soit 2 à
  5 s. La durée est journalisée, et aucun cache n'est prévu.
- **`JOURS_FIN_DE_CYCLE`** : sa seule occurrence est dans
  `api/portail/protocole/route.ts:144`. Elle se déplace dans
  `web/src/lib/protocol/finDeCycle.ts`, avec `estFinDeCycle(jourZero,
  maintenant)`, sans changer de valeur. La route et le chargeur l'importent.

## 4. Fiche et cockpit, à comportement constant

- **`FichePatientPanel.tsx`** : le `useCallback` des lignes 1191-1333 devient
  le `useMemo` des entrées, puis un appel au module. Les deux sites de
  `phaseDue` passent par `phaseDueDuDossier`.
- **`ClinicalRuntimeSection.tsx`** : les lignes 1410-1453 et 1518-1528 sont
  remplacées par `deriverEtatRuntimePourPhases`. Les champs hors du
  sous-ensemble restent dérivés sur place.
- **Ce qui prouve la constance** : les bancs existants, verts sans réécriture.
  - `FichePatientPanel.test.tsx` : rail et statuts, fil « Prochaine étape » ;
  - `ClinicalRuntimeSection.test.tsx` : assertions sur `onEtatChange` ;
  - `contrat.test.ts:89-112` ;
  - `FichePatientPanel.guard.test.ts` ;
  - les E2E de la fiche et ses visuels.

## 5. Banc de parité

Ce banc est au niveau Vitest. Trois fixtures font moins de cinq dossiers : à
l'E2E, la répartition est masquée, et le banc ne pourrait lire les comptes
sans trahir le masquage.

1. **Garde « un seul moteur »** : la fiche importe `statutsPhases` et ne porte
   plus de moteur local.
2. **`pariteFichePage.test.ts`** : chaque fixture (Sophie Nicola, Jennifer
   Martin, Michel Dogné) reçoit le même jeu d'entrées.
   - Rendu de la fiche : « Prochaine étape : X ».
   - Agrégation par `phaseDueDuDossier` puis `agregerComptesCabinet`, avec un
     seuil passé en paramètre : le dossier est rangé sous X.
   - Le banc écrit l'écart des plus de 40 envois (§1).
3. **E2E de la page** : la page rend l'effectif ; la répartition est masquée
   à trois dossiers ; le banc « sous cinq » joue par tableau (D-385 §6) ;
   l'UI est en français ; aucun nom de dossier n'apparaît.

## 6. Découpage : trois PR, dans cet ordre

Chaque PR passe T2 au vert, sans migration ; la troisième dépend des deux
premières.

1. **PR 1, extraction côté fiche (P1).** Elle porte :
   - `statutsPhases.ts` et `etatRuntimeDerive.ts`, avec leurs tests unitaires ;
   - la consommation par la fiche et par `ClinicalRuntimeSection` ;
   - l'amendement de `contrat.ts:8-10` ;
   - la garde « un seul moteur ».

   Les suites existantes, inchangées et vertes, prouvent la constance.
2. **PR 2, extraction côté serveur.** `lib/clinical-engine/rejeuEpisodeCockpit.ts`
   reçoit les quatre fonctions locales de la route cockpit : `loadRuntimeInputs`,
   `ancreCycleCourant` et `ancrePoseeDe`, `episodePersisteRejouable`,
   `rejouerChaine`. S'y ajoute `lib/protocol/finDeCycle.ts`.
   **Jamais sous `web/src/lib/clinical/**`** : ce chemin retient le déploiement
   jusqu'à une release-db (`.github/workflows/release-db.yml:40`, [[D-044]]),
   et `clinical-engine/` n'y est pas. `cockpit/route.test.ts` reste vert sans
   changement.
3. **PR 3, chargeur et page.** Elle porte :
   - `comptesCabinet.ts` ;
   - la route `GET /api/praticien/comptes-cabinet`, en session, sans journal
     par dossier ;
   - la page `/dashboard/cabinet` et son panneau client, sur le patron de
     Trajectoires ;
   - l'entrée du rail ;
   - les bancs du §5.

Chaque PR est revue de façon ordinaire (D-385 §6) et porte sa clôture.

## 7. Risques

- Un ordre d'évaluation peut changer pendant l'extraction. La parade : une
  transcription littérale, et les suites existantes.
- Le coût croît avec le nombre de dossiers. Il se mesure, et l'optimisation
  vient après la mesure.
- L'élection du jalon peut diverger entre la fiche et la page (§2). Le banc de
  parité la couvre.
- Une concurrence trop large saturerait le pool Prisma.
- Le temps doit rester déterministe : `maintenant` est passé en paramètre
  partout.
