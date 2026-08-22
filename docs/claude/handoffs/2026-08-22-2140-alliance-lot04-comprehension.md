# Alliance 6.0-A LOT-04 — « Ce que j'ai compris de vous »

Date : 2026-08-22 · Branche : `alliance-6a/lot-04` · Aucune migration.

## Ce qui est livré

Le praticien rédige une synthèse de compréhension versionnée, la publie au
patient sous garde, et le patient peut déposer un désaccord structuré accroché
à la version exacte contestée. Cinq tables déjà en production (LOT-01) ; ce lot
n'écrit ni `schema.prisma`, ni `prisma/migrations/`, ni `prisma/checks/`.

## Les quatre arbitrages, et pourquoi

**1. L'accusé de lecture praticien n'a pas de colonne — et n'en aura pas.** Le
fichier de lot l'exigeait ; la table a six colonnes figées et le schéma refuse
explicitement une colonne mutable (elle contredirait l'append-only). Une
colonne l'aurait aussi fait rougir : `COLS_DESACCORDS` est une liste blanche du
contrat SQL, jouée par le CI. Représentation retenue, en deux morceaux
distincts : **« vu »** = le journal d'accès existant (`ROUTE_JOURNAL` dédié au
GET, `G-TRUST-04`) ; **« répondu »** = état **dérivé** à chaque lecture — il
existe une version publiée, postérieure au désaccord, qui descend de la version
contestée. Les deux conditions comptent : « descend de » sans « après »
qualifierait de réponse une version publiée avant la contestation ; « après »
sans « descend de » qualifierait n'importe quelle autre synthèse du dossier.

**2. `D-090` — le régime d'une garde suit le GESTE, pas le texte.** La carte du
Socle notait cet alignement « non tranché ». Un même objet porte ici **deux
entrées** : refus confirmable à la publication (un humain est là pour
trancher), journalisant au service portail (personne ne l'est, et bloquer
montrerait une page d'erreur au patient pour un texte qu'il n'a pas écrit).
Refus dur écarté : un faux positif du registre rendrait une synthèse légitime
impubliable sur une surface où le praticien choisit ses mots.

**3. Le drapeau garde la PUBLICATION, pas le brouillon.** Troisième geste gardé,
le moins évident : laisser publier surface fermée produirait un stock de
synthèses que le praticien croit remises et qui atteindraient toutes le patient
d'un coup à l'allumage — `D-070` vu depuis l'autre bout de la chaîne. Rédiger
et réviser des brouillons reste possible ; c'est l'usage attendu avant
ouverture. La lecture praticien n'est pas gardée (une liste vide est un silence
honnête ; un 503 ferait croire à une panne).

**4. Segment `comprehension`, pas `synthese`.** Trois surfaces portent déjà ce
mot (`api/praticien/synthese/` = synthèse IA, `lib/synthese-praticien.ts`,
`components/SynthesePanel.tsx`). L'en-tête du module feuille lève l'ambiguïté.

## Preuve de mutation — les bancs de débranchement, VUS ROUGES

Aucun test ne garde la carte de `vocabulaire.ts` (c'est un commentaire, et le
hook la classe en silence). La preuve est donc manuelle, et la voici :

| Mutation appliquée | Banc | Verdict |
|---|---|---|
| `if (publier)` → `if (false && publier)` dans `api/praticien/comprehension/route.ts` | `route.test.ts` « DÉBRANCHEMENT — refuse de publier un texte au registre anxiogène » | **rouge** (1 failed / 26 passed) |
| `if (servie && termeAnxiogene(...))` → `if (false)` dans `api/portail/comprehension/route.ts` | `route.test.ts` « DÉBRANCHEMENT — journalise un registre anxiogène servi » | **rouge** (1 failed / 22 passed) |

Les deux gardes ont été rebranchées et rejouées vertes après la mutation.

## Piège rencontré, à ne pas rejouer

La garde anti-diagnostic refuse **tout nom déclaré commençant par `code`**.
`const code = (err as {code?: unknown}).code` dans le helper de journalisation
Prisma — un code d'ERREUR, pas un code diagnostique — a fait rougir G3. Renommé
`marqueurPrisma` plutôt que d'assouplir la garde : une exception la rendrait
contournable par un nom bien choisi. Le contre-patron identique vit encore dans
`api/portail/ce-qui-compte/route.ts`, hors du périmètre de sa propre garde.

## La revue a trouvé ce que je n'avais pas vu

`wn-reviewer` a rendu **NO-GO** sur deux bloquants, tous deux réels, tous deux
corrigés dans la même PR.

