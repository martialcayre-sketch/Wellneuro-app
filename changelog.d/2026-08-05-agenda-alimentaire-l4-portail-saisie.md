### Ajouté — L'agenda alimentaire devient visible et notable par le patient (lot LOT-04)

L4a avait ouvert l'accès serveur sans qu'aucun écran ne le consomme : `Q_ALI_09`
assigné menait à une impasse, et `WN_AGENDA_ALI` restait éteint pour cette raison.
Ce lot livre la surface — aiguillage, hub, saisie, relecture — et la borne des
21 jours au chemin d'écriture. Le drapeau ne s'allume qu'après, sur Development et
Preview, jamais en Production ([D-022](../docs/DECISIONS.md)).

Le patient voit l'agenda dans son hub avec son avancement, y entre depuis le
portail, note une journée sans clavier, la relit et la corrige.

#### Une fenêtre s'ancre sur ce qui est enregistré, pas sur ce qui est relisible

`calculerFenetreAliDepuisDates` ancrait les 21 emplacements sur `min(dates)` des
seules journées **relues**. Une ligne en quarantaine — JSONB illisible — sortait de
la collection, et si c'était la plus ancienne, l'ancre glissait vers la suivante.
Tant que la fenêtre ne servait qu'à l'affichage, le défaut était cosmétique.
Il cesse de l'être le jour où la borne des 21 jours s'appuie sur cette ancre : une
date que le serveur refusait la veille redevenait acceptable.

L'ancre se calcule désormais sur l'union `dates ∪ datesIllisibles`. Elle tient parce
que **la quarantaine porte sur le JSONB `reponses`, jamais sur la colonne
`date_jour`** : la date d'une ligne qu'on ne sait pas relire reste connue, et
`listJours` la remonte déjà, sans requête supplémentaire.

Deux garde-fous, sans lesquels le correctif serait pire que le défaut :

- **L'union est filtrée par `estDateValide`.** Ces dates viennent de lignes dont on
  ne sait rien relire, et `dateDebut` sort d'un tri **lexicographique** : un
  `1900-01-01` reculerait l'ancre de 126 ans et **ferait refuser toute écriture**.
  C'est le seul endroit du chemin où l'on fait confiance à une donnée issue d'une
  ligne déclarée non fiable — le filtre est la contrepartie.
- **L'union sert à l'ancre, jamais à `renseignee` ni à `nbRenseignees`.** Une
  journée en quarantaine n'est pas une journée relue ; la compter ferait franchir
  les seuils d'exploitabilité (14 jours, 4 week-ends, 7 paires) sur du vide.

`EmplacementFenetreAli` gagne un drapeau `illisible`, **additif et non exclusif** de
`renseignee` : le modèle étant append-only, une même date peut porter une tête de
chaîne relue *et* une ligne illisible. Un enum aurait forcé un choix faux dans les
deux sens. L'écran en a l'usage — sans lui, il rendrait un trou ordinaire, le
patient taperait dessus et récolterait un `409`.

Le test qui garde ce correctif **a été falsifié avant d'être cru** : l'union
neutralisée, cinq tests tombent, dont celui-là, qui rend `201` là où il attend
`409`. Un test vert qui n'a pas mordu ne prouve rien.

#### La borne des 21 jours, et pourquoi elle est posée à cet endroit précis

Le `POST` refuse toute `dateJour` **au-delà** de `dateDebut + 20`
(`409 hors_fenetre_21j`). Motif **distinct** de `date_hors_fenetre`, qui dit
« aujourd'hui ou hier » : deux natures, deux réactions d'écran. Et surtout pas
`recueil_complet` — la fenêtre peut être **trouée**, 21 jours parcourus et 8
renseignés ; le mot mentirait au patient sur ce qu'il a fait. Le premier `POST` d'un
agenda vide passe toujours : c'est lui qui pose l'ancre.

**C'est une borne supérieure, et elle seule.** Une première rédaction bornait des deux
côtés : agenda vide, le patient note aujourd'hui, l'ancre vaut J — et noter la veille
devenait impossible, refusé par un message affirmant que le recueil couvrait déjà
21 jours alors qu'il en couvrait une. Un jour de recueil perdu au démarrage, et une
capacité que L4a acceptait. Une date antérieure à l'ancre **recule l'ancre** et passe.
Ce recul n'est pas le glissement corrigé plus haut : celui-là était silencieux, vers
l'avant et subi ; celui-ci est explicite, vers l'arrière et voulu par le patient. Le
total reste borné par 21 dates distinctes — `estDateSaisissable` ne laissant écrire
qu'aujourd'hui ou la veille, l'ancre ne peut reculer que d'un jour, et seulement au
démarrage.

