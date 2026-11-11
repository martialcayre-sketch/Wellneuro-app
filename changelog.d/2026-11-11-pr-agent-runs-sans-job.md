### PR-Agent : preuve de revue face aux runs GitHub sans job (2026-11-11)

Le lecteur distingue un run sur commentaire encore `queued`, sans
conclusion et sans aucun job sur toutes ses tentatives, d'une commande
susceptible d'avoir réécrit la revue. L'API `jobs?filter=all` est lue après
les commentaires : zéro job est affiché, un job présent maintient le
blocage et une réponse illisible donne le code 2. Les commandes postées
sur la PR restent bloquantes ; les quatre conditions de D-393 demeurent.

Sur les mêmes réponses API de #1994, tête `70c9e8f8`, l'ancien lecteur
rend 1 et le nouveau 0. Quatre runs sans job y bloquaient la condition (d).
Leur état serveur n'est pas réparé : GitHub refuse l'annulation forcée
(409) et la suppression (403) du premier run examiné. Aucun changement
du workflow, des quotas ou des protections de branche.
