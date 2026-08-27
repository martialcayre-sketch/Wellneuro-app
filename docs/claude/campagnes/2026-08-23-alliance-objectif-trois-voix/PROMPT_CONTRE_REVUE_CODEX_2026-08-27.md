# Contre-revue adverse globale — Alliance 6.0-B + LOT-05 (P0) + `D-113`

*Prompt unique, à coller dans l'extension Codex. Il fusionne les deux passes
dues : la revue P0 du LOT-05 (surface patient) et la contre-revue de clôture de
la campagne 6.0-B, plus le chantier `D-113` livré depuis.*

> **Statut au 2026-08-27 : rédigé, PAS ENCORE JOUÉ.** Ce fichier est l'énoncé
> de la passe, pas son résultat. Il est versionné parce qu'une contre-revue
> dont on ne peut plus relire la question posée n'est pas auditable : le
> verdict seul ne dit pas ce qui a été cherché, ni ce qui a été délibérément
> laissé hors champ.
>
> La passe se lance **manuellement par le responsable** — jamais par un agent
> ([[D-105]] : les trois voies d'intégration automatisée ont été auditées et
> rejetées). Le résultat viendra dans un fichier distinct,
> `REVUE_CODEX_ADVERSE_<date>.md`, à côté de celui-ci.
>
> Elle est **due avant la clôture de campagne**, jamais après — c'est le régime
> établi par [[D-108]], où sept affirmations sur treize avaient été réfutées,
> dont un texte servi au patient depuis cinq semaines.

---

## 0. Ce que tu fais

Tu ne fais **pas** une revue ouverte du diff. Tu tentes de **falsifier
vingt-cinq affirmations absolues**, hiérarchisées en trois niveaux. Une seule
d'entre elles fausse au **niveau 1** suffit à empêcher la clôture de campagne
qui s'appuie dessus.

**Ce qui réfute** : un contre-exemple tracé de bout en bout — entrée, chemin de
données, effet faux obtenu — ou une mutation **réellement exécutée** qui casse
la propriété **tout en laissant son banc vert**.

**Ce qui ne réfute rien** et n'est pas demandé : une impression, une inquiétude,
un « ce serait plus propre si », une préférence de style, un refactoring.

---

## 1. Règles d'engagement — non négociables

- **Lecture et exécution locale seulement.** N'ouvre aucune PR, ne pousse rien,
  ne commite rien. Les mutations de test se font dans une copie jetable.
- **Aucune identité patient réelle dans ta sortie.** Les seules identités
  admissibles sont des fixtures : **Sophie Nicola, Jennifer Martin, Michel
  Dogné**. Si tu rencontres autre chose qui ressemble à une identité réelle,
  signale son **emplacement sans la recopier**.
- **Ne touche pas à la base de production.** Aucune commande d'écriture, aucun
  SQL mutant, aucune migration jouée.
- **Réponds en français.**
- **Ne juge aucun arbitrage clinique.** Que le rideau `D-052` s'applique à
  toute ancre, que la fermeture des fenêtres à l'ouverture d'un cycle soit la
  bonne règle, que `D-093` soit levable : ce sont des décisions prises. Tu
  vérifies qu'elles sont **implémentées telles qu'énoncées**, jamais qu'elles
  sont bonnes.

---

## 2. Périmètre

**Trois ensembles, tous mergés sur `main`.**

1. **Alliance 6.0-B — « l'objectif à trois voix »**, sept lots.
   Plage : `379ce774~1..65de4055`.
   *Attention : cette plage est **entrelacée** avec la campagne « Doctrine
   exécutable », qui n'est PAS dans le périmètre. Restreins-toi aux chemins
   listés plus bas.*

2. **LOT-05 — la réponse d'étape (`D-111`), classe P0**, trois PR :
   #799 la migration (appliquée en production, constatée par conteneur),
   #800 le code (`ccfba9d2`), **#801 les correctifs d'une revue interne**
   (`7b14d4fa`) — le récit d'étape disparaissait et deux gardes étaient
   décoratives. **Relis #800 et #801 ensemble** : #800 seul te ferait chasser
   des défauts déjà fermés.

