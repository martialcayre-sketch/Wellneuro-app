---
id: "LOT-08"
titre: "Le recueil dit son état"
statut: "fait"
dépend_de: "LOT-05"
---

# LOT-08 — Le recueil dit son état

Trois reliquats de lecture, nommés à la clôture de `LOT-05` et de `LOT-07`. Ils
tiennent tous la même phrase : **le recueil ne dit pas son état.**

## But

Un praticien lit un agenda alimentaire sans savoir si le patient peut encore
l'alimenter, sans voir quand ni comment chaque journée a été notée, et retire un
recueil de 21 jours sans que l'écran lui dise combien de journées il emporte.

Une fois le lot fait, chacune de ces trois questions a une réponse à l'écran, et
aucune n'a coûté une garde de plus sur la donnée.

## Constat

### 1. La bannière — une réserve écrite noir sur blanc

`D-027` a délibérément retiré `WN_AGENDA_ALI` de la lecture praticien : la donnée
est append-only (`D-015`), elle survit à l'extinction, et le moment où ce lecteur
compte le plus est justement celui où le drapeau serait éteint. La décision porte
sa propre réserve, et c'est ce lot :

> **L'écran ne dit pas que le recueil est fermé.** Le panneau ne lit pas la
> position du drapeau : un praticien peut donc relire un agenda que le patient ne
> peut plus alimenter, sans que rien ne l'indique. Faire dépendre le lecteur du
> drapeau qu'il refuse justement de lire a été écarté ; **le dire par une
> bannière reste possible et n'est pas fait.**

### 2. Le tiroir — trois champs transportés et jetés à l'arrivée

`canal`, `soumisLe` et `supersedesJourId` sont au schéma
(`schema.prisma:1016-1018`), sélectionnés par `SELECT_JOUR`
(`lib/agenda-alimentaire/persistence.ts:51`), portés par `JourRow`
(`types.ts:163`) et rendus par la route praticien dans `jours: JourRow[]`.
`JourneeCard` prenait `{ dateJour, reponses }` et jetait le reste.

**Ce n'était donc pas un lot d'API.** Rien à ajouter au transport : il fallait
lire ce qui arrivait déjà. `supersedesJourId` porte en particulier le **taux de
correction** dont `LOT-06` aura besoin — `resolveJoursActifs`
(`jour.ts:270`) ne rend que les têtes de chaîne, si bien qu'une tête portant
`supersedesJourId` **est** une journée corrigée.

### 3. La modale — un geste destructif muet sur ce qu'il emporte

`LOT-07` l'assigne nommément ici : « La modale de confirmation ne dit pas combien
de journées d'agenda existent. Le praticien retire un recueil qui contient des
données sans que l'écran le lui dise. » Ce troisième reliquat n'était pas dans
`CAMPAGNE.md` — il ne vivait que dans la section « ce que ce lot ne fait pas » du
lot précédent, ce qui est exactement le rôle de cette section.

## Le transport du drapeau — et ce qui a été écarté

`isAgendaAlimentaireEnabled` lit `process.env.WN_AGENDA_ALI`, sans miroir
`NEXT_PUBLIC_*`, et `AgendaAlimentairePraticienPanel` comme `FichePatientPanel`
sont `'use client'`. La bannière avait donc besoin d'un transport, et il n'y en
avait aucun.

**Écarté : un champ `recueilOuvert` dans la réponse de
`GET /api/praticien/agenda-alimentaire`.** C'était la réponse évidente, et elle
oblige à appeler `isAgendaAlimentaireEnabled` dans une route dont le commentaire
interpelle nommément le relecteur tenté de le faire, et exige « de repasser par
une décision qui rouvre ce point ». *Rapporter* n'est pas *garder* — mais l'appel
est le même, à une ligne près de devenir un `if` qui referme un lecteur
append-only.

**Retenu : un provider de page.** Le motif existait déjà, à deux lignes du point
de montage, dans le même fichier :

```tsx
<C5FeatureProvider enabled={isC5Enabled(process.env.WN_C5_ENABLED)}>
```

`web/src/app/dashboard/patients/[idPatient]/page.tsx` est un composant serveur ;
`C5FeatureProvider` fait treize lignes et son consommateur profond
`ClinicalRuntimeSection` lit `useC5Enabled()` — la même forme que le panneau de
l'agenda. La route n'est pas touchée : le garde-fou de `D-027` reste intact, sans
rien rouvrir. Consigné en **`D-028`**.

