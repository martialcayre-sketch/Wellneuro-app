### Playwright CI : débloquer l’installation des dépendances Ubuntu (2026-11-11)

Le job E2E et le workflow des baselines remplacent le miroir Ubuntu Azure par
`https://archive.ubuntu.com/ubuntu` dans les sources du runner, sans changer
les suites, composants ni clés de signature. Le run `43049069649` était resté
près d’une heure à cette étape, sans lancer de test : le miroir Azure ne
répondait plus, à raison d’environ vingt secondes par paquet.

Les accès APT et l’étape d’installation sont bornés ; une mise à jour d’index
incomplète échoue. Le rapport Playwright reste obligatoire après les tests,
mais son absence n’ajoute plus un faux échec quand leur préparation a échoué.
Le banc des invariants CI vérifie les deux workflows et la conservation des
signatures et des dépôts tiers. Aucun réessai de test n’est ajouté.
