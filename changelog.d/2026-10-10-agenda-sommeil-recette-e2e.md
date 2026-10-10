### Agenda du sommeil — la recette locale versée en E2E (2026-10-10)

Campagne `2026-10-07-agenda-sommeil-adhesion`, LOT-08. Tests seulement : aucun
code applicatif, seuil, contrat ni libellé modifié ; patient fictif
`PAT_SEED_03` uniquement.

- **Praticien** (`e2e/agenda-sommeil-praticien.spec.ts`, nouveau) : le
  chronogramme est lu dans le SVG — chaque nuit court de son repère du soir à
  son lever, sur les graduations de l'axe, portions claires à leur place, tiret
  gris en tête quand le patient ne sait pas. Le test rougit sur le code d'avant
  le LOT-07, qui ne dessinait aucune barre depuis trois mois sans qu'aucun test
  ne le voie. Clôture : à six nuits, confirmation demandée et « Laisser
  l’agenda ouvert » n'appelle pas la route ; à sept, agrégation directe.
- **Patient** (`e2e/agenda-sommeil-saisie.spec.ts`) : ordre impossible refusé
  sans rien écrire, « je ne sais pas » envoyés sous v4, rappel proposé après la
  première nuit et fichier `.ics` sans lien ni mot de santé, carte renvoyée sous
  la frise dès la deuxième nuit, agenda v3 terminé en v3.
- Les deux projets les jouent, dont **WebKit au gabarit iPhone 13** : la saisie
  complète est désormais rejouée dans le moteur de Safari à chaque PR.
