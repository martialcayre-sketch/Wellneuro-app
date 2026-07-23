### SP-CONV — stabilisation des baselines visuelles avant leur premier commit (2026-07-23)

La relecture du premier jeu de baselines (workflow `visual-baselines`) a
attrapé deux pièges avant qu'ils n'entrent au dépôt : la capture du
cockpit figeait un état transitoire (« Chargement de la proposition… »),
et les écrans à texte temporel (phrase de reprise en mois, dates du Fil)
auraient dérivé avec le calendrier. Correctifs : la capture du cockpit
attend l'état posé du runtime (« indéterminée » reste légitime —
Réévaluation sans épisode est un état stable) ; la comparaison au pixel
est réservée aux quatre écrans sans texte dépendant du temps (cockpit,
tiroir, patients, porte du portail) — le Fil et le hub gardent capture de
revue + snapshot ARIA.
