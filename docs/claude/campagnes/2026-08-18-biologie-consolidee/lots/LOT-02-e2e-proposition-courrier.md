---
id: "LOT-02"
statut: "terminé (2026-08-22, PR #726) — joué vert au CI (vrai navigateur, build de production), puis double run consécutif vert sur base persistante locale : le nettoyage est prouvé, la production jamais touchée"
dépend_de: "LOT-01"
---

# LOT-02 — La surface vivante a enfin des parcours

## But

À la fin de ce lot, un parcours praticien complet — ouvrir un dossier, lire la
proposition de bilan, déclarer un panel documenté, établir le courrier — est
joué par Playwright dans un vrai navigateur. Aujourd'hui, **aucun E2E ne
couvre ces surfaces**, alors que `WN_CB_PROPOSITION` est posé en production
depuis le 2026-08-18 : ce qui casserait à l'écran ne serait vu par personne
avant un praticien.

## Résultat observable

`npm run test:e2e` joue un spec neuf qui traverse la surface biologie de bout
en bout sur un patient fictif, et le rejoue **deux fois de suite sans échouer**
— la preuve que son nettoyage est complet.

## Le patron à suivre, et pourquoi il évite le piège

`web/e2e/fiche-trajectoire-peuplee.spec.ts` provisionne son épisode en
`beforeAll`, nettoie en `afterAll`, tourne en **mode sériel**, et note en tête
qu'aucun autre spec ne lit ses données. C'est ce qui permet de peupler un
patient **sans toucher au seed** — et donc sans déplacer les bancs qui
dépendent des trois patients fictifs (`visual.spec.ts` et sa capture pixel,
`fiche-detail-reponses.spec.ts`, `seedCertification.guard.test.ts`). Modifier
`web/prisma/seed.ts` les emporterait tous : c'est l'interdit central du lot.

Helpers à écrire dans `web/e2e/helpers/db.ts`, au patron de
`provisionnerReponseOrientation` / `nettoyerOrientationFileEnvoi` :

- provisionner de quoi rendre la proposition **non vide** (le moteur doit
  avoir de la matière : passations et drapeaux d'anamnèse) ;
- nettoyer **chirurgicalement** — identifiants préfixés, suppression ciblée du
  panel documenté, de la correspondance et des réponses fabriquées, dans un
  ordre sûr vis-à-vis des clés étrangères.

## Périmètre

- `web/e2e/biologie-proposition-courrier.spec.ts` (neuf).
- `web/e2e/helpers/db.ts` — provisionnement et nettoyage, rien d'autre.
- Aucune modification de code applicatif : si le parcours révèle un défaut, il
  se traite dans un lot propre — un E2E qui « corrige au passage » cache ce
  qu'il a trouvé.

## Ce que le parcours doit prouver

1. Le panneau de proposition s'affiche et porte des lignes.
2. Déclarer un panel documenté change ce que le moteur propose.
3. Le formulaire de courrier n'apparaît que s'il y a quelque chose à proposer.
4. Le courrier s'établit, son texte est rendu pour transcription, et
   **aucun envoi n'a lieu**.
5. Une seconde consignation sans changer de destinataire est refusée.
6. Le fil porte le **verdict d'ancrage du LOT-01** — c'est la raison de la
   dépendance.

## Interdits

- **Ne jamais modifier `web/prisma/seed.ts`.**
- **Jamais `resetPortailState`** pour nettoyer ce spec : elle filtre sur
  `idAssignation: { not: null }` et laisserait la matière fabriquée en place.
- **Aucune donnée patient réelle** : Sophie Nicola, Jennifer Martin, Michel
  Dogné seulement.
- **Jamais deux runs E2E en parallèle** — base partagée, Mac exclusivement.
- Ne pas corriger de code applicatif dans ce lot.

## Dépendances

LOT-01, pour le point 6 du parcours. Le reste pourrait s'écrire avant, mais
scinder ferait deux passages sur le même fichier.

## Tests

Le lot **est** le test. Vérification propre : deux runs consécutifs verts
(preuve du nettoyage), et le segment E2E de T3 reste au CI tant que `D-049`
tient — un blocage WebKit sur le Mac y fait expirer une navigation sans qu'une
requête parte, et `wn-test-worktree.sh` le classe tout seul.

## LE BLOCAGE — trouvé par le CI le 2026-08-21, après quatre rondes

**Le panneau de proposition n'est jamais rendu, et ce n'est ni un sélecteur ni
un drapeau.** `ClinicalRuntimeSection` n'appelle `loadProposition()` que si
`readyDecisionCardId` existe — donc seulement quand le runtime clinique est
`ready` avec une carte de décision. Le `ready` ne vient pas d'une ligne en
base : il vient du **POST de confirmation d'épisode T0**, un geste praticien à
l'écran (`confirmAssessmentEpisode` est en mémoire).

Et confirmer un T0 exige des préconditions que le dépôt a **explicitement
renoncé** à provisionner en E2E — `e2e/mode-consultation.spec.ts:88-91` :

> « NON-COUVERTURE NOMMÉE : le parcours NOMINAL (rideau complet, synthèse
> validée, confirmation sans friction) n'a pas d'E2E — le peupler déplacerait
> le seed partagé par l'orientation, les captures visuelles et le garde de
> certification. Il est couvert par les bancs de route. »

**Le but de ce lot passe donc par une porte que la campagne s'interdit
d'ouvrir à la légère.** Ce n'est pas un défaut du parcours écrit ; c'est une
prémisse du lot qui ne tient pas, et le cadrage ne l'avait pas vue — le
fichier de lot parlait de « provisionner de quoi rendre la proposition non
vide » sans savoir que la proposition n'est même pas demandée avant un T0.

**ARBITRAGE RENDU le 2026-08-21 : construire la fixture T0** (issue 1
ci-dessous). Elle l'est, et **sans rien inventer** :
`src/lib/clinical-engine/dossierT0Fixture.ts` existait déjà — « le dossier de
référence qui PASSE les préconditions T0 », partagé par les bancs des trois
routes pour qu'une condition qui change ne soit pas à retrouver dans des
fixtures divergentes. La fixture E2E s'y branche (`passationsRideauT0`,
`PLAINTES_DIGESTIF_ET_PONDERAL`, `CONSULTATION_VALIDEE_FIXTURE`,
`SYNTHESE_VALIDEE_FIXTURE`) plutôt que d'en écrire une quatrième. Les
`rawAnswers` étant dérivées du catalogue, `Q_ALI_01` suit sa forme courante
sans qu'un seul item soit écrit à la main.

