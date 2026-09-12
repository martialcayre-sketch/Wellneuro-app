---
id: "2026-09-12-vie-du-portail-patient"
titre: "La vie du portail patient — consignée, et non rejouée de mémoire"
statut: "en cours — LOT-01 à LOT-05 livrés, mise en service à demander"
créée_le: "2026-09-12"
mise_à_jour: "2026-09-12"
lot_courant: "LOT-05"
branche_campagne: "aucune"
branche_lot_courant: "portail-journal-lot05"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# La vie du portail patient — consignée, et non rejouée de mémoire

## La demande, et le piège qu'elle contient

Demande du responsable, 2026-09-12 : « prévoir au portail patient un *fil du
jour* (questionnaires à remplir, lectures synthèses, bilans, actions à faire
comme déclarer ce qui compte pour moi, reminders agenda sommeil et agenda
alimentaire), **consigner la vie du portail patient** ».

**Le piège est nommé d'avance, et il est écrit dans le code.**
`MonParcoursAccueil.tsx` porte ceci, en tête :

> « Ce bloc porte l'étape du moment — **UNE seule chose mise en avant**. C'est
> la réponse à l'écart **E11** de l'audit 5.0 : la page d'atterrissage empilait
> une dizaine de blocs autonomes, contre le principe **A6-R1** *une étape à la
> fois (séquentiel, pas de hub empilé)* côté patient. »

Un « fil du jour » patient qui **liste tout ce qui est dû** est, littéralement,
le hub empilé qu'un audit a fait démonter. Le construire rouvrirait E11 sans
qu'aucune décision ne l'ait voulu.

## Ce qui sauve la demande : deux objets, et un seul manque

Le Fil du jour praticien fait DEUX choses à la fois — il dit *ce qui s'est
passé* et *ce qu'il reste à faire*. Côté patient, ces deux moitiés n'ont pas le
même sort :

| | Côté patient | État |
|---|---|---|
| **Ce qui est à faire** | « Votre étape du moment » — une seule, délibérément | **Existe**, et ne doit pas grossir |
| **Ce qui s'est passé** | — | **N'existe pas**, et c'est le verbe de la demande : *consigner* |

*Consigner* n'est pas *assigner*. La demande, lue à la lettre, porte sur la
moitié qui manque — celle qui n'entre en concurrence avec rien.

## Résultat observable

1. Un patient voit, depuis son portail, **ce qui s'est passé dans son dossier**
   — ce qu'il a transmis, ce qui lui a été remis, ce qu'il a dit sur son
   objectif — daté, dans l'ordre, et **du serveur**, donc identique sur son
   téléphone et sur son ordinateur.
2. Les deux agendas ont le **même régime de rappel**. Aujourd'hui le sommeil a
   une phrase d'appui factuelle et l'alimentaire n'a rien.
3. « Ce qui compte pour moi » et « Ce que j'ai compris de vous » ont une
   **porte visible** depuis l'accueil, sans dépliage préalable.
4. « Votre étape du moment » reste **une seule étape**. Aucun lot n'y ajoute de
   liste.

## État réel au cadrage — 2026-09-12 (vérifié, non supposé)

| Élément demandé | Où il vit aujourd'hui |
|---|---|
| Questionnaires à remplir | « À compléter » sur le hub, **plus** l'étape du moment — dédoublonnés exprès (SP-CONV LOT-04) |
| Lectures de synthèses | `/comprehension` — atteignable seulement depuis « Mon accompagnement » **replié**, ou depuis le dossier à deux voix |
| Bilans | « Consulter mon bilan » — rangée de liens secondaires, conditionnel à `bilanConsultable` |
| Déclarer ce qui compte | `/ce-qui-compte` — **aucune entrée depuis l'accueil**, seulement depuis le dossier à deux voix |
| Rappel agenda sommeil | Phrase d'appui sous l'étape du moment (`lib/agenda-sommeil/rappelPortail.ts`) — « 5 nuits notées sur 21 », jamais un compte à rebours |
| Rappel agenda alimentaire | ~~**Rien**~~ — **CETTE LIGNE ÉTAIT FAUSSE**, corrigée le 2026-09-12 après lecture du code : `lib/agenda-alimentaire/rappelPortail.ts` existe, jumeau déclaré du sommeil, et `hubQuestionnaires.ts` le fait remonter jusqu'à l'étape du moment avec sa phrase factuelle. Détail et preuves : `lots/LOT-04-rappel-agenda-alimentaire.md` |
| Ce qui s'est passé | « Depuis votre dernière visite (N) », **replié** — et voir ci-dessous |

### « Depuis votre dernière visite » ne consigne rien

`lib/portail-visite.ts` le dit lui-même : « **purement local et
présentationnel** ». Quatre conséquences, toutes vérifiées dans le code :

