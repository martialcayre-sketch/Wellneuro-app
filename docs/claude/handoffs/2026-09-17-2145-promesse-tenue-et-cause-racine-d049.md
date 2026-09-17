# Handoff — 2026-09-17 — La promesse tenue, et la cause racine de D-049

## État Git

`main` à `c6a38203` (#1181 mergée, 18:25:51Z). Branche
`wn-drapeau-trace-2026-09-17`, partie **nommément d'`origin/main`** : elle porte
la consignation de la pose du drapeau, plus la clôture de session.

⚠️ **Le checkout principal était sur `wn-session-2026-09-17`, qui n'existe plus
sur `origin`** (supprimée au squash) et affichait 19 commits fantômes. Un rebase
naïf les rejoue et conflit — c'est arrivé. L'ascendance ment après un squash ;
l'état de la PR fait foi.

## Objectif en cours

Campagne `2026-09-17-promesse-tenue-partage-medecin`, LOT-00 **livré**.

## Décisions prises

**Aucun numéro neuf** — deux amendements EN PLACE, sur arbitrage du responsable.

- **`D-222` amendé** : ses trois réserves fermées, plus une quatrième pièce
  qu'il n'avait pas vue (`consentement_suivi`, le texte lu au moment du
  consentement).
- **`D-219` §3 RENVERSÉ** : TRUST n'est plus un indicateur, c'est une garde.
  Le refus, le retrait **et le silence** ferment le courrier de biologie et la
  consignation à la main, dans les deux sens. La lettre d'adressage sur signal
  d'alerte en est l'**exception**, nommée au patient dans
  `donnees_confidentialite@v9`.
- Le coût du renversement est **assumé par écrit** : un partage hors application
  devient invisible au dossier ET au registre RGPD.

## Fichiers modifiés

Quatre textes patient (`registre.ts` v9 + `consentement_suivi@v3`,
`AvantDeCommencer.tsx` écran 3, la formulation de « Mes choix » sortie vers
`lib/trust/finalitesChoix.ts`), la garde (`consentementPartage.ts`) et trois
routes d'écriture, deux panneaux praticien, une migration additive, et les deux
amendements au registre.

## Validations

T1 vert, T2 vert (580 fichiers de banc, 205 E2E). **T2 a été rouge deux fois,
utilement** : `node:crypto` entré dans le bundle client par un module importé en
`'use client'` (les 9 661 bancs étaient verts — un banc unitaire ne voit pas un
problème de bundle), puis la garde mordant la fixture E2E sur Chromium ET
iPhone 13.

**Sept constats de revue, sept réels, zéro écarté à tort.** Six de Copilot, un
d'une session pair — et c'est ce dernier qui était le plus grave.

## Blocages ou risques

**Aucun bloquant.** Trois réserves nommées :

1. **La quatrième preuve du drapeau manque** : `trust/choix` et `trust/etat`
   relisent l'identité AVANT le drapeau, donc un appel anonyme rend 401 dans les
   deux états. Seule une session patient réelle verrait la différence.
2. **Un déploiement manuel non attribué** à 19:03:49 UTC, par le compte partagé
   `wellneuro`. Ce n'est pas cette session ; la question est posée au
   responsable.
3. **Le rouge WebKit du CI reste inexpliqué** — symptôme distinct (« WebKit
   encountered an internal error »), et les confondre est ce que la note du
   2026-09-07 interdit.

## Prochaine action exacte

**La session est close** — campagne close, état machine basculé, handoff et
journal écrits, ménage fait, PR de clôture #1183 ouverte. Cette rubrique
annonçait d'écrire l'amendement `D-049` et la PR de clôture : les deux sont dans
ce même changement. Constat de revue, corrigé.

**Un seul suivi réellement ouvert** : la montée de Playwright en 1.63.0, sur sa
branche `wn-playwright-163-d049`. Elle doit partir **avec la régénération des
huit baselines visuelles** par le workflow `visual-baselines.yml` — elles sont
toutes en `-linux.png` et ne se produisent pas sur un Mac. C'est cette PR qui
fermera `D-049`, pas celle-ci.

## Interdits actifs

- **Ne pas ajouter `retries` à Playwright** — c'est le contournement que
  l'amont recommande et que `D-049` interdit en toutes lettres : il
  transformerait ce blocage en succès silencieux et emporterait les vrais
  échecs intermittents.
- **Ne pas retirer ni réécrire le geste de transcription praticien** — deux
  frictions nommées par le responsable, lot de refonte en file.
- **Ne pas rouvrir le périmètre messagerie de santé** (`D-222` §4, fermé).
