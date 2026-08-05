### Agenda alimentaire — le lecteur praticien, sans passer par `execute_sql` (LOT-05 temps B)

Le pilote démarré le 2026-08-05 n'avait qu'un seul chemin de lecture :
`execute_sql`. Ce lot ajoute la route `GET /api/praticien/agenda-alimentaire`
(décalquée de `agenda-sommeil`, même ordre de gardes — session, identifiant
patient, appartenance AVANT toute lecture Prisma) et le panneau
`AgendaAlimentairePraticienPanel`, monté dans la fiche patient à côté de
l'agenda du sommeil.

Deux écarts délibérés au patron du sommeil, tous deux arbitrés en session :

- **La route n'est pas gardée par `WN_AGENDA_ALI`.** Le modèle de persistance
  est append-only (`D-015`) : les journées survivent à l'extinction du
  drapeau, et fermer le lecteur avec lui rendrait illisible une donnée déjà
  recueillie. Le drapeau continue de gouverner la bibliothèque, le hub
  patient et l'écriture — jamais cette lecture.
- **La réponse porte un compte `illisibles`** (lignes en quarantaine, au sens
  de `persistence.ts`), distinct des journées actives : un dossier de
  contrôle qui tait ses lignes en quarantaine ment par omission.

Le panneau affiche la couverture insuffisante en toutes lettres sous
`MIN_JOURS_AGREGATS` (7) journées — jamais une zone vide non expliquée — et
distingue les quatre rendus d'un champ `boolean | null | undefined`
(observation vraie, observation fausse, abstention explicite, non renseigné). Aucun score, indice, gramme, kcal ni quantité :
frontière déjà assertée par `agenda_alimentaire_v1.sql`, gardée ici côté API
et côté UI par des tests qui scannent la sortie rendue.
