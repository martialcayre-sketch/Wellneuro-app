### Fiches d'assiette : l'e-mail neutre « Un document de votre praticien vous attend » (D-251, lot 11) (2026-09-29)

- **Sous `WN_FICHES_ASSIETTE_LECTURE`, toujours fermé.** Drapeau fermé, les
  fiches partent sous le drapeau d'émission, l'e-mail non.
- **Un e-mail par clic « Valider pour diffusion »** qui remet au moins une
  fiche. Sa trace naît « Non envoyé » avec les remises, dans la même
  transaction ; l'e-mail part après, et la trace est mise à jour (`document_remis`
  au registre des correspondances). Un arrêt entre les deux laisse « non
  envoyé », jamais rien. Un double clic, qui ne remet rien, n'annonce rien.
- **Le praticien le sait** : avant le clic, la sous-vue Diffusion dit qu'un
  e-mail neutre suivra ; après, elle dit s'il est parti — un échec, une
  messagerie absente ou un portail fermé s'affichent en alerte, sans bloquer.
- **Le texte ne nomme rien** : ni assiette, ni fiche, ni lien qui ouvre. Il
  donne la page d'accès et le chemin (« Accéder à mon parcours », puis « la
  liste de ce que vous avez à faire »). Gabarit `document_remis@1`, validé par
  le responsable le 2026-09-29.
- **Portail fermé** (compte désactivé, accès révoqué) : aucun e-mail, et la
  trace le dit.
- **Le fil du jour ne résout plus le protocole servi** pour savoir quelles
  fiches sont à lire (`fichesALire`, revue du lot 10) : les contrôles restent
  rejoués, la mention « ne fait plus partie » reste calculée par l'écran.
- **Le drapeau d'émission est constaté par le comportement** (dossier de
  test, 2026-09-29).