3. **`D-113` — les cycles nommés `T0`/`T1`/`T2`**, deux PR :
   #803 la structure (`ed82deec`), #805 le comportement (`441d8cee` puis
   `e89da245`, ce dernier portant les correctifs d'un **NO-GO** de revue
   interne). Clôture documentaire `d5c23a00` (#807).
   Plage utile : `ed82deec~1..d5c23a00`.

**Trois zones neuves et peu éprouvées** — les correctifs de #801, ceux de
`e89da245`, et le croisement `D-113` × LOT-05 décrit en N1.5. Ce sont des zones
de **quelques heures**, pas des zones consolidées : raison d'y regarder plus,
pas moins.

**Chemins du périmètre** (tout le reste est hors sujet) :

```
web/src/lib/praticien/objectifNegocie.ts
web/src/lib/praticien/objectifNegocie*.test.ts
web/src/lib/protocol/cycles.ts
web/src/lib/protocol/ancresPersistees.ts
web/src/lib/protocol/fenetreJalon.ts
web/src/lib/protocol/jalonDu.ts
web/src/lib/protocol/jalonObjectifDu.ts
web/src/lib/protocol/trajectoire.ts
web/src/lib/protocol/versioning.ts
web/src/lib/protocol/cabinet.ts
web/src/lib/protocol/resumeTrajectoire.ts
web/src/lib/protocol/resumeJ21.ts
web/src/lib/equilibre/constants.ts
web/src/lib/equilibre/types.ts
web/src/lib/equilibre/momentum.ts
web/src/lib/equilibre/momentumParBesoin.ts
web/src/lib/clinical-engine/runtimeFromPrisma.ts
web/src/lib/clinical-engine/preconditionsT0*.ts
web/src/app/api/portail/dossier/route.ts
web/src/app/api/praticien/objectifs/route.ts
web/src/app/api/praticien/cockpit/route.ts
web/src/app/api/praticien/protocoles/route.ts
web/src/app/api/praticien/protocoles/versions/route.ts
web/src/app/api/praticien/protocoles/checkins/route.ts
web/src/app/api/praticien/trajectoire/route.ts
web/src/components/patient-companion/DossierDeuxVoixView.tsx
web/src/components/patient-cockpit/ObjectifNegociePanel.tsx
web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx
web/src/components/patient-cockpit/TrajectoirePanel.tsx
web/src/components/patient-cockpit/MomentumPanel.tsx
web/src/components/ui/SpiraleEpisodes.tsx
web/prisma/migrations/20260823120000_alliance_objectif_trois_voix_v1/
web/prisma/migrations/20260825150000_alliance_jalons_objectif_v1/
web/prisma/checks/
```

---

## 3. Méthode et seuil de preuve

Chaque affirmation reçoit **exactement un** verdict :

| Verdict | Signification |
|---|---|
| **`RÉFUTÉE`** | contre-exemple tracé de bout en bout, ou mutation **exécutée** qui casse la propriété en laissant son banc vert |
| **`RÉSISTE`** | aucun contre-exemple recevable trouvé |
| **`NON VÉRIFIABLE`** | un élément nécessaire à la preuve manquait — **nomme lequel** |

Chaque trouvaille est marquée **`CONFIRMÉE`** (chemin complet lu ou exécuté) ou
**`PLAUSIBLE`** (un maillon reste supposé — **nomme ce maillon**).

**Quatre exigences sur la preuve :**

1. **Une mutation annoncée est une mutation exécutée.** Si tu affirmes qu'une
   mutation laisse un banc vert, tu l'as appliquée dans une copie jetable et tu
   as lancé le banc. Sinon : `NON VÉRIFIABLE`, pas `RÉFUTÉE`. *Une précédente
   contre-revue a été écartée pour avoir présenté comme confirmées des
   mutations jamais lancées.*
2. **Ne confonds pas « le runtime le permet » et « rien ne l'en empêche ».** Un
   verrou permissif dont un contrepoids existe ailleurs ne réfute rien : va
   chercher le contrepoids avant de conclure.
3. **Cite fichier et ligne** pour chaque constat, et donne le chemin de données
   complet — de l'entrée jusqu'à l'effet faux.
4. **Pour un banc, ne demande jamais « est-il bon ? »** Demande : *quelle
   mutation devrait le faire rougir, et rougit-il ?*

**Commandes de validation** (depuis `web/`) : `npm run check` (rapide),
`npm run test:worktree -- --fast` (build de production + E2E).

---

## 4. Les vingt-cinq affirmations, par niveau

### NIVEAU 1 — une donnée patient perdue ou corrompue, ou une garde franchie

*Neuf affirmations. Ce niveau se traite en entier avant tout autre. Une seule
réfutée ici est bloquante : l'effet est en production et irréversible.*

**N1.1 · [C11] Deux cycles d'un même dossier ne partagent jamais une ligne
persistée.** Chaque `(dossier, cycle, jalon)` a son propre
`assessment_episodes` et son propre `protocol_drafts`.

> C'est le défaut le plus grave qu'ait produit ce chantier, et il ne s'est vu
> **ni au type-check, ni aux tests, ni à l'écran** : l'identifiant valait
> `runtime-episode-<patient>-<jalon>`, unique seulement tant qu'un dossier
> n'avait qu'un cycle. Le `J21` du second y prenait la **même clé primaire** que
> celui du premier, et les deux points de persistance écrivent par
> `upsert(where: {id}, update: {})` — la confirmation n'écrivait **rien**, sous
> une réponse `ok: true`. Le correctif préfixe les jalons de mesure par le nom
> de leur ancre.
>
> **Attaque-le** : le préfixe est-il posé sur **tous** les chemins qui
> fabriquent un identifiant ? Que devient un dossier sans ancre confirmée qui
> retombe sur la forme historique, puis qui en pose une ? Deux ancres de même
> rang en base — la colonne n'a ni CHECK ni unicité — produisent-elles deux
> lignes qui se recouvrent ? Et cherche **d'autres identifiants dérivés d'un
> littéral de jalon** ailleurs dans le dépôt : la même faute peut vivre sur une
> autre table.

**N1.2 · [C5] Aucun chemin ne permet d'ancrer un cycle sans le rideau `D-052` —
dans aucun des deux sens de la contradiction.**

> L'écart identifiant ↔ `milestone` déclaré n'a longtemps été fermé que dans un
> sens : le suffixe de l'identifiant primait, donc déclarer `T1` sur
> l'identifiant d'un `J21` faisait rendre `J21`, la porte ne s'évaluait **pas**,
> et c'est pourtant `milestone: 'T1'` qui partait en base et s'y relisait comme
> une ancre. Le correctif **refuse** la contradiction au lieu de la départager.
>
> **Cherche un troisième sens** : un identifiant hors format runtime, un champ
> tiers qui décide de l'ancrage, un appelant qui reconstruit l'épisode **après**
> la garde.

**N1.3 · [C4] Les trois gardes d'écriture sont les seules portes.** La forme
(ni ancre ni jalon de mesure ⇒ refus), le rang (l'ancre déjà posée, ou
exactement la suivante), la cohérence interne (identifiant et `milestone`
déclaré qui se contredisent ⇒ refus).

> La colonne `milestone` n'a **aucun CHECK** en base : si un chemin les
> contourne, rien d'autre ne rattrape. Cherche-le — y compris les chemins
> d'écriture qui n'appellent ni `refusAncreNonRecevable` ni
> `refusPreconditionsPersistance`.

**N1.4 · [B1] Aucune réponse d'étape ne peut être écrite hors de la fenêtre que
le SERVEUR calcule.**

> L'écran ne garde pas cette borne. Une horloge de navigateur décalée, un onglet
> resté ouvert une semaine, un POST direct : tous doivent être refusés. Cherche
> un chemin d'écriture qui contourne `jalonObjectifDu`.

**N1.5 · [B4] Toute ancre de cycle est refusée comme jalon d'objectif AU BORD,
avant la base, en français, sans jamais produire un 500.**

> La taxonomie en base est `('J21','J42','J90')` **sans ancre**, et
> `resoudreJalonDu` rend pourtant l'ancre pour tout dossier sans cycle confirmé.
> Laisser passer lève un `23514` et rend un 500 sur un chemin qu'aucun palier de
> test ne traverse.
>
> **Fait aggravant, postérieur au lot** : `D-113` a **ouvert** la série des
> ancres — `T0`, `T1`, `T2`, … Une garde écrite contre le seul littéral `'T0'`
> ne couvre plus rien à partir du deuxième cycle. La question n'est donc pas
> « refuse-t-il `T0` ? » mais **« refuse-t-il toute ancre ? »**. C'est le
> croisement le plus susceptible de rendre quelque chose.

**N1.6 · [B2] `eva` vaut `null` quand le patient n'a pas répondu à l'échelle,
jamais `0` — bord applicatif ET base ; et aucune décimale n'atteint la
colonne.**

> La colonne est un `INTEGER` : `5.5` est arrondi à `6` **avant** le CHECK, qui
> l'accepte. La base **ne peut pas** voir la valeur d'avant le cast. Cherche un
> chemin — corps de requête, coercition, valeur par défaut — où une décimale, un
> `NaN`, une chaîne numérique, un booléen ou un `0` de remplissage atteint la
> colonne.

**N1.7 · [B3] Le texte d'une réponse d'étape est obligatoire, et l'EVA ne peut
pas le remplacer : aucune ligne au texte vide n'atteint la table.**

> **Attention particulière** au CHECK : `btrim(texte, ' \t\r\n')` ne retire que
> ces quatre caractères. Un texte fait uniquement d'**espaces insécables**, de
> caractères de largeur nulle ou d'autres blancs Unicode passe-t-il ? Vérifie ce
> que le CHECK considère réellement comme « non vide ».

**N1.8 · [A5] Auteur et horodatage d'un amendement, d'une disposition ou d'un
contournement sont posés CÔTÉ SERVEUR**, jamais acceptés du corps de requête
sans recoupement contre la session.

> Cherche un champ d'auteur ou de date qui traverse le navigateur et atterrit en
> base sans être recoupé.

**N1.9 · [nouveau] La réponse d'étape est append-only et référence la version
EXACTE de l'objectif (`idObjectif`), jamais « l'objectif courant ».**

> Un amendement ultérieur ne doit pas réécrire, réattribuer ni faire disparaître
> une réponse déjà donnée. Cherche un chemin où une réponse change de version,
> ou où le récit d'étape se vide — **c'est exactement le défaut qu'a corrigé
> #801**, donc la zone est neuve.

---

### NIVEAU 2 — la provenance ou la fidélité est rompue

*Neuf affirmations. Le produit affirme alors quelque chose qu'il ne peut pas
justifier. Non bloquant en sécurité, bloquant pour la clôture.*

**N2.1 · [A1] Aucune proposition d'objectif ne peut exister sans source citée,
et c'est un INVARIANT DE TYPE** — pas une validation appelable qu'on pourrait
oublier d'appeler. *Cherche un chemin de construction qui produit une
proposition servie sans `source_proposition_id` résolu.*

**N2.2 · [A2] Le moteur cite et n'invente jamais** : aucun fragment de texte
servi au praticien ou au patient n'est produit autrement que par recopie d'une
source enregistrée. *Cherche une concaténation, un gabarit, une reformulation ou
une troncature qui fabrique une phrase que nulle source ne porte.*

**N2.3 · [A4] La reprise au cockpit cite sans réécrire** : aucun chemin ne
permet de modifier le texte d'une proposition tout en lui conservant sa citation
de source. *Cherche un chemin où le texte servi diverge de la source qu'il
prétend citer.*

**N2.4 · [A3] `WN_OBJECTIF_PROPOSE` absent ⇒ le moteur de proposition est éteint
sur TOUS les chemins**, fail-closed. *Cherche un second chemin — route,
composant, effet, préchargement — qui produit ou affiche une proposition drapeau
éteint.*

**N2.5 · [C1] Une ancre posée ne se déplace jamais.** Aucun chemin de lecture ne
fait dépendre les jalons d'un cycle de l'ancre d'un **autre** cycle.

> *Construis un dossier à deux cycles (`T0` en janvier avec un J21 mesuré, `T1`
> en mars) et cherche une lecture — trajectoire, jalon dû, cabinet, résumé,
> bandeau, momentum par besoin, fenêtre serveur — où le premier cycle perd sa
> mesure ou se recalcule depuis l'ancre du second.*

**N2.6 · [C6] Ouvrir un cycle n'efface ni ne recalcule aucune mesure du cycle
précédent** : ce qui a été confirmé reste lisible à l'identique. *Cherche une
lecture où l'ouverture d'un `T1` change une valeur déjà confirmée sous `T0`.*

**N2.7 · [C9] La discordance rang ↔ date est signalée À UN HUMAIN et jamais
corrigée.**

> Deux angles. **(a)** Cherche un tri, un `sort`, un `at(-1)` qui départage
> silencieusement les deux sources au lieu de les laisser diverger. **(b)** Le
> signal doit **atteindre quelqu'un** : le drapeau n'était calculé pour personne
> jusqu'au correctif. Cherche une **autre** valeur calculée au nom de `DC-30`
> que rien ne rend, ne journalise ni ne transmet — un booléen que personne ne
> lit ne signale rien.

**N2.8 · [nouveau] Le texte patient n'est JAMAIS journalisé, et l'absence de
réponse n'est jamais rendue comme un manquement** (`DC-24` : silence ≠ réponse,
libellés non-jugeants).

