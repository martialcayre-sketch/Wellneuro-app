### Protocole 21 jours — ce qu'une contre-revue adverse a trouvé avant la clôture (2026-09-16)

Vingt-six affirmations de la campagne « 5. Actions » ont été soumises à **réfutation**
avant d'être gravées dans sa clôture, sur le patron de `D-108`. **Six sont tombées**, et
quatre d'entre elles cachaient un défaut vivant en production.

**Le refus de registre anxiogène était invisible sur le chemin de révision.** L'alerte et
son bouton « Enregistrer ce texte tel quel » vivent dans le constructeur, masqué hors de
la sous-vue « protocole » — d'où ne part pas le geste « Appliquer les arbitrages ». Sur un
texte signalé, le praticien cliquait et **il ne se passait rien**. C'est le défaut du
booklet à l'identique : une garde confirmable dont la commande est inatteignable est une
garde bloquante déguisée.

**Deux chemins d'écriture ouverts sont fermés.** `POST /api/praticien/protocoles` est
retirée : aucun appelant, mais authentifiée et acceptant un protocole entier fabriqué par
le client avec sa propre empreinte, hors garde. `adviceSheetRef` est fermé à l'écriture.

**Le carnet alimentaire cesse d'affirmer une absence.** Il annonçait « Aucun protocole
diffusé pour ce patient » quand un protocole existait et que le portail refusait de le
servir. Il dit désormais ce qui est vrai, et le geste qui le répare. Le miroir de
diffusion juge les deux causes de refus par la **même fonction** que le portail.

Détail, verdicts et dettes nommées : `D-200`.
