# Mesures — audit du corpus à la recherche de protocoles (2026-09-16)

*Annexe de mesure, pas un cadrage. Elle existe pour une seule raison : le travail
qu'elle consigne était **périssable**, et il allait mourir avec la session qui
l'a produit.*

## Ce qui a été mesuré, et sur quoi

L'extraction a porté sur les **492 documents extraits** du corpus de
neuronutrition (`canonical.md` par source, hors dépôt), dont **123 portent une
conduite de prise en charge identifiable**. Pour chacun : la famille du
document, la présence d'un protocole, le tableau clinique, l'indication, les
exclusions déclarées, la hiérarchie proposée, les actions avec leurs trois
plans, la biologie, les compléments, le suivi, les messages patient et les
« à ne pas faire ».

**Chaque champ extrait porte une ancre** — la phrase source qui le fonde. Les
1258 ancres ont été re-vérifiées une à une contre le texte d'origine : 1258 sur
1258 retrouvées.

## CE QUI RESTE HORS DU DÉPÔT, ET POURQUOI

Le fichier de sortie (1,4 Mo) contient des **extraits cliniques verbatim** de
notices dont les 507 entrées de `source_registry.json` sont toutes
`rightsStatus: to_verify` et `clinicalReviewStatus: not_reviewed`. Le gate G6
n'est pas ouvert. **Aucun extrait n'entre ici** : cette annexe ne consigne que
des **comptes** et des **identifiants de source**, tous deux déjà présents au
dépôt. C'est le même régime que les deux cadrages du même jour.

Le fichier brut vit dans le scratchpad de session (`audit_corpus.json`). Il est
reproductible : l'extraction se rejoue sur les `canonical.md`, et la
re-vérification des ancres est mécanique.

## Les comptes

**123 documents portant une conduite**, répartis en neuf familles :

| Famille | Documents |
| --- | --- |
| Fiche de synthèse | 29 |
| Fiche patient | 22 |
| Fiche protocole | 20 |
| Cours | 14 |
| Fiche outils | 12 |
| Arbre décisionnel | 9 |
| Instrument | 7 |
| Ordonnance commentée | 7 |
| Aliment vedette | 3 |

**107 des 123 portent un protocole complet** ; **107 portent une hiérarchie**
explicite entre leurs actions. **58 déclarent des exclusions** — les 65 autres
déclarent n'en avoir aucune, ce qui n'est pas la même chose qu'aucune exclusion.

**575 actions**, et elles couvrent **les dix types du contrat V4**, sans
exception :

| Type | Actions | | Type | Actions |
| --- | --- | --- | --- | --- |
| `food` | 145 | | `gentle_activity` | 46 |
| `chronobiology` | 94 | | `biological_exploration` | 37 |
| `calming_routine` | 77 | | `hydration` | 33 |
| `observation` | 60 | | `medical_referral` | 18 |
| `supplement_exploration` | 47 | | `advice_sheet` | 18 |

Autour des actions : **683 compléments**, **684 examens de biologie**, **514
« à ne pas faire »**, **297 messages patient verbatim**.

## LE CONSTAT QUI DÉCIDE DE TOUT LE RESTE

Les trois plans du contrat ne sont **pas** couverts également :

| Plan | Actions le portant | Part |
| --- | --- | --- |
| Idéal | 572 | **99 %** |
| Minimal | 109 | **19 %** |
| Secours | 110 | **19 %** |

**Le corpus donne le plafond, presque jamais le plancher.** Et le plancher est
précisément le champ que le patient lit : `projeterContenuPatient` sert
`minimalPlan` au patient, pas `idealPlan`. Un catalogue tiré du corpus tel quel
remplirait donc massivement le champ que le patient ne voit pas, et laisserait
vide celui qu'il voit.

## CE QUE CES CHIFFRES NE PROUVENT PAS — deux réfutations retenues contre l'audit

**1. « Trois actions est la taille native d'une conduite » est circulaire.**
Aucun des 123 documents ne porte 1 ou 2 actions dans cette extraction — mais
l'extraction a été cadrée sur un contrat qui en borne le nombre à 3
(`MAX_ACTIONS_PROTOCOLE_21J`). Le chiffre relit la règle qu'on lui a appliquée.
**Il ne fonde aucun arbitrage sur la taille d'une conduite.**

**2. « 123 tableaux cliniques distincts sur 123 documents » ne mesure rien.**
Le champ est de la **prose libre** de plusieurs centaines de caractères : deux
documents portant la même situation clinique produisent deux chaînes
différentes. Compter les distincts compte des rédactions, pas des situations.
Toute affirmation sur le nombre de tableaux cliniques réels demande une
normalisation qui n'a **pas** été faite.

## Ce que l'audit a trouvé, et qui n'est pas un compte

- **Une famille appariée jamais exploitée.** Douze fiches patient d'assiette
  (`WN-SRC-0296` → `WN-SRC-0307`) forment un ensemble structuré, indication par
  indication. Le contrat du protocole porte depuis l'origine un champ
  `adviceSheetRef` — **mort de bout en bout**, dette consignée au LOT-03 de la
  campagne « 5. Actions ». Le corpus porte les fiches ; le contrat porte le
  pointeur ; personne ne les a jamais reliés.
- **Trois documents, une même plainte, trois conduites différentes.**
  `WN-SRC-0315`, `WN-SRC-0316` et `WN-SRC-0317` traitent tous l'insomnie, et
  proposent trois conduites distinctes — parce que le **tableau** diffère
  (insomnie et dépression, insomnie et anxiété, insomnie récente sur stress
  modéré). Elles ne se contredisent pas : elles se départagent sur autre chose
  que la plainte. **Un axe clinique — « sommeil » — ne peut pas arbitrer entre
  elles.** C'est le fait le plus contraignant pour le choix de l'unité du
  catalogue.
- **L'aliment vedette est marginal dans la matière.** Trois documents sur 123
  relèvent de cette famille, et sur 575 actions, quatre seulement portent le
  domaine « assiette / aliment vedette » — contre **119 actions de domaine
  « assiette »**.
