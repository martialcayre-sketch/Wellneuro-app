---
id: "LOT-04"
titre: "BP-04 — Attente typée sur les deux véhicules"
statut: "terminé (2026-10-15) — code de D-305 livré en une PR, sans migration ; aucun constat de production attendu, aucune attente n'y étant posée"
dépend_de: "LOT-01, LOT-09"
---

# LOT-04 (BP-04) — Attente typée sur les deux véhicules

> **Fiche proposée la nuit du 2026-10-15, arbitrages rendus le même jour.**
> Écrite sans le responsable, à partir des sources citées ; ses sept
> arbitrages sont rendus (section « Arbitrages ») et consignés par la
> décision de contrat D-305. Le code part après son merge.

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
une liste non vide de codes d'analytes, connus du catalogue et pris dans la
dernière proposition de bilan du dossier ; celle née d'une règle de
compléments reste « non typée » (arbitrage 2 A). Une attente posée avant
reste lisible et se dit « attente non typée : aucun résultat ne la
réveille ». Les empreintes des versions déjà enregistrées ne changent pas.
Aucun réveil, aucun état dérivé, aucune carte au Fil dans ce lot
(arbitrage 5 A).

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

## Arbitrages (rendus par le responsable le 2026-10-15)

Chaque question donne les faits, puis la conséquence de chaque réponse ; la
réponse retenue suit, en **Rendu**.

1. **La date du contreseing de la demande d'examens.** Le cadrage la demande
   sans trancher sa forme (« fail-closed ou déclarative explicite »).
   - **A.** Facultative. Une attente sans date se dit « contreseing non
     daté » et ne réveille rien. Geste du praticien inchangé.
   - **B.** Obligatoire pour toute attente neuve : refus à l'enregistrement
     sans date. Le praticien la saisit en suspendant l'action, ce qui change
     son geste.
   - **C.** Renvoyée à BP-16, qui pose la demande à contresigner. Ce lot ne
     porte que les codes.
   - **Rendu : C.**
2. **L'attente d'une règle de compléments.**
   - **A.** Même type, lu tolérant, sans saisie dans l'atelier : une attente
     née d'une règle reste « non typée » (cadrage v1).
   - **B.** Saisie typée dans l'atelier aussi (cadrage v3, « les deux
     véhicules ») : le lot touche l'atelier et la signature des règles, sans
     effet en production tant qu'aucune règle n'y est posée.
   - **Rendu : A.**
3. **Les codes contre le catalogue.**
   - **A.** Vérifiés à l'enregistrement : un code inconnu est refusé.
     Contrat plus sûr ; le moteur clinique dépend alors du catalogue
     biologique.
   - **B.** Forme seulement : aucun couplage, mais un code mort passerait,
     et l'attente ne serait jamais réveillée, sans que rien ne le dise.
   - Sous-question : liste non vide obligatoire ? Un plafond de nombre serait
     un chiffre à fournir par le responsable ; la fiche n'en propose pas.
   - **Rendu : A**, liste non vide obligatoire pour une attente neuve, sans
     plafond de nombre.
4. **La cible en texte libre, à côté des codes.**
   - **A.** Libre, telle qu'aujourd'hui : le praticien peut écrire une cible
     qui ne dit pas les mêmes analytes que les codes.
   - **B.** Libre, avec un contrôle de cohérence affiché au praticien.
   - **C.** Dérivée des codes : plus de texte libre pour une attente neuve.
   - **Rendu : A.**
5. **L'état « à arbitrer » ou « à examiner ».** La v1 le mettait dans ce lot,
   jugé sur la date de prélèvement, avec l'arbitrage juxtaposé et sans carte
   au Fil ; la v3 et le plan le renvoient à BP-16.
   - **A.** Hors de ce lot : contrat seul, BP-16 porte l'état.
   - **B.** Dans ce lot : il lit les résultats, ce qui l'inscrit aux bancs des
     lecteurs de résultats biologiques.
   - **Rendu : A.**
6. **La borne de D-190 §3 au serveur.**
   - **A.** Oui : l'enregistrement refuse une attente dont les codes ne
     viennent pas des lignes « recommandé », « à répéter » ou « conditionnel
     à déclencheur rempli » de la proposition de bilan. Il faut alors dire
     quelle version de la proposition fait foi.
   - **B.** Non : la borne reste à l'écran, contre ce que demande la v3.
   - **Rendu : A**, jugée contre la dernière proposition de bilan du dossier
     au moment où l'attente est posée (et non contre la dernière version
     diffusée).
7. **Les attentes déjà posées.** Elles restent « non typées ».
   - Le libellé exact de cet état, et l'écran où il se dit.
   - Faut-il d'abord les compter en production, par conteneur et en
     agrégats ? Le constat de BP-02 les comptait ; il n'a pas été relu ici.
   - **Rendu :** libellé retenu, « attente non typée : aucun résultat ne la
     réveille », là où l'attente s'affiche aujourd'hui (action suspendue) ;
     compter d'abord. **Compté le 2026-10-15** par conteneur, en lecture
     seule et en agrégats : 4 versions de protocole en base, aucune action
     « conditionnelle à la biologie », donc **aucune attente posée** ; aucune
     n'est à retyper.

## Périmètre

- Le champ des codes sur les deux types d'attente, la normalisation, le
  lecteur tolérant ; la saisie des codes seulement en suspendant une action
  de protocole (2 A).
