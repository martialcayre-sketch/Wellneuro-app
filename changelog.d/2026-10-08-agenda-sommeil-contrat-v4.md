### Agenda du sommeil — « Je ne sais pas » et repère « essayé de dormir » (contrat v4, D-271, D-272) (2026-10-08)

Campagne `2026-10-07-agenda-sommeil-adhesion`, LOT-04. **Modification
d'instrument** (Q_SOM_09), sous deux décisions : [[D-271]] et [[D-272]]. Aucun
seuil, aucune borne, aucun poids, aucun barème modifié ; aucune migration.

- **Repère du soir ([[D-272]])** : le patient donne l'heure où il **a essayé de
  dormir**, et non plus celle où il a éteint la lumière (item du Consensus
  Sleep Diary). La question de coucher et celle de l'endormissement s'y
  rapportent. Le patient qui s'endort lumière éteinte devant un écran avait
  jusqu'ici une réponse ambiguë.
- **« Je ne sais pas » ([[D-271]])** : une réponse pour l'endormissement et pour
  la durée des réveils, et pour eux seuls. La nuit part ; chaque métrique qui
  en aurait besoin (latence médiane, fréquences au-delà de 30 min, éveil
  nocturne, temps de sommeil et efficacité) la laisse de côté, sans jamais lui
  prêter de valeur. Elle compte pour la qualité, la régularité, le temps au
  lit et la couverture. Nouveau compteur `AGD_NB_NUITS_LAT`, affiché sous la
  latence médiane côté praticien.
- **Contrat `agenda-sommeil-v4`.** Un agenda garde le contrat de sa première
  nuit : ceux commencés en v3 s'y terminent, avec leurs mots et sans « je ne
  sais pas ». C'est le serveur qui l'applique, à l'écriture.
- Vue praticien : le chronogramme et les tuiles nomment le repère tel qu'il a
  été demandé (« Essai de dormir » ou « Extinction »), et l'infobulle écrit
  « Ne sait pas » sans dessiner de portion d'endormissement.
