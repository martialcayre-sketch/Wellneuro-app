### Questionnaire des plaintes : « Suivant » n'ouvre plus la confirmation de transmission (2026-11-07)

Audit d'interface du 2026-11-07 (grille `ui-ux-pro-max`, constat n° 1), reproduit dans Chromium sur le composant réel. Dans `PlaintesForm`, « Suivant » et « Transmettre au praticien » étaient le même `<button>` sans clé : React le réutilisait et passait son type à `submit` pendant le clic, si bien que le navigateur soumettait le formulaire. La confirmation « Transmettre vos réponses ? » s'ouvrait dès l'arrivée sur l'étape 2, avant que le patient ait vu les trois derniers curseurs. Aucun envoi ne partait sans cette confirmation.

Correctif : une clé distincte par bouton, comme `SaisieNuitForm` le fait déjà pour le même piège. Le spec `portail-accessibilite-saisie` clique désormais sur « Suivant » et attend l'étape 2 sans dialogue.

Hors de ce lot : les curseurs qui partent à 5 sans distinguer une valeur touchée d'une valeur laissée relèvent d'un arbitrage clinique distinct.
