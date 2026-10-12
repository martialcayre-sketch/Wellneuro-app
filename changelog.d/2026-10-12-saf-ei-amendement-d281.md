### Sécurité : la règle d'interruption sur effet indésirable est amendée avant sa signature (D-281, 2026-10-12)

- **Décision seule, aucun code** : `D-281` amende la règle `SAF-EI-01`
  ([[D-101]], `DC-42`), qui n'a jamais été signée. La production ne change pas :
  les signalements restent capturés et notifiés, rien ne s'interrompt.
- **Pourquoi** : éprouvée sur vingt cas fictifs (banc local, signature
  simulée), la règle livrée bloquait le dossier entier pour tout signalement
  rattaché, rattachait le programme entier plutôt que l'élément en cause,
  laissait « Je ne sais pas » sans effet et se levait sans motif. Zéro
  signalement en production au 2026-10-12 : aucun cas réel à relire.
- **La règle amendée** : le patient désigne un élément de son programme (ou
  « Je ne sais pas », ou « un autre produit », qui valent tous les
  compléments) ; l'élément passe en pause au portail sous deux textes signés ;
  aucun programme ne se diffuse avant la validation de l'implication par le
  praticien ; un élément impliqué ne repart jamais à l'identique ni augmenté.
  Aucune borne de durée, aucune gradation par la gravité déclarée.
- **Suite** : migration, formulaire et pause au portail, surface de
  validation et règle amendée avec son banc, puis signature (`D-281` §6).
- Renvoi ajouté sous `DC-42` dans `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md`.
