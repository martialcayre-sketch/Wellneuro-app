# File d'attente des campagnes — hiérarchie du 2026-08-21 (axe 6.0)

> **Réconciliée le 2026-08-27.** Le fichier promet de se mettre à jour « à
> chaque ouverture ou réarbitrage » ; il ne l'avait pas été depuis le
> 2026-08-25. Trois écarts constatés et corrigés ci-dessous : une campagne
> **ouverte, menée et livrée sans jamais entrer dans la table** (l'objectif à
> trois voix) ; une **collision de nom** qu'elle a introduite sur « 6.0-B » ; et
> des pointeurs « prochaine en file » devenus faux. La réconciliation ne
> réarbitre rien — elle rend la table fidèle à ce qui s'est passé.

## `6.0-B` DÉSIGNE DEUX CAMPAGNES SANS RAPPORT — toujours qualifier

L'axe 6.0 attribuait les lettres à l'ouverture : **A** = le dossier à deux voix,
**B** = charge et capacité, **C** = le récit, **D** = le jumeau. La campagne
ouverte le 2026-08-23 s'est intitulée **« Alliance 6.0-B — l'objectif à trois
voix »**, reprenant une lettre déjà attribuée.

Les deux existent, aucune ne se renomme : « 6.0-B » figure dans `D-110`,
`D-111`, `D-112` et dans les messages de commit, et l'historique Git ne s'efface
pas. **Un « 6.0-B » nu est donc ambigu** — c'est exactement le régime déjà en
vigueur pour le préfixe `R` (CLAUDE.md : « toujours qualifier la série »).

- **6.0-B *l'objectif à trois voix*** — `2026-08-23-alliance-objectif-trois-voix/`, livrée.
- **6.0-B *charge et capacité*** — `2026-08-21-charge-et-capacite/`, rang 5, non ouverte.

## D'où vient cette file