## Périmètre

### A — Bannière « recueil fermé »

- `web/src/components/agenda-alimentaire/AgendaAliFeatureProvider.tsx` (nouveau) —
  motif de `C5FeatureProvider`, **mais à trois états** : `true` ouvert, `false`
  fermé, **`null` position inconnue**. Le défaut est `null`, pas `false`.
  Le réflexe fail-closed vient des *gardes* ; ce contexte alimente un **énoncé**,
  et le drapeau est allumé en production — un défaut `false` serait donc la
  valeur fausse cent pour cent du temps, et un provider oublié afficherait en
  silence « recueil fermé » sur un recueil ouvert. Se taire quand on ne sait pas
  est le seul défaut qui ne ment jamais. Le rendu teste `=== false`, jamais
  `!drapeau`.
- `web/src/app/dashboard/patients/[idPatient]/page.tsx` — enveloppe, imbriquée
  avec `C5FeatureProvider`, **et son câblage est testé**
  (`page.test.tsx`) : le provider est monté et alimenté depuis
  `isAgendaAlimentaireEnabled`, jamais depuis une constante. Vérifié par
  mutation.
- `AgendaAlimentairePraticienPanel.tsx` — bannière en tête du bloc des épisodes,
  drapeau éteint seulement. **L'état vide n'est pas touché** : `D-027` l'a rendu
  descriptif exprès (« un écran ne doit pas proposer un geste impossible »), une
  bannière par-dessus n'y ajouterait rien.

### B — Le tiroir dit d'où vient chaque journée

`JourneeCard` reçoit la ligne entière (`JourRow`) au lieu de deux champs :

- **`soumisLe`** — toujours affiché, « Noté le … », heure de Paris
  (`Intl.DateTimeFormat` avec `timeZone: 'Europe/Paris'`).
- **`supersedesJourId`** non nul — « Journée corrigée — remplace une version
  antérieure. » Rien quand il est nul.
- **`canal`** — affiché **seulement s'il diffère de `'portail'`**. `CANAUX`
  (`persistence.ts:41`) est une liste fermée à `['portail']` et l'écriture valide
  contre elle : **branche dormante par construction**, et c'est délibéré — le
  champ existe pour un second canal à venir, et l'afficher inconditionnellement
  poserait 21 lignes identiques par épisode.

### C — La modale dit ce qu'elle emporte

- `web/src/app/api/praticien/patients/route.ts` — champ
  `nbJourneesAgenda?: number | null`, sur le patron exact d'`aPassation` :
  - **une seule requête groupée** par page, jamais un `count` par ligne
    (`nbJourneesAgendaParAssignation`, sœur de `idsAssignationsAvecPassation`) ;
  - **les deux branches** de construction de réponse, paginée et non paginée —
    leçon `LOT-07`, dans ce même fichier ;
  - **tri-état, `null` n'est pas `0`** : `null` = ce n'est pas un agenda
    alimentaire, rien à dire ; `0` = agenda sans aucune journée notée, et ça se
    dit. Classe déjà payée sur C4, où `[]` traité comme `null` faisait rendre
    « Compatible » sur une composition vide ;
  - comptage de **dates distinctes**, pas de lignes : la table est append-only,
    une journée corrigée porte deux lignes pour une seule date. L'index
    `agd_ali_assignation_date_idx` existe déjà — **aucune dette d'index créée**,
    contrairement à `LOT-07` qui en avait nommé une.
- `PatientsPanel.tsx` — porte la valeur jusqu'à la modale. **Fait d'affichage
  seul** : `annulable` reste décidé par `estAnnulable` seul.
- `AnnulationAssignationDialog.tsx` — phrase ajoutée quand la valeur n'est pas
  `null`, **accordée sur toute sa longueur** (verbe et pronom compris : à `N = 1`,
  « Elle reste enregistrée », jamais « Elles restent »). Le geste reste
  réversible : pas de saisie de confirmation ajoutée.
  **Le mot est « journée de saisie », pas « journée notée », et c'est
  délibéré.** Le panneau de la fiche affiche « N journées notées » =
  `fenetre.nbRenseignees`, qui ne compte que les lignes **relues**, quarantaine
  exclue ; ce compte-ci porte sur les dates distinctes de **toutes** les lignes
  enregistrées. Les deux répondent à deux questions différentes et donnent deux
  nombres — les mettre derrière le même mot les ferait se contredire à deux
  clics d'écart, et précisément pendant un incident d'intégrité, c'est-à-dire au
  moment où le praticien a besoin de croire l'écran.