> Cherche un `console.*`, une trace, une télémétrie ou un message d'erreur qui
> échoie la saisie du patient — et un libellé qui transforme un silence en
> retard, en oubli ou en défaut d'observance.

**N2.9 · [B6] Aucune surface patient de 6.0-B n'attache de VALENCE CLINIQUE à ce
que le patient déclare** : ni couleur, ni icône, ni hiérarchie, ni formulation
qui transforme une déclaration en jugement. *Cherche une surface montée par le
portail — y compris un composant monté par une page déjà relue.*

---

### NIVEAU 3 — invariants structurels et dettes assumées

*Sept affirmations. Ici, un `RÉFUTÉE` est une dette à ouvrir, pas un incident.
La dernière te demande explicitement un **jugement**, pas un contre-exemple.*

**N3.1 · [C2] `estAncreDeCycle` est le prédicat unique** : plus aucun test de
littéral `'T0'` dans `web/src/` ne décide de « est-ce une ancre ? ». *Les
littéraux `'T0'` restants doivent tous signifier soit « la toute première
mesure », soit un défaut d'affichage sans conséquence. Trouve-en un qui décide
encore de l'ancrage.*

**N3.2 · [C3] Aucune table indexée par `JalonMomentum` ne subsiste** : aucun
`Record`, `Map` littérale ou équivalent ne peut rendre `undefined` sous un type
non-nullable pour `T1`. *C'est la classe de défaut que `D-113` dit avoir
supprimée — un `Record` dont la clé est une union de gabarit ouverte dégénère en
signature d'index, et `tsc` reste vert. Cherche-en une qui survit, y compris
dans les composants.*