- La vérification des codes au catalogue et la liste non vide (3) ; la cible
  libre inchangée (4).
- La borne de D-190 §3 au serveur, contre la dernière proposition de bilan
  du dossier (6).
- Le libellé des attentes non typées (7).
- Les bancs d'empreinte V4 et C4 (ce dernier à créer).
- La décision de contrat D-305 (sur D-142), écrite avec cette fiche ; le
  code la cite.

## Hors périmètre

- Le réveil d'une attente par un résultat, l'état dérivé, la carte au Fil
  (BP-16, arbitrage 5 A).
- La date du contreseing de la demande d'examens (BP-16, arbitrage 1 C).
- La saisie des codes dans l'atelier des règles de compléments (2 A).
- L'amendement de D-190 §5 (BP-18a).
- Toute règle clinique, tout seuil, tout plafond.
- Le portail.

## Fichiers probables (une PR, sans migration)

- Les types et la normalisation de l'attente (moteur clinique, compléments).
- La route des versions de protocole (borne serveur, 6).
- L'écran de suspension d'une action (choix des analytes) et celui de
  l'arbitrage biologique.
- Leurs tests ; `protocolV4.test.ts` ; un banc d'empreinte C4 neuf.
- Gardes de liste blanche : `importeursBiologyLibrary.guard.test.ts` pour tout
  importeur neuf du catalogue biologique (la garde annonce déjà « le lecteur
  d'attente C4 »).
- `changelog.d/`, cette fiche et `CAMPAGNE.md`.

## Interdits

- Aucune règle clinique, aucun seuil, aucun plafond inventé.
- Aucune empreinte déjà enregistrée ne change.
- Aucune attente posée par une machine.
- Aucune donnée patient réelle dans le dépôt (`D-125`).

## Tests

- Empreinte V4 : une version sans le champ garde son empreinte ; une version
  avec le champ en change. Même banc pour C4.
- Lecteur tolérant : une attente ancienne se lit « non typée ».
- Code inconnu refusé, liste vide refusée (3) ; attente hors de la dernière
  proposition refusée au serveur (6) ; attente née d'une règle lue « non
  typée » (2 A).
- Paliers : T1 à chaque édition, T2 avant le commit ; `/code-review medium`.

## Critères de done

Bancs d'empreinte V4 et C4 verts ; attente ancienne lue « non typée » ; T2
vert ; D-305 mergée avant le code.

## Livraison (2026-10-15)

Une PR, sans migration, sans drapeau, partie de `origin/main` après le merge
de D-305 (#1471).

- **Contrat** : `ProtocolWaitFor.analyteCodes`, exigé non vide à l'écriture
  par `buildProtocolDraft` (dédupliqué, trié) ; lecteur tolérant
  `estAttenteTypee` et libellé `LIBELLE_ATTENTE_NON_TYPEE` dans
  `clinical-engine/types.ts`, communs aux deux véhicules.
- **C4** : `lireConditionBiologique` lit le même champ ; présent mais
  malformé, la condition est illisible. L'atelier refuse une condition qui
  porte des codes (arbitrage 2 A).
- **Serveur** : la route des versions juge les attentes que la soumission
  pose (`biology-library/attentesBornees.ts`) — catalogue, puis proposition
  re-dérivée à l'instant ; le prédicat des lignes ouvrantes,
  `ligneOuvreUneAttente`, vit dans la feuille `vocabulaireStatuts.ts`, lu
  aussi par l'écran.
- **Lecture de l'arbitrage 6 retenue au code, à confirmer en revue** : une
  action suspendue que la version active porte déjà, **identique en tout
  point** (égalité canonique de l'action), n'est pas rejugée. Sans cela, le
  bilan revenu (ligne passée « déjà documenté »), la révision qui applique
  l'arbitrage d'une intention serait refusée pour une autre, restée en
  attente et inchangée. Toute différence — code ajouté, cible, intitulé,
  type — est un geste neuf, jugé : la contre-revue du 2026-10-15 a montré
  qu'un identifiant seul ne suffit pas, le constructeur renumérotant ses
  actions depuis `action-1`.
- **Fenêtre résiduelle (contre-revue, P2)** : jusqu'au déploiement, le code
  en production pose encore des attentes sans codes, que l'écrivain strict
  refuserait ensuite à leur révision. Recompté par conteneur le 2026-10-15
  à 13 h 01, en agrégats : 4 versions, aucune attente. À recompter juste
  avant le merge.
- **Écran** : le constructeur offre en cases à cocher les analytes des lignes
  ouvrantes de la proposition servie ; sans proposition, il le dit et
  n'offre rien. Le panneau d'arbitrage nomme les analytes attendus, ou dit
  l'attente non typée.
- **Bancs** : empreinte V4 (`protocolV4.test.ts`) et C4
  (`attenteC4.empreinte.test.ts`, créé), valeurs mesurées sur le code d'avant
  par une sonde jetable ; route (catalogue, quatre statuts refusés, deux
  admis, proposition indisponible, attente inchangée non rejugée) ; atelier ;
  écran. Le parcours E2E d'arbitrage lit son code d'analyte dans la
  proposition servie au dossier de fixture.

## Dépendances

LOT-01 (terminé) ; LOT-09 (terminé). BP-16 attend ce lot, avec BP-03 et
BP-11. Rang 4 du plan (F16), sans gel avec la piste C.
