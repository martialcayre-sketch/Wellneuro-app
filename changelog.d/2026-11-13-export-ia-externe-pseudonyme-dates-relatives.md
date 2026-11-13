### Export pseudonymisé : un pseudonyme d'export à la place de l'identifiant, dates en jours relatifs, âge en tranche de cinq ans ([[D-512]])

Arbitrage du responsable du 2026-11-13 sur les points P1-2 et P1-3 de la revue de sécurité de l'export « Pour une
IA externe (pseudonymisée) » ; [[D-512]] amende [[D-252]] §2. Version « IA externe » seulement : la version complète
ne change pas. Aucune migration, aucun changement clinique ni du scoring.

- Pseudonyme d'export : `EXT-XXXXXX`, calculé par HMAC-SHA256 de l'identifiant sous le secret serveur
  `WN_EXPORT_PSEUDONYME_SECRET`, jamais stocké. Il remplace `PATnnn` dans la section 1, le titre, le pied de page, les
  métadonnées et le nom du fichier ; le tiroir l'affiche après le téléchargement. Sans secret configuré, l'export
  pseudonymisé échoue avec un message, sans retomber sur `PATnnn`. Le masqueur protège le pseudonyme et masque un
  `PATnnn` cité dans un texte libre.
- Dates administratives retirées : création du dossier, horodatage du consentement, accès du patient, date de clôture
  du suivi.
- Dates cliniques en jours relatifs : J0 = première consultation (à défaut, premier événement enregistré), puis J+n
  et J-n ; une date connue au mois ou à l'année près s'écrit en mois ou en années relatifs (M-3, A-1). Le préambule
  dit comment les lire. Date d'export au jour, sans l'heure ; métadonnées du PDF ramenées au jour.
- Âge en tranche de cinq ans (« 40-44 ans »), à l'affichage seulement.
- Registre RGPD : la ligne de l'export pseudonymisé est mise à jour.
- Exploitation : la variable `WN_EXPORT_PSEUDONYME_SECRET` (32 caractères au moins) est à créer sur Scalingo avant
  le déploiement, faute de quoi l'export pseudonymisé reste indisponible ; la changer change tous les pseudonymes.
