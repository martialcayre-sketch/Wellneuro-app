### Document pour le médecin : impression tracée, ligne au Fil, « Pour votre médecin » au portail (D-307, F38)

- Page Documents, aperçu « Médecin traitant » : « Imprimer » demande une
  confirmation. Le serveur recompose alors le document depuis la synthèse
  validée, en enregistre l'instantané figé, puis l'écran imprime cet
  instantané. Ouvrir l'aperçu ne laisse toujours pas de trace.
- L'impression est refusée, sans trace, sur un dossier clos, ou si le patient
  a refusé ou retiré le partage avec son médecin traitant, ou ne s'est pas
  prononcé. L'accord est relu sous verrou au moment d'écrire.
- Le Fil de correspondance porte « Document pour le médecin imprimé le … ».
- Portail « Pour votre médecin », derrière `WN_DOCUMENT_MEDECIN_PATIENT`
  (éteint) : le patient télécharge la dernière impression, et chaque
  téléchargement est journalisé. Rien n'est servi tant que le partage n'est
  pas accordé.
- L'aperçu et l'impression partagent désormais la composition serveur des
  blocs, du nom et de la date. Une garde de tests nomme le seul module qui
  écrit dans les deux tables.
