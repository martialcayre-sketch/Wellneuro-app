### Garde des flux Anthropic : un commentaire placé dans l'appel ne fait plus sauter le fichier (autonomie-pieges-restes, partie 5, 2026-11-17)

- Le tri ajouté par #2209 ne lisait que les fichiers où l'appel apparaît tel
  quel dans le texte brut. Un appel écrit `a.messages.stream/* x */(`
  n'apparaît pas tel quel : le fichier était sauté sans bruit. Avant #2209,
  le contrôle `incertains` le relevait (constat de PR-Agent sur #2209).
- Le tri lit désormais tout fichier dont le texte brut contient le mot
  `messages` et le mot `stream` ou `create`. Ce tri est sûr : le masquage
  remplace chaînes et commentaires par des espaces sans rien déplacer. Le
  banc prend environ 100 ms. Un témoin couvre ce cas.
