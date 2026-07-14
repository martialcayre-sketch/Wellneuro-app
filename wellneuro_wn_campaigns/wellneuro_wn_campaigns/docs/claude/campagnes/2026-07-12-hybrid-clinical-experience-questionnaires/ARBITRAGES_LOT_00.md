# ARBITRAGES_LOT_00 — HC-F

Arbitrages fondés sur l'audit réel (`AUDIT_UI_REEL.md`,
`MATRICE_ECRANS_MIGRATION.md`). **Validés par l'utilisateur le 2026-07-12**
(toutes les propositions ci-dessous ont été approuvées telles quelles).
LOT-01 reste néanmoins à autoriser explicitement séparément.

## 1. Pages de première vague

Proposition : `NavBar`/`SidebarRail`/`MobileBottomNav` (le rail lui-même),
`/dashboard` (accueil), `/dashboard/parametres`, `/dashboard/synthese`
(dette tokens Lot 0 à résorber), et l'ensemble du portail patient
(`portail/[token]/**`, hub, saisie/lecture seule).

Différé explicitement : `FichePatientPanel.tsx` (fiche patient) — base
réelle du futur cockpit C1, restylage prématuré tant que C1 n'a pas fixé
son contrat de données (risque de double travail).

## 2. Périmètre et déclenchement du mode consultation

Proposition : bascule via un bouton visible dans le header de la fiche
patient (`FichePatientPanel.tsx`), pas de raccourci clavier dans cette
première itération (ajoutable sans coût plus tard). Le mécanisme est une
enveloppe de mise en page, sans logique clinique propre (cf.
`CONTRATS_UX_P1.md` §1).

## 3. Stratégie de prévisualisation patient

Proposition : la prévisualisation réutilise le même composant que le
portail réel en mode lecture seule (pas un rendu HC-F séparé), pour
garantir qu'elle ne peut pas diverger silencieusement du portail réel
(cf. `CONTRATS_UX_P1.md` §3). Conséquence : la prévisualisation hérite
aussi du filtrage patient-safe — ce qui rend d'autant plus important de
corriger le point de risque signalé en audit §4 (`api/patient/reponses`)
avant de brancher la prévisualisation dessus.

## 4. Palette de commandes : livrée ou différée

Proposition : **différée**. `CAMPAGNE.md` LOT-02 est explicite : « une
palette partielle ou simulée ne doit pas être livrée » et la recherche
globale réelle n'existe pas encore dans le dépôt (aucune route de recherche
transverse identifiée pendant l'audit). Livrer une palette maintenant
demanderait soit de la simuler (interdit), soit de construire une recherche
globale hors périmètre de HC-F.

## 5. Capacités P3 explicitement différées

Reprises telles quelles de `CAMPAIGN_META.json` (non remises en cause par
l'audit, aucune n'a de code existant trouvé) : personnalisation dashboard,
recherche globale multi-module, visualisations complexes, CAT réel.

## Points hors arbitrage — décisions utilisateur actées

- **Contradiction `docs/design-system-d1.md`** (audit §6) : **tranché** —
  la version « tout clair + rail praticien sombre structurel » (§5 amendée)
  fait foi. Le tableau de traçabilité (praticien « sombre » partout) sera
  corrigé en conséquence lors de LOT-01.
- **Point de risque de frontière de données** (audit §4,
  `api/patient/reponses/route.ts` exposait `scoresJson` brut) : **corrigé
  immédiatement**, hors HC-F — la route ne renvoie plus que
  `titre`/`dateReponse`/`statutReponses` (le champ `scores` n'était de
  toute façon consommé par aucun composant client, `ConsultationScreen.tsx`
  n'affichait que titre/date). `type-check` et `check_no_secrets.sh` verts
  après correctif.
- **Captures de référence avant changement** : non produites (pas d'outil
  de capture navigateur disponible dans cette session). À produire via
  `npm run dev` + capture manuelle/Playwright avant LOT-02 si jugées
  nécessaires — reste ouvert, non bloquant pour clore LOT-00.
