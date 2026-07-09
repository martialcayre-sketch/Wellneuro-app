# Remplacement de la section R9 dans ROADMAP_AGENT_PLAN.md

Instructions : remplacer intégralement l'actuelle section
"### R9 — NeuroScore / Wellness Body Score" (section 4 du roadmap) par le
texte ci-dessous. Le renommage n'est pas cosmétique : "NeuroScore" et
"Wellness Body Score" ne doivent plus apparaître nulle part dans le
document après cette modification.

---

### R9 — Mon équilibre (indicateur patient / cartographie neuro-fonctionnelle praticien)

- 12 besoins fondamentaux répartis en 4 piliers (Nutritionnels, Somatiques,
  Sensoriels-émotionnels, Psychiques), regroupés en 3 strates pondérées
  pour le calcul et la visualisation : Corps 60 % (piliers 1+2), Ancrage
  20 % (pilier 3), Esprit 20 % (pilier 4). Équi-pondération à l'intérieur
  de chaque strate.
- Méthodologie de normalisation et de pondération **documentée et
  versionnée** (`versionScore`, analogue à `versionPrompt` : un v1 ne se
  compare pas à un v2).
- **Le score global n'est jamais une moyenne arithmétique.** Il est
  plafonné/modulé par les fondations critiques identifiées (sommeil
  effondré, carences objectivées, inflammation, instabilité glycémique,
  stress chronique, troubles digestifs). L'affichage privilégie toujours
  le profil par besoin aux creux mis en évidence plutôt qu'un chiffre
  unique sans contexte — jamais diagnostique (enjeu clinique ET
  réglementaire : éviter la qualification dispositif médical).
- Chaque donnée alimentant le score porte un **niveau de preuve** : A
  (questionnaires validés), B (référentiels neuronutrition), C (biologie
  fonctionnelle), D (hypothèses WellNeuro). Visible côté praticien.
- **Biomarqueurs réels hors périmètre V1** : le score est complet et
  livrable dès les questionnaires seuls, sans dépendance HDS/D6. Les
  biomarqueurs deviennent un mécanisme de raffinement ultérieur
  (T0 = questionnaires, T1 = ajustement biologique), pas un prérequis.
  Mécanisme de traçabilité T0/T1 à concevoir avant implémentation.
- **Suivi longitudinal (momentum)** : jalons T0/J21/J42/J90, traité comme
  objet à part entière du calcul, porteur de la dimension motivationnelle.
- Côté patient : un seul objet visuel synthétique sur l'écran d'accueil
  (indicateur circulaire "Mon équilibre"), aucune imagerie de dégradation
  (pas de rouge alarme, pas de noir/gris/fissures) — la progression est
  toujours montrée comme une construction. Écran détail séparé
  (`/patient/besoins`) avec visualisation des 12 besoins en sphères
  concentriques organiques, accessible depuis l'accueil, jamais imposé par
  défaut.
- Côté praticien : dashboard dense thème sombre, 5 objets cliniques
  (indice global, stabilité métabolique, réserve d'adaptation, clarté,
  momentum) et priorités des 21 prochains jours sourcées avec leurs
  niveaux de preuve.
- Contexte détaillé et arbitrages produit complets :
  `docs/claude/MON_EQUILIBRE_CONTEXTE.md`.

---

Vérifier également section 8 (consignes pour l'agent de plan) : aucune
modification requise, les consignes 3, 4 et 5 s'appliquent déjà à ce
chantier sans changement.