Le spec pose en plus le geste praticien qui manquait : **confirmer l'épisode
T0**. Le bouton est assérté ACTIF — désactivé, il signifierait qu'une
précondition dure manque, et le message d'échec le dit.

**Les trois issues telles qu'elles se présentaient :**

1. **Construire la fixture T0 complète** en `beforeAll`/`afterAll` (rideau
   renseigné et cotable, synthèse validée), sans toucher au seed — le patron
   de `fiche-trajectoire-peuplee` montre que c'est possible. C'est un lot en
   soi, sensiblement plus lourd que ce que LOT-02 décrit, et il ouvrirait au
   passage la non-couverture nommée ci-dessus.
2. **Réduire le périmètre** : couvrir la surface biologie par bancs de route
   et de composant (déjà le cas pour l'essentiel), et limiter l'E2E à ce qui
   est atteignable sans T0.
3. **Recadrer LOT-02** avec la contrainte nommée, et le rouvrir après le lot
   de fixture T0.

Ce que le lot a produit d'utile en attendant : trois défauts réels du harnais
(drapeaux jamais armés, position de la suite Vitest déplacée par une pose au
niveau du job, message de banc muet), tous corrigés et documentés.

## Ce que le cadrage a trouvé et que ce fichier ne disait pas

- **Les drapeaux n'étaient posés nulle part dans le harnais.**
  `isCbPropositionEnabled` exige `WN_CB_ENABLED` **et** `WN_CB_PROPOSITION` ;
  ni `wn-test-worktree.sh`, ni le job `verify`, ni `webServer.env` de
  Playwright ne les portaient. Sans eux, la route rend 503 et le parcours
  passerait au vert **sans rien trouver à cliquer**. Ils vivent désormais dans
  `webServer.env` seul — les poser au niveau du job CI a fait rougir 10 bancs
  unitaires, la suite Vitest tournant en position CB éteinte. C'est de la
  configuration de test : l'interdit « aucun code applicatif » tient.
- **Le point 5 n'a pas de garde serveur** : la double consignation est refusée
  côté écran seulement (bouton désactivé). C'est la dette que la campagne
  nomme déjà (« deux onglets peuvent encore établir deux lettres ») ; le spec
  éprouve donc le bouton, pas un 409 qui n'existe pas.
- **Aucun épisode confirmé n'est nécessaire** — la première version de la
  fixture en provisionnait un « pour rendre la phase Actions atteignable » :
  faux, `ClinicalRuntimeSection` reste monté et seul l'affichage est filtré.
  Retiré à la revue plutôt que gardé sur une justification inventée.

## Critères de done

- [x] Le spec joue les six points ci-dessus, en mode sériel.
- [ ] **Deux runs consécutifs passent** — NON PRODUIT. Les E2E sont
      l'exclusivité du Mac et le conteneur de la session ne peut pas installer
      le navigateur (le proxy bloque `cdn.playwright.dev`). Le spec part
      **jamais joué, pas même une fois** : ne pas lire son absence de rouge
      comme un vert.
- [x] `web/prisma/seed.ts` est intact ; aucun autre spec n'a bougé.
- [x] Aucun code applicatif modifié. Défaut nommé et renvoyé : la double
      consignation sans garde serveur (déjà au registre des questions ouvertes
      de la campagne).
- [ ] T2 vert — même empêchement que ci-dessus. Joués à la place :
      `npm run check` (T1) et `npx tsc --noEmit`, verts. **Le typage ne prouve
      qu'une chose : un sélecteur mal écrit se voit, un sélecteur qui ne
      correspond à rien, non.**
- [x] Fragment `changelog.d/` écrit.