**N3.3 · [B5] `JALONS_OBJECTIF`, le CHECK
`reponses_jalon_objectif_jalon_check` et la table de cadence ne peuvent pas
diverger sans qu'un banc rougisse.** *Mutation à exécuter : ajoute un `J120` à
l'un des trois, retire `J21` d'un autre, renomme une ancre — le banc rougit-il à
chaque fois ?*

**N3.4 · [C7] `targetAt` est déterministe** : aucun appel d'horloge n'entre dans
`proposalHash`. *Sinon toute ouverture d'ancre serait périmée à la seconde, avec
un 409 impossible à résorber. Vérifie le chemin GET → POST de bout en bout.*

**N3.5 · [C8] Les cadences 21, 42, 90 et la tolérance de ±8 sont inchangées**
par `D-113`, et aucun seuil, dose, poids ou borne clinique n'est touché. *C'est
ce qui autorise ces PR à ne porter aucune décision clinique. Trouve une valeur
clinique qui a bougé.*

**N3.6 · [C10] Le geste d'ouverture d'un cycle n'écrit rien tant que l'épisode
n'est pas confirmé.** *Cherche un effet de bord — écriture, invalidation de
cache, mutation d'état persistant — déclenché par le seul fait de demander la
proposition d'une nouvelle ancre.*

