### Corrigé

- **Le message d'orientation inactive donnait une raison fausse depuis le
  2026-08-04** (`D-076`) : « les règles NNPP2 ne sont pas encore validées »,
  alors que la table est signée depuis ce jour. La constante est servie dès que
  l'un OU l'autre des deux termes du verrou est faux — elle ne peut donc en
  nommer aucun. Elle dit désormais « Orientation non activée sur cet
  environnement. » Ce n'était pas une coquille : c'est la phrase qu'un
  praticien lit pour comprendre pourquoi son écran se tait, et elle l'envoyait
  vers « le contenu clinique n'est pas prêt » au lieu de « la fonctionnalité
  n'est pas ouverte ici » (`DC-34` : une explication fausse est pire qu'une
  explication absente).
