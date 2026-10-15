---
id: "LOT-04"
titre: "BP-04 — Attente typée sur les deux véhicules"
statut: "à_faire (fiche proposée le 2026-10-15, non validée ; sept arbitrages du responsable à rendre avant le code)"
dépend_de: "LOT-01, LOT-09"
---

# LOT-04 (BP-04) — Attente typée sur les deux véhicules

> **Fiche proposée, non validée.** Écrite la nuit du 2026-10-15, sans le
> responsable, à partir des sources citées. Rien ne se code avant ses
> arbitrages (section « Arbitrages à rendre ») et la décision de contrat qui
> les consigne.

## But

Qu'une attente biologique dise **quels analytes** elle attend, en codes du
catalogue, et non plus seulement par une cible en texte libre. Sans cela, aucun
résultat ne peut jamais la réveiller : BP-16 (boucle d'exploration), puis
BP-20 et BP-21a, l'attendent (plan F16 ; `CAMPAGNE.md`, ligne BP-16).

Le cadrage v3 y ajoute la date du contreseing de la demande d'examens et une
borne de D-190 §3 testée au serveur (`CADRAGE_BIO_PARCOURS_v3_2026-10-04.md`,
lignes 123, 175, 344, 382).

## Résultat observable

Une attente posée après ce lot, en suspendant une action de protocole, porte
une liste de codes d'analytes ; celle née d'une règle de compléments aussi
selon 2 B, et reste « non typée » selon 2 A. Une attente posée avant reste
lisible et se dit « attente non typée : aucun résultat ne la
réveille ». Les empreintes des versions déjà enregistrées ne changent pas.
Aucun réveil, aucun état dérivé, aucune carte au Fil dans ce lot (voir
l'arbitrage 5).

## Socle établi (ne se rediscute pas)

- **Sans migration, sans release-db, sans drapeau.** Portes BP-01 et BP-09,
  toutes deux faites (plan F16).
- **Extension additive du contrat V4**, sur le patron de D-240, sans contrat
  V5 : un champ absent ne change pas l'empreinte (`canonicalJson` ignore
  `undefined`), si bien que les versions déjà enregistrées gardent la leur.
- **Un seul lecteur par véhicule** (D-142) : le typage vaut pour l'attente
  d'une action de protocole **et** pour celle d'une règle de compléments (C4),
  sinon l'écriture et la lecture divergent.
- **Le lecteur tolérant précède l'écrivain** (plan F16) : une attente ancienne
  se lit « non typée », jamais refusée.
- **`cible` est conservée** (cadrage v1, ligne 149).
- **Le praticien seul pose l'attente** (D-190) ; une machine la suggère, elle
  ne la pose jamais (D-190 §3 ; cadrage v3, ligne 278). D-190 §5 n'est pas
  amendée ici : c'est BP-18a.
- **Un résultat annulé ne réveille rien** (D-294 §6) ; un critère « contrôle
  fait » se juge sur la date de prélèvement, jamais sur celle de saisie
  (cadrage v1, ligne 188). Ces deux règles servent à BP-16 ; ce lot ne les
  applique pas encore.
- **Aucune règle clinique, aucun seuil, aucun plafond inventé.**
- **La référence au catalogue** se reprend sur le patron de re-dérivation au
  serveur des actions alimentaires, pas sur celui, seulement structurel, des
  compléments (`FILE_ATTENTE.md`, ligne 80, dans l'historique Git avant
  069db0d1).

## Ce que le code fait aujourd'hui (lu le 2026-10-15)

- L'attente d'une action de protocole porte un type, une cible en texte libre
  et une échéance facultative ; tout champ inconnu est refusé à la
  normalisation, si bien que le champ neuf doit y être déclaré.
- L'attente d'une règle de compléments a la même forme, avec son lecteur
  unique, réutilisé par l'atelier de règles (qui ne porte aucune règle en
  production, D-142 §1 — à redater par conteneur).
- Aucune attente ne porte de codes d'analytes. Le seul précédent d'une liste
  de codes vérifiée contre le catalogue est celui des portes biologiques des
  assiettes (`portesBiologiquesAssiettesV1`, et son banc).
- La borne de D-190 §3 n'existe pas au serveur : la route des versions ne
  vérifie pas qu'une attente vient d'une ligne de la proposition de bilan.
- Empreinte V4 : un banc existe (`protocolV4.test.ts`). Empreinte C4 : aucun
  banc dédié trouvé — le critère de done du plan (« bancs d'empreinte V4 et
  C4 ») suppose de le créer.

## Arbitrages à rendre (avant le code)

Chaque question donne les faits, puis la conséquence de chaque réponse.

1. **La date du contreseing de la demande d'examens.** Le cadrage la demande
   sans trancher sa forme (« fail-closed ou déclarative explicite »).
   - **A.** Facultative. Une attente sans date se dit « contreseing non
     daté » et ne réveille rien. Geste du praticien inchangé.
   - **B.** Obligatoire pour toute attente neuve : refus à l'enregistrement
     sans date. Le praticien la saisit en suspendant l'action, ce qui change
     son geste.
   - **C.** Renvoyée à BP-16, qui pose la demande à contresigner. Ce lot ne
     porte que les codes.