**N3.7 · [C12] Aucune clé n'est laissée à la seule discipline applicative là où
la base pourrait la tenir.** — **jugement demandé, pas contre-exemple.**

> `assessment_episodes.milestone` n'a **aucun CHECK** et la table **aucune
> unicité** sur `(dossier, cycle, jalon)` : c'est une dette explicitement nommée
> et reconduite, pas un oubli. Juge si le bord applicatif la couvre réellement —
> et si l'argument « la table est vide en production » est un motif de report
> acceptable ou un report qui deviendra **impayable au premier `T0` confirmé**.

---

## 5. Ordre d'exécution et arrêt

1. **Traite le niveau 1 en entier**, avant toute autre chose. Si tu manques de
   budget, un niveau 1 complet vaut mieux que trois niveaux survolés — dis-le
   explicitement dans tes limites de couverture.
2. Puis le niveau 2, puis le niveau 3.
3. **Commence par les trois zones neuves** (`e89da245`, `7b14d4fa`, et le
   croisement `D-113` × LOT-05 de N1.5) : c'est là que le rendement est le plus
   élevé.
4. **N'arrête pas une affirmation au premier contre-exemple** : cherche si le
   défaut est **plus large qu'annoncé**. C'est ce qui a le plus de valeur.

---

## 6. Ce qu'il ne faut PAS faire

