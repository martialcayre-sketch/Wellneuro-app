---
id: "LOT-12"
titre: "BP-12a — Fiches d'usage : structure signée, texte en base"
statut: "à_faire (fiche proposée le 2026-10-15 ; dix arbitrages rendus le 2026-10-15 ; décision du lot D-314 écrite ; cinq arbitrages de forme rendus le 2026-10-16, D-314 §8 ; migration mergée (#1488) et appliquée en production le 2026-10-16, constat par conteneur ; code consommateur écrit sur branche, douze arbitrages rendus le 2026-10-16 ; code mergé (#1498) et déployé le 2026-10-16, structure vide ; validateur posé en production le 2026-10-16 ; première signature à quatre dossiers clos, arbitrage 28 ; structure écrite le 2026-11-01, D-401, arbitrages 29 à 40, signature à poser)"
dépend_de: "LOT-07, LOT-09"
---

# LOT-12 (BP-12a) — Fiches d'usage : structure signée, texte en base

> **Fiche proposée le 2026-10-15, arbitrages rendus le même jour.** Écrite
> sans le responsable, à partir des sources citées ; ses dix arbitrages sont
> rendus (section « Arbitrages ») et consignés par D-314, qui étend D-251.
> La migration part après son merge. Dépôt public : cette fiche ne porte aucun texte de fiche
> d'usage, aucun contenu de claim, aucune population en clair, aucun seuil.

## But

Donner au premier parcours (« exploration du besoin 2 », D-266 §6) ses
**fiches d'usage décisionnel** : une fiche par question clinique et par
usage, en deux couches (cadrage v3, §3.2) :

- une **structure** signée à cinq termes, en TypeScript, faite
  d'identifiants seulement (usage, question, codes d'analyte, besoins, claims
  `identifiant@version`, nature, statut d'usage, population, statut
  réglementaire, renvois aux précautions) ;
- un **texte** en base HDS, sur le patron `FicheAssietteVersion` /
  `FicheAssietteActe` de D-251 §5 : `FicheUsageVersion`, `FicheUsageActe`,
  ajout seul, validé par un acte daté du responsable.