Sa place dans la séquence est décidée, pas subie. **Après** le refus de quarantaine,
parce que la ligne de journal d'intégrité doit être émise « qu'on refuse ou non »
([D-015](../docs/DECISIONS.md)) : insérée avant, la borne l'aurait masquée dès qu'un
`POST` tombe hors fenêtre, et un agenda à la fois corrompu et hors période n'aurait
plus jamais ouvert d'incident. **Avant** les contrôles de doublon et de chaînage, qui
ne portent que sur le chaînage et laisseraient écrire la 22ᵉ journée.

L'ancre est **reprise** de la fenêtre, jamais recalculée : la même borne écrite deux
fois, ce sont deux bornes à tenir d'accord.

#### Un état terminal se dit avant tout geste à poser — et un geste proposé doit être possible

`authorizeAgendaAlimentairePortail` prend une option `{ verifierDateLimite: true }`,
posée par le **seul** `POST`, qui insère un `410 expired` **entre** la clôture de
suivi (410) et le consentement (403). Sur une assignation périmée et sans
consentement, le patient recevait « donnez votre consentement » (403) alors que
`api/patient/consentement` refuse en `410` : un geste impossible. Le contrôle qui
vivait dans la route est **supprimé**, pas dupliqué — deux porteurs de la même
exemption `deverrouille` devant rester d'accord, dont l'un devient inatteignable,
c'est un test qui ne s'exécute plus et une dérive silencieuse à la première édition.

#### Une exemption ne vaut que si toutes les portes la connaissent

L'exemption `statutReponses = 'deverrouille'` manquait à `api/patient/consentement`.
L'y ajouter n'a d'abord **rien rouvert** : `api/patient/questionnaire` — la route que
l'écran appelle en **premier** — refusait en `410` sans l'exempter, si bien que le
`ConsentScreen` n'était jamais rendu et que la route de consentement restait
**inatteignable depuis l'interface**. Il y a quatre portes sur ce parcours ; en aligner
trois et laisser fermée celle qui s'ouvre d'abord revient à n'en aligner aucune. Les
quatre le sont désormais, et un questionnaire délibérément rouvert par le praticien
après sa date limite est enfin consentable de bout en bout.

Corollaire : **l'écran ne décide plus lui-même de l'expiration.** Il la calculait avec
`isDeadlineExpired`, construite sans fuseau — donc évaluée dans celui du **navigateur**.
À Paris l'été, le client fermait le consentement environ deux heures avant le serveur ;
à l'ouest d'UTC, plusieurs heures après. La route rend désormais un verdict booléen
calculé côté serveur, que les **deux** écrans porteurs du `ConsentScreen` consomment.

Le `GET`, lui, reste à deux arguments : un agenda périmé demeure **lisible**, le
patient doit pouvoir relire ses 21 jours.

La même règle, appliquée à l'écran, ferme trois autres impasses :

- **Le `ConsentScreen` ne s'affiche plus sur une assignation périmée** (hors
  `deverrouille`) : il proposait un geste que la route refuse. Le garde vaut pour
  **tous** les questionnaires, le défaut y étant identique.
- **Le hub ne propose plus « Terminer et transmettre à mon praticien »** au 21ᵉ jour,
  ni le bouton, ni le badge. Le jumeau sommeil le peut — sa route de clôture existe ;
  l'alimentaire n'en a aucune, la clôture patient étant hors périmètre. Le patient qui
  suivait le hub serait arrivé sur une frise sans le geste annoncé. Le premier garde ne
  portait que sur le libellé du bouton, et **la promesse est revenue par le badge** —
  « À transmettre », à trois lignes d'un commentaire de vingt lignes expliquant pourquoi
  le bouton reste vide. Un garde qui ne couvre qu'une des deux surfaces ne garde pas la
  règle, il garde un champ : il porte désormais sur les deux, et refuse aussi bien un
  verbe de geste que la forme « À + infinitif ». Il tombera le jour où la clôture
  existera, et c'est le signal attendu.
- **Le message du refus hors fenêtre ne promet plus de corrections.** Une première
  rédaction ajoutait « vous pouvez encore corriger les journées de la période » :
  faux dans les deux sens, l'écriture restant bornée à aujourd'hui ou la veille.

#### Une quarantaine ne bloque plus une date qu'on sait pourtant corriger

D-015 refusait toute écriture sur une date portant une ligne illisible. C'était trop
large : quand la tête de chaîne active est **relue**, on peut chaîner et constater le
doublon — bloquer punissait le patient sans rien protéger.

Mais rouvrir sur la seule présence d'une tête relue serait trop étroit, cette tête étant
calculée sur le **sous-ensemble lisible**. Si la vraie tête est la ligne en quarantaine
et qu'une ligne supplantée est relue, la correction se chaînerait sur une ligne **déjà
supplantée**, et la date porterait deux têtes concurrentes le jour où la quarantaine se
lève — un dégât qui ne se voit qu'à ce moment-là.