2. **L'attente d'une règle de compléments.**
   - **A.** Même type, lu tolérant, sans saisie dans l'atelier : une attente
     née d'une règle reste « non typée » (cadrage v1).
   - **B.** Saisie typée dans l'atelier aussi (cadrage v3, « les deux
     véhicules ») : le lot touche l'atelier et la signature des règles, sans
     effet en production tant qu'aucune règle n'y est posée.
3. **Les codes contre le catalogue.**
   - **A.** Vérifiés à l'enregistrement : un code inconnu est refusé.
     Contrat plus sûr ; le moteur clinique dépend alors du catalogue
     biologique.
   - **B.** Forme seulement : aucun couplage, mais un code mort passerait,
     et l'attente ne serait jamais réveillée, sans que rien ne le dise.
   - Sous-question : liste non vide obligatoire ? Un plafond de nombre serait
     un chiffre à fournir par le responsable ; la fiche n'en propose pas.
4. **La cible en texte libre, à côté des codes.**
   - **A.** Libre, telle qu'aujourd'hui : le praticien peut écrire une cible
     qui ne dit pas les mêmes analytes que les codes.
   - **B.** Libre, avec un contrôle de cohérence affiché au praticien.
   - **C.** Dérivée des codes : plus de texte libre pour une attente neuve.
5. **L'état « à arbitrer » ou « à examiner ».** La v1 le mettait dans ce lot,
   jugé sur la date de prélèvement, avec l'arbitrage juxtaposé et sans carte
   au Fil ; la v3 et le plan le renvoient à BP-16.
   - **A.** Hors de ce lot : contrat seul, BP-16 porte l'état.
   - **B.** Dans ce lot : il lit les résultats, ce qui l'inscrit aux bancs des
     lecteurs de résultats biologiques.
6. **La borne de D-190 §3 au serveur.**
   - **A.** Oui : l'enregistrement refuse une attente dont les codes ne
     viennent pas des lignes « recommandé », « à répéter » ou « conditionnel
     à déclencheur rempli » de la proposition de bilan. Il faut alors dire
     quelle version de la proposition fait foi.
   - **B.** Non : la borne reste à l'écran, contre ce que demande la v3.
7. **Les attentes déjà posées.** Elles restent « non typées ».
   - Le libellé exact de cet état, et l'écran où il se dit.
   - Faut-il d'abord les compter en production, par conteneur et en
     agrégats ? Le constat de BP-02 les comptait ; il n'a pas été relu ici.

## Périmètre (selon les arbitrages)

- Le champ des codes sur les deux types d'attente, la normalisation, le
  lecteur tolérant.
- Selon 1, 3, 4, 6 : la date, la vérification au catalogue, la cible, la
  borne au serveur.
- Les bancs d'empreinte V4 et C4 (ce dernier à créer).
- La décision de contrat (D-xxx, D-142) qui consigne les arbitrages ; son
  numéro se réserve dans `main` au moment de l'écrire.

## Hors périmètre

- Le réveil d'une attente par un résultat, l'état dérivé, la carte au Fil
  (BP-16), sauf arbitrage 5 B.
- L'amendement de D-190 §5 (BP-18a).
- Toute règle clinique, tout seuil, tout plafond.
- Le portail.

## Fichiers probables (une PR, sans migration)

- Les types et la normalisation de l'attente (moteur clinique, compléments).
- La route des versions de protocole (borne serveur, selon 6).
- L'écran de suspension d'une action (choix des analytes) et celui de
  l'arbitrage biologique.
- Leurs tests ; `protocolV4.test.ts` ; un banc d'empreinte C4 neuf.
- Gardes de liste blanche : `importeursBiologyLibrary.guard.test.ts` pour tout
  importeur neuf du catalogue biologique (la garde annonce déjà « le lecteur
  d'attente C4 ») ; les bancs des lecteurs de résultats si 5 B.
- `changelog.d/`, la décision de contrat, cette fiche et `CAMPAGNE.md`.

## Interdits

- Aucune règle clinique, aucun seuil, aucun plafond inventé.
- Aucune empreinte déjà enregistrée ne change.
- Aucune attente posée par une machine.
- Aucune donnée patient réelle dans le dépôt (`D-125`).

## Tests

- Empreinte V4 : une version sans le champ garde son empreinte ; une version
  avec le champ en change. Même banc pour C4.
- Lecteur tolérant : une attente ancienne se lit « non typée ».
- Selon les arbitrages : code inconnu refusé (3 A) ; attente hors proposition
  refusée au serveur (6 A) ; date absente refusée (1 B).
- Paliers : T1 à chaque édition, T2 avant le commit ; `/code-review medium`.

## Critères de done

Bancs d'empreinte V4 et C4 verts ; attente ancienne lue « non typée » ; T2
vert ; décision de contrat mergée.

## Dépendances

LOT-01 (terminé) ; LOT-09 (terminé). BP-16 attend ce lot, avec BP-03 et
BP-11. Rang 4 du plan (F16), sans gel avec la piste C.