S'y ajoutent le **vocabulaire d'hypothèses** du parcours, que BP-11
(constats du praticien) consomme par identifiant, et le **contrat de
fraîcheur** étendu : un claim remplacé rend la fiche « à relire », jamais
réécrite. BP-11 attend ce lot (branche J1), BP-12b aussi (chemin critique de
l'étage outil) ; BP-27 le lira plus tard (cadrage v3, lignes 377, 414, 426).

## Résultat observable

Après le lot, dans l'espace praticien, les fiches d'usage du besoin 2
retenues par l'arbitrage 1 existent : leur structure est signée au dépôt
(identifiants), leur texte est en base, validé par un acte daté du
responsable. Une fiche dont un claim épinglé est remplacé se dit « à
relire » ; le contrat de fraîcheur la refuse en CI et au préflight de la
release-db. Rien n'est servi au patient ; aucun parcours ne consomme encore
les fiches (BP-11, BP-16) ; aucune sélection d'après le dossier.

## Socle établi (ne se rediscute pas)

- **Une migration, deux PR** (D-266 §11) : la migration seule, puis le code
  après release-db approuvée, sentinelle et constat par conteneur (D-087).
- **Release-db au rang 4, après EF-3b** : celle d'EF-3b est constatée
  (#1478, migration finie le 2026-10-15 à 16:57 UTC, plan porte 9). BP-12a
  est la suivante dans la hiérarchie du rang 4 (plan, « L'ordre des
  release-db de ce rang » : EF-3b, puis BP-12a, BP-11, BP-13, BP-15…) ;
  une à la fois, déploiement constaté avant le merge suivant (D-248).
- **Portes levées** : signatures de BP-07 (LOT-07, terminé le 2026-10-14,
  #1438) ; essai de restauration (porte 8, G-7, #1462) ; BP-09 constaté
  (porte 9, #1448). **Porte 23** (signature des contenus de BP-12a par le
  responsable, dans le lot, avant son merge) : non levée ; elle se lève dans
  ce lot (arbitrages 1 et 2).
- **Le texte ne touche jamais le dépôt** (D-251 §4) : ni commit, ni PR, ni
  handoff, ni changelog, ni log de CI. Les tests et les E2E n'emploient que du
  texte synthétique.
- **Régime « rédigé, puis validé »** (D-251 §5, DC-16, D-094, D-195 §1) :
  la voie d'ingestion ne crée que des brouillons et refuse tout champ de
  validation ; la validation est un acte distinct, daté, du responsable ;
  aucune donnée patient dans une consigne.
- **Module signé distinct de `catalogueConduitesV1`** (D-266 §6) : il ne
  l'alimente pas, ne crée aucun axe, ne sélectionne aucun tableau clinique
  (D-206 A2). Garde posée par BP-01.
- **Aucune phrase dans la structure** (D-208 ; garde de BP-01).
- **Population obligatoire par usage**, curée claim par claim, affichée
  (DC-14, armée par le cadrage v3, ligne 339 ; D-095 : une population
  générale déclarée n'est pas un silence).
- **Signature de l'usage ≠ validation du claim** : la signature du
  responsable sur la structure valide l'usage ; celle du claim reste à
  Curation signée (cadrage v3, §3.2).
- **Une source externe n'apparaît à l'écran qu'ingérée en claim certifié**
  (DC-01) ; un claim narratif n'entre jamais dans une table.
- **Les positions d'expert P1 à P8** (signées au dossier privé le
  2026-10-14) sont versionnées par BP-12b, pas ici : une fiche de ce lot ne
  les cite pas comme pièces.
- **Constante produit** (D-266 §14) : chiffrée par le responsable dans le
  lot qui la lit ; aucune valeur par défaut ; un lot qui la lit sans valeur
  n'ouvre pas.
- **Aucune règle clinique, aucun seuil, aucune dose, aucune population
  inventés.**

## Ce que le code fait aujourd'hui (lu le 2026-10-15)

- **Aucun module de fiches d'usage** : `web/src/lib/fiches-usage/`
  n'existe pas ; aucun code d'hypothèse du parcours.
- **Les gardes de BP-01 l'attendent déjà**, toutes sous
  `web/src/lib/bio-parcours/` :
  - `catalogueConduitesSepare.guard.test.ts` refuse qu'un module de
    `fiches-usage/` importe le catalogue des conduites ;
  - `appelantsLlmBiologie.guard.test.ts` range `fiches-usage/` parmi les
    chemins où tout appelant d'un modèle doit **importer** `verifierDc03` ;
    le banc ne garde que l'import, et seulement sous `web/src` : l'appel
    effectif et le refus d'un verdict `ok: false` relèvent de la revue ;
  - `aucunePhraseStructureSignee.guard.test.ts` juge tout source qui déclare
    `validationExterne` (vrai ou faux), donc une structure neuve, sans
    réglage ;
  - `importeursBiologyLibrary.guard.test.ts` : liste blanche nominative ; un
    module qui vérifie ses codes d'analyte au catalogue y entre par son nom.
- **Hook DC-17** (`.claude/hooks/protect-wellneuro-files.mjs`) : niveau
  « demande », sur `Edit|Write` seulement ; il détecte une table signée par
  son marqueur `validationExterne: true` hors commentaire, si bien qu'une
  structure **signée** de fiches d'usage est couverte sans changement (son
  banc écrit justement un `fiches-usage/ficheUsageBesoin2V1.ts`). Une
  structure au verrou **éteint** (`false`) ne l'est pas.
- **Contrat de fraîcheur** : `claimsEpinglesFraicheur.guard.test.ts` ne
  balaye que `web/src/lib/clinical/` ; il exige que les `claimsSource`
  coïncident avec `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql`
  (et son négatif), joués au CI et au préflight de
  `web/scripts/release-db-scalingo.sh`. Une structure sous `fiches-usage/`
  y échapperait sans extension du balayage.
- **Patron D-251** : `FicheAssietteVersion` (contenu JSON et son empreinte,
  texte source et son empreinte, modèles de rédaction et de contre-lecture,
  version de consigne) et `FicheAssietteActe` (ordre, acte fermé
  `validee`/`retiree`, empreinte égale à celle de la version, validateur,
  relecture intégrale exigée pour valider, motif exigé pour retirer) ;
  triggers d'ajout seul et de pose de date
  (`20260926150000_fiches_assiette_catalogue_v1`) ; contrat négatif
  `fiches_assiette_catalogue_v1_negatif.sql`. Un acte vaut pour **une
  version entière**, pas pour une ligne. La route des actes refuse un texte
  ou un état changé depuis l'affichage.
- **Signature à cinq termes** : patron `stopRulesV1.ts` (`shaPerimetre`
  littéral, `claimsSource`), garde transversale
  `verrousSignatureDocumentes.guard.test.ts`. Matrice de consommation :
  `scripts/wn-matrice-consommation.mjs`.
- **Constantes de D-266 §14** : seule « effectif minimal » est chiffrée
  (séance du 2026-10-12) ; « fiches validées par séance » n'a ni valeur ni
  code.
- **Population** : un vocabulaire fermé existe pour les bornes biologiques
  (`BiologyReferenceRange.population`, défaut `adulte_tout_venant`, D-068,
  D-069) ; aucun pour un usage.
- **Rapporté de BP-01** (LOT-01, « Reporté ») : « entrées décisionnelles du
  nouveau module tracées » revient à ce lot.

## Arbitrages (rendus par le responsable le 2026-10-15)

Chaque question donne les faits, puis la conséquence de chaque réponse ; la
réponse retenue suit, en **Rendu**.

1. **Les contenus signés dans ce lot (porte 23).** Le dossier de preuve de
   BP-07 couvre la question du besoin 2 rubrique par rubrique ; le cadrage
   veut une fiche par question et par usage.
   - **A.** Toutes les fiches que le dossier de preuve permet d'écrire :
     le lot dure le temps de leur signature et de leur validation ; BP-11
     et BP-12b reçoivent un vocabulaire complet.
   - **B.** Une seule fiche (une question, un usage), qui prouve la chaîne
     de bout en bout ; les suivantes viennent par lots de contenu, sans
     migration. Le lot se ferme plus vite ; BP-11 n'a d'abord qu'une partie
     des hypothèses.
   - **C.** Aucune fiche, le mécanisme seul : contredit la porte 23 et le
     critère de fin de F05.
   - **Rendu : A**, toutes les fiches que le dossier de preuve permet
     d'écrire.
2. **Où la porte 23 se tient pour la couche texte.** Le texte n'entre en
   base qu'après la release-db et le déploiement du code ; la structure, elle,
   se signe dans la PR de code.
   - **A.** La structure se signe avant le merge de la PR de code ; le texte
     se valide en production après le déploiement ; le lot se clôt sur le
     constat, par conteneur et en agrégats, des actes de validation (PR de
     clôture). BP-11 peut partir dès le merge du code.
   - **B.** Même chose, mais BP-11 attend la clôture : aucun constat ne
     pourra pointer une hypothèse dont le texte n'est pas validé.
   - **Rendu : A.** BP-11 peut partir dès le merge du code de ce lot.
3. **Où vivent les libellés des hypothèses.** La structure ne porte que des
   identifiants (aucune phrase) ; BP-11 affichera un libellé par hypothèse.
   - **A.** Dans le texte de chaque fiche : pas de table de plus ; une
     hypothèse partagée par deux fiches a deux libellés, qui peuvent
     diverger.
   - **B.** Une table propre, versionnée et validée par acte sur le même
     patron, dans la même migration : un libellé par hypothèse ; trois
     tables au lieu de deux, un écran de validation de plus.
   - **Rendu : B**, une table propre des libellés d'hypothèse, dans la même
     migration.
4. **Qui rédige le texte.** Le cadrage admet qu'un modèle rédige et qu'un
   second contre-lise.
   - **A.** Le responsable rédige ; le texte entre en brouillon par une
     route interne d'ingestion, sans modèle. Aucun site d'IA neuf.
   - **B.** Un outil hors ligne rédige et contre-lit, comme pour les fiches
     d'assiette (D-251 §5). Site d'IA neuf : liste fermée de K-05a (porte 5)
     et dossier RGPD à amender ; vérificateur DC-03 exigé par la garde.
   - **C.** A dans ce lot ; B, s'il est voulu, par un lot à part.
   - **Rendu : B**, dans ce lot. Précision lue après la réponse : l'outil
     des fiches d'assiette vit sous `tools/corpus/fiches/`, hors de
     l'application, et `sitesAppelIa.guard.test.ts` ne balaye ni `tools/`
     ni `scripts/`. Un outil de même place **ne modifie donc pas la liste
     fermée de K-05a** (porte 5 inchangée) ; son flux, sans donnée patient
     par construction, se déclare comme celui des fiches d'assiette : un
     document TRUST et la mention au dossier RGPD (rubrique 6, constat D4
     de D-299). Le vérificateur DC-03 s'applique à sa sortie (D-266 §7,
     porteur BP-01) ; l'option B le disait « exigé par la garde », ce qui
     est faux sous `tools/` : la garde ne balaye que `web/src`, et n'y
     vérifie que l'import. L'exigence reste contractuelle ; elle se tient
     par les bancs de l'outil (verdict `ok: false` ⇒ bloc exclu) et par la
     revue. Un modèle rédige, un second contre-lit, un désaccord exclut le
     bloc ; la voie d'ingestion ne crée que des brouillons.
5. **Le grain de la validation.** Le patron D-251 valide une version
   entière, relecture intégrale déclarée ; le cadrage dit « ligne à ligne
   (DC-16) ».
   - **A.** Un acte par version, relecture intégrale déclarée, rubriques
     relues côte à côte avec la structure : patron repris tel quel.
   - **B.** Un acte par rubrique : validation progressive possible, table
     d'actes plus fine ; une fiche n'est valide que si toutes ses rubriques
     le sont, ce que le serveur doit juger.
   - **Rendu : B**, un acte par rubrique. La validité d'une version se
     dérive au serveur : toutes ses rubriques validées, sur la même
     empreinte de version.
6. **La rubrique « explication patient ».** Le cadrage la range dans le
   texte ; rien de ce lot ne va au patient.
   - **A.** Hors de ce lot : elle viendra avec la première surface patient
     du parcours (BP-18b, file C, porte 18).
   - **B.** Rédigée et validée ici, jamais servie : aucune route patient ;
     son activation reste un geste de la file C.
   - **Rendu : A**, hors de ce lot.
7. **Le vocabulaire de population.** Champ obligatoire par usage.
   - **A.** Reprendre le vocabulaire fermé des bornes biologiques
     (`adulte_tout_venant`…) : un seul vocabulaire ; il ne dit peut-être pas
     toutes les populations du dossier de preuve.
   - **B.** Une liste fermée propre aux fiches d'usage, signée dans ce lot,
     chaque valeur nommée par le responsable : vocabulaire juste, mais deux
     listes à tenir alignées.
   - **Rendu : B**, liste fermée propre, chaque valeur nommée et signée par
     le responsable dans ce lot ; au dépôt, des identifiants seulement.
8. **Des valeurs dans la structure.** D-266 §9 range au porteur BP-12a les
   natures « seuil décisionnel documenté » et « cible thérapeutique »
   (DC-20, DC-47).
   - **A.** Aucune valeur : la structure déclare seulement la nature
     attendue d'une valeur et le claim qui la porte ; les valeurs viennent
     avec l'évaluateur (BP-27). Rien à chiffrer dans ce lot.
   - **B.** Les seuils décisionnels documentés par un claim certifié y
     entrent dès ce lot : chacun est une valeur clinique, avec sa décision,
     son claim et son banc DC-47.
   - **Rendu : A**, aucune valeur.
9. **La constante « fiches validées par séance »** (D-266 §14).
   - **A.** Non lue dans ce lot : aucun plafond à l'écran ; elle reste sans
     valeur.
   - **B.** Lue : l'écran de validation refuse au-delà d'un nombre par
     séance. Le nombre, et ce qu'est une séance, sont à fournir par le
     responsable ; sans eux, le lot n'ouvre pas.
   - **Rendu : A**, non lue.
10. **Le contrat de fraîcheur étendu à la couche texte.** Un claim
    remplacé rend la structure « à relire » (contrat SQL au CI et au
    préflight, dès que le balayage couvre `fiches-usage/`).
    - **A.** Le texte validé est lié à l'empreinte de la structure : une
      structure re-signée rend son texte « à relire » jusqu'à un nouvel
      acte ; l'état se dérive à la lecture, rien n'est réécrit.
    - **B.** Le texte vit indépendamment de la structure : il ne repasse « à
      relire » que si un claim qu'il cite est remplacé ; moins de
      relectures, mais un texte peut survivre à un changement d'usage.
    - **Rendu : A**, texte lié à l'empreinte de la structure.

### Arbitrages de la migration (rendus le 2026-10-16, D-314 §8)

Posés en écrivant la PR de migration ; le onzième et le quinzième suivent
la revue `wn-reviewer` de son premier jet.

11. **Où vivent les actes des libellés.** D-314 disait trois tables.
    - **A.** Une table d'actes partagée, à deux cibles exclusives : trois
      tables, comme écrit.
    - **B.** Une table d'actes propre aux libellés : quatre tables, chacune
      à une seule cible ; D-314 amendée.
    - **Rendu : B.**
12. **Où vivent les libellés des populations d'usage.** D-314 §2 les met en
    base sans dire où ; une population sert plusieurs fiches.
    - **A.** Dans une table de vocabulaire, avec ceux des hypothèses, sous
      leur nature : un libellé par population, validé une fois.
    - **B.** Dans la rubrique « population » de chaque fiche : deux fiches,
      deux libellés qui peuvent diverger.
    - **Rendu : A.**
13. **La liste des rubriques du texte.**
    - **A.** Fermée par la base, « explication patient » refusée : l'ajouter
      (BP-18b) est une migration.
    - **B.** Fermée par le code seul : sans migration, mais l'arbitrage 6 ne
      tient plus que par le code applicatif.
    - **Rendu : A.**
14. **Le format des identifiants.**
    - **A.** Fixé par la base : `FU_…`, `HYP_…`, `POP_…` ; la structure s'y
      conforme ; en changer est une migration.
    - **B.** Forme générique sans préfixe : fiche et terme indistincts en
      base.
    - **Rendu : A.**
15. **Les libellés et l'empreinte de la structure** (arbitrage 10 étendu).
    Le vocabulaire est déclaré dans la structure signée ; un identifiant dont
    le sens change sous le même nom laisserait son libellé validé.
    - **A.** Liés : une re-signature rend tous les libellés « à relire »
      jusqu'à un nouvel acte.
    - **B.** Indépendants, sous la règle « un identifiant ne change jamais de
      sens ».
    - **Rendu : A.**

### Arbitrages du code consommateur (rendus le 2026-10-16, D-314 §9)

Posés après l'écriture de la PR 2 et sa revue `wn-reviewer`, avant son
ouverture. Le premier rendu de chaque question est celui qui a été recommandé,
sauf au 24.

16. **Les trois axes de D-266 §3 dans la structure.** Rendu : **maintenant**,
    tant que la structure est vide (rien ne repasse « à relire »).
17. **Nature ↔ statut.** Rendu : **règle du cadrage** — piste exploratoire ou
    usage non étayé : « non validé » seulement ; structure refusée à la
    signature sinon. (Écartés : plus stricte ; aucune contrainte.)
18. **Besoins.** Rendu : **les 12 besoins du guide**, au moins un par fiche.
19. **Question clinique.** Rendu : **identifiant `QC_…` maintenant**, liste
    fermée déclarée par la structure ; texte en clair dans la rubrique
    « question ».
20. **Statut réglementaire, renvois aux précautions.** Rendu : **reportés à
    BP-17**.
21. **`prescriptif` des claims.** Rendu : **non exigé** (régime des
    contradictions, D-046).
22. **Qui valide.** Rendu : **le responsable seul**, liste d'adresses en
    variable d'environnement, fermée par défaut. (Écarté : tout praticien.)
23. **Libellé de référence.** Rendu : **le plus récent validé** ; les autres
    « remplacé », sans acte automatique. (Écarté : un seul validé à la fois.)
24. **Place de l'écran.** Rendu : **avec la biologie** (page « Biologie
    fonctionnelle »). (Écarté : rayon de la Bibliothèque, recommandé.)
