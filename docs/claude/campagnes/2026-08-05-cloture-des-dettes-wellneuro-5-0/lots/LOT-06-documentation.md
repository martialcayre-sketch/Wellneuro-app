---
id: "LOT-06"
titre: "Dettes psychométriques et exigences RGPD"
statut: "livré"
dépend_de: "aucun"
---

# LOT-06 — Prouver que la règle enregistrée est la bonne, et avancer le dossier RGPD

## Ce que le cadrage du 2026-08-07 a corrigé

Ce lot a été rédigé le 2026-08-05. Confronté au dépôt deux jours plus tard, il
portait six faits périmés ou faux. Ils sont corrigés ici, et la correction fait
partie du livrable : un lot qui vise un état qui n'existe plus fabrique du
travail à côté.

| Ce que le lot annonçait | Ce que le dépôt dit |
|---|---|
| « onze notices manquantes » | **10** instruments en `statutBibliographique: a_completer` |
| « escalade SIIN du 2026-07-25, sans réponse » | **l'escalade existe et reste ouverte** — `web/src/lib/questionnaires/gerontologie.ts:49` et l'entrée `Q_GEO_04` du registre l'écrivent. Ce qui est introuvable, c'est sa **trace datée** : aucune pièce ne porte la démarche du 2026-07-25 ni de relance. Elle porte les **bandes HAS 2011**, pas les droits — la réserve de droits, distincte, porte sur **PAR** (MMSE/GRECO). Et Q_GEO_04 a été **arbitré le 2026-08-03** : verrou maintenu, catalogue inactif, aperçu praticien autorisé |
| `docs/claude/CHECKLIST_ACTIVATION_G_TRUST_04.md` | chemin faux → `docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md` |
| test à créer : « aucune notice vide sans raison » | **existe déjà** — `scripts/lib/verifier_registre_instruments.js` refuse un `a_completer` dont le `motifBibliographique` fait moins de 40 caractères |
| gate « arbitré le 2026-07-22 » | décision du responsable datée du **2026-07-21**, bornée au 2026-10-21 |
| exigences 5, 6, 7 « à avancer » | leur **chantier de code est livré**, mais le tableau du gate les porte toujours **⚠️ partielles**, réserves non levées. Le seul trou que *ce lot* pouvait combler est le **dossier RGPD** ; l'exigence 7 (pentest, revue externe) reste entière |

**Deux numérotations se ressemblent dans le fichier de gate, et le lot les
confondait** : le tableau « exigences 1 à 7 » (5 = journalisation, 6 = réponse
aux incidents, 7 = tests de sécurité) et la liste « Ce qu'il resterait à faire »
(item 7 = dossier RGPD). Le « 7 » visé par ce lot est celui de la **seconde**.
Toute mention doit désormais dire « exigence N » ou « item N du reste-à-faire ».

## But

Deux dettes de nature documentaire mais à effet juridique, réunies parce qu'elles
partagent la même exigence : produire une **preuve opposable**, pas une intention.

**Volet psychométrique.** Le projet prouve très bien que le code reproduit la
règle enregistrée. Il prouve mal que la règle enregistrée est la bonne version,
scientifiquement et juridiquement utilisable. L'écart est déjà nommé (#560, « ce
que “certifié” ne dit pas »). État exact au 2026-08-07, mesuré sur
`docs/claude/corpus/instrument_registry.json` : **65 instruments**, dont
60 `scoring_verifie`, 2 suspendus terminaux (Q_FIB_03 fermé, Q_PED_03 arbitrage
clinique ouvert), Q_SOM_09 en `droits_verifies`, Q_GEO_04 en
`contenu_verrouille`, 1 en `repere`.

**Volet RGPD.** Le gate G-TRUST-04 n'est pas « en attente » : il a été **arbitré
le 2026-07-21** — rester sur l'hébergement actuel, borner la phase de test au
2026-10-21, ne pas instruire de migration HDS dans cette campagne. Des trois
chantiers qu'on croyait ouverts, **deux ont déjà leur code livré** — ce qui
n'est pas la même chose qu'être satisfaits, et le tableau du gate les porte
toujours **⚠️ partiels** :