1. **Rien n'est écrit au serveur.** Un instantané `localStorage` est comparé
   au suivant, puis écrasé.
2. **Il ne voit que les assignations** — `{ idAssignation, titre,
   statutReponses }`. Une synthèse publiée, un objectif ratifié, une entrée
   « ce qui compte », une nuit d'agenda : rien de tout cela n'y entre.
3. **Il ne suit pas la personne.** Le patient qui ouvre son portail sur son
   téléphone au lieu de son ordinateur ne voit rien : l'instantané est resté
   dans l'autre navigateur.
4. **Il est vide à la première visite**, par construction.

**La vie du portail n'est donc pas consignée : elle est devinée, localement, et
jetée.** C'est exactement ce que la demande nomme.

## Le principe que la campagne se donne : DÉRIVER, ne rien cocher

La vie du dossier est **déjà en base** — assignations, réponses, synthèses
publiées, ratifications, amendements, demandes de correction, entrées « ce qui
compte », nuits d'agenda, bilans transmis. Un journal se **dérive** de ces
lignes ; il ne se stocke pas une seconde fois.

C'est la discipline de `D-170` (« un statut se coche sans rien faire ; une
reformulation ne se simule pas ») et celle de `DC-24` : une absence se lit comme
une absence. Un journal recopié divergerait de ce qu'il prétend refléter, et
personne ne saurait lequel des deux croire.

**Conséquence : le journal lui-même ne se stocke pas, et LOT-01 n'a besoin
d'aucune migration.**

Une seule ligne de cette campagne s'écrit en base, et elle ne fait pas partie du
journal : le **repère de fraîcheur** du patient (arbitrage 3), qui dit jusqu'où
il a vu — pas ce qui s'est passé. Il vit au LOT-02, sous ses propres contraintes,
et son existence a été décidée le 2026-09-12, pas supposée ici.

## Ce qui n'est PAS un lot de cette campagne

- **Grossir « votre étape du moment ».** Le principe A6-R1 tient.
- **Notifier.** Aucun canal sortant : ni e-mail, ni push. Le portail se consulte,
  il ne poursuit pas. (Même arbitrage que le Fil praticien, 2026-09-10.)
- **Compter.** Ni « 3 actions en retard », ni série, ni score d'assiduité
  (`DC-19`/`DC-20`). Le nombre de fois qu'un patient a ouvert son portail n'est
  pas une mesure de lui. Le repère de fraîcheur du LOT-02 est écrit pour rendre
  ce décompte **impossible**, et non seulement interdit : un seul instant par
  dossier, écrasé à chaque avancée. Ce qui n'est pas conservé ne se compte pas.
- **La mise en service.** Surface patient : le code se livre, son activation se
  demande. Le drapeau est `WN_PORTAIL_JOURNAL` (LOT-01), **neuf, éteint, et il
  ne se compose d'aucun des cinq autres** : une surface fermée par son propre
  drapeau ne produit aucune ligne de journal, même celui-ci allumé.

## Lots proposés

| Lot | Objet | Migration |
|---|---|---|
| **LOT-01** | La **dérivation** du journal : une fonction pure qui assemble la vie d'un dossier depuis les tables existantes, et sa route de lecture au portail | non |
| **LOT-02** | Le **repère de fraîcheur** : la marque « vu jusqu'ici » du patient, sa migration, sa route | **oui** (arbitrage 3) |
| **LOT-03** | L'écran « Ce qui s'est passé » sur l'accueil du portail — placé **après** l'étape du moment, déplié seulement s'il y a du neuf | non |
| **LOT-04** | ~~Le rappel de l'agenda alimentaire~~ — **SANS OBJET, déjà livré** (constaté le 2026-09-12) | non |
| **LOT-05** | Les deux portes manquantes : « ce qui compte » et « ce que j'ai compris » visibles depuis l'accueil | non |
| **LOT-06** | Doctrine (`D-xxx`), journal de session, handoff — et la demande de mise en service | non |

## Une ligne du cadrage était fausse — corrigée le 2026-09-12

Le tableau « état réel » ci-dessus affirmait que l'agenda **alimentaire** n'avait
« rien » : ni état, ni rappel. **C'est faux**, et la vérification a précédé
l'écriture du lot : le module jumeau existe, il a ses bancs, et le hub le fait
remonter jusqu'à l'étape du moment. Le LOT-04 est donc **sans objet**, et son
fichier de lot porte les preuves.

**La leçon est celle de « sans drapeau propre = en service au déploiement » :**
une absence se CONSTATE, elle ne se suppose pas. Un cadrage qui affirme un
manque sans l'avoir cherché fabrique du travail, et pire — il fait croire à une
lacune là où le dépôt était en règle.

