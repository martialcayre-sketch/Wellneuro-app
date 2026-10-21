---
id: "2026-10-04-bio-parcours"
titre: "BIO-PARCOURS — la biologie dans un assistant clinique de bout en bout"
statut: "en_pause (ouverte le 2026-10-04 ; LOT-00, LOT-01, LOT-02, LOT-03, LOT-04, LOT-07, LOT-09, LOT-10, LOT-11, LOT-23, LOT-25 et LOT-26 terminés ; lots de sécurité issus de BP-26 livrés : 10A, 11A, 5A, 8B, D-281 lots 1 et 2 ; LOT-03 (BP-03) terminé le 2026-10-17 ; suite au plan docs/claude/PLAN_WELLNEURO.md)"
créée_le: "2026-10-04"
mise_à_jour: "2026-10-20"
lot_courant: "aucun"
branche_campagne: "aucune"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# BIO-PARCOURS — la biologie dans un assistant clinique de bout en bout

## Objectif

Le praticien part d'informations vérifiées, pose ses constats, compare des
options sourcées, valide une prescription hors médicament, la remet au
patient, suit sa mise en œuvre et révise sa décision à partir des résultats.
Le premier parcours est l'« exploration du besoin 2 », construit d'abord dans
l'**étage outil**. L'**étage assistant** se développe derrière drapeau et
n'ouvre que fonction par fonction (`D-266` §2).

Coordination avec BIO-INGEST (pistes, gates, parallélisme) :
[`BIOFLOW_ROADMAP.md`](../../../architecture/bioflow/BIOFLOW_ROADMAP.md).

## Ce qui a causé cette campagne

La saisie et l'import des résultats biologiques sont ouverts en production
(BIO-INGEST, `WN_BIO_INGEST_ENABLED` posé le 2026-10-03), mais aucun échelon du
parcours n'en fait un usage décisionnel tracé (`D-122`, `D-157`). Le
responsable a fixé la direction le 2026-10-04 : « assistant clinique
proactif, prescriptif sous validation professionnelle, explicable et
longitudinal, construit autour des 12 besoins ». Le cadrage v3.1 en a tiré le
programme, après deux contre-revues Codex et une contre-revue d'architecture.

## Résultat observable

- **Jalon J1** (après BP-20) : sur les trois fixtures, la boucle sans
  prescription tourne en banc. Elle va de la question choisie au constat du
  praticien, puis au suivi factuel et à la révision motivée.
- Ouverture a (BP-21a), puis ouverture b (BP-21b), chacune décidée par
  `D-xxx` sur des critères écrits avant elle.
- Chaque option servie cite ses claims ou sa position signée
  `identifiant@version`. Aucune option n'est servie sans précautions, aucun
  médicament n'est prescrit, et aucune version ni aucun constat n'est réécrit
  sans geste.
- Au moins un cycle réel arrive au jalon de fin, constaté au conteneur en
  agrégats.

## Décisions

- **`D-266`** — la décision-cadre (BP-00) : deux étages, frontières,
  nomenclature unique, doctrine amendée, convention de lot, constantes
  produit, organisation.
- **`D-265`** — préalable hors campagne : les dossiers réels et le portail G4
  sont reconduits sans terme, la voie d'exception D-234 est maintenue.
- Frontières tenues : `D-122` (aucun résultat ne parle au moteur sans sa
  décision), `D-157` (juxtaposer est documentaire), `D-059` §4 (l'arbitrage ne
  porte aucune valeur), `D-206` A1-A2, `D-087` et `D-248` (migration seule,
  `release-db`, un merge à la fois).
- Détail : [`CADRAGE_BIO_PARCOURS_v3_2026-10-04.md`](../CADRAGE_BIO_PARCOURS_v3_2026-10-04.md)
  (version versée ; le Claude Doc privé fait foi pour les passages cliniques
  retirés du dépôt).

## Contraintes non négociables

- Aucune règle clinique, aucun seuil, aucune dose ni aucun poids inventé : la
  dose est tirée d'une source, modifiable, jamais calculée ; sans source, on
  affiche « information manquante ».