- **exigence 5** (piste d'audit) — table `journal_acces_dossiers`, écriture
  branchée sur 22 routes GET. **Reste** : la preuve fonctionnelle en production,
  qui attend un usage réel, et l'absence d'écran de consultation ;
- **exigence 6** (violation de données) — `docs/PROCEDURE_VIOLATION_DONNEES.md`,
  écrite **et exercée sur table** le 2026-07-22. **Restent** : la confirmation
  par un conseil qualifié et le registre physique des violations ;
- **item 7 du reste-à-faire** (dossier RGPD) — **absent**. C'est le seul
  livrable neuf de ce lot.

**L'exigence 7 du tableau** (tests de sécurité : pentest, revue externe) reste
entière et hors de portée d'un lot : elle attend un prestataire.

## Résultat observable

- Le lot ne repose plus sur un fait faux : les six écarts ci-dessus sont
  corrigés dans ce fichier même.
- `docs/DOSSIER_RGPD.md` existe : quatorze rubriques, chacune **sourcée dans le
  dépôt** ou **marquée TROU** avec porteur et échéance, plus un tableau
  récapitulatif des trous. Aucune valeur juridique inventée.
- Le statut COSMIN est **assumé inconnu**, une fois et pour l'ensemble, avec la
  raison écrite.
- Les résidus des exigences 4 à 7 du reste-à-faire portent chacun une note qui
  dit s'ils attendent un lot ou une action humaine externe.

## Périmètre

- `docs/DOSSIER_RGPD.md` (créé) et les renvois qui y mènent.
- `CHECKLIST_ACTIVATION_G_TRUST_04.md` : notes sur les items 4 à 7.
- Registre des questionnaires : la note COSMIN globale, dans
  `docs/claude/corpus/README.md`.
- Ce fichier de lot.

## Hors périmètre

- **Lever le gate G-TRUST-04** — hors mandat de cette campagne, et le dossier
  RGPD ne s'y substitue pas.
- **Rédiger l'AIPD** — elle est nommée comme absente, elle n'est pas écrite ici.
- **Trancher la contradiction sur le DPO** (G-TRUST-02 dit « pas de DPO »,
  `DECISIONS.md` D-005 dit « confirmé par le DPO le 2026-07-27 ») : exposée,
  pas résolue.
- Biologie réelle, documents de laboratoire, dispositifs connectés, captation
  vocale : tous subordonnés au gate.
- Rouvrir Q_FIB_03 (fermé définitivement) ou Q_PED_03 (suspendu ; rouvrir sur
  usage seulement, avec le scoring dimensionnel complet, jamais la somme brute).
- Toute modification de seuil.
- **Toucher `instrument_registry.json`** : une édition y bascule `docs_only` et
  déclenche build et E2E complets pour une phrase de prose.

## Fichiers probables

- `docs/DOSSIER_RGPD.md` (neuf)
- `docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`
- `docs/claude/corpus/README.md`
- `docs/securite_rgpd.md`, `README.md`, `AGENTS.md`, `docs/ROADMAP_TECHNIQUE.md` (renvois)
- `changelog.d/2026-08-07-lot06-dossier-rgpd.md`

## Interdits

- Aucune donnée patient réelle.
- Ne **jamais** inventer ni « compléter » une référence bibliographique : une
  notice absente reste absente, avec sa raison.
- **Ne jamais écrire une base légale, une durée de conservation ou un article du
  RGPD plausibles.** Une valeur inventée dans un dossier RGPD est pire que son
  absence : elle se cite.
- Pas de modification de seuil ni de bande.
- Pas de migration.

## Étapes

- [x] Corriger les six faits périmés du lot.
- [x] Écrire `docs/DOSSIER_RGPD.md` — sourcer ou marquer TROU, rubrique par rubrique.
- [x] Poser les renvois vers ce dossier.
- [x] Noter, dans la checklist du gate, ce qui attend un lot et ce qui attend une action externe.
- [x] Assumer COSMIN inconnu, une fois, avec la raison.
- [x] T1.

## Tests

- Contrôle de cohérence du registre : **déjà couvert** par
  `scripts/lib/verifier_registre_instruments.js` (`a_completer` sans motif
  ≥ 40 caractères refusé, vocabulaire COSMIN fermé). Rien à créer ; il n'est
  d'ailleurs pas rejoué, le JSON n'étant pas touché.
- Relecture ciblée du dossier RGPD : aucune rubrique ne porte de valeur non
  sourcée ; chaque TROU a un porteur et une échéance ; le mot « conforme »
  n'apparaît nulle part.

## Critères de done

- [x] Les six faits périmés sont corrigés dans ce fichier.
- [x] `docs/DOSSIER_RGPD.md` existe, avec ses quatorze rubriques et son tableau de trous.
- [x] COSMIN : inconnu assumé, raison écrite, une fois pour l'ensemble.
- [x] Les items 4 à 7 du reste-à-faire portent leur note « lot » ou « externe ».
- [x] Rien n'affirme, nulle part, que le gate est levé.

## Résultats

Livré le 2026-08-07. T1 vert (269 tests, aucun secret détecté).

**Ce que le lot laisse dans le dépôt.** `docs/DOSSIER_RGPD.md` (315 lignes,
quatorze rubriques, quinze trous datés et portés), quatre renvois qui y mènent,
quatre notes sur les items 4 à 7 du reste-à-faire du gate, la note COSMIN, et ce
fichier remis d'aplomb.

**Ce que la revue adversariale a rattrapé, et qui vaut d'être retenu.** Le
cadrage avait conclu que l'escalade SIIN de Q_GEO_04 était « introuvable dans le
dépôt ». C'était faux : `web/src/lib/questionnaires/gerontologie.ts:49` et
l'entrée `Q_GEO_04` du registre l'écrivent noir sur blanc, et le registre précise
même qu'elle « reste OUVERTE ». Ce qui manque, c'est sa **trace datée** — aucune
pièce ne porte la démarche du 2026-07-25 ni de relance. **Une absence de trace
n'est pas une absence de fait**, et un cadrage qui prétend corriger des faits
faux est exactement l'endroit où cette confusion coûte le plus cher.

La même revue a rattrapé une seconde formulation : « exigences 5 et 6 faites »
mettait la réserve en queue de phrase alors que le tableau du gate les porte
⚠️ partielles. Sur un document à effet juridique, l'ordre des mots **est** le
fond.

**Les trois trous découverts à l'écriture** — information sur l'écart
d'hébergement non consignée, fournisseur SMTP non identifié, Sentry
sous-traitant de fait non déclaré aux personnes — n'étaient nommés nulle part
avant ce lot. Ils sont désormais portés, avec échéance.
