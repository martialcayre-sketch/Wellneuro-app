# AGENTS.md — Wellneuro NNPP2

Wellneuro NNPP2 est une application de consultation en neuronutrition **en
production**. Priorité absolue : sa stabilité. Le code applicatif est dans
`web/`.

## Les cinq interdits

Ils n'ont pas bougé depuis l'origine et ne bougeront pas. Leur violation ne se
rattrape pas — un secret poussé est un secret à révoquer, une donnée patient
commitée est une fuite, une migration lancée a déjà écrit.

1. **Aucun secret** en dur : clé, jeton, mot de passe, chaîne de connexion.
   Ne jamais lire, afficher ni modifier un fichier `.env*`.
2. **Aucune donnée patient réelle**, même rencontrée dans un fichier ouvert ou
   un log collé par erreur — ne pas la reproduire, ne pas la « compléter ».
   Seuls patients fictifs autorisés : Sophie Nicola, Jennifer Martin,
   Michel Dogné.
3. **Aucune migration** Prisma ou SQL, aucune modification de `schema.prisma`,
   aucune écriture Supabase sans demande explicite et confirmation distincte.
4. **Aucune modification de la logique clinique ni des seuils de scoring** sans
   demande explicite, source, et fragment dans `changelog.d/`.
5. **Changement minimal** : pas de refactor, de renommage ni de réorganisation
   non demandés. Les textes visibles par l'utilisateur sont en français.

## Où sont les règles complètes

Ce fichier est délibérément court. **Tout le reste vit ailleurs, en un seul
exemplaire :**

| Besoin | Fichier |
|---|---|
| Règles de travail complètes, validations, workflow PR | `CLAUDE.md` |
| Règles par type de fichier (clinique, Prisma, front, docs) | `.github/instructions/` |
| État du projet et contexte à jour | `docs/claude/PROJET_CONTEXTE.md` |
| Décisions structurantes, avec date et conséquences | `docs/DECISIONS.md` |
| Sécurité, RGPD, données de santé | `docs/securite_rgpd.md` |

## La règle qui garde ce fichier court

**Ne rien écrire ici qui soit déjà écrit ailleurs, et rien de datable** — pas
d'architecture, pas de liste de routes, pas de commande, pas de compteur, pas
de date. Ces choses changent ; leur copie ici ne changerait pas avec elles.

Ce fichier l'a appris à ses dépens : parti de 86 lignes décrivant
l'architecture, il a dérivé dix-sept jours durant en décrivant un état du dépôt
qui n'existait plus — tout en restant chargé par
`.github/copilot-instructions.md`, donc servi au relecteur des PR. Une règle
fausse lue par un agent est pire qu'une règle absente.

Le seul contenu admis ici est celui qui **ne peut pas dériver** parce qu'il ne
décrit rien : les interdits ci-dessus, et les renvois.