- **Ne propose aucun refactoring, renommage ni réorganisation.**
- **Ne sors pas du périmètre de chemins.** Le déploiement, `release-db`, les
  migrations autres que les deux nommées, et tout fichier de « Doctrine
  exécutable » sont hors sujet.
- **Ne signale pas les défauts déjà nommés au dépôt** — vérifie d'abord qu'ils
  le sont : `assessment_episodes.milestone` sans CHECK, les deux routes
  « Mon équilibre » cycle-aveugles, `neCouvrePas` null sur les 95 interventions.
  Les renommer n'apporte rien ; montrer qu'ils sont **plus larges qu'annoncé**
  apporte beaucoup.
- **Ne prends pas ces contraintes d'architecture pour des défauts** :
  - `JALONS_OBJECTIF` est une **littérale** dans `objectifNegocie.ts` et doit le
    rester — la garde `G5` interdit à ce module d'importer `@/lib/equilibre` (il
    part dans le bundle patient). La dérivation depuis `JOURS_JALON` est
    **vérifiée** par `G7`, pas exécutée. Proposer de la dériver à l'exécution,
    c'est proposer de casser `G5`.
  - Le filtre SQL des ancres est **volontairement large** (`startsWith: 'T'`),
    la forme étant tranchée en mémoire par `estAncreDeCycle` : un `LIKE` plus
    fin en SQL serait une **seconde définition** de « ancre ».

---

## 7. Format de restitution attendu

1. **Tableau des verdicts** — une ligne par affirmation : identifiant (`N1.1`…),
   énoncé court, verdict, motif en une phrase.
2. **Une section par trouvaille `RÉFUTÉE`**, dans l'ordre des niveaux, avec :
   `fichier:ligne`, chemin de données complet, **résultat faux obtenu**, et la
   preuve exécutée (code de la mutation, sortie du banc avant/après).
3. **Limites de couverture** — ce que tu n'as pas pu vérifier, et pourquoi.

Compte final en une ligne : *N réfutées (dont X au niveau 1), M résistent,
P non vérifiables.*
