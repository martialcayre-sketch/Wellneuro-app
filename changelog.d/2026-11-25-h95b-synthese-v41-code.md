### Synthèse IA, biologie : consigne principale `synthese-v41` (D-559, H95 part B, 2026-11-25) — évaluée non conforme, non servie

- **Consigne principale** (branche seulement) : dans la section « Résultats de biologie », après le paragraphe de D-545 §5 qui ne change pas, les trois paragraphes de D-557 §2, chacun suivi du texte de D-559 §3 de même rang, puis le texte 4 en paragraphe neuf. `VERSION_PROMPT_SYNTHESE` passe à `synthese-v41` (`synthese-v40` n'a jamais été servie).
- **Gardes** : la section attendue se construit des citations de D-539, D-545, D-557 et D-559, sans recopie à la main ; un test vérifie la place de chaque texte ; empreintes de la section et de la consigne, drapeau éteint et posé, reportées sur `synthese-v41`.
- **Banc d'évaluation** (`web/scripts/eval-d539/`) : il exige `synthese-v41`. Il compte un 25e dossier fictif, qui porte une demande d'examen déclarée (D-559 §6, réponse `20261125-1220-b-h95`). Les paquets de lecture recopient en plus les réponses 1425, 1426, 1109 et 1130, tirées de D-559.
- **Évaluation** (D-559 §4) : **non conforme**, 34 générations en violation sur 75 (constat au journal H95, fragment `2026-11-25-03`). La PR n'est pas déclarée « prête » ; `synthese-v39` reste en service.
- **Inchangés** : `synthese-biologie-v2`, le contrôle de D-545 §4, le drapeau `WN_SYNTHESE_BIOLOGIE_ENABLED` (éteint).
