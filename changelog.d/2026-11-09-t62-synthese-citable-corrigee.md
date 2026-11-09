### Objectif et résumé global : une synthèse corrigée se cite et se compte (D-469, t62, 2026-11-09)

Arbitrage `20261105-0937-d` du 2026-11-06 (audit d61) : « validée ou corrigée » partout. Amende D-167 §2 et §10,
s'applique à D-168 §1 à 4. Aucun seuil, aucune migration, aucune `release-db`.

- `Corrigee_Praticien` n'est produite qu'en annotant une synthèse validée, texte et date de validation inchangés.
  Les adaptateurs bornés de `lib/objectif` (`lireSyntheseCitable`, `lireSynthesesCitables`, `constaterOuverture`)
  étaient les seuls lecteurs à l'ignorer ; ils la citent et la comptent désormais.
- Effet assumé : si la première synthèse d'un dossier est corrigée, sa date de validation d'origine redevient la
  borne du second rideau. Constat en production du 2026-11-09, en agrégats : 2 synthèses corrigées dans
  2 dossiers ; la borne recule dans les deux ; aucun booléen d'ouverture ne bascule.
- Liste unique dans le module feuille `web/src/lib/synthese/statutsValidee.ts`, sans import, ré-exportée par
  `preconditionsT0.ts` sous son nom historique ; les adaptateurs ne tirent toujours aucun moteur clinique.
- Bancs : gardes de surface mises à jour ; banc neuf `syntheseCitableCorrigee.test.ts` sur table simulée
  (corrigée citée et comptée, première synthèse corrigée, brouillons et rejetées exclus, notes hors des sorties).