## Interdits

- **Aucune migration, aucun changement de `schema.prisma`.** Les trois champs et
  l'index existent. Tenu.
- **Aucun appel à `isAgendaAlimentaireEnabled` dans
  `api/praticien/agenda-alimentaire/route.ts`.** Tenu — le provider l'évite.
- **Ne pas garder la route ni le panneau derrière le drapeau** : on rapporte
  l'état, on ne ferme rien. `D-027` tient tout entier.
- Ne pas toucher à l'état vide du panneau (`D-027`).
- Aucun score, indice, gramme, kcal ni quantité à l'écran — frontière assertée
  par `web/prisma/checks/agenda_alimentaire_v1.sql` et par la garde DOM du test
  du panneau. Un compte de journées et une heure n'en sont pas.
- Ne pas élargir la portée de l'annulation ni toucher à `estAnnulable`.
- Aucune écriture en base de production, aucun backfill.

## Fichiers touchés

- `web/src/components/agenda-alimentaire/AgendaAliFeatureProvider.tsx` (nouveau)
- `web/src/app/dashboard/patients/[idPatient]/page.tsx`
- `web/src/components/agenda-alimentaire/AgendaAlimentairePraticienPanel.tsx` + test
- `web/src/app/api/praticien/patients/route.ts` + test
- `web/src/components/PatientsPanel.tsx` + test
- `web/src/components/ui/AnnulationAssignationDialog.tsx`
- `docs/DECISIONS.md` (D-028), `CAMPAGNE.md`, fragment `changelog.d/`

## Ce que ce lot ne fait pas — nommé, pas fait

Une classe de défaut qu'on ne nomme pas se redécouvre au lot suivant.

- **La profondeur de correction ne se voit pas.** Une tête portant
  `supersedesJourId` dit « corrigée », pas « corrigée deux fois ». Le taux que
  `LOT-06` calculera est donc un taux de journées corrigées, jamais un nombre de
  corrections. À dire explicitement quand le barème s'en servira.
- **Le test du comptage prouve la déduplication applicative, pas celle de la
  base.** Le mock Prisma rend ce qu'on lui donne : la paire `distinct` +
  `Set` en mémoire est une défense de profondeur dont seule la seconde moitié est
  couverte. Une vérification de la première demanderait un test d'intégration sur
  base réelle, qui n'existe pas ici. Le commentaire de la fonction le dit au
  conditionnel — il affirmait d'abord une déduplication « côté base » que rien
  ne vérifie.
- **La modale promet un geste qui peut être impossible.** « Vous pourrez
  réassigner ce questionnaire si besoin » est faux drapeau éteint : `IDS_SUSPENDUS`
  retire alors `Q_ALI_09` de la bibliothèque **et** de la route d'assignation.
  Texte préexistant, mais ce lot rend la modale spécifiquement consciente qu'elle
  parle d'un agenda sans fermer ce point — elle ne connaît pas la position du
  drapeau, le provider n'étant monté que sur la fiche patient, pas sur la liste.
  C'est la règle de `D-027` (« un écran ne doit pas proposer un geste
  impossible ») appliquée à l'envers, deux lignes au-dessus de la phrase ajoutée.
  À fermer par un lot suivant, avec le geste symétrique côté agenda du sommeil.
- **Le nom de la variable d'environnement n'est couvert par aucun test, et ne
  peut pas l'être.** `isAgendaAlimentaireEnabled` est déclarée
  `(value = process.env.WN_AGENDA_ALI)` : une faute de frappe au point de montage
  rend `undefined`, ce qui **déclenche le paramètre par défaut** et relit la
  bonne variable. Vérifié par mutation — le nom fauté rend exactement le même
  verdict. L'argument explicite y est donc décoratif, et le même angle mort vaut
  pour `isC5Enabled(process.env.WN_C5_ENABLED)` juste au-dessus.
