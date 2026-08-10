# Handoff — 2026-08-10 — LOT-00 : la clôture de l'agenda alimentaire

**Campagne** : `2026-08-10-chaine-alimentaire` · **Lot** : LOT-00 livré (2026-08-10)

## Livré

- `web/src/lib/agenda-alimentaire/cloture.ts` — `cloturerAgendaAli`, gabarit
  du jumeau sommeil : agrégats → pseudo-items `AGA_*` dérivés → 
  `QuestionnaireReponse` standard `scored:false`, idempotente sous verrou de
  ligne. Hors `index.ts` (l'index du domaine est pur).
- `web/src/app/api/praticien/agenda-alimentaire/cloture/route.ts` — POST
  praticien, appartenance + journal d'accès (G-TRUST-04), sans garde de
  drapeau (arbitrage LOT-05 étendu, écrit dans la route).
- Bancs : 14 cas de clôture + 6 de route ; liste D-039 épinglée à la main ;
  mutation « curation silencieuse » → 3 rouges, témoin vert.

## Ce que le lot a appris

- **La quarantaine impose un garde que le jumeau n'a pas** : clôturer avec
  des lignes illisibles transmettrait des agrégats sur recueil amputé — refus
  nommant les dates.
- `PSEUDO_ITEM_NB_JOURS` est le même nom dans les deux chemins (agrégats
  complets / repli sous seuil) — un banc l'assère, sinon la lecture
  idempotente du compte se casserait en silence.
- Le littéral de fixture élargit `nature` en `string` : le cast vers
  `JourAgregable[]` est dit en commentaire, pas caché.

## Résidus nommés (prochains gestes possibles)

1. Bouton « Clôturer » dans le lecteur praticien (l'API existe) + E2E.
2. Clôture automatique portail à J21 (le jumeau sommeil l'a) — décision
   d'activation à part, le recueil étant piloté.
3. LOT-01 (discordance rythme) : exige sa décision clinique D-xxx avant tout
   code.

## Palier

T1 vert ; Vitest complet 4 253 verts ×2 positions du drapeau ; E2E injouables
dans le conteneur distant (Chromium épinglé vs préinstallé, proxy) — la preuve
du palier est le job `verify` de la PR du lot.