Réarbitrée en session le 2026-08-21, sur l'architecture de campagnes issue de
l'audit « Wellneuro face au notebook 00 » (audit → contre-audit adversarial →
vision 6.0 « alliance thérapeutique » → architecture, §8 de l'artifact).
Constat fondateur : le portefeuille était entièrement *moteur et données* ;
l'axe alliance — la réponse au trou Éducation thérapeutique de l'audit —
n'avait aucun véhicule. Cinq dossiers 6.0 entrent en file en `--init-only` :
le cadrage complet (CAMPAGNE.md, lots) s'écrit au moment d'ouvrir chaque
campagne, avec un état réel frais — jamais d'avance. Ce fichier porte l'ordre
et sa raison ; il se met à jour à chaque ouverture ou réarbitrage.
Hiérarchie précédente : celle du 2026-08-18 (l'historique Git la conserve).

## L'ordre, et pourquoi

| Rang | Campagne | Dossier | Raison du rang |
|---|---|---|---|
| 0 | Biologie consolidée | `2026-08-18-biologie-consolidee/` | **TERMINÉE (2026-08-22)** — les trois lots livrés (LOT-01 PR #725, LOT-03 PR #731, LOT-02 PR #726). Le créneau primaire s'ouvre ; prochaine en file : le Socle (rang 1) — l'ouverture reste un geste du responsable. |
| — | Échéance HDS — G-TRUST-04 | `2026-08-18-echeance-hds-g-trust-04/` | **PARALLÈLE, et la seule fenêtre qui SE FERME.** Bloquée sur l'externe pour l'annexe (Scalingo muette) ; revue du 2026-10-21 inchangée ; ne consomme pas le créneau primaire. **Mais son LOT-02 porte une échéance au 2026-09-01** (`D-080`) : décommissionnement Vercel/Supabase **avec preuve d'effacement écrite au registre RGPD**, et constat de levée de la réserve annexe HDS (`D-089`). Le jour où la base de rollback disparaît, tout code ou outil pointant encore vers Supabase devient un piège muet — le MCP `execute_sql` lit précisément cette base gelée. **Travail de dépôt identifié le 2026-08-26** : 5 scripts npm `supabase:*` morts, `vercel.json`, `vercel-build.sh`, `clone_env_vars.py`, la documentation qui décrit encore le filet, et le seul point sensible `withSupabaseSslMode` (chaîne de connexion — à vérifier contre la base réelle avant d'y toucher). Les migrations qui nomment Supabase sont historiques et **ne se touchent pas**. |
| 1 | Socle de restitution sûre | `2026-08-21-socle-restitution-sure/` | **TERMINÉE (2026-08-22)** — ouverte et livrée le même jour, trois lots : couverture des chemins sortants prouvée par bancs de débranchement + re-vérification du bilan (LOT-01, PR #736), clinique au niveau « demande » + D-083 (LOT-02, PR #739), registre de gabarits `DC-26` (LOT-03). **Le gate des campagnes 6.0 est posé.** Le créneau primaire s'ouvre ; prochaine en file : 6.0-A (rang 2) — l'ouverture reste un geste du responsable. Restent au responsable : validations `valideLe` des gabarits, arbitrage des régimes de garde, candidats de couverture du hook. |
| 2 | Alliance 6.0-A — le dossier à deux voix | `2026-08-21-alliance-dossier-deux-voix/` | **TERMINÉE (2026-08-22)** — six lots mergés (#748, #750, #754, #755, #757, #760). Le gate `D-092` est constaté en production sur sa structure : cinq tables et écrivain unique prouvés, zéro ratification au moment de la clôture. Cela n'active ni les deux surfaces encore fermées (`WN_CE_QUI_COMPTE`, `WN_DOSSIER_DEUX_VOIX`) ni le chemin élargi protocole→produits, qui restent des gestes du responsable. Le créneau primaire s'ouvre ; prochaine en file : Doctrine exécutable (rang 3) — son ouverture reste un geste du responsable. |
| 3 | Doctrine exécutable | `2026-08-18-doctrine-executable/` | **TERMINÉE (2026-08-25)** — neuf lots exécutés (LOT-01, 03, 04, 05, 06, 07, 09, 10, 11), plus un LOT-12 **non prévu au cadrage** né d'une contre-revue adverse, et le LOT-08 de clôture. **Six règles franchissent leurs trois preuves** — `DC-09`, `DC-19`, `DC-22`, `DC-23`, `DC-54`, `DC-55` — chacune vérifiée par le lot de clôture, banc nommé, jamais sur la foi d'un lot déclaré terminé. **Ce qui n'est PAS fermé est écrit** : `DC-20` (nature en prose, pas dans la donnée → rang 4), `DC-26` (compilateur inexistant), `DC-42` (**signature reportée au 2026-08-30**), `DC-43` (mécanisme complet, **sans sujet** — `neCouvrePas` null sur les 95), `DC-58` (instruite, sans méthode fondée), les **quatre non armées** revérifiées structurellement, et les **onze statuts orphelins** → campagne dédiée (`à cadrer`). `DC-50`/`DC-51` **renvoyées** à la chaîne alimentaire — un renvoi est un routage, pas une fermeture. **La contre-revue adverse a payé** (`D-108`) : lancée AVANT la clôture, elle a réfuté **sept** des treize affirmations qui allaient être gravées, dont un texte servi au patient depuis cinq semaines. ~~Le créneau primaire s'ouvre ; prochaine en file : Curation signée (rang 4).~~ **Pointeur périmé, corrigé le 2026-08-27** : ce n'est pas Curation signée qui a suivi, mais **6.0-B *l'objectif à trois voix*** (rang 3 bis), ouverte hors table le 2026-08-23. Restent au responsable : la signature `SAFETY_EI_METADATA` (revue 2026-08-30), le cadrage des **deux** campagnes routées (curation des exclusions, dix orphelines), l'arbitrage de la gate sur un état INCONNU, et le seuil de significativité du momentum. |
| 3 bis | **Alliance 6.0-B — l'objectif à trois voix** | `2026-08-23-alliance-objectif-trois-voix/` | **LIVRÉE, NON CLOSE (2026-08-26)** — ouverte le 2026-08-23 **hors de cette table**, qui n'en a jamais porté trace jusqu'à la réconciliation du 2026-08-27 : c'est l'écart que celle-ci corrige, et il explique la collision de nom ci-dessus. Six lots livrés (PR #748→#802 pour la série complète ; LOT-05 en trois PR — #799 migration, #800 code, #801 correctifs de revue). **Le LOT-06 a rendu un bilan qui contredit l'attente du portefeuille** (`D-112`) : les **neuf tables de la campagne portent zéro ligne** en production, et **zéro épisode `T0` n'est confirmé** sur 21 dossiers — l'appareil est complet et n'a jamais servi. `D-093` n'est donc pas levé : sa condition (a) bute sur l'absence d'objectif, sa condition (b) n'est pas « non atteinte » mais **non productible**. Le dossier de signature du classement **n'est pas préparé, et ce refus est motivé** (`DC-19` : rien à certifier, le rédiger supposerait un comportement). **Restent avant clôture** : passe Codex du LOT-05 (P0) et **contre-revue adverse de campagne** — avant, jamais après. |
| 4 | Curation signée | `2026-08-18-curation-signee/` | **En parallèle continu, pas en séquence** : cadence praticien (claim par claim). NABM, liens biomarqueur↔besoin, question D-062. Chaque claim curé rapproche l'activation du chemin protocole→produits — donc renforce le rang 2. **Périmètre entrant le 2026-08-23** (`D-096`) : la migration des trois axes doctrinaux du claim — catégorie `A-E` (`DC-07`), niveau d'exécution (`DC-13`), nature du seuil (`DC-20`) — transférée depuis « Doctrine exécutable », faute de consommateur là-bas. Elle porte désormais **la structure ET le contenu** de ces axes, plus la matrice claim par claim. Source à reprendre au cadrage : `sources/2026-08-23-transfert-migration-axes-claim.md`. **Toujours à l'arrêt** : appariement NABM et liens biomarqueur↔besoin à 0 ligne. |
| 5 | 6.0-B ***charge et capacité*** (à ne pas confondre avec 6.0-B *l'objectif à trois voix*, rang 3 bis) | `2026-08-21-charge-et-capacite/` | **FAIT NOUVEAU DU 2026-08-26, à peser avant d'ouvrir** : le bilan `D-112` a constaté **zéro usage** de tout ce que 6.0-A et 6.0-B *objectif* ont construit. Ce rang ajoute une **surface de plus** ; le goulot constaté n'est pas l'ingénierie, c'est le temps praticien. Le rang n'est pas réarbitré ici — la réconciliation ne décide pas —, mais l'ouvrir sans avoir lu `BILAN.md` serait ouvrir à l'aveugle. Budget d'effort, « simplifier mon protocole » (`ProtocolDraft` chaîné), mode « semaine compliquée », check-in v3 additif. Dépend de 6.0-A ; arbitrage A1 intangible (pilotage, jamais score). |
| 6 | 6.0-C — Le récit du parcours | `2026-08-21-recit-du-parcours/` | Timeline racontée (projection), petites victoires (jamais causales, `DC-27`), « pourquoi maintenant ? » + double lecture (`DC-34/35`), hypothèses partagées (`DC-31/32`), messages du registre signé. Dépend du Socle et de 6.0-A. |
| 7 | 6.0-D — Le jumeau de compréhension | `2026-08-21-jumeau-de-comprehension/` | La signature conceptuelle : représentations patient/praticien côte à côte, versionnées, écarts visibles, « prochain choix ensemble » aux jalons. Dépend de 6.0-A et 6.0-C. |
| 8 | Nutrition référentielle (R1→R3) | `2026-08-18-nutrition-referentielle/` | Recule d'un cran par réarbitrage 6.0 : ses fiches conseils consomment le registre de messages du Socle — l'ordre naturel la place après lui. Premier lot inchangé (recouvrement rayon C4). |
| à cadrer | Curation des exclusions d'intervention (`neCouvrePas`) | *(pas de dossier — routée le 2026-08-24, `D-107`)* | **Arbitrage praticien du 2026-08-24, qui REVIENT sur le constat de `D-101`.** Le LOT-05 avait ABANDONNÉ cette curation sur mesure — son registre n'a aucun consommateur d'exécution. Le responsable rouvre : les **95 interventions** portent `neCouvrePas` **null sur les 95**, et tant qu'elles le restent, `gatePopulationV1` ne mord sur **aucun** dossier et `DC-43` ne peut pas franchir son gate faute de **sujet**, non faute de mécanisme. Le mécanisme, lui, est **complet et relu** (`D-101`) : il ne manque que la donnée. **Ce que cela débloque** : `DC-43` obtient un porteur nommé au lieu d'être reconduite « écrite, non armée ». **Ce que cela coûte** : une cadence praticien, intervention par intervention, comme « Curation signée ». **Garde-fou non négociable** (`D-101`, `DC-35`) : une intervention dont les exclusions ne sont pas curées se propose **en le disant** — la curation partielle est un état déclaré, jamais un silence. |
| à cadrer | Les dix règles orphelines de la constitution | *(pas de dossier — routée le 2026-08-24, `D-107`)* | **Arbitrage praticien du 2026-08-24, après deux reports.** `DC-03`, `DC-36`, `DC-38`, `DC-39`, `DC-40`, `DC-41`, `DC-44`, `DC-45`, `DC-47`, `DC-48`, plus la part de `DC-11` hors exclusions. Le LOT-01 de « Doctrine exécutable » les avait nommées orphelines (`D-095`), `D-096` en a sorti `DC-09` pour le LOT-09, et l'arbitrage de portefeuille était **reporté, pas clos** — trois options nommées : dettes nommées, campagne dédiée, rattachement au coup par coup. **Le responsable tranche : campagne dédiée.** Les deux autres options sont écartées avec leur motif — « dettes nommées » était le régime qui les a rendues orphelines, et le « coup par coup » ne fait remonter aucune règle sans porteur. Le **LOT-08** de « Doctrine exécutable » les écrit comme telles ; il ne les arbitre plus, c'est fait ici. Recompte au grep avant cadrage : `grep -c '\*\*Orpheline\*\*'` rend **13** au 2026-08-24 (onze statuts + deux en en-tête). |
| gaté | Mémoire relationnelle consentie | *(pas de dossier — gaté conformité)* | Nouvelle finalité RGPD ⇒ information des personnes + base légale d'abord ; derrière la revue HDS du 2026-10-21. La mécanique trust (version immuable + accusé + retrait) est prête ; la table devra entrer dans l'effacement IDP2. |

Critère d'acceptation transverse des lots 6.0 (principe architectural §7 de
l'audit) : une stratégie cliniquement pertinente mais incomprise, irréalisable
ou sans rapport avec ce qui compte pour le patient n'est pas « done ».

## Chantiers en cours hors file — de l'ingénierie, pas des campagnes

Ni des campagnes (pas de dossier, pas de lots), ni des gestes du responsable :
du travail de dépôt porté par sa décision et sa PR. Ils figurent ici pour que la
file cesse de laisser croire que rien ne se fait en dehors d'elle.

- **`D-113` — les cycles nommés `T0`, `T1`, `T2`** (2026-08-26, arbitrage du
  responsable). Chaque cycle s'ouvrait par un `T0` : un second cycle
  **déplaçait l'ancre du premier** et refermait ses fenêtres de jalon par effet
  de bord. **PR 1 mergée** (#803) — la structure : série d'ancres ouverte,
  `JOURS_JALON` re-typée sur les seuls jalons de mesure (un `Record` indexé par
  un type ouvert dégénérait en signature d'index, rendant `undefined` sous un
  type `number`), garde `G7` portée. **Elle ne change aucun comportement.**
  **PR 2 livrée** (2026-08-27) — le comportement : les sites `milestone ===
  'T0'` relus un par un et tranchés entre « l'ancre du cycle courant » et « la
  toute première mesure » ; le rideau `D-052` étendu à **toute ancre** (ouvrir
  un deuxième cycle est le même acte, la clé s'élargit, aucun seuil ne bouge) ;
  **trois défauts muets supprimés** — deux `Record<JalonMomentum, string>`
  dégénérés en signature d'index (`LABEL_JALON['T1']` = `undefined` typé
  `string`), six listes littérales `['T0', 'J21', 'J42', 'J90']` qui rejetaient
  un `T1` par un `continue`, cinq requêtes `where: { milestone: 'T0' }` +
  « la plus récente » dont les deux moitiés étaient fausses. **L'ouverture d'un
  `T1` est un geste praticien nommé**, et la fermeture des fenêtres du cycle
  précédent est annoncée avant le geste au lieu d'être un effet de bord (§8).
  **Deux gardes d'écriture neuves** aux points de persistance : la forme (ni
  ancre ni mesure ⇒ refus) et le rang (ancre déjà posée, ou la suivante — un
  `T7` sur un dossier qui n'a que `T0` laisserait six rangs vides).
  **Dette reconduite** : `assessment_episodes.milestone` reste une colonne
  `String` **sans CHECK** — les gardes ci-dessus la couvrent au bord
  applicatif, la contrainte en base est une migration à part, avec sa
  confirmation distincte. Fenêtre favorable inchangée : la table est **vide en
  production**, donc aucune donnée à migrer ; le premier `T0` confirmé rendrait
  la bascule payante.

## Ce qui n'est PAS en file — des gestes, pas des campagnes

- **Relancer le recueil 21 jours** du carnet alimentaire (pilote PAT006) :
  seul débloqueur des campagnes existantes `2026-08-04-agenda-alimentaire`
  (LOT-06 barème) et `2026-08-10-chaine-alimentaire` (LOT-02/03) — elles
  reprennent, elles ne se recréent pas. Indépendant de tout l'axe 6.0.
- **Orientation NNPP2 — FAIT, plus rien à signer ni à poser** : les trois
  tables sont signées depuis les 2026-08-15/16 (`D-061`, `D-062`, `D-067`,
  frein structurel `D-065`), les deux drapeaux sont posés, et l'activation
  est CONSTATÉE en production — par le comportement (`D-074`, 2026-08-18 :
  le panneau sert des recommandations, seule preuve valable puisque la
  variable est sensitive et que les E2E arment le même drapeau sur la même
  base), puis valeur `'1'` confirmée au panneau le 2026-08-19. Reste la
  dette d'interface nommée par `D-074` §4 : `MESSAGE_ORIENTATION_INACTIVE`
  périmé (ne s'affiche plus en production, correction = autre finalité).
- **Constater** la proposition de bilan sur un vrai dossier (preuve terminale
  de la chaîne T0).
- ~~**Désarmer `WN_CB_RESULTS_ENABLED`**~~ — **renversé le jour même par
  `D-078`** : le responsable autorise explicitement l'activation de l'étage 2
  (résultats réels), le désarmement n'est plus la consigne et le drapeau
  reste posé. Trace conservée : le relevé du matin (variable à `true` contre
  son verrou « jamais avant l'attestation HDS ») était exact — c'est la règle
  qui a changé, par écart assumé. Dette résiduelle nommée : le commentaire du
  verrou (`biology-library/featureFlag.ts`, « GATE DUR HDS : ne doit jamais
  passer à true avant l'attestation ») contredit désormais `D-078`.
- **Dette nommée, portée hors rature** : le commentaire du verrou
  `isCbResultsEnabled` (`web/src/lib/biology-library/featureFlag.ts`, « GATE
  DUR HDS : ne doit jamais passer à true avant l'attestation d'hébergement »)
  contredit `D-078` depuis le 2026-08-19 — à réviser à l'ouverture de CB-09,
  qui est précisément le moment où ce commentaire sera lu comme une garantie.
- **Filtre de validité des passations — FAIT, allumé le 2026-08-19**
  (`D-077`, arbitrage praticien en session) : `WN_ENABLE_VALIDITE_PASSATIONS=1`
  posé et porté par un redéploiement aliasé. Geste sûr, prouvé avant
  l'arbitrage : 111 passations en production, toutes `VALID` — aucun calcul
  ne change, la route d'invalidation praticien s'ouvre (fin du 503).
  Vérification restante à l'œil : le geste d'invalidation répond sur un
  dossier de test réel.
- **Trancher les arbitrages pendants** : `complements-clean-label-v1`
  (« remplacée ? »), dégel JA5-05, sort de `2026-08-02-rayon-biologie-cb`
  (recouverte par le LOT-06 de la chaîne T0), worktree
  `arbitrage-boucle-clinique`.

## Écarté à cet arbitrage — et pourquoi

- **Arc espace patient (E3→E2→E4)** : le dashboard E4 n'est plus un arc
  séparé — il est **absorbé** par 6.0-A/B/C, dont les écrans portail sont ses
  tranches à valeur immédiate. IDP2 (LOT-04, jeton permanent) reste bloqué
  par une mesure d'usage (12/13 accès sans nouveau chemin).
- **E8 / résultats biologiques réels et D5 / messagerie** : derrière le gate
  HDS — l'annexe signée est leur préalable, pas leur début.
- **Programme corpus (gates G0-G4, pilote sommeil)** : G6 jamais ouvert ;
  aucune campagne tant que l'extraction du stock n'est pas faite.