**B1 — une dépublication de fait, épinglée par deux de mes propres bancs.**
`syntheseServieAuPatient` servait la *tête de chaîne* publiée. Dès que le
praticien enregistrait un **brouillon** de révision, la seule tête devenait ce
brouillon, non publiée : le portail rendait `synthese: null` et l'écran patient
affichait « votre praticien n'a encore rien publié ici — cela ne veut rien dire
de plus ». Faux, et fabriqué : le patient perdait l'accès au texte qu'il avait
lu et parfois contesté, tandis que le cockpit lui affirmait l'inverse. J'avais
écrit deux bancs qui verrouillaient ce comportement, en croyant protéger le
patient d'un texte « déjà corrigé ». L'argument qui tranche : le filtre par
tête n'apportait **rien** — une révision publiée est toujours plus récente,
donc gagne de toute façon ; son seul effet propre était le défaut. Corrigé en
servant la publiée la plus récente, avec les bancs réécrits pour épingler le
comportement voulu et non l'actuel.

**B2 — `err.message` brut sous un commentaire qui promettait le contraire.** La
route praticien journalisait le message d'erreur tel quel, alors que
`PrismaClientValidationError` recopie le `data:` du `create` — 4 000 caractères
de prose clinique et l'e-mail du praticien. Le helper de rédaction sûre existait
**dans la route sœur du même lot**. Corrigé sur les deux chemins d'exception,
avec deux bancs (erreur Prisma caviardée, erreur non-Prisma conservée).

**Aussi corrigé, hors bloquants** : `M3` — la sonde du hub appelait la route de
service à chaque visite de l'accueil et pouvait émettre « registre anxiogène
**servi** » pour une page jamais ouverte ; un mode `?interrupteur=1` la remplace
(deux `findMany` et un transport de texte en moins, l'événement redevient vrai).
`M1` — le cockpit affirmait « révisées en parallèle » là où deux têtes peuvent
aussi venir d'une version écrite indépendamment ; reformulé sans diagnostiquer
la cause. `M4` — l'assertion du journal d'accès était vacuante (`0 === 0`) ;
remplacée par un cas positif nommant le gabarit littéral et la méthode.
`M2` — le cockpit dit désormais qu'une version indépendante ne rattache pas le
désaccord.

## Ce qui reste ouvert

- **`WN_COMPREHENSION` n'est pas posé en production** — geste du responsable.
  Rappel du piège `D-071` : poser la variable ne suffit pas, il faut un build
  qui la porte.
- **L'append-only n'est tenu par rien en base** : ni trigger, ni contrainte.
  Toute la discipline est portée par `comprehensionAppendOnly.guard.test.ts` —
  c'est la dette que le schéma renvoie explicitement aux lots 02/03/04/06.
- **Course sur `supersedes`** : la lecture-puis-409 n'est pas étanche. Deux
  têtes coexistantes sont **signalées** au cockpit, jamais départagées en
  silence. Aucune contrainte `UNIQUE` n'existe sur les cinq tables.
- **Le LOT-06 hérite de quatre fichiers chauds** : `FichePatientPanel.tsx`,
  `PatientCompanionHome.tsx`, `patient/featureFlag.ts`, et les fichiers de
  campagne.
- Le fichier de lot demandait T2, la classe clinique de campagne T3 : la plus
  stricte a été retenue.

### Nommé par la revue, laissé en suivi de campagne

- **Rien ne prévient le praticien qu'un désaccord est arrivé.** Aucun signal
  hors ouverture du panneau, aucune remontée en liste de dossiers. Le lot
  applique au praticien le modèle « pull » qu'il assume côté patient — un
  désaccord peut rester invisible indéfiniment. Ce n'est pas un oubli
  d'implémentation : c'est une surface que le lot n'a pas cadrée, et qui
  demande son propre arbitrage (une notification passerait par le registre de
  gabarits).
- **`etatDesaccord` a un angle mort sans issue** : répondre par une version qui
  ne descend pas de la version contestée laisse le message en « pas encore de
  réponse », définitivement. Le cockpit le dit maintenant à l'écran ; le modèle,
  lui, n'a pas changé.
- **`api/praticien/objectifs/route.ts` porte le même défaut que B2** — même
  commentaire promettant « jamais le payload », même `err.message` brut. Dette
  nommée, hors périmètre de ce lot : le correctif y est identique (reprendre
  `messageJournalisable`).
- **Aucun E2E sur `/portail/[token]/comprehension`** — parité avec le LOT-03,
  qui n'en a pas non plus sur `ce-qui-compte`. À traiter pour les deux surfaces
  ensemble, drapeaux allumés, plutôt que pour celle-ci seule.
- **`confirmerRegistre` est acceptable dès le premier envoi** : un client pourrait
  publier sans jamais voir le terme relevé. Le panneau ne le fait pas, et c'est
  le même régime que le booklet.
