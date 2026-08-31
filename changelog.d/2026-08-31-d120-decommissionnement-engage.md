### Le décommissionnement D-080 s'engage : validation expresse, un jour d'avance acté, drapeau CB régularisé (2026-08-31)

Le responsable a validé expressément l'exécution du décommissionnement
complet Vercel/Supabase (`D-120`), avec une anticipation d'un jour actée sur
le terme de `D-080` — la production Scalingo constatée saine le jour même,
après résolution le soir même d'un incident de performance (saturation
mémoire des conteneurs, redimensionnement S→M et borne de tas V8, hors
dépôt). L'ordre d'exécution protège le point de non-retour : gestes
réversibles d'abord (domaine et intégration GitHub détachés du projet Vercel,
qui déployait encore en fantôme), suppressions ensuite avec preuve
d'effacement capturée au moment de chaque geste et consignée en rubrique 12
du dossier RGPD. L'inventaire a établi qu'« activer les fonctions dépendantes
de HDS » ne recouvre aucun geste de code — l'unique fonction gatée (biologie
réelle, Phase C) reste hors produit par roadmap — et a révélé
`WN_CB_RESULTS_ENABLED` posé en production sans trace, en écart avec
`D-081` : retiré le 2026-08-31 (geste inerte, zéro appelant).

Écarté : poser le moindre drapeau au titre de cette validation (aucun code ne
les lit) ; toute confusion avec `SAFETY_EI_METADATA` (`DC-42`), signature
clinique sans lien avec HDS.