- Aucun médicament n'est prescrit ; un besoin qui touche un médicament sort en
  « à discuter avec le médecin ».
- Un lot porte au plus une migration et son code consommateur, en deux PR ;
  chaque migration exige une **confirmation distincte**, une `release-db`
  approuvée et un constat par conteneur.
- La passe Codex est obligatoire sur les migrations, les modules cliniques
  signés et les décisions de frontière.
- Aucun texte clinique dans le dépôt public (`D-251` §4) : identifiants de
  claims seulement.
- Le registre RGPD et la note patient sont mis à jour **avant** toute table
  neuve, et la version TRUST avant le drapeau qui lit la table.
- Aucun secret, aucun patient réel. Les fixtures se limitent à Sophie Nicola,
  Jennifer Martin et Michel Dogné, et prouvent un mécanisme, jamais un
  parcours (`D-125`). Tout texte d'interface est en français.

## Lots

Les fiches portent l'identifiant `LOT-nn` qu'exige l'audit ; les documents
disent `BP-nn` (`D-266` §15). BP-06 est absorbé par BP-05 : `LOT-06` n'est pas
attribué. **Campagne en pause ; LOT-03 (BP-03), ouvert le 2026-10-14, terminé
le 2026-10-17 ; LOT-07 (BP-07) et LOT-09 (BP-09) terminés le 2026-10-14.** BP-26 est terminé le 2026-10-10 (`D-276`) : qualification différée
à l'aboutissement du produit, aucune fonction retirée ni réduite, porte de
`D-266` §2 amendée. Les lots de sécurité relevés par BP-26 sont livrés (10A,
11A, 5A, 8B, `D-281` lots 1 et 2 ; lignes datées de la table ci-dessous),
ainsi que la priorité posée par le praticien (5A) et les seuils sourcés de
l'agenda du sommeil (8B). La campagne a repris par BP-07, rang 1 du plan
unique (`docs/claude/PLAN_WELLNEURO.md` §2, fiche F02) ; passée
`en_cours` dans la PR qui écrit la fiche `lots/LOT-07`, elle repasse
`en_pause` à sa clôture (2026-10-14), puis `en_cours` à nouveau dans la PR
qui écrit la fiche `lots/LOT-03` (2026-10-14), et repasse `en_pause` à sa
clôture (2026-10-17), jusqu'au lot suivant du plan. L'ordre des lots est
celui du plan, la campagne dit le travail (`D-285` §1). Les fiches ne sont
écrites que pour la phase 0 ; celles des autres lots s'écrivent quand ils
arrivent.

**Clôture d'un lot** : avec le handoff, mettre à jour le suivi BioFlow du
responsable (page hors dépôt, créée le 2026-10-05) : état du lot, lots
nouveaux, décisions acceptées.

