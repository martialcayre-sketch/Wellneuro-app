### Audit 3, lot Q4 : un échec d'envoi se consigne toujours ; le signalement au praticien est tracé au dossier (D-398)

- Six chemins d'e-mail patient : invitation unitaire, pack, file d'envoi,
  accusé, rappel de questionnaire et bilan. La préparation du transport et
  du gabarit entre dans le bloc qui consigne l'échec. Une exception à cette
  étape s'écrit « Erreur » au journal `correspondances_patient`, avec son
  motif, comme un refus SMTP. Avant, elle ne laissait aucune trace.
  - Pour le bilan, l'audit `booklet_envois` est écrit lui aussi, et la route
    répond 502.
  - Pour le rappel, la route répond « Erreur » au lieu d'un 500. La trace
    porte désormais le motif, et la cadence la relit.
- L'e-mail de signalement au praticien est tracé au dossier sous le type
  nouveau `signalement_praticien`, ajouté au registre
  `TYPES_CORRESPONDANCE_PATIENT` :
  - objet : « Signalement déposé — courriel au praticien » ;
  - la ligne porte la sorte (`effet_indesirable`, `incident_confidentialite`
    ou `demande_droit`) et l'identifiant du signalement ;
  - elle ne porte jamais l'adresse du praticien, et le motif d'un échec est
    masqué, au journal comme dans le log d'exploitation ;
  - sans SMTP ou sans adresse, la ligne est écrite « Non envoyé ».
- Le panneau du dossier s'intitule « E-mails du dossier ». Sa description,
  son état vide et son erreur de lecture ne parlent plus du seul patient
  (textes validés le 2026-10-31).
- Aucune migration, aucun changement de schéma : `type` n'a aucune
  contrainte en production (lu le 2026-10-31).
- Bancs : sur chaque chemin, un transport ou un gabarit qui lève produit une
  trace « Erreur » avec son motif. Le signalement a son propre banc
  (`notification.envoi.test.ts`). Contre le code d'avant, les bancs des sept
  chemins rougissent (mutation : 13 cas en échec, aucun autre).
