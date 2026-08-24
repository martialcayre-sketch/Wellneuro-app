# File d'attente des campagnes — hiérarchie du 2026-08-21 (axe 6.0)

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
| — | Échéance HDS — G-TRUST-04 | `2026-08-18-echeance-hds-g-trust-04/` | **PARALLÈLE, bloquée sur l'externe** (annexe Scalingo muette) ; échéances portées par `blocking_issues` ; revue du 2026-10-21 inchangée. Elle ne consomme pas le créneau primaire. |
| 1 | Socle de restitution sûre | `2026-08-21-socle-restitution-sure/` | **TERMINÉE (2026-08-22)** — ouverte et livrée le même jour, trois lots : couverture des chemins sortants prouvée par bancs de débranchement + re-vérification du bilan (LOT-01, PR #736), clinique au niveau « demande » + D-083 (LOT-02, PR #739), registre de gabarits `DC-26` (LOT-03). **Le gate des campagnes 6.0 est posé.** Le créneau primaire s'ouvre ; prochaine en file : 6.0-A (rang 2) — l'ouverture reste un geste du responsable. Restent au responsable : validations `valideLe` des gabarits, arbitrage des régimes de garde, candidats de couverture du hook. |
| 2 | Alliance 6.0-A — le dossier à deux voix | `2026-08-21-alliance-dossier-deux-voix/` | **TERMINÉE (2026-08-22)** — six lots mergés (#748, #750, #754, #755, #757, #760). Le gate `D-092` est constaté en production sur sa structure : cinq tables et écrivain unique prouvés, zéro ratification au moment de la clôture. Cela n'active ni les deux surfaces encore fermées (`WN_CE_QUI_COMPTE`, `WN_DOSSIER_DEUX_VOIX`) ni le chemin élargi protocole→produits, qui restent des gestes du responsable. Le créneau primaire s'ouvre ; prochaine en file : Doctrine exécutable (rang 3) — son ouverture reste un geste du responsable. |
| 3 | Doctrine exécutable | `2026-08-18-doctrine-executable/` | **OUVERTE ET EN COURS** (1/7) — **sept lots exécutables sur neuf numéros** (LOT-01 livré, LOT-02 transféré, LOT-03 à LOT-09 à faire) ; plus aucune migration ni confirmation obligatoire. Le cadrage a **déplacé trois véhicules** : V1 est à moitié livré (l'objet à trois formes existe depuis `D-041`/`D-044` ; restent producteurs et politique), **V4 est périmé** (ses deux fiches d'accueil sont livrées avec la chaîne T0 — `DC-39`/`DC-41` deviennent des dettes sans véhicule), et **§D est clos** par le Socle LOT-02 (`D-083`). **Arbitrage du responsable le 2026-08-23 : la population sort du claim** — modèle « général déclaré + exclusions déclarées » porté par l'intervention (95 entrées, `neCouvrePas` null sur les 95), sur le précédent signé `BiologyFunctionalRange` (`D-068`/`D-069`) ; `DC-14` n'est pas modifiée, sa portée est écrite (extrapolation d'un claim, pas défaut d'une colonne). **V2 a quitté la campagne le 2026-08-23** (`D-096`) : sans consommateur interne, la migration des trois axes doctrinaux du claim est **transférée à Curation signée** (rang 4), son unique bénéficiaire — « Doctrine exécutable » n'a donc plus aucune migration ni confirmation obligatoire. **LOT-01 livré** (`D-095`, PR #769) : deux bascules sur 58 règles, sept réserves « Banc dû » retirées, et **onze règles orphelines** que la clôture de la chaîne T0 a laissées sans véhicule. `DC-09` — le garde-fou que l'audit désignait comme le plus exposé — en sort pour recevoir le **LOT-09** (`D-096`) ; **les dix autres** restent des dettes nommées, arbitrage de portefeuille en suspens. **V3 (gates de population) n'est plus préventif mais en retard** : `priorityRulesV1` est signée et `D-093` ouvre les recommandations élargies en notant que le classement n'est couvert par aucune ligne signée — sa fenêtre est la borne de six semaines de `D-093`. Bloque toujours toute calibration (barème alimentaire, classements), quelle que soit la date d'arrivée des données 21 j. |
| 4 | Curation signée | `2026-08-18-curation-signee/` | **En parallèle continu, pas en séquence** : cadence praticien (claim par claim). NABM, liens biomarqueur↔besoin, question D-062. Chaque claim curé rapproche l'activation du chemin protocole→produits — donc renforce le rang 2. **Périmètre entrant le 2026-08-23** (`D-096`) : la migration des trois axes doctrinaux du claim — catégorie `A-E` (`DC-07`), niveau d'exécution (`DC-13`), nature du seuil (`DC-20`) — transférée depuis « Doctrine exécutable », faute de consommateur là-bas. Elle porte désormais **la structure ET le contenu** de ces axes, plus la matrice claim par claim. Source à reprendre au cadrage : `sources/2026-08-23-transfert-migration-axes-claim.md`. **Toujours à l'arrêt** : appariement NABM et liens biomarqueur↔besoin à 0 ligne. |
| 5 | 6.0-B — Charge et capacité | `2026-08-21-charge-et-capacite/` | Budget d'effort, « simplifier mon protocole » (`ProtocolDraft` chaîné), mode « semaine compliquée », check-in v3 additif. Dépend de 6.0-A ; arbitrage A1 intangible (pilotage, jamais score). |
| 6 | 6.0-C — Le récit du parcours | `2026-08-21-recit-du-parcours/` | Timeline racontée (projection), petites victoires (jamais causales, `DC-27`), « pourquoi maintenant ? » + double lecture (`DC-34/35`), hypothèses partagées (`DC-31/32`), messages du registre signé. Dépend du Socle et de 6.0-A. |
| 7 | 6.0-D — Le jumeau de compréhension | `2026-08-21-jumeau-de-comprehension/` | La signature conceptuelle : représentations patient/praticien côte à côte, versionnées, écarts visibles, « prochain choix ensemble » aux jalons. Dépend de 6.0-A et 6.0-C. |
| 8 | Nutrition référentielle (R1→R3) | `2026-08-18-nutrition-referentielle/` | Recule d'un cran par réarbitrage 6.0 : ses fiches conseils consomment le registre de messages du Socle — l'ordre naturel la place après lui. Premier lot inchangé (recouvrement rayon C4). |
| à cadrer | Curation des exclusions d'intervention (`neCouvrePas`) | *(pas de dossier — routée le 2026-08-24, `D-107`)* | **Arbitrage praticien du 2026-08-24, qui REVIENT sur le constat de `D-101`.** Le LOT-05 avait ABANDONNÉ cette curation sur mesure — son registre n'a aucun consommateur d'exécution. Le responsable rouvre : les **95 interventions** portent `neCouvrePas` **null sur les 95**, et tant qu'elles le restent, `gatePopulationV1` ne mord sur **aucun** dossier et `DC-43` ne peut pas franchir son gate faute de **sujet**, non faute de mécanisme. Le mécanisme, lui, est **complet et relu** (`D-101`) : il ne manque que la donnée. **Ce que cela débloque** : `DC-43` obtient un porteur nommé au lieu d'être reconduite « écrite, non armée ». **Ce que cela coûte** : une cadence praticien, intervention par intervention, comme « Curation signée ». **Garde-fou non négociable** (`D-101`, `DC-35`) : une intervention dont les exclusions ne sont pas curées se propose **en le disant** — la curation partielle est un état déclaré, jamais un silence. |
| à cadrer | Les dix règles orphelines de la constitution | *(pas de dossier — routée le 2026-08-24, `D-107`)* | **Arbitrage praticien du 2026-08-24, après deux reports.** `DC-03`, `DC-36`, `DC-38`, `DC-39`, `DC-40`, `DC-41`, `DC-44`, `DC-45`, `DC-47`, `DC-48`, plus la part de `DC-11` hors exclusions. Le LOT-01 de « Doctrine exécutable » les avait nommées orphelines (`D-095`), `D-096` en a sorti `DC-09` pour le LOT-09, et l'arbitrage de portefeuille était **reporté, pas clos** — trois options nommées : dettes nommées, campagne dédiée, rattachement au coup par coup. **Le responsable tranche : campagne dédiée.** Les deux autres options sont écartées avec leur motif — « dettes nommées » était le régime qui les a rendues orphelines, et le « coup par coup » ne fait remonter aucune règle sans porteur. Le **LOT-08** de « Doctrine exécutable » les écrit comme telles ; il ne les arbitre plus, c'est fait ici. Recompte au grep avant cadrage : `grep -c '\*\*Orpheline\*\*'` rend **13** au 2026-08-24 (onze statuts + deux en en-tête). |
| gaté | Mémoire relationnelle consentie | *(pas de dossier — gaté conformité)* | Nouvelle finalité RGPD ⇒ information des personnes + base légale d'abord ; derrière la revue HDS du 2026-10-21. La mécanique trust (version immuable + accusé + retrait) est prête ; la table devra entrer dans l'effacement IDP2. |

Critère d'acceptation transverse des lots 6.0 (principe architectural §7 de
l'audit) : une stratégie cliniquement pertinente mais incomprise, irréalisable
ou sans rapport avec ce qui compte pour le patient n'est pas « done ».

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
