### Accueil Observatoire LOT-04 — agenda praticien et rappels de rendez-vous (2026-07-23)

Le workflow rendez-vous, jusqu'ici différé, obtient son socle (campagne
`2026-07-23-accueil-observatoire`, gate migration confirmé par le propriétaire
le 2026-07-23) :

- **Modèle `RendezVous`** (migration additive `ao_rendez_vous_v1`) : objet
  opérationnel minimal — ni récurrence, ni notification, ni surface patient.
  L'annulation est un statut daté, jamais une suppression ; l'effacement de
  dossier emporte les rendez-vous nommément.
- **Écran agenda** : la maquette statique 4.0 devient un CRUD — planifier un
  rendez-vous (patient actif, date, heure, motif), voir la semaine groupée par
  jour, annuler. Bornes praticien et dossier clos respectées.
- **Cartes « Pré-vol prêt »** dans le Fil du jour : chaque consultation du jour
  remonte, horodatée, et ouvre la préparation du copilote (pré-vol SP-COP
  réutilisé). Elles passent en tête après les signalements ; la consultation à
  venir la plus proche devient la carte « Maintenant » ; le résumé du panneau
  affiche « N consultations » d'abord.
- Registre des différés mis à jour : R6 produit / E5 « socle rattaché » — le
  chaînage complet (Cal.com, assignation auto pré-consultation) reste différé.
