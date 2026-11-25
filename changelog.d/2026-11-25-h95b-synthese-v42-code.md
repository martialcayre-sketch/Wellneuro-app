### Synthèse IA, biologie : consigne principale `synthese-v42` (D-563, H95 part B, 2026-11-25) — évaluée non conforme, non servie

- **Consigne principale** (branche seulement) : sur la base de `synthese-v41`, jamais servie (#2348 fermée), les textes 5 et 6 de D-563 §3 à la suite du texte 3 de D-559, le texte 7 en puce du narratif après celle de D-545 §5 (2), et l'exemple d'argument du contrat de sortie de D-563 §4. `VERSION_PROMPT_SYNTHESE` passe à `synthese-v42`.
- **Gardes** : textes extraits de D-563, place vérifiée ; empreintes de la section, de la consigne (drapeau éteint et posé) et du contrat reportées sur `synthese-v42`.
- **Banc d'évaluation** (`web/scripts/eval-d539/`) : repris de #2348 (dossier 25), il exige `synthese-v42` ; les paquets de lecture recopient aussi les réponses 1333, 1334 et 1335 de D-563 §2.
- **Évaluation** (D-563 §5) : **non conforme**, 17 générations en violation sur 75 (contre 34 sous `synthese-v41` ; constat au journal H95, fragment `2026-11-25-05`). La PR n'est pas déclarée « prête » ; `synthese-v39` reste en service.
- **Inchangés** : `synthese-biologie-v2`, le contrôle de D-545 §4, le drapeau `WN_SYNTHESE_BIOLOGIE_ENABLED` (éteint).
