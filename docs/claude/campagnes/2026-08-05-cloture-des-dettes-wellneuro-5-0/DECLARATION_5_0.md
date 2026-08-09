# Déclaration Wellneuro 5.0 — verdict par dette

> Écrite le 2026-08-08 au LOT-07, clôture de la campagne
> `2026-08-05-cloture-des-dettes-wellneuro-5-0`.

## Comment lire ce document

Chaque dette de l'audit d'entrée reçoit **un** de ces trois verdicts :

- **fermée** — un artefact vérifiable en face, relu à la clôture ;
- **arbitrée et reportée** — une décision datée, avec sa date de revue ;
- **ouverte** — et alors ce qui manque est nommé.

**Aucun verdict n'a été pris sur la prose d'un lot.** Chaque preuve a été
confrontée à l'artefact réel — script exécuté, code lu, registre compté. Quatre
des huit verdicts diffèrent de ce que le lot concerné écrivait de lui-même ;
c'est la seule raison d'être de ce document.

## Verdict global

**Wellneuro 5.0 n'est pas déclarable en bloc.**

| | Dettes |
|---|---|
| **Fermées** | 1 (consommation), **2 (validation psychométrique — par décision, D-034)**, 3 (moteurs de scoring), 7 (chemin d'écriture en base) |
| **Arbitrée et reportée** | 8 (HDS) — revue au **2026-10-21** |
| **Ouvertes** | 4 (double source des packs), 5 (deux parcours patients), 6 (état réel) |

Quatre fermées, une reportée, trois ouvertes. La campagne a fait ce qu'elle
annonçait — rendre observable et consommable ce qui est livré — mais **trois
dettes demandent un travail qu'aucun lot de cette campagne n'a exécuté**, et
deux d'entre elles se croyaient plus avancées qu'elles ne le sont.

> **Mise à jour du 2026-08-08.** Ce document a été écrit le jour de la clôture,
> puis corrigé **trois fois**. **La dette 2 a été fermée par une décision** prise
> après coup (D-034). **La dette 4 portait une mesure périmée** : celle du
> LOT-02, datée du 2026-08-05, démentie par une lecture de production du
> 2026-08-08. Et **le motif qui plaçait la dette 6 en tête était surestimé** —
> corrigé en fin de document. Les trois vont dans des sens différents : une
> dette fermée, une urgence abaissée, un raisonnement rectifié. Un document de
> clôture cite des mesures ; une mesure a une date, et une clôture n'arrête pas
> le monde.

---

## Dette 1 — Ingestion complète, consommation partielle

**Verdict : fermée.** LOT-05, PR #593.

**Preuve.** `scripts/wn-matrice-consommation.mjs` est un **générateur**, pas une
doc rédigée : il indexe le dépôt et dérive les appelants par remontée d'imports
(`PROFONDEUR_MAX = 3`). Rejoué à la clôture — 19 sources, 6 dormantes,
880 fichiers indexés — et sa sortie **rediffée** contre
`docs/claude/MATRICE_CONSOMMATION.md` : identique hors horodatage. Les six
dormantes portent chacune un arbitrage daté du 2026-08-05 dans
`docs/claude/corpus/consommation_decisions.json`.

**Ce qui reste.** `catalogue-biologie` est marqué `a_brancher` sans lot porteur.
`--strict` ne rougit pas, l'arbitrage existant : c'est un choix, pas un oubli.

## Dette 2 — Certification du calcul ≠ validation psychométrique

**Verdict : fermée par décision, le 2026-08-08 — D-034.**

> **Ce verdict a changé après la clôture.** Il disait *ouverte*, et la suite de
> cette section explique pourquoi c'était juste : le LOT-06 avait soldé la
> **traçabilité** de l'écart, pas l'écart. Ce qui manquait n'était pas du travail
> mais **une décision**, et elle a été rendue : la validation psychométrique
> **n'entre pas au programme**. Wellneuro repère et prépare une consultation ; il
> ne mesure pas. Une dette qu'on décide de ne pas contracter est fermée, pas
> ouverte.
>
> **Preuve, et elle n'est pas seulement déclarative.** `D-034` dans
> `docs/DECISIONS.md` ; la définition de « certifié » écrite là où le mot
> s'emploie (`docs/claude/corpus/README.md`) ; et surtout **une ligne de code** :
> la consigne système de synthèse disait « organiser les résultats de
> questionnaires **validés** » — seule surface du runtime à revendiquer la
> validation, et celle qui fabrique le texte clinique lu par le praticien puis
> remis au patient. Elle porte désormais l'énoncé exact — *WellNeuro n'a
> évalué la validité d'aucun instrument qu'il sert et ne s'en réclame pas*, ce
> qui ne nie pas la validité de ceux qui le sont par ailleurs —
> (`synthese-v18` → `synthese-v19`), avec un garde de banc qui refuse le retour
> de la revendication **et** exige la présence du démenti.
>
> **Réversible, et à un prix connu** : le vocabulaire fermé `A|B|C|inconnu` et le
> banc qui interdit un grade sans étude concordante restent en place. Rouvrir
> demande une campagne d'ingestion, rien à défaire.

Ce qui suit est l'analyse du 2026-08-08 au matin, conservée telle quelle.

**Verdict d'alors : ouverte.** LOT-06, PR #617 — travail réel, dette non fermée.

**Preuve de ce qui est fait.** Les 65 instruments portent `cosmin: inconnu`, et
la raison est écrite une fois (`docs/claude/corpus/README.md`). Le banc
`scripts/lib/verifier_registre_instruments.js` refuse un `a_completer` sans motif
d'au moins 40 caractères **et** son revers, un motif hors `a_completer` : les
10 `a_completer` ont leurs 10 motifs, zéro lacune muette.

**Pourquoi elle reste ouverte.** Ce qui a été soldé est la **traçabilité** de
l'écart, pas l'écart. Aucun instrument n'a reçu de grade COSMIN, et le banc
interdit d'en écrire un sans étude concordante : renseigner ce champ suppose
d'ingérer les études de validation, ce qu'aucune campagne n'a au programme.
« Certifié » continue de vouloir dire *le code reproduit la règle enregistrée*.

## Dette 3 — Trois classes de scoring ouvertes

**Verdict : fermée.** LOT-03, PR #583.

**Preuve.** Les trois gates existent dans `web/src/lib/questions.ts` —
`count_threshold` (L2517), `ecab` (L3357), `sum_decimal` (L3706) — sur le même
motif : recueil incomplet → `interpretation: null` et note. Trois bancs dédiés
les couvrent (`qInf05RecueilPartiel.guard.test.ts`,
`ecabRecueilPartiel.guard.test.ts`, `qdrsRecueilPartiel.guard.test.ts`,
19 cas au total).

**Ce qui reste, et qui n'annule pas le verdict.**

1. `web/src/lib/clinical/orientationEngine.ts:212` et
   `orientationRulesV1.ts:229` **déclarent toujours ces trois moteurs
   « ouverts »**. Le LOT-03 avait repéré ces commentaires sans les corriger : le
   dépôt contredit sa propre correction à deux endroits.
2. La passe de mutation est **manuelle et non reproductible** — aucun Stryker,
   aucune configuration de mutation. La preuve tient à la prose du lot ; le code
   et ses bancs, eux, tiennent.
3. Les `verdictScoring` du registre portent des dates **antérieures** au LOT-03
   (2026-07-30 à 08-01). Le banc a été rejoué à cette clôture — 63
   questionnaires, vert — mais le registre n'a pas été re-tamponné : ses
   horodatages ne prouvent donc rien du scoring d'aujourd'hui. À vérifier au
   prochain passage sur le corpus.

## Dette 4 — Double source de vérité des packs

**Verdict : ouverte.** LOT-02, PR #581 — le lot recommande lui-même de ne pas la
fermer.

**Preuve de ce qui est fait.** La journalisation existe, mais **pas** dans
`web/src/lib/consultation/packRegistry.ts` : `resolvePackQuestionnaireIds`
renvoie une `raison`, et les deux appelants journalisent — `api/portail/valider/route.ts:123` et
`api/praticien/packs/assign/route.ts:154`.

**Pourquoi elle reste ouverte, et c'est le constat le plus inconfortable de
cette clôture.** L'annonce « repli legacy journalisé (`logger.info`) » décrit mal
ce qui a été livré. Le cas qui compte — `ensembles_divergents`, le pack en
dérive — était **déjà** en `logger.warn` **avant** le lot. Le LOT-02 n'a ajouté
que la branche INFO des deux cas bénins (`registre_absent`, `registre_vide`),
dont il mesure ensuite **zéro occurrence en production**. Le geste livré ne
couvre donc aucun cas observé, et le lot le reconnaît : son hypothèse de départ
était fausse.

> **Correction du 2026-08-08 — la mesure citée était périmée.** Cette section
> affirmait, d'après le LOT-02 : « 1 pack sur 8 en dérive réelle
> (`PACK_-bG21yeIvVYRhrdlYuWIMnFz`, `Q_SOM_09` absent du registre), non
> resynchronisé ». **Lecture de production du 2026-08-08 : 0 divergence sur 8
> packs**, `Q_SOM_09` présent des deux côtés du pack de base. Une écriture d'une
> **autre** campagne (`packs.updated_at = 2026-08-07 15:46`) l'avait
> resynchronisé au passage.
>
> Le fait était vrai à sa mesure — 2026-08-05 — et faux à sa publication. Il a
> franchi T3, deux passes de revue adversariale et le CI, parce qu'on relit la
> **valeur** d'une mesure citée, jamais sa **date**. Une mesure de production
> reprise d'un lot antérieur porte toujours *sa* date, pas celle du document qui
> la cite.

**Reste concret, au 2026-08-08 : aucune dérive.** Ce qui manque n'est plus une
resynchronisation mais **un garde contre le retour de la dérive** — les deux
sources s'accordent aujourd'hui par l'effet d'une écriture qui ne visait pas cet
objectif, pas par un mécanisme. C'est ce qui maintient le verdict *ouverte*, et
ce qui en abaisse l'urgence.

## Dette 5 — Deux parcours patients

**Verdict : ouverte.** LOT-04, PR #591 — le critère « une date de retrait
existe » est coché à tort.

**Preuve de ce qui est fait.** Le parcours legacy est **inatteignable** : une
redirection 307 (`permanent: false`) de `/patient/:idAssignation*` vers
`/portail/connexion`, plus le retrait du repli e-mail sur les routes API.

**Deux écarts avec ce que le lot déclare.**

1. **Il n'existe aucune date de retrait.** `LOT-04-validation.md:80` coche
   « Une date de retrait existe, dans le code et dans la doc ». Le code porte
   `// PARCOURS INATTEIGNABLE — RETRAIT PRÉVU (LOT-04, 2026-08-05)` — mais
   **2026-08-05 est la date de la décision, pas une échéance**. Le texte qui suit
   renvoie à « un lot nommé au prochain cadrage », et `next.config.mjs:34` à
   « une nouvelle mesure d'usage ». Aucune date-cible nulle part.
2. **La redirection n'est pas où le lot la place.**
   `web/src/app/patient/[idAssignation]/page.tsx` (406 lignes) ne redirige pas :
   il rend toujours l'ancien parcours entier. L'inatteignabilité repose sur
   `web/next.config.mjs:42-50`, pas sur la page — et un lien interne
   `href={/patient/...}` y subsiste (**L192**).

**Pourquoi « ouverte » et non « arbitrée et reportée ».** Le *risque* est
fermé : les deux parcours ne sont plus atteignables tous les deux. Ce qui reste
est le **retrait**, et il n'a pas de date — or « arbitrée et reportée » exige
précisément une date de revue. Sans elle, il n'y a pas de report, seulement une
intention. La dette suivante est donc petite et bornée : poser une date, retirer
le lien.

## Dette 6 — État réel et documentation désynchronisés

**Verdict : ouverte.** LOT-01, PR #575 — la dette est plus ouverte que le lot ne
le déclare.

**Preuve de ce qui est fait.** `scripts/wn-etat-reel.mjs` **observe** bien six
dimensions : drapeaux référencés, migrations sur disque, certification, PR
ouvertes, branches et worktrees, parcours patient.

**Pourquoi elle reste ouverte.** `comparerEtat` (L250-277) ne compare plus
qu'**une seule** de ces six dimensions : `validation.last_checked_at`. Les
comparaisons `git.branch` et `git.dirty` ont été retirées le 2026-08-07 —
**délibérément et à raison** (#612 : ce qui se recalcule ne se stocke plus, motif
écrit dans le script L253-260). Ce n'est donc pas le retrait qui fait la dette,
c'est ce qu'il laisse : un outil qui observe six dimensions et n'en confronte
qu'une. La prose du LOT-01, qui en annonce trois, n'a simplement pas suivi.

**Et le lot courant n'est comparé par rien.** `campagneActive` et `lotActif` sont
*rapportés* (L297-298), jamais confrontés. Constat vérifié à la clôture :
`.wn/state.json` portait `active_lot: "LOT-06"` alors que `CAMPAGNE.md` disait
LOT-07 — **l'outil ne l'a pas vu**. Le critère « zéro écart » de ce lot est donc
plus faible qu'il n'en a l'air, et c'est écrit ici plutôt que de s'en prévaloir.

## Dette 7 — Déploiement de la base couplé au build

**Verdict : fermée.** LOT-00, PR #435.

**Preuve.** `web/scripts/vercel-build.sh` ne fait plus que deux gestes —
`prisma:generate` et `next build`. Aucun `migrate deploy`, aucun import.
`.github/workflows/release-db.yml` existe, son job `release` porte
`environment: release-db` (L225), `if: github.ref == 'refs/heads/main'`, et son
`migrate deploy` est en L281. **Un seul chemin d'écriture, gaté par un
environnement protégé.**

**Ce qui reste.** Le gage tient à une configuration GitHub — reviewers requis,
secrets — non vérifiable depuis le dépôt.

## Dette 8 — HDS et données réelles

**Verdict : arbitrée et reportée. Date de revue : 2026-10-21.**

> **Avenant du 2026-08-09 — `docs/DECISIONS.md` D-037.** Ce verdict est vrai à
> sa date et n'est pas réécrit. Il est **amendé** : D-006 (2026-07-28) décidait
> déjà la migration vers Scalingo — six jours **après** l'arbitrage cité en
> preuve ci-dessous, que la présente déclaration a repris sans le confronter.
> D-037 confirme D-006 et **avance la date de revue de cette dette du
> 2026-10-21 à la réponse de Scalingo** au ticket du 2026-08-09. L'échéance de
> la dérogation, elle, reste au 2026-10-21 — c'est elle qu'évoque « ce qui
> reste » plus bas, et elle n'est pas touchée.

**Preuve.** Décision du responsable du traitement : rester sur l'hébergement
actuel, borner la phase de test, ne pas instruire de migration HDS. Sa part
actionnable — indépendante de l'hébergeur — est traitée au LOT-06 :
`docs/DOSSIER_RGPD.md`, quatorze rubriques, ses trous datés et portés
(tableau §14 ; le compter ici le périmerait à la prochaine ligne).

**Ce qui reste.** Le gate G-TRUST-04 **n'est pas levé**, et rien dans cette
campagne ne le lève. Sans reconduction écrite au 2026-10-21, la règle du dépôt
reprend.

**Une incohérence de date, signalée et non tranchée** : `CAMPAGNE.md:54` date
l'arbitrage du **2026-07-22**, `docs/DOSSIER_RGPD.md:20` et la checklist du gate
du **2026-07-21**. L'échéance, elle, est la même partout.

---

## PR ouvertes

| PR | État | Verdict |
|---|---|---|
| #435 | mergée (LOT-00) | soldée |
| #372 | ouverte depuis le 2026-07-25 | **fermée à cette clôture** — périmètre absorbé par #566/#567, arbitrage du LOT-05 ; branche conservée |
| #618 | **mergée** le 2026-08-08 (`592d28d7`) | soldée d'elle-même. Elle était encore un brouillon `BLOCKED` au cadrage de ce lot, quelques heures plus tôt : la clôture a été écrite pendant qu'elle atterrissait |

**Aucune PR n'est ouverte au moment de cette déclaration.** C'est un état
instantané, pas une propriété : il vaut pour le 2026-08-08.

## État machine

`.wn/state.json` passe à `idle` (aucune campagne primaire active) et
`ACTIVE_CAMPAIGN.md` est régénéré depuis lui.
`validation.last_checked_at` était périmé de 15 jours — le seul écart que
`wn-etat-reel.mjs` sache encore détecter, et il était rouge.

**Ce que « zéro écart » ne couvre pas** : cinq des six dimensions observées ne
sont comparées à rien, et le lot courant n'est comparé par rien du tout (dette 6).

> **Ce paragraphe a d'abord été faux, et la manière dont il l'était mérite d'être
> écrite.** Il affirmait `ACTIVE_CAMPAIGN.md` resynchronisé ; il ne l'était pas.
> La vue avait été régénérée **avant** l'édition de `.wn/state.json` dont elle
> dérive, et elle portait donc encore « Lot actif : LOT-06 », « Statut : active ».
> C'est exactement l'instance de la dette 6 décrite deux lignes plus haut —
> aucune comparaison ne confronte cette vue à sa source — survenue dans le
> paragraphe qui la dénonce. Trouvée par la revue adversariale, pas par un test.

## Ce que la campagne a produit sans qu'on le lui demande

Deux défauts vivants trouvés en chemin, hors du périmètre de leur lot :

- **LOT-04** — un repli d'accès sans re-vérification de révocation, sur six
  routes patient. Une révocation d'accès pouvait être silencieusement défaite.
- **LOT-01** — trois défauts bloquants de son propre outil, dont un « 0 écart »
  faussement rassurant quand le script était lancé depuis `web/`.

Les deux ont été trouvés par une revue adversariale, pas par les tests.

## Ce qui doit devenir une campagne

Les dettes ouvertes n'entrent **pas** dans celle-ci : on ne pose pas au moment de
fermer une dette découverte à la fermeture. Elles demandent leur propre cadrage,
et voici ce qu'il devra porter — **ordre révisé le 2026-08-08 après audit**.

1. **Dette 6 d'abord.** Le motif d'origine était surestimé : la déclaration
   écrivait « tout jugement sur les autres dettes passe par lui », et c'est
   faux — aucun des huit verdicts n'a utilisé `wn-etat-reel`, tous ont été
   rendus en exécutant les scripts et en lisant le code. Le vrai motif est
   étroit et tient quand même : **cette campagne a produit quatre
   auto-déclarations fausses**, et les deux défauts de la PR de clôture
   elle-même sont exactement ce que les deux gardes proposés attraperaient
   (confronter `ACTIVE_CAMPAIGN.md` à sa source ; refuser un
   `last_checked_at` postérieur à `updated_at`). C'est un argument de **taux de
   récidive**, pas de prérequis : il justifie « tôt et pas cher ».
2. **Dette 5, avec elle** — poser une date de retrait réelle et retirer le lien
   interne survivant. Petite et bornée ; voyage dans n'importe quel lot.
3. **Dette 4 en dernier, re-mesurée d'abord.** Il n'y a plus de dérive en
   production (lecture du 2026-08-08) ; ce qui reste est l'absence de garde
   contre son retour.

**La dette 2 ne figure plus dans cette liste** : elle était une *décision*, pas
une tâche, et elle a été rendue le 2026-08-08 — D-034, elle n'entre pas au
programme. C'était le défaut de forme de la liste d'origine, qui la mettait
quatrième d'une file de lots quand elle coûtait quelques minutes d'arbitrage.

Plus deux corrections mineures : les commentaires de `orientationEngine.ts` et
`orientationRulesV1.ts` qui déclarent faussement trois moteurs ouverts, et la
date d'arbitrage HDS divergente d'un jour.

## Validations

- **T3** — `npm run test:worktree` complet, joué à la clôture depuis le worktree
  du lot.
- **Anti-secrets** — `scripts/check_no_secrets.sh` sur le dépôt entier.
- Chaque lot a documenté son propre palier ; les résultats sont dans sa section
  `## Résultats`.
