### ai, code : la première lecture est datée, le patient en est averti, le praticien la lit au dossier (D-297, 2026-10-18)

- **Portail** : « Votre lecture est datée » (texte validé de D-297 §4) en tête
  de chaque page qui consigne une lecture — bilan, synthèse, fiche d'assiette,
  courrier pour le médecin — et au-dessus du bouton qui ouvre le détail du
  protocole (protocole daté aussi, arbitrage du 2026-10-18). Dans « Mes
  échanges », le bloc remplace la phrase de D-293 §4.
- **Écriture** : `POST /api/portail/lectures` demande un jour à la création de
  l'accusé ; le trigger de la migration `20261018150000` en fixe la valeur
  (jour de Paris de l'horloge de la base). Une réouverture n'écrit rien.
- **Cockpit** : encart « Documents remis » en phase « Patient » — chaque
  version remise (bilan, synthèse, fiche, courrier, protocole), son jour de
  remise et « Lu le JJ/MM/AAAA », « Lu, date non enregistrée » ou rien. Route
  `GET /api/praticien/documents-remis`, seule surface praticien qui lit la
  table des lectures, sans compte ni agrégat.
- **Gardes** : `portailLecturesPatient.guard.test.ts` admet cette seule route
  et y refuse tout compte ; `lectureDatee.guard.test.ts` exige l'avis sur
  chaque appelant du POST.
- D-297 amendée (quatre arbitrages du 2026-10-18). Aucune règle clinique,
  aucun seuil, aucune relance.
