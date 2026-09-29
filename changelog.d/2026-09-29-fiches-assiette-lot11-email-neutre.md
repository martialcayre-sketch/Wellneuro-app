### Fiches d'assiette : l'e-mail neutre « Un document de votre praticien vous attend » (D-251, lot 11) (2026-09-29)

- **Sous `WN_FICHES_ASSIETTE_LECTURE`, toujours fermé.** Drapeau fermé, les
  fiches partent sous le drapeau d'émission, l'e-mail non.
- **Un e-mail par clic « Valider pour diffusion »** qui remet au moins une
  fiche, envoyé après le commit. Un double clic, qui ne remet rien la seconde
  fois, n'annonce rien. Un échec d'envoi ne défait pas le clic : il se lit sur
  la fiche du dossier, au registre des correspondances (`document_remis`).
- **Le texte ne nomme rien** : ni assiette, ni fiche, ni lien qui ouvre. Il
  donne la page d'accès et le chemin (« Accéder à mon parcours », puis « Ce
  que j'ai à faire aujourd'hui »). Gabarit `document_remis@1`, validé par le
  responsable le 2026-09-29.
- **Accès au portail révoqué** : aucun e-mail, et la trace le dit.
- **Le fil du jour ne résout plus le protocole servi** pour savoir quelles
  fiches sont à lire (`fichesALire`, revue du lot 10) : les contrôles restent
  rejoués, la mention « ne fait plus partie » reste calculée par l'écran.
