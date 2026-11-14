### Bancs de garde : le cockpit de la bibliothèque des options gardé sur toute sa fermeture (2026-11-14)

Lot `garde-cockpit-fermeture` (file C), P3-a de `wn-reviewer` sur #2106. Le
banc `atelier-bibliotheque-options/cockpit.guard.test.ts` ne lisait que
`cockpit.ts` et ses imports directs. Une lecture du dossier glissée dans
`lecture.ts` le laissait vert, et `ecritures.guard.test.ts` aussi : ce
dernier ne voit que les deux tables de la bibliothèque. Le banc suit
désormais la fermeture résolue des imports de valeur du cockpit, sur le
patron d'`outillageBancs.guard.test.ts`. La fermeture doit être exactement
la liste admise, et le client de base n'y entrer que par `lecture.ts`. Aucun
fichier n'y accède à un autre modèle Prisma, au SQL brut ni au monde
extérieur, hors du drapeau. Des contre-épreuves l'éprouvent un et deux
niveaux plus bas, ainsi qu'avec le client généré en lien hors du dépôt.
Aucune liste admise d'un autre banc n'est modifiée. Ni migration, ni contenu
clinique.
