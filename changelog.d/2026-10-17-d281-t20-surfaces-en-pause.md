### Portail et cockpit : la Boussole, la fiche d'assiette et l'aperçu praticien d'un élément en pause restent servis, marqués « en pause » (D-281 §2, fiche t20, sans migration, 2026-10-17)

- **Le trou** : la pause sur effet indésirable n'était marquée que sur la
  liste des actions de l'accueil du portail. Trois surfaces l'ignoraient : la
  Boussole alimentaire (résumé et lecture détaillée), les fiches d'assiette
  remises (liste et lecture) et l'aperçu « Vu par votre patient » de l'écran
  de diffusion. Elles auraient montré comme actif un élément en pause.
- **L'arbitrage du responsable du 2026-10-16** : ces surfaces restent servies et
  lisibles, marquées « En pause » avec le texte signé de l'élément (D-281 §4),
  jamais masquées. Aucun texte neuf.
- **Le mécanisme** : `pausesParReference` (module pur) reporte sur la
  référence d'une action (l'aliment d'une Boussole, l'assiette d'une fiche) la
  pause de cette action. Quand plusieurs actions portent la même référence,
  l'état le plus précis l'emporte. Les pauses viennent toutes de
  `pausesServies`, qui rend `[]` tant que la règle amendée n'est pas signée.
  **Aucun effet avant M-1.** Les routes concernées :
  - `api/portail/protocole` sert `boussolesEnPause`, hors de la vue signée ;
  - `api/portail/boussole/[foodRef]` sert `pause` ;
  - chaque fiche d'assiette porte `pause` ;
  - le GET de `api/praticien/protocoles/diffusion` sert `pauses` sur la
    version de l'aperçu, et seulement quand l'aperçu est servi.
- **Les pannes** : une panne de lecture des pauses ne sert jamais une surface
  sans sa marque. La fiche et le zoom de la Boussole rendent leur erreur ; le
  GET de la diffusion cache l'aperçu (`apercu: null`) et garde le reste de
  l'état. Un protocole servi illisible ne désigne aucun élément : la fiche
  reste servie, sans mention ni marque, et l'accueil du portail, sur ce même
  protocole, ne sert rien.
- Aucune migration, `schema.prisma` inchangé. La garde de diffusion reste
  inerte jusqu'à la signature.
