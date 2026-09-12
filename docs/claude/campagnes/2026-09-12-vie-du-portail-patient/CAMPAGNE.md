---
id: "2026-09-12-vie-du-portail-patient"
titre: "La vie du portail patient — consignée, et non rejouée de mémoire"
statut: "cadrée — arbitrages dus avant LOT-01"
créée_le: "2026-09-12"
mise_à_jour: "2026-09-12"
lot_courant: "aucun"
branche_campagne: "aucune"
branche_lot_courant: "aucune"
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
| Rappel agenda alimentaire | **Rien** — un lien « Ouvrir Mon carnet alimentaire », sans état ni rappel |
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

**Conséquence : LOT-01 n'a pas besoin de migration.** Si un lot ultérieur en
demande une, c'est qu'une décision aura été prise entre-temps — elle se
justifiera alors par écrit.

## Ce qui n'est PAS un lot de cette campagne

- **Grossir « votre étape du moment ».** Le principe A6-R1 tient.
- **Notifier.** Aucun canal sortant : ni e-mail, ni push. Le portail se consulte,
  il ne poursuit pas. (Même arbitrage que le Fil praticien, 2026-09-10.)
- **Compter.** Ni « 3 actions en retard », ni série, ni score d'assiduité
  (`DC-19`/`DC-20`). Le nombre de fois qu'un patient a ouvert son portail n'est
  pas une mesure de lui.
- **La mise en service.** Surface patient : le code se livre, son activation se
  demande.

## Lots proposés

| Lot | Objet | Migration |
|---|---|---|
| **LOT-01** | La **dérivation** du journal : une fonction pure qui assemble la vie d'un dossier depuis les tables existantes, et sa route de lecture au portail | non |
| **LOT-02** | L'écran « Ce qui s'est passé » sur l'accueil du portail — placé **après** l'étape du moment, jamais avant | non |
| **LOT-03** | Le rappel de l'agenda **alimentaire**, au régime exact du sommeil : une phrase factuelle, jamais un compte à rebours | non |
| **LOT-04** | Les deux portes manquantes : « ce qui compte » et « ce que j'ai compris » visibles depuis l'accueil | non |
| **LOT-05** | Doctrine (`D-xxx`), journal de session, handoff — et la demande de mise en service | non |

## Arbitrages dus AVANT le LOT-01

Quatre, et aucun ne se déduit du code.

1. **Le journal montre-t-il les gestes du PRATICIEN ?** « Votre praticien a
   publié une synthèse le 3 septembre » est utile — et c'est aussi une
   surveillance du praticien par son patient, dans les deux sens. Le dossier à
   deux voix a tranché ce genre de question au cas par cas ; ici, elle se pose
   en bloc.
2. **Jusqu'où remonte-t-il ?** Tout le dossier, ou une fenêtre ? Une fenêtre est
   un **seuil**, et aucun seuil ne s'invente (`DC-19`/`DC-20`).
3. **Déplié ou replié par défaut ?** Replié, il ne concurrence pas l'étape du
   moment mais reste invisible — le défaut actuel. Déplié, il pèse sur une page
   dont un audit a retiré le poids.
4. **Que fait-il d'un dossier neuf ?** Un journal vide chez quelqu'un qui vient
   d'entrer dit « il ne s'est rien passé » — vrai, mais accueillant comme une
   porte close. `DC-24` demande que l'absence se lise comme une absence, pas
   comme un manquement.

## Dépendance

Aucune sur le chantier en cours (lecture des cartes du Fil **praticien**,
PR #1030 et suivantes). Les deux touchent le mot « fil » et rien d'autre : l'un
est une surface praticien qui s'acquitte, l'autre une surface patient qui se
lit. **Ne pas les nommer pareil** — la leçon du 2026-09-12 sur « demande de
correction » a coûté une campagne entière.
