### Édition d'une synthèse IA avant validation, avec rechercher/remplacer (2026-07-27)

**Demande explicite** : permettre au praticien de modifier le contenu du
booklet avant signature (validation) et envoi, avec une fonction de recherche
de mot (occurrence suivante), remplacer et remplacer tout.

**Le défaut.** Une synthèse générée par IA (`Brouillon_IA`) ne pouvait jamais
être éditée : seulement validée telle quelle ou rejetée en bloc. Seule une
synthèse rédigée à la main (`Brouillon_Praticien`) passait par
`SynthesePraticienEditor`. Corriger un mot dans un texte par ailleurs correct
obligeait donc à tout rejeter et rédiger de zéro.

**Le correctif.** La garde PATCH `action:'enregistrer'`
(`/api/praticien/synthese`) accepte désormais aussi `Brouillon_IA`. Point
d'attention trouvé en cours de conception : la validation stricte du brouillon
praticien (`validerBrouillonPraticien`, bornes 4000/12000 caractères, 3 axes
max) écrase aussi silencieusement le champ `limites` par un texte générique.
L'appliquer à une édition de contenu IA aurait donc pu rejeter une correction
triviale d'un texte déjà plus long, et remplacer la mention de limites générée
par le modèle sans que personne ne s'en aperçoive. La branche IA utilise donc
la même coercion permissive que la génération (`validateSyntheseSchema`), pas
celle du brouillon praticien. Une synthèse validée reste verrouillée dans les
deux cas — seul l'état pré-validation change.

**Rechercher/remplacer.** Nouvelle barre d'outils dans `SynthesePraticienEditor`
(recherche insensible à la casse, sans regex, sur `resume_praticien` et
`narratif_patient` — le champ ciblé suit le focus). Occurrence suivante
(cyclique), remplacer, remplacer tout ; le résultat est toujours tronqué à la
longueur maximale du champ, le `maxLength` HTML du textarea ne bornant que la
frappe interactive, pas une valeur injectée par l'état React.

**Trouvé en revue adversariale (`wn-reviewer`), corrigé avant merge** : une
occurrence trouvée puis mémorisée pouvait devenir obsolète — après une frappe
manuelle dans le même champ, ou en changeant de synthèse sans fermer le panneau
de recherche — et un « Remplacer » ultérieur écrasait alors un empan de texte
qui ne correspondait plus au mot cherché. Corrigé par une revalidation de
l'empan au moment du remplacement (retombe sur une recherche fraîche si le
texte a changé) et un remontage de l'éditeur à chaque changement de synthèse
(`key={idSynthese}`).

**Validations** : T1 vert ; T2 vert (2132/2132 unitaires, 93/98 E2E — 5 échecs
confirmés faux positifs connus `portail-google`/`portail-lien-magique`,
pollution `.env.local` de worktree, reproduits identiquement sur deux runs) ;
revue adversariale indépendante (`wn-reviewer`) — NO-GO initial sur deux points
(positions de remplacement obsolètes, diff bruité par des fins de ligne CRLF
déjà présentes dans les fichiers commités avant ce lot), tous deux traités.
Aucune migration, aucune modification de seuil clinique.