- **La fonction de comptage n'a pas de garde de portée propre.**
  `nbJourneesAgendaParAssignation` filtre sur `idAssignation` seul ; c'est correct
  aujourd'hui, ses ids venant d'une liste déjà bornée par
  `filtrePatientsDuPraticien`. Prise isolément, elle compterait pour n'importe
  quelle assignation du système. Même forme que `idsAssignationsAvecPassation` —
  réserve de robustesse, pas un défaut d'autorisation.
- **Le plafond de 40 lignes** (`MAX_ASSIGNATIONS`) : le compte n'apparaît que sur
  les lignes affichées. Défaut préexistant, classe déjà payée sur `Q_ALI_01` —
  *une action par ligne ne vaut que ce que vaut la pagination de la liste qui la
  porte*. Non traité ici, comme dans `LOT-07`.
- **L'agenda du sommeil n'a pas le même geste.** La modale ne dit rien des nuits
  notées de `Q_SOM_09`, dont l'annulation pose exactement la même question.
  Symétrie à faire, série distincte.
- **Rien ne mesure la position du drapeau côté dépôt** — réserve de `D-025` et
  `D-027`, non levée : la bannière *dit* le drapeau, elle ne le *vérifie* pas. Un
  drapeau mal positionné produirait donc une bannière fausse, dans un sens comme
  dans l'autre.
- **L'index `@@index([idAssignation])` sur `QuestionnaireReponse`**, report nommé
  par `LOT-07`, reste ouvert. Ce lot n'y ajoute aucune sollicitation : son
  comptage porte sur une autre table, déjà indexée.

## Tests

