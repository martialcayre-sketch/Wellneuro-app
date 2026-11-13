### Refonte Lien, PAT-4 (seconde PR) : plaintes et agenda alimentaire (D-488, D-481, 2026-11-13)

Seconde PR du lot PAT-4, sur l'itération 2 du prototype pour les plaintes (U12) et l'agenda alimentaire (U17), publiée le 2026-11-13 à la suite de la réponse du responsable (liste commune `20261113-1008-d`). C'est un habillage. Les questions, les options, les cotations, les conditions d'apparition et les règles d'enregistrement restent les mêmes. Aucune migration, aucun drapeau, aucun décor, aucun texte hors de [[D-488]].

- **Plaintes** :
  - Q3b : la dimension n'est plus précédée de son emoji, le libellé suffit. Le libellé enregistré et la donnée `icon` de `lib/plaintes.ts` ne changent pas.
  - Q4a : `writeDraft` rend le succès de l'écriture, comme `writeQuestionnaireDraft`. Après un échec, aucune confirmation ni heure antérieure ne paraît.
  - Q6a, T-36 : « Me reconnecter » paraît sous le seul refus HTTP 401 de la transmission.
- **Agenda alimentaire** :
  - Q12a (réponse du responsable du 2026-11-13, liste commune `20261113-1442-d`) : « C'est noté » reste actif sur une journée incomplète. Au clic, la consigne que le code prévoyait déjà (`MESSAGE_MANQUE_PRISES`, `MESSAGE_MANQUE_PRESENCES`) paraît au-dessus du bouton et vient dans la fenêtre par le plus petit défilement, sans déplacer le focus. Rien n'est envoyé. Poser ou retirer une prise efface la consigne devenue caduque. Le serveur refuse toujours une journée incomplète.
  - T-42a, T-42b, T-42c (« C'est noté », « C'est noté pour hier », « Corriger ») sans la coche, T-44a et T-44b (« Merci, à demain. », « Merci pour vos trois semaines ») sans emoji (Q3b). Les pastilles 🍽️ et 🍎 de la ligne de prises restent.
  - Q6a, T-36 : « Me reconnecter » paraît sous le seul refus HTTP 401 de l'enregistrement d'une journée. La journée en cours n'est pas gardée (Q7a) ; rien ne le promet.
