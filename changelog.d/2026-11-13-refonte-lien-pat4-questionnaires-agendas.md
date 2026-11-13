### Refonte Lien, PAT-4 (première PR) : questionnaires, agenda du sommeil, observation alimentaire, message de sécurité dans la fenêtre (D-506, D-488, D-481, 2026-11-13)

Quatrième lot du plan patient de la refonte Lien / Empreinte, sur le prototype PAT-4, itération 2, arbitré le 2026-11-12 (`Q1b Q2d Q3b Q4a Q5b Q6a Q7a Q8a Q9a Q10a Q11b`, [[D-481]] complément DOC-7). Le responsable a donné le feu vert du code le 2026-11-13 (« Oui, les deux »). C'est un habillage, plus l'amendement clinique de [[D-506]]. Les questions, les options, les cotations, les conditions d'apparition et les règles d'enregistrement restent les mêmes. Aucune migration, aucun drapeau, aucun décor (Q10a), aucun texte hors de [[D-488]]. Les plaintes (U12) et l'agenda alimentaire (U17) suivront dans une seconde PR, après la réponse du responsable (liste commune `20261113-1008-d`). Le brouillon de l'observation alimentaire sur l'appareil reste au lot Q5b ([[D-507]]).

- **Message de sécurité** ([[D-506]], amende [[D-277]] §1, Q1b) :
  - À chaque apparition, résumé compris, `MessageReponseSuicide` vient dans la fenêtre par le plus petit défilement (`scrollIntoView({ block: "nearest" })`), et seulement s'il n'y est pas entièrement.
  - Le focus ne bouge pas. En mouvement réduit, du système ou du réglage patient, le défilement n'est pas animé.
  - L'effet ne court qu'au montage du message. Un nouveau rendu, le passage d'une réponse positive à une autre ou le défilement du patient ne le relancent pas ; un retrait puis un nouveau choix positif, si. Le code traite aussi comme une apparition le retour sur une page qui porte déjà la réponse positive (retour arrière, « Vérifier cette partie », reprise d'un brouillon) : cette lecture est soumise au responsable (liste commune `20261113-1035-d`).
  - Le texte, l'emplacement, la règle de déclenchement et `role="alert"` ne changent pas, à l'entrée comme dans les questionnaires.
  - Les titres focalisés du résumé et des micro-lots le sont sans défilement, pour ne pas chasser le message de la fenêtre.
  - Un E2E (`portail-message-securite.spec.ts`) mesure le vrai composant au téléphone, au zoom 200 % et en confort 112,5 %, en Chromium et en WebKit (réserve Q11b). La mesure sur téléphone réel reste due.
- **Avancement** (Q2d) : « N réponses sur M », compté sur les réponses renseignées, remplace « N % complété » de la saisie par parties.
- **Brouillon des questionnaires** (Q4a) : `writeQuestionnaireDraft` rend désormais le succès de l'écriture. Après un échec, aucune confirmation ni heure antérieure ne paraît. Les textes « sur cet appareil » ne changent pas.
- **Session expirée** (Q6a, T-36) : « Me reconnecter » paraît sous le seul refus HTTP 401 de la transmission d'un questionnaire, et sous ceux de l'enregistrement d'une nuit et de la transmission de l'agenda du sommeil. Le lien mène à `/portail/connexion`, dans le même onglet. Aucun retour direct au questionnaire n'est promis.
- **Textes acceptés** ([[D-488]], DOC-7) :
  - Réponses transmises : T-40, et la date d'envoi en lettres, en heure locale (Q8a).
  - Agenda du sommeil : T-41a, T-41b et T-42a sans emoji décoratif (Q3b), T-43a à T-43e sans emoji, T-48h avec l'apostrophe typographique. La clé `gt60` ne change pas, et la vue praticien du chronogramme lit le même libellé. Les échelles de réponse en emoji restent.
  - Observation alimentaire : T-48a à T-48g avec une espace insécable avant « ? » et « : ». Les dates lues par le patient sont en lettres et en heure locale (Q8a). Les dates enregistrées ne changent pas.