- **T1** `npm run check` après chaque édition.
- **T2** `npm run test:worktree -- --fast` avant commit — palier de la classe API.
- Unitaires ciblés. **Tous ne mordent pas, et il faut le dire** : les cas
  positifs (bannière présente, mention affichée, compte servi, accord au
  singulier, câblage de la page) échouent sur le code d'avant ; les cas négatifs
  (drapeau allumé → rien, `supersedesJourId` nul → rien, canal `'portail'` → rien,
  `null` → rien, non-régression `LOT-07`) passaient déjà, deux d'entre eux
  vacuellement puisque la branche d'affichage n'existait pas. Ce sont de bons
  contrôles de non-régression, pas des preuves du lot — les compter comme telles
  serait l'argument de qualité que le lot suivant reprendrait à tort.
  - bannière : drapeau éteint + épisodes → présente ; allumé → absente ; éteint +
    zéro épisode → état vide seul ; **panneau hors provider → aucune bannière**
    (position inconnue : on n'affirme rien) ; **câblage de `page.tsx`** vérifié
    par mutation ;
  - `soumisLe` rendu — attendu **littéral** (`01/08/2026 11:00`), jamais
    recalculé avec le même `Intl.DateTimeFormat` que le composant : un attendu
    dérivé de la même formule reste vert si `timeZone: 'Europe/Paris'` disparaît,
    sur une machine déjà réglée sur Paris — le Mac de développement ;
  - `supersedesJourId` non nul → mention, nul → absente ; `canal` `'portail'` →
    rien, autre valeur → mention (fixture non écrivable : `ensureCanal` la
    refuse, cohérent avec la branche dormante, mais elle ne prouve rien sur une
    donnée atteignable) ;
  - garde DOM de frontière rejouée **drapeau éteint**, pour que la bannière passe
    au crible des mots interdits — la garde existante tourne drapeau allumé, donc
    sans bannière ;
  - `nbJourneesAgenda` correct dans les **deux** branches de
    `GET /api/praticien/patients` ; `null` hors `Q_ALI_09` ; `0` sur agenda vide ;
    journée corrigée comptée **une** fois ; **une seule** requête de comptage ;
  - modale : phrase sur `N > 0`, « aucune journée » sur `0`, **rien** sur `null` ;
  - non-régression `LOT-07` : le bouton « annuler » reste piloté par
    `estAnnulable` seul.

## Critères de done

- Les trois questions ont une réponse à l'écran.
- Aucune garde nouvelle sur la donnée : `D-027` tient, la route est inchangée.
- Le tri-état de `nbJourneesAgenda` est préservé de bout en bout, et n'entre dans
  aucune décision d'autorisation.
- Les tests ci-dessus existent et échouent sur le code d'avant ; T1 et T2 verts.
- Revue par un regard qui n'a pas écrit le code, constats traités ou nommés.
- `CAMPAGNE.md`, `docs/DECISIONS.md` (D-028), une entrée `SESSION_LOG.md`, un
  fragment `docs/claude/handoffs/` et un fragment `changelog.d/` écrits **sur la
  branche vivante**, avant la PR.

## Résultats

Livré le 2026-08-05.

**Ce qui a changé.** Un provider de page (`AgendaAliFeatureProvider`, treize
lignes) porte la position du drapeau jusqu'au panneau, qui affiche une bannière
« recueil fermé » quand il est éteint. `JourneeCard` reçoit la ligne entière et
rend l'horodatage de saisie, la mention de correction et le canal quand il sort
du portail. La liste des assignations transporte `nbJourneesAgenda`, et la modale
d'annulation dit ce qu'elle emporte.

**Ce que la conception a évité.** Le champ `recueilOuvert` dans la réponse de la
route praticien, qui aurait demandé de rouvrir `D-027` pour un résultat identique.
Le motif de transport existait déjà dans le fichier de montage, deux lignes plus
haut.

**Correctif apporté à la première écriture.** Les deux comptages de la route
`patients` (`aPassation`, `nbJourneesAgenda`) étaient enchaînés en série : deux
allers-retours par page là où le fichier prend soin de n'en faire qu'un. Passés
en `Promise.all`, dans les deux branches.

**Le bloquant de la revue adversariale.** L'accord de la phrase de la modale
s'arrêtait au substantif : à `N = 1`, « Ce recueil contient 1 journée notée.
**Elles** restent enregistrées… ». Ce n'était pas un cas de bord — le recueil
pilote en production est à *une* journée sur vingt et une, si bien que la
première fois que cette modale sert, elle sert le singulier.

**Le constat qui a changé la conception.** Le défaut `false` du contexte avait
été posé par réflexe fail-closed. Le réflexe vient des **gardes** ; ici l'objet
est un **énoncé**, et le drapeau est allumé en production : un défaut `false`
était donc la valeur fausse cent pour cent du temps, et un fil débranché aurait
affirmé en silence « recueil fermé » sur un recueil ouvert — sur l'écran dont ce
lot fait justement le porte-parole de l'état du recueil. Passé à trois états,
défaut `null` (« je ne sais pas », donc je n'affirme rien), et le câblage réel
épinglé par un test plutôt que compensé par un défaut.

**Deux comptages derrière le même mot.** La modale affichait « N journées
notées », exactement le libellé que le panneau de la fiche sert depuis
`fenetre.nbRenseignees` — lequel exclut les lignes en quarantaine, quand le
comptage de la modale les inclut. Deux nombres, même mot, deux clics d'écart, et
l'écart n'apparaît que pendant un incident d'intégrité. Libellé rendu distinct
(« journée de saisie »), divergence nommée, test qui interdit le retour au mot
du panneau.

**Une découverte à ne pas répéter.** Le premier test de câblage ne mordait pas,
et la mutation l'a montré : `isAgendaAlimentaireEnabled(value = process.env.WN_AGENDA_ALI)`
absorbe un `undefined` en relisant la bonne variable, si bien qu'un nom fauté au
point de montage rend le même verdict. L'argument explicite y est décoratif. Le
test a été refait sur ce qui peut réellement casser — provider présent, alimenté
par la fonction et non par une constante — et vérifié par mutation.

**Trois réserves nommées plutôt que fermées** : la promesse « vous pourrez
réassigner » reste fausse drapeau éteint, la déduplication côté base n'est
prouvée par rien, et la fonction de comptage n'a pas de garde de portée propre.
Toutes trois en section « ce que ce lot ne fait pas ».

**Validation.** T1 vert : 4 056 tests unitaires sur 367 fichiers, lint et
anti-secrets verts. **T2 non conclusive en local** : deux passes complètes à code
identique ont rendu deux jeux d'échecs *différents* — d'abord
`portail-lien-magique.spec.ts:48` (assertion de gigue d'horloge, 819 et 1 032 ms
contre un seuil de 800) sur les deux projets, puis `portail-parcours.spec.ts:281`
(fixture `PAT_SEED_03`) sur un seul. Signature connue d'un second poste jouant
Playwright sur la base partagée ; aucune des deux ne touche une surface de ce lot
— la revue a cherché un chemin causal et n'en a trouvé aucun. **Seul le CI rend
un verdict.**