| BP | Fiche | Objet | Statut | Migration | Dépend de |
|---|---|---|---|---|---|
| — | — | Préalable hors campagne : décision du 2026-10-21 (`D-265`) | terminé (PR #1305) | non | — |
| **Phase 0** | | **Destination, gouvernance, gardes** | | | |
| BP-00 | LOT-00 | Décision-cadre `D-266`, ouverture de la campagne | terminé (2026-10-04) | non | — |
| BP-26 | LOT-26 | Note de qualification par fonction, existant compris | terminé (2026-10-10, D-276) | non | BP-00 |
| BP-01 | LOT-01 | Gardes avant surface | terminé (2026-10-04) | non | BP-00 |
| BP-02 | LOT-02 | Constat d'usage et ligne de base, en agrégats | terminé (2026-10-05) | non | — (lecture seule) |
| BP-25 | LOT-25 | Plafond d'actions porté à 7 | terminé (2026-10-08, D-273) | non | BP-00 |
| BP-23 | LOT-23 | Relecture réelle (`D-213` §1) | terminé (2026-10-06) | non | BP-01 |
| BP-10 | LOT-10 | Sécurité biologique, étage 1 | terminé (2026-10-07) | **oui** | BP-02, BIO-INGEST LOT-07 |
| — | — | 10A, sans fiche : encart d'urgence, Fil du jour, lettre d'adressage, message au patient et courriel au praticien (`D-275`, `D-277`) | terminé (2026-10-10 ; #1370, #1373, #1374, #1375, #1393) | **oui** (`D-275` §2, constatée le 2026-10-10) | BP-26 |
| — | — | 11A, sans fiche : effet indésirable « incertain », stress et DASS-21, commentaires du laboratoire (`D-278`) | terminé (2026-10-11 ; #1395 à #1398, #1400, #1401) | **oui** (`D-278` §3, constatée le 2026-10-11) | BP-26 |
| — | — | 5A, sans fiche : la priorité posée par le praticien (`D-279`) | terminé (2026-10-12 ; #1402, #1403) | **oui** (constatée le 2026-10-11) | BP-26 |
| — | — | 8B, sans fiche : seuils sourcés de l'agenda du sommeil et de « Peu couvert » (`D-280`) | terminé (2026-10-12 ; #1404) | non | BP-26 |
| — | — | `D-281` lots 1 et 2, sans fiche : SAF-EI-01 amendée, migration ; le lot 3 (portail) est au plan, rang 1 | terminé (2026-10-13 ; #1406, #1408) | **oui** (constatée le 2026-10-13) | BP-26 |
| **Phase 1** | | **Fondations** | | | |
| BP-09 | LOT-09 | Annulation d'un résultat, ajout seul | terminé (2026-10-14 ; #1448, release-db constatée, #1455 ; `D-294`) | **oui** | BP-00 |
| BP-07 | LOT-07 | Dossier de preuve remis à Curation signée | terminé (2026-10-14) | non | BP-00 |
| BP-12a | LOT-12 | Fiches d'usage (structure signée, texte en base) | à_faire | **oui** | BP-07 |
| BP-12b | LOT-28 | Positions d'expert signées ; arbitrage de conflit persisté | à_faire | **oui** | BP-12a |
| BP-13 | LOT-13 | Données physiologiques, traitements et compléments en cours | à_faire (2026-10-21 : fiche, arbitrages du 2026-10-20 et du 2026-10-21, `D-335`, déclaration RGPD et texte patient validés le 2026-10-21 ; migration seule en PR le 2026-10-21) | **oui** | BP-00, BP-11 (clé de pièce de constat) |
| BP-14 | LOT-14 | Identité d'auteur séparée du rôle | à_faire | **oui** | BP-00 |
| BP-03 | LOT-03 | Série par analyte, jour n, trois dates | terminé (2026-10-17 ; #1463 fiche, #1466 code, sans migration ; constat après déploiement par le responsable) | non | BP-01, BP-09 |
| BP-04 | LOT-04 | Attente typée sur les deux véhicules | terminé (2026-10-15 ; `D-305` #1471, code en une PR sans migration) | non | BP-01, BP-09 |
| BP-05 | LOT-05 | Contexte de prélèvement typé (absorbe BP-06) | à_faire | **oui** | BP-00, BP-03 |
| **Phase 2** | | **Premier parcours, étage outil** | | | |
| BP-11 | LOT-11 | Constats du praticien | terminé (2026-10-20 ; #1600, release-db constatée, puis le code sous `WN_BIO_CONSTAT` éteint ; `D-331`) | **oui** | BP-09, BP-12a |
| BP-16 | LOT-16 | Boucle d'exploration | à_faire | non | BP-03, BP-04, BP-11 |
| BP-15 | LOT-15 | Décisions de parcours | à_faire | **oui** | BP-00 |
| BP-20 | LOT-20 | Suivi factuel ; jalon J1 | à_faire | non | BP-15, BP-16 |
| BP-08 | LOT-08 | Indicateurs de processus | à_faire | non | BP-20 ; un cycle réel à J21 |
| BP-17 | LOT-17 | Bibliothèque signée des options par hypothèse | à_faire | non | BP-11, BP-12b |
| BP-18a | LOT-18 | Prescription niveau 3, figée | à_faire | **oui** | BP-01, BP-14, BP-17, BP-23 ; DC-42 signée |
| BP-18b | LOT-29 | « Protocole personnalisé » remis | à_faire | selon | BP-18a |
| **Phase 3** | | **Ouvertures de l'étage outil** | | | |
| BP-24 | LOT-24 | Conformité : TRUST nouvelle version, registre, effacement, RC | à_faire | non | BP-13, BP-14, BP-18b, `D-265` |
| BP-21a | LOT-21 | Ouverture J1 | à_faire | non | BP-10, BP-20, BP-26 |
| BP-21b | LOT-30 | Ouverture de la prescription | à_faire | non | BP-21a, BP-18b, BP-24 |
| BP-22 | LOT-22 | Observation après ouverture | à_faire | **oui** | BP-21a |
| **Phase 4** | | **Étage assistant** (derrière drapeau) | | | |
| BP-27 | LOT-27 | Évaluateur par marqueur (propose, ne pose jamais) | à_faire | **oui** | BP-03, BP-05, BP-12a, BP-13, BIO-INGEST LOT-07 |
| BP-19 | LOT-19 | Stratégie proposée d'après le dossier | à_faire | **oui** (journal) | BP-13, BP-15, BP-17, BP-20 |
| — | — | Étage 2 du résultat préoccupant ; marches 2 à 4 du suivi ; proposition de bilan d'après le dossier — une fonction par lot, chacune sous sa `D-xxx`, derrière drapeau (`D-276` §3) | à_faire | selon | BP-27 selon le cas |
| **Phase 5** | | **Extension** : B12 et folates, contre-épreuve sommeil, puis par situation | à_faire | selon | BP-21b |

**Chemin critique de l'étage outil** : BP-00 → BP-07 → BP-12a → BP-12b →
BP-17 → BP-18a → BP-18b → BP-24 → BP-21b. **Branche J1** : BP-12a → BP-11 →
BP-16 → BP-20 → BP-21a. Le rythme est fixé par les signatures de BP-07.
Ordre des `release-db`, une à la fois, arrêté par le plan unique (§5
« Ce qui ne s'accélère jamais ») : faites, BIO-INGEST LOT-07, BP-10, `D-281`
lot 2, `D-282` lot 2 ; puis BP-09 (rang 3), l'essai de restauration (porte 8),
le rang 4 (BP-12a, BP-11, BP-13, BP-15, avec les autres lignes du plan), le
rang 5 (BP-12b, BP-14, BP-18a, BP-18b s'il porte une migration, BP-05), BP-27
(rang 6), BP-19 (rang 7), BP-22 (rang 8). Le plan fait foi.

## Hors périmètre, nommé

- Tout médicament : ni prescription, ni ajustement, ni arrêt.
- La biologie dans le score des 12 besoins : horizon non daté, sous décision
  propre et bump de version.
- La campagne C4 et l'atelier C4, consommés sans être rouverts ; la campagne
  Curation signée garde la signature claim par claim.
- La prescription d'examens biologiques dans l'outil : la demande est
  contresignée par un médecin, hors de l'outil.
- Les règles orphelines restées à la campagne dédiée : la part de DC-11 hors
  exclusions, DC-36 et DC-45.
- Les lots BIO-INGEST LOT-03 à LOT-07 : toujours les préfixer « BIO-INGEST »,
  les deux campagnes ayant des fiches `LOT-03`, `LOT-04`, `LOT-05` et
  `LOT-07`.

## Done de campagne

- [ ] BP-21a et BP-21b décidés et ouverts, sur des critères écrits avant eux.
- [x] Chaque fonction ouverte a sa ligne de la note de qualification (BP-26) :
      la même pour toutes, qualification différée (`D-276`).
- [ ] Contre-revue adverse lancée AVANT le lot de clôture.
- [ ] Constat d'usage au conteneur, en agrégats : au moins un cycle réel
      arrivé au jalon de fin.
- [ ] Documentation canonique, registre RGPD et TRUST à jour ; handoff final
      produit.
