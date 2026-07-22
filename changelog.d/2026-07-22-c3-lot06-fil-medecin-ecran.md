### C3 LOT-06 — le fil de correspondance médecin, consignable depuis la fiche patient (2026-07-22)

Seconde PR du lot (la migration a voyagé seule) : le fil devient utilisable.
Le médecin n'accède à rien, l'application n'envoie rien — le praticien
consigne un envoi fait par ses canaux habituels et transcrit une réponse
reçue.

- **Route `GET`/`POST /api/praticien/correspondance-medecin`** : garde
  d'appartenance, refus portés par la route (D5). **Dossier clos = 409 pour
  les deux sens** — la correspondance est une pièce du dossier (FM-2) ; le
  chemin propre pour une réponse arrivée après clôture est rouvrir →
  transcrire → reclôturer. La lecture, elle, n'est jamais refusée : la
  clôture promet la lecture.
- **La consignation est inantidatable** : `consigneLe` n'est jamais transmis,
  la base pose le présent — invariant testé côté helper, route et composant.
- **Minimisation structurelle** : un `@` dans la désignation du médecin est
  refusé (`medecin_libelle_email`) — la promesse « aucune adresse e-mail »
  ne dépend pas de la discipline de saisie. Best-effort assumé : la vraie
  garantie reste l'absence de champ dédié.
- **TRUST : indicateur, pas garde** (décision utilisateur du 2026-07-22). Le
  partage a lieu hors application — bloquer la consignation rendrait le
  dossier aveugle sans protéger personne. L'écran affiche l'état du choix
  `partage_medecin_traitant` (nouveau helper pur
  `lib/trust/consentementPartage.ts`, dernier événement fait foi).
- **Onglet « Correspondance »** dans la fiche patient : fil du plus récent au
  plus ancien, formulaire (sens, désignation libre, texte, date d'échange
  facultative, synthèse référencée facultative avec dégradation silencieuse) ;
  une erreur de lecture propose « Réessayer », jamais un fil présenté vide.
- Référence de synthèse **souple** : validée au POST (404 identique pour
  inexistante et autrui), tolérée disparue en lecture (AC-5 de la revue de la
  PR de migration).