25. **TRUST et consignes.** Rendu : **relus avant le merge** de la PR du code.
    **Accord du responsable le 2026-10-16** : document TRUST, les deux
    consignes (`fiche-usage-v1`) et les modèles par défaut (rédaction
    `claude-sonnet-5`, contre-lecture `gpt-5.4`) approuvés en l'état.
26. **Restes de la revue.** Rendu : **les quatre corrigés avant la PR** —
    affichage des états, version dépassée, bancs sur base réelle, retrait
    symétrique des libellés.
27. **Bases locales d'essai.** Rendu : **supprimées**.

### Arbitrage de la première signature (rendu le 2026-10-16, D-314 §10)

Posé après le déploiement du code (#1498), structure vide. Fait établi :
chaque fiche ajoutée change l'empreinte, et une re-signature rend texte et
libellés « à relire » (arbitrage 15).

28. **Quand écrire et signer la structure.** Options : le fer seul
    maintenant (tout revalider à chaque dossier ajouté) ; fer et vitamine D ;
    fer, vitamine D, zinc et magnésium ; les huit analytes du besoin 2 (rien
    à l'écran avant le dernier dossier). Rendu : **fer, vitamine D, zinc,
    magnésium érythrocytaire**, signés en une fois ; B9 et B12, iode et
    sélénium par re-signature. Précise l'arbitrage 1. (Recommandé : fer et
    vitamine D.)

### Arbitrages de l'écriture de la structure (rendus le 2026-11-01, D-401)

Posés quand les quatre dossiers étaient clos, sur un inventaire des positions
signées et de leurs claims relus en production (tous `VALIDE`, `v1.0`).
Rendus par questions à options, tous sur l'option recommandée ; le détail est
dans D-401 §2.

29. **Découpage** : une fiche par position signée — et non par analyte et
    population, ni par analyte et usage.
30. **Axes de D-266 §3** : pré-remplis par l'assistant selon une règle
    écrite, corrigés par le responsable sur la surface.
31. **Rubriques** : `question`, `population` et celles des étiquettes des
    claims de la fiche.
32. **Fer P7 et P8** (aucun claim) : pas de fiche avant la re-signature
    suivante.
33. **Fer P4** (précaution) : dans la structure, marqueur sécurité posé.
34. **Hypothèses** : vocabulaire vide pour cette signature.
35. **Populations** : cinq identifiants, nommés par le responsable.
36. **Codes d'analyte** : celui du dossier seul.
37. **Claims contraires affichés** : épinglés.
38. **Claims cités en exclusion** : non épinglés.
39. **Renvois du zinc** : les douze claims désignés sans identifiant et le
    brouillon cité en P5 épinglés ; les autres brouillons non.
40. **Claims sans étiquette** : le claim hors parcours retiré, les deux
    autres épinglés.

## Périmètre

- La structure signée sous `web/src/lib/fiches-usage/` (identifiants
  seulement) pour toutes les fiches que le dossier de preuve permet
  d'écrire (1), ses entrées décisionnelles tracées, sa déclaration à la
  matrice de consommation, ses codes d'analyte vérifiés au catalogue ; la
  nature d'une valeur attendue, jamais la valeur (8).
- Le vocabulaire d'hypothèses (identifiants) et la liste fermée des
  populations d'usage (identifiants), signés dans la structure (7).
- La migration : `FicheUsageVersion`, `FicheUsageActe` (un acte par
  rubrique, 5), `FicheUsageLibelle` (vocabulaire : hypothèses et
  populations, 3, 12) et `FicheUsageLibelleActe` (11) ; texte et libellés
  liés à l'empreinte de la structure (10, 15) ; ajout seul, triggers, CHECK
  fermés (rubriques, 13 ; formats, 14), contrat négatif propre, joué au CI
  et par `wn-test-worktree.sh`.
- L'outil hors ligne de rédaction et de contre-lecture, sous `tools/`, sur
  le patron de `tools/corpus/fiches/` (4) ; son document TRUST et sa
  mention au dossier RGPD.
- La route interne d'ingestion des brouillons, les routes et l'écran de
  validation praticien, rubrique par rubrique (5).
- Le contrat de fraîcheur étendu à `fiches-usage/` (balayage et contrat
  SQL) ; le texte validé lié à l'empreinte de la structure, « à relire »
  dérivé à la lecture (10).
- Le hook DC-17 et ses bancs, étendus à la structure (critère de fin de
  F05), au verrou éteint compris.
- La décision du lot, D-314, qui étend D-251 (§4, §5) aux fiches d'usage ;
  la signature de la structure et la validation des textes (porte 23).

## Hors périmètre

- Toute surface patient, tout envoi, toute remise ; la rubrique
  « explication patient » (arbitrage 6 ; BP-18b, file C).
- Toute valeur clinique dans la structure (arbitrage 8 ; BP-27).
- La constante « fiches validées par séance » (arbitrage 9) : aucun
  plafond à l'écran.
- Les positions d'expert versionnées et l'arbitrage de conflit persisté
  (BP-12b) ; `conflitsSourcesV1` n'est pas re-signé ici.
- Le constat du praticien (BP-11), la boucle d'exploration et le choix de la
  question (BP-16), la table signée des questions par périmètre (cadrage v3,
  §3.3).
- La bibliothèque des options par hypothèse (BP-17), toute dose.
- L'évaluateur par marqueur et toute lecture de valeur (BP-27).
- Toute sélection d'une fiche d'après le dossier (étage assistant).
- `catalogueConduitesV1`, tout axe, tout tableau clinique.

## Fichiers probables

**PR 1, migration seule**

- `web/prisma/schema.prisma` (modèles neufs, sans `prisma format`) ;
  `web/prisma/migrations/2026…_fiches_usage_v1/migration.sql`.
- `web/prisma/checks/fiches_usage_v1_negatif.sql` ; son étape au CI
  (`.github/workflows/ci.yml`) et dans `scripts/wn-test-worktree.sh`.

**PR 2, code consommateur (après release-db constatée)**

- `web/src/lib/fiches-usage/` : structure signée, vocabulaire d'hypothèses,
  populations, invariants, lecteurs ; leurs bancs.
- Routes : ingestion interne sous secret, lecture et actes praticien
  (rubriques, libellés d'hypothèse) ; écran de validation.
- `tools/` : outil de rédaction et de contre-lecture, sa consigne, ses
  bancs (texte synthétique) ; document TRUST sur le modèle de
  `docs/TRUST_IA_FICHES_ASSIETTE.md` ; `docs/DOSSIER_RGPD.md` (rubrique 6).
- `claimsEpinglesFraicheur.guard.test.ts` (balayage) ;
  `rag_claim_fraicheur_tables_signees_v1.sql` et son négatif ;
  `importeursBiologyLibrary.guard.test.ts` (importeur nommé) ;
  `.claude/hooks/protect-wellneuro-files.{mjs,test.mjs}` ; matrice de
  consommation.
- `changelog.d/`, cette fiche, `CAMPAGNE.md` (D-314 est écrite avec cette
  fiche, avant la migration).

## Interdits

- Aucun texte de fiche, aucun libellé d'hypothèse, aucune population en
  clair, aucun contenu de claim au dépôt (D-251 §4).
- Aucune règle clinique, aucun seuil, aucune dose, aucune borne inventés ;
  aucune constante lue sans valeur posée par le responsable.
- Aucune validation par une machine ; aucune donnée patient dans une
  consigne.
- Aucun SQL destructif ; aucune écriture en production hors de la
  release-db approuvée ; aucun texte saisi en production par l'assistant.
- Aucune donnée patient réelle dans le dépôt (D-125).

## Tests

- Contrat SQL négatif : mise à jour et suppression refusées ; acte sans
  relecture refusé ; empreinte d'acte fausse refusée ; CHECK fermés.
- Structure : signature à cinq termes, aucune phrase, population présente
  pour chaque usage, codes d'analyte connus du catalogue, claims au format
  `identifiant@version`.
- Fraîcheur : un claim remplacé rougit le contrat (CI et préflight) ; une
  structure re-signée rend son texte « à relire » (arbitrage 10).
- Ingestion : un champ de validation est refusé. Actes : texte changé
  depuis l'affichage refusé ; une version à une rubrique non validée n'est
  pas valide (arbitrage 5) ; un libellé d'hypothèse non validé ne sort pas.
- Outil : désaccord des deux modèles ⇒ bloc exclu ; sortie passée au
  vérificateur DC-03, un verdict `ok: false` excluant le bloc (banc propre
  à l'outil : la garde de BP-01 ne balaye pas `tools/`) ; aucune donnée
  patient dans la consigne.
- Hook DC-17 : la structure déclenche « demande », verrou posé ou éteint ;
  mutation qui rougit.
- Paliers : T1 à chaque édition ; T3 avant la PR de migration ; T2 avant la
  PR de code ; `wn-reviewer` et passe Codex sur la migration et le module
  signé (D-266 §11).

## Critères de done

Release-db constatée (sentinelle, constat par conteneur) ; structure signée
par le responsable avant le merge de la PR de code ; textes et libellés
d'hypothèse validés par acte daté, constatés en agrégats par conteneur (la
clôture ; BP-11 n'attend pas ce constat, arbitrage 2) ; document TRUST et
mention RGPD versés ; hook DC-17 étendu à la structure ; contrat de
fraîcheur vert sur `fiches-usage/` ; T2 vert.

## Dépendances

LOT-07 (terminé) ; LOT-09 (terminé, porte 9) ; porte 8 (levée). BP-11
(LOT-11) et BP-12b (LOT-28) attendent ce lot. Rang 4 du plan (F05), file B ;
release-db après EF-3b, avant BP-11.
