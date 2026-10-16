### Conditions d'utilisation de l'espace patient : texte, accueil, page et filet au dépôt, sous drapeau éteint (D-292 amendée, ACT-1, PR 1)

- Nouveau drapeau `WN_PORTAIL_CONDITIONS`, **éteint à la livraison** : fermé,
  le portail est exactement celui d'avant. Sans migration.
- Registre TRUST : `conditions_utilisation` v1, les quatre textes
  d'information repris mot pour mot (`cadre_accompagnement` v1,
  `limites_securite` v1, `donnees_confidentialite` v18, `usage_ia` v8) puis
  la partie 5 « Quand ces conditions changent ». Un test compare chaque partie
  à la version courante de son texte et signale tout écart d'ici
  l'activation. Le rendu des documents titre les parties.
- Ouvert : à l'accueil, un nouveau patient majeur voit les conditions seules ;
  un patient déjà suivi ne voit rien ; un dossier mineur ou sans date de
  naissance garde l'accueil en trois textes.
- Page `/portail/[token]/conditions` : la version en vigueur et « J'en ai pris
  connaissance », accusé par POST au clic, jamais à l'affichage ; le centre
  « Informations, confidentialité et droits » y renvoie.
- Dépôt de compte rendu : l'accusé exigé est celui des conditions au lieu de
  celui d'`usage_ia` (D-292 §4, qui amende D-269 §6), présenté juste avant le
  dépôt. La route de lecture refuse la clé tant que le drapeau est fermé.
- D-292 amendée : cinq arbitrages du 2026-10-16 (lien magique existant,
  mineurs inchangés, envoi unique au cockpit, aucun rappel, phrase de 24 h à
  l'e-mail). La seconde PR porte le lien, l'envoi et le gabarit d'e-mail.
