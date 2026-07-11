# WellNeuro — Collection d’évolutions produit 3.0 / 4.0

> Collection Markdown pour nourrir un moteur de développement, un agent IA de planification, des séances de brainstorming produit ou des prompts Claude/Codex.
>
> Ce dossier ne contient **pas de code** et ne demande **aucune migration**. Il formalise des intentions produit, UX, cliniques et techniques.

## Invariants projet

- Interface utilisateur en français.
- Vocabulaire prudent : « recommandation », « protocole personnalisé », « exploration biologique à discuter », « indice de suivi ».
- Éviter : « diagnostic », « ordonnance », « prescription automatique », « traitement prescrit par l’app ».
- Le praticien valide toujours avant diffusion patient.
- L’IA explique, reformule, hiérarchise et prépare ; elle ne diagnostique pas, ne prescrit pas et ne calcule pas seule.
- Patients fictifs uniquement dans les exemples : Sophie Nicola, Jennifer Martin, Michel Dogne.
- Pas de données patient réelles dans les maquettes, prompts, seeds ou captures.
- Pas de secret en dur.
- Aucune migration Prisma/SQL sans demande explicite et confirmation.
- Tout stockage de biologie réelle ou messagerie santé doit être pensé avec dépendance HDS.

## Fichiers

| Fichier | Rôle |
|---|---|
| `00_INDEX_STRATEGIQUE.md` | Vision d’ensemble et architecture fonctionnelle cible. |
| `01_JUMEAU_CLINIQUE_FONCTIONNEL.md` | Profil vivant patient, trajectoire, hypothèses fonctionnelles. |
| `02_PROTOCOLE_ADAPTATIF_21J.md` | Protocole 21 jours adaptatif, charge thérapeutique, décisions J7/J14/J21. |
| `03_GPS_ALIMENTAIRE_BOUSSOLE.md` | Évolution Boussole alimentaire : produit, panier, repas, semaine. |
| `04_MOTEUR_COMPLEMENTS_CLEAN_LABEL.md` | Bibliothèque compléments, cohérence nutraceutique, filtres qualité. |
| `05_BIOLOGIE_RAISONNEE.md` | Catalogue biologique, packs dynamiques, T0/T1, documents médecin. |
| `06_COMPAGNON_PATIENT.md` | Dashboard patient, actions du jour, check-in, parcours calme. |
| `07_MESSAGERIE_CONTEXTUALISEE.md` | Messagerie praticien-patient structurée, réponse assistée validée. |
| `08_MOMENTUM_DECROCHAGE.md` | Suivi longitudinal, momentum clinique, adhésion, risque de décrochage. |
| `09_DOCUMENTS_BOOKLETS_MULTI_DESTINATAIRES.md` | Booklets et documents dynamiques patient/médecin/praticien. |
| `10_COPILOTES_IA.md` | Architecture des IA spécialisées et règles d’encadrement. |
| `11_MATRICE_PRIORISATION_ROADMAP.md` | Séquençage recommandé, dépendances, lots et PR. |
| `12_PROMPTS_BRAINSTORM_DEV.md` | Prompts prêts à copier pour sessions IA ou agent de dev. |

## Usage recommandé

1. Lire `00_INDEX_STRATEGIQUE.md`.
2. Choisir un seul module.
3. Utiliser la section « Prompt agent dev » du fichier concerné.
4. Créer une branche courte par module.
5. Ne pas mélanger design, logique clinique, données et IA dans une même PR.
