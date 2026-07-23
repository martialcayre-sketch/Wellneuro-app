---
id: "2026-07-23-spirale-fiche-trajectoire"
titre: "SP-TRAJ — Fiche-trajectoire 5.0 : porte d'entrée, Spirale navigable, refonte Questionnaires & packs"
statut: "en cours"
créée_le: "2026-07-23"
mise_à_jour: "2026-07-23"
lot_courant: "LOT-03"
---

# SP-TRAJ — Fiche-trajectoire 5.0

> Cadrage issu de l'audit du 2026-07-23 (session « ux praticien spirale 5.0 »),
> plan approuvé par l'utilisateur le jour même. Constat déclencheur, vérifié
> dans le code ET en production (déploiement Vercel = main) : **l'entrée
> « Fiche-trajectoire » du rail pointe sur `/dashboard/patients`**, la page
> héritage « Patients & assignations » — la trajectoire réelle est enterrée au
> 3ᵉ niveau (liste → lien « Fiche patient » → onglet « Trajectoire »), et les
> éléments signature de la maquette (Spirale navigable, en-tête d'épisode,
> panneau mode de vie, momentum) n'y figurent pas.

## Décisions utilisateur (2026-07-23, actées au plan)

1. **Périmètre : tout en une fois** — Fiche-trajectoire conforme maquette ET
   refonte de « Patients & assignations », en une campagne multi-PR.
2. **Arbitrages revisités** : la courbe momentum (A6) et le repère cabinet
   (A6-2/SP-CAB) entrent au périmètre — révision **A6-R2** à écrire au
   `REGISTRE_FRONTIERES.md` dans le lot qui les livre (LOT-03), jamais avant.
   « Estimé ↔ mesuré » reste un panneau d'état « second temps » (HDS requis,
   aucun stockage, aucune donnée fabriquée).
3. **Porte d'entrée** : nouvelle page `/dashboard/trajectoires` (liste
   orientée trajectoire) ; « Questionnaires & packs » garde
   `/dashboard/patients`, refondu (formulaires en tiroirs).

## Sources normatives

- Maquette : `docs/claude/propositions/2026-07-15-wellneuro-5-0-spirale/maquette-artifact-reference.html`
  (écran `#p-trajectoire` — référence propriétaire depuis V14) ;
- `docs/claude/REGISTRE_FRONTIERES.md` (A5-R1, A6, A8 — A6-R2 à venir au LOT-03) ;
- Acquis SP-CONV à réutiliser, jamais réécrire : contrat d'épisode partagé
  (`lib/trajectoire-partagee/contrat.ts`), suture time-travel
  (`TrajectoirePanel` → `LectureEtatPassePanel`, asOf), gardes A8 de
  `lib/protocol/trajectoire.ts`.

## Frontières

- **Aucune migration Prisma** : tout le périmètre se sert des tables
  existantes (`AssessmentEpisode`, `QuestionnaireReponse`).
- Le score et les jalons restent la propriété de `lib/equilibre` ; les zones
  du référentiel sont lues depuis `Q_MOD_01.scoring`, jamais recopiées.
- Un jalon non mesuré est un trou visible, jamais un 0 (A8-2) ; aucune
  médiane ni delta inter-versions (A8-3, étendu à l'agrégat cabinet).
- Hors périmètre : portail patient (le Jardin), stockage biologie (HDS),
  météo d'adhésion (SP-MET), écoute ambiante (gate CNIL/RGPD).

## Lots

| Lot | Contenu | PR |
|---|---|---|
| LOT-01 | Fiche : deep-link `?onglet=` + en-tête trajectoire + Spirale navigable (`SpiraleEpisodes`) | PR-1 |
| LOT-02 | État daté enrichi : « Mode de vie — 7 domaines » (`Q_MOD_01`, zones du référentiel) | PR-2 |
| LOT-03 | Momentum en courbe (jalons mesurés seuls) + repère cabinet (n≥5) + « Estimé ↔ mesuré » + révision A6-R2 | PR-3 |
| LOT-04 | Porte d'entrée `/dashboard/trajectoires` + re-pointage du rail | PR-4 |
| LOT-05 | Refonte « Patients & assignations » → « Questionnaires & packs » (tiroirs) | PR-5 |
| LOT-06 | Preuve visuelle (baselines Ubuntu) + clôture | PR-6 |

Chaque lot = une PR verte seule (T1/T2/T3), revue et mergée par Copilot.
