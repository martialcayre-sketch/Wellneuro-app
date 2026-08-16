# Handoff — 2026-08-16 — D-066 : cinq cognitifs réactivés, l'invariant « jamais de routine » rendu structurel

- **État** : PR-A du programme LOT-06 implémentée sur
  `feat/reactivation-instruments-comptes-completude`. T1 vert (1868 tests),
  T3 vert hors le rouge WebKit `D-049` (même signature, zéro requête réseau).
  `wn-reviewer` : **NO-GO → GO sous réserve → réserves soldées** (MAJ-1 à
  MAJ-5 et les trois mineurs traités dans la même PR). PR à ouvrir.
- **Décision** : `D-066` (registre) — trois volets : réactivation des cinq sur
  déclaration praticien « usage couvert » (patron EORTC, réserves de droits
  NON levées, au registre), publication des comptes de complétude par `had`/
  `sum_two_phases`/`francis` (+ consigne v26), et l'invariant structurel
  ajouté après revue.

## Ce que la revue a imposé, et qui est maintenant vrai

La première implémentation confiait « l'assignation est un geste praticien,
jamais un envoi de routine » à la vigilance d'écran. Après correctifs :

- **Packs** : 409 `questionnaire_consultation` au POST et au PATCH (ajouts
  seuls — un pack hérité reste éditable) ; le composeur ne propose plus les
  cinq ; `packs/assign` porte la ceinture jumelle (repli legacy compris) ;
  l'onboarding écarte et **journalise** (les deux routes).
- **Marquage de bout en bout** : sélecteur d'assignation (« — passation en
  consultation »), aperçu bibliothèque (impératif vrai, trois états de
  légende), file d'envoi (badge — c'était la dernière surface, celle du bouton
  réel), portail patient (« se remplit en consultation, avec votre praticien »,
  gardé par banc avec contre-épreuve).
- **`administrationMode: 'clinicien'` sur les cinq** — l'AQ et le QDRS ne
  l'avaient pas (informant-based : auto-remplis, ils répondraient à la place
  du proche, `DC-14`/`DC-28`). Banc dérivé de la population, auto-entretenu.
- **`alertMA` (5 mots) exige une phase 2 complète** : deux items sur cinq
  cotés 0 rendaient « évocateur de maladie d'Alzheimer ». Seule modification
  de sortie clinique du lot — elle cesse de se déclencher, jamais l'inverse.

## Risque résiduel, nommé et assumé (D-066 §3)

Le patient peut remplir seul à domicile malgré le bandeau — aucun logiciel ne
force la présence du praticien. Pour MMT/5 mots l'auto-remplissage détruit la
mesure ; pour AQ/QDRS il substitue le patient à l'informant. Le bandeau portail
est la seule protection au point de risque maximal ; il est garanti présent par
banc, pas garanti lu.

## Bloqué — connecteur MCP Supabase

`permission_error: Unable to verify organization membership`, persistant.
En attente de reconnexion de l'intégration dans claude.ai :

1. **Lecture MAJ-4** (avant merge idéalement, non bloquante depuis la
   ceinture) : `SELECT id_pack, qids FROM packs WHERE qids &&
   ARRAY['Q_GEO_03','Q_GEO_04','Q_GEO_05','Q_GEO_06','Q_NEU_06','Q_PED_02','Q_URO_02']`
   — vide attendu.
2. **Textes de claims pour PR-2** : `WN-CL-0178-055` (IgA sécrétoires —
   salivaire ou fécales ?), `WN-CL-0044-003` (classification ferritine),
   `WN-CL-0239-004/010` + `WN-CL-0154-054` (bornes vitamine D).

## Reste du programme

PR-2 (migration catalogue — transcription prête en scratchpad
`pr2-transcription.md` : 47 analytes, 15 panels, contraintes CHECK relevées
dont l'extension `µg/mL`), PR-3 (règles + signature + banc d'inertie RV-1 +
garde de forme RV-2 — les sept instruments sont maintenant tous déclenchables),
PR-4 (re-signature priorités, `shaPerimetre` ×4, date orientation ISO), PR-5
(dettes M-B, L-A, L-C/L-D).
