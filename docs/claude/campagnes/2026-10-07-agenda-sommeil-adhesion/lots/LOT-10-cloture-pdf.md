---
id: "LOT-10"
titre: "De la clôture au dossier exporté — l’endormissement « Non calculé », jamais 0"
statut: "terminé (2026-10-10, #1386)"
dépend_de: "LOT-08"
---

# LOT-10 — De la clôture au dossier exporté

## Constat

Le LOT-08 a nommé un trou : aucun test ne reliait la clôture d’un agenda au
rendu du dossier exporté pour la médiane d’endormissement (`AGD_LAT_MED`). La
chaîne n’était prouvée que maillon par maillon (agrégat nul, rendu « Non
calculé » des réveils, préambule), et le texte d’un PDF ne se lisait pas en CI
(`pdftotext` absent).

## Ce que le lot verse

Tests seulement : aucun code applicatif, seuil, contrat ni libellé modifié ;
patient fictif `PAT_SEED_03` uniquement.

- **`web/e2e/helpers/textePdf.ts`** — lit le texte d’un dossier exporté tel
  qu’il est dessiné, sans outil externe : flux de page décompressés par
  pdf-lib, chaînes hexadécimales WinAnsi des polices standard, fragments de
  même ordonnée recollés en ligne. Lecteur volontairement étroit : une forme
  qu’il ne lit pas fait manquer le texte attendu, donc rougir le test, jamais
  un faux vert.
- **`web/e2e/agenda-sommeil-praticien.spec.ts`** — deux tests, sur les deux
  versions de l’export (`ia-externe`, `complete`) :
  - sept nuits « je ne sais pas » pour l’endormissement, clôturées depuis le
    panneau : le libellé paraît une fois, suivi de « Non calculé : données
    insuffisantes », jamais de 0 ; et la qualité moyenne (4) paraît, preuve
    que la même clôture a bien agrégé — « Non calculé » s’écrit aussi pour un
    agrégat qui manque ;
  - le témoin : sept nuits « en moins de 15 min » font écrire « Latence
    d’endormissement médiane : 8 min ». Sans lui, une médiane toujours « Non
    calculé » laisserait le premier test vert.
- Le lecteur échoue avec un message explicite s’il ne lit aucun texte.

## Validation

- Spec praticien en local contre le build de production : 10/10 (Chromium
  bureau et Chromium au gabarit iPhone 13).
- Revue adverse en deux angles (lecteur et faux verts ; conventions, isolation,
  WebKit) : un constat majeur, vérifié — « Non calculé » ne distinguait pas une
  médiane absente d’agrégats jamais écrits (repli de `cloture.ts` sur le seul
  nombre de nuits) ni d’une clé perdue. Corrigé par le témoin de qualité et le
  test à endormissement connu. Mineur écarté : un banc unitaire propre au
  lecteur — l’E2E le couvre, et le lecteur échoue désormais en le nommant.
- T1 complet ; CI (WebKit compris).

## Origine

Écrit par une conversation parallèle de la même session cloud, interrompue
par un redémarrage du conteneur avant sa validation ; repris, vérifié et
versé ici sur décision du responsable (2026-10-10).