La règle retenue tranche par `soumisLe`, le critère que `resolveJoursActifs` emploie
déjà pour départager : règle de blocage et règle de résolution parlent ainsi la même
langue, par construction et non par coïncidence. Elle est **fail-closed** — égalité
d'horodatage ou horodatage inexploitable bloquent. La ligne de journal d'intégrité et le
compte `illisibles` continuent, eux, de porter sur l'ensemble **complet** : une ligne
supplantée illisible reste un événement d'intégrité, qu'on bloque ou non.

#### La correction devient atteignable

Le `POST` accepte depuis L4a la correction d'une journée notée, à condition de porter
un `supersedesJourId` désignant la tête de chaîne **active**. Mais le `GET` rendait
`jours[]` **sans `id`** : la capacité était écrite, testée, et **inatteignable depuis
l'écran** — tout renvoi tombait en `409 deja_notee`.

Le `GET` rend désormais l'`id` de chaque journée active. Aucune clé de premier niveau
n'est ajoutée à la réponse, dont la surface reste épinglée exactement. Ce qui tranche :
le `POST` renvoie **déjà** `jourId` au client en `201` — l'identifiant est entre les
mains du patient sur le chemin d'écriture ; le `GET` était simplement le seul à ne pas
le rendre pour les journées écrites plus tôt.

Le formulaire de correction s'ouvre **pré-rempli** — seul cas où l'écran pré-remplit,
la doctrine « rien n'est pré-coché » visant la saisie initiale. Une abstention `null`
relue se réaffiche en « je ne sais pas », jamais en « non ».

#### La surface

Une journée par écran, sans clavier. Les prises se posent sur une **ligne de temps
tactile** 04:00 → 03:59 au pas de 15 minutes : taper pose, taper sur une prise bascule
repas ↔ hors-repas, l'appui long retire. Chaque acte a un chemin non gestuel — bouton
explicite, flèches, touche Suppr — et une ligne `aria-live` liste les prises : le geste
est le chemin rapide, pas le seul.

Les quatre présences ont **trois** états (oui / non / je ne sais pas) ; `soirPlusCopieux`
en a **deux**, le contrat refusant `null` sur ce seul champ. `boolean | null` ne se teste
nulle part par `if (x)` : `null` est une abstention, `undefined` une clé absente — le
handoff de L4a désignait cet écran comme l'endroit où ce raccourci s'écrirait.

La frise des 21 emplacements distingue vide, notée et illisible **par la forme** —
pointillé, capsule, croix — la couleur ne faisant qu'appuyer. Aucun chiffre dans la
frise, aucune couleur d'alarme, aucun agrégat : le seul chiffre rendu au patient est un
compte de saisies.

Au hub, le champ servi s'appelle `journeeDuJourEnregistree` et non « notée » : il mesure
« une ligne existe pour aujourd'hui », lisible ou non — le hub ne parse jamais le JSONB.
Le nom dit ce qu'il mesure plutôt que de promettre une lecture qui n'a pas lieu.

#### Ce qui reste ouvert

- **La correction resserre le recueil.** Une quarantaine sur le premier jour offrait
  tacitement 21 jours de plus ; elle occupe désormais l'emplacement 1. Quand **aucune**
  ligne relue ne porte cette date, la journée est **définitivement perdue** — le `POST`
  la refuse, aucun chaînage n'est possible sur une ligne illisible, et aucun geste de
  sortie n'existe hors effacement RGPD du dossier. L'arbitrage est de préférer un
  recueil court et daté juste à un recueil long et mal daté.
- **`soumisLe` estime là où `supersedesJourId` trancherait.** Ce dernier est lui aussi
  une colonne, lui aussi sélectionné, et lui aussi jeté à la mise en quarantaine. Il
  donnerait une certitude quand l'horodatage ne donne qu'une présomption — plus
  grossière dans les deux sens, et surbloquante à l'égalité. L'erreur va toujours dans
  le sens fermé, donc sans risque pour la donnée, mais c'est un refus opposé au patient
  sans geste de sortie. À affiner par le lot qui touchera la persistance.
- **La correction n'est ouverte que sur J et J-1**, `estDateSaisissable` bornant
  l'écriture depuis L4a. Une journée fausse à J-5, dans la fenêtre et parfaitement
  lisible, n'est corrigible par aucun chemin. L'écran est cohérent avec le serveur — la
  frise n'offre aucun clic par journée — mais la capacité manque.
- **La borne ne ferme rien d'observable** : passé `dateDebut + 20`, `statutReponses`
  reste `non_rempli`. Le praticien voit une assignation ouverte que le serveur refuse
  d'alimenter, sans trace au dossier ; le seul signal est `metadata.motif` au journal.
- **`nbRenseignees` diverge entre le hub et la route agenda** — le hub compte les dates
  en quarantaine, la route non. Écart pré-existant, que ce lot réduit en supprimant la
  divergence d'ancre, et qu'il ne peut pas fermer sans faire lire le JSONB au hub.
- **Aucune vue praticien de l'agenda alimentaire** n'existe encore, et la clôture
  patient non plus.
