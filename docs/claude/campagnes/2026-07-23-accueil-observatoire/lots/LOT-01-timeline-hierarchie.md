---
id: "LOT-01"
titre: "Timeline, hiérarchie, résumé qualitatif, bandeau « Vues rapides »"
statut: "livré — PR #308"
dépend_de: ""
---

# LOT-01 — Timeline, hiérarchie, résumé qualitatif, bandeau « Vues rapides »

Statut : livré (PR de ce lot). Sans migration, sans nouvelle route API.

## Livré

- **Timeline** (`FilDuJour.tsx`) : grille heure | pastille-icône | carte avec
  axe vertical, conforme à la maquette Spirale (`.fil-time`/`.fil-dot`/
  `.fil-card`). L'heure vient de `libelleTemporel` (`lib/fil/horodatage.ts`) :
  heure réelle si l'événement date d'aujourd'hui, « hier », date courte,
  « — » sans date — rien d'inventé.
- **Carte imminente** (`indexCarteImminente`) : tête de l'ordre fixe tant que
  le Fil n'a pas d'heures de rendez-vous (le LOT-04 la raffinera). Badge
  textuel « Maintenant » (jamais la couleur seule, A5-R1), bordure accent,
  action primaire. Écarter la carte imminente promeut la suivante.
- **Résumé qualitatif** (`resumeFil`) : « 1 signalement · 2 relectures · … »
  remplace « N carte(s) » ; les agrégats comptent leurs lignes sources
  (`CarteFil.nbElements`).
- **Agrégat relectures PAR PATIENT** (`cartesSynthesesAValider`) : « N
  relectures en attente ». L'agrégat global de la maquette est impossible —
  le refus G1 est ancré sur un patient (FK). Clé
  `synthese_a_valider:agregat:<idPatient>:<dateRef ISO>` : une nouvelle
  synthèse déplace la date de référence donc la clé — la carte écartée
  **revient** (fait nouveau = nouvelle décision). Les refus par-synthèse
  déjà en base deviennent inertes (append-only, aucun nettoyage).
- **Bandeau « Vues rapides »** (`ui/VuesRapides.tsx`, monté dans `NavBar`) :
  Fil du jour · Trajectoire · Consultation · Correspondance, `aria-current`
  sur la vue active, desktop seulement (MobileBottomNav couvre le mobile).

## Vérification

- Vitest : `cartes.test.ts` (agrégat, clés, résumé, imminence),
  `horodatage.test.ts` (bornes de jour civil), `FilDuJour.test.tsx`
  (timeline, marqueur unique, résumé), `VuesRapides.test.tsx` (ordre,
  aria-current, exactitude de l'accueil).
- E2E existants inchangés (`article` et `data-testid` conservés) ; T2
  (`test:worktree -- --fast`) avant commit.
