### Refonte Lien, PAT-6 (première partie) : dates de version et mentions en lettres, erreur au geste, état confirmé annoncé, 401 de lecture sur U35 (2026-11-14)

Code des choix Q1b, Q4a, Q5a, Q6a et Q7a du prototype PAT-6 ([[D-481]],
complément DOC-11), au feu vert du responsable du 2026-11-14. Q2a et Q3a
attendent la garde serveur du dossier de la page (Q8a, lot
`garde-portail-dossier-session`).

- Q1b : la date de version des documents d'information s'écrit en lettres
  (« publiée le 12 novembre 2026 ») dans `DocumentTrust` et dans les deux
  mentions de U37, par une seule fonction (`lib/trust/datePublication.ts`).
  La date calendaire se lit en UTC, sans glissement de jour ; dates
  canoniques, versions et textes signés inchangés.
- Q7a : les mentions « Ajouté par vous le » et « Confirmé par votre
  praticien le » de U35 et de la fiche de l'entrée passent en lettres, à
  l'heure de Paris comme avant. Libellés de [[D-335]] inchangés.
- Q4a : sur la page U35 seule, une lecture refusée en 401 renvoie à
  l'entrée ; une erreur réseau ou une lecture indisponible garde sa phrase et
  « Réessayer ». Un enregistrement refusé en 401 n'y est pas relu, pour ne
  pas emporter la saisie. La fiche de l'entrée (U07) ne change pas.
- Q5a : sur U35, le message d'un enregistrement en échec paraît dans la
  question, sur la ligne ou dans le formulaire concerné, au-dessus des
  boutons, une seule fois ; sur U39, dans l'accordéon du choix concerné.
  Textes et rôles inchangés.
- Q6a : après un enregistrement accepté par le serveur ET relu, une région
  `status` annonce l'état déjà affiché (la ligne et sa mention sur U35 ; le
  choix et son statut sur U39). Rien avant la confirmation, rien sur une
  relecture en échec, aucun texte neuf.

Aucune route, garde, drapeau, migration, règle clinique ni texte de
consentement, de droits ou de sécurité modifié.