Ce qui reste vrai et n'est pas de cette campagne : la **clôture alimentaire**
n'existe pas, si bien que l'état `a_transmettre` ne propose aucun geste côté
alimentaire. Le code le dit et l'explique (`D-015` : un refus — ou une
proposition — doit nommer un geste POSSIBLE).

## Arbitrages tranchés — 2026-09-12

Les quatre questions ouvertes au cadrage ont été posées et tranchées le jour
même par le responsable. Ce qui suit fait foi ; le reste de ce document a été
remis en cohérence avec ces réponses.

### 1. Le journal montre les gestes du praticien QUI PRODUISENT quelque chose

**Tranché : seulement ce qui lui est remis.**

Y entrent : une synthèse publiée, un bilan transmis, un questionnaire assigné,
une reformulation d'objectif proposée. N'y entrent pas les gestes internes —
un protocole relu, une biologie arbitrée, une note de suivi, une décision de
palier.

La ligne de partage est le **destinataire du geste**, pas sa nature : le patient
voit ce qui lui arrive, jamais ce qu'on fait de lui. Ce critère est
opérationnel, et il doit se lire dans le code comme une liste fermée d'espèces
d'événements — pas comme un filtre sur un champ qui pourrait dériver.

### 2. Le journal remonte à l'entrée du dossier, sans borne

**Tranché : tout le dossier.**

Aucun seuil n'est inventé (`DC-19`/`DC-20`). La volumétrie réelle ne justifie
pas encore de fenêtre — un dossier de trois mois tient en une vingtaine de
lignes. Si elle vient à la justifier, ce sera un fait nouveau, constaté sur des
dossiers réels, et la fenêtre se décidera alors par écrit.

### 3. Déplié seulement s'il y a du neuf — et cela coûte une migration

**Tranché : replié par défaut, déplié quand quelque chose s'est passé depuis
que le patient a vu le journal.**

**C'EST LE SEUL POINT DE LA CAMPAGNE QUI DEMANDE UNE ÉCRITURE**, et le cadrage
initial annonçait le contraire. Il faut un repère serveur : sans lui, le
« neuf » se calculerait en `localStorage` — exactement le défaut que cette
campagne existe pour corriger (un patient qui change de téléphone verrait tout
en neuf, ou rien).

Trois contraintes encadrent ce repère, et elles ne sont pas de forme :

- **UN SEUL INSTANT PAR DOSSIER, ÉCRASÉ.** Pas un journal de visites. Une
  table append-only de connexions serait un décompte d'assiduité déguisé — ce
  que « Ce qui n'est PAS un lot » interdit explicitement, et que `DC-19`/`DC-20`
  interdisent en général. Les valeurs précédentes sont perdues, et c'est voulu :
  ce repère n'est pas une trace d'audit, c'est une commodité d'affichage.
- **LE REPÈRE AVANCE QUAND LE JOURNAL A ÉTÉ MONTRÉ DÉPLIÉ**, pas à chaque
  ouverture du portail. Le déplacer à chaque chargement le viderait de son sens
  au premier rafraîchissement — le patient n'aurait rien lu et le portail
  dirait qu'il a tout vu.
- **NE PAS LE NOMMER COMME LA LECTURE DU FIL PRATICIEN.** Les deux se
  ressemblent et ne sont pas la même chose : là-bas un praticien acquitte une
  carte, ici un patient est informé. `fil_card_lectures` et son vocabulaire
  (`lue`, `luePar`, `supersedesLectureId`) restent au praticien. Voir la
  dépendance ci-dessous — l'homonymie « demande de correction » a coûté une
  campagne entière le jour même.

### 4. Un dossier neuf s'ouvre sur sa propre entrée

**Tranché : l'entrée dans l'accompagnement est la première ligne du journal.**

« Vous êtes entré dans votre accompagnement le 12 septembre. » Le journal n'est
donc jamais vide : l'entrée dans le dossier EST un événement du dossier, il est
en base, daté et vrai.

Conséquence directe : **aucun état vide à écrire**, et aucune phrase d'accueil à
inventer. `DC-24` est satisfait sans habillage — l'absence de tout le reste se
lit comme une absence parce qu'il n'y a rien d'autre à lire, pas parce qu'une
phrase le dit.

Corollaire à vérifier au LOT-01 : la date d'entrée dans l'accompagnement doit
être lisible pour **tous** les dossiers, y compris les plus anciens. Si elle
manque pour certains, le journal commence à leur premier événement connu — et
ce cas se constate sur les dossiers réels, il ne se suppose pas.

## Dépendance

Aucune sur le chantier en cours (lecture des cartes du Fil **praticien**,
PR #1030 et suivantes). Les deux touchent le mot « fil » et rien d'autre : l'un
est une surface praticien qui s'acquitte, l'autre une surface patient qui se
lit. **Ne pas les nommer pareil** — la leçon du 2026-09-12 sur « demande de
correction » a coûté une campagne entière.
