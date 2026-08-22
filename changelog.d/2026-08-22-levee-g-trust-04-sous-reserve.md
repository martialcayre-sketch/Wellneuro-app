### G-TRUST-04 est levé — techniquement, sur l'état du code, avec une réserve unique (D-089, 2026-08-22)

Décision du responsable du traitement, au soir de la journée qui a exécuté
le cap [[D-085]] : le gate « sécurité et hébergement » est **levé le
2026-08-22**, au vu de l'état du code — hébergement et données chez un
hébergeur certifié HDS depuis le cutover (Scalingo, LNE 38436),
journalisation prouvée en production, purge des jetons dormants vérifiée
§C, mono-praticien arbitré avec condition de réouverture, procédures
d'incident exercées (runbook Scalingo, registre physique), revue de
sécurité jouée, triée **et corrigée le jour même**.

- **Réserve unique, nommée** : la signature de l'annexe HDS — une question
  de jours, à constater levée au plus tard au 2026-09-01 ([[D-080]]) ; à
  défaut, le 2026-10-21 (ancienne borne de dérogation) redevient point de
  contrôle. Pendant qu'elle court : aucune affirmation contractuelle
  d'hébergement HDS face au patient.
- La **dérogation du 2026-07-21 est remplacée** — l'écart n'est plus compté
  comme tel ; ses fondements de juillet (« pas d'HDS, pas de journalisation
  centralisée ») sont tombés, et le registre des gates le dit désormais.
- La dette `D-TRUST-03` est refermée sur ce périmètre ; la biologie réelle
  reste hors produit par choix de roadmap (Phase C), plus par le gate.
