### Document pour le médecin : tables de l'impression et du téléchargement (D-307, F38)

- Migration `documents_medecin_imprimes_v1` : deux tables en ajout seul. La
  première trace chaque impression confirmée, avec le HTML imprimé recopié et
  son empreinte. La seconde journalise chaque téléchargement du patient. La
  base pose l'instant et l'ordre, refuse une synthèse non validée ou d'un
  autre dossier, refuse l'impression par un autre praticien, et ne sert que la
  dernière impression. RLS sans politique ; contrat SQL négatif au CI.
- Effacement du dossier : les téléchargements, puis les impressions, partent
  avant les synthèses.
- Aucun code ne les écrit encore. La route d'impression, la ligne au Fil et
  « Pour votre médecin » au portail viendront après l'application constatée.
