---
date: 2026-08-05
heure: "11:30"
lot: plancher agi par l'orientation
branche: worktree-plancher-agi-orientation
statut: prêt pour PR
---

# Le plancher agi — quatre règles d'orientation rallumées sur un recueil partiel

## Où on en est

Le lot est écrit, T3 est vert trois fois, deux passes adversariales indépendantes ont
été passées et leurs deux NO-GO sont levés. `D-024` est écrite, le fragment de
changelog est posé, les deux fragments antérieurs qui affirmaient le contraire ont été
amendés. Reste : commit, PR, lecture du CI.

## Ce que le lot fait

Une règle d'orientation de type `zone` s'allume sur le `bandePlancher` de `D-021`
**si et seulement si toutes les bandes que le score final peut encore atteindre sont
dans la zone visée**. Quatre règles publiées entrent dans ce cas : `R-GAS-01`,
`R-SOM-01`, `R-STR-01`, `R-STR-02`. Aucune autre — vérifié par inventaire exécuté.

Le motif rendu au praticien, exemple réel :

> `Q_GAS_01 : au moins zone warning (« B — Troubles fonctionnels modérés à
> importants ») — recueil partiel, 23 items sans réponse sur 31`

## Les trois choses à ne pas défaire

1. **`valeur` et `interpretation` restent `null`.** Le plancher entre par un
   **troisième champ** d'`extraireCible`. C'est ce qui rend l'immunité des règles
   `type:'comparaison'` — `Q_MOD_01`, échelle inversée testée en `<=` — vraie *par
   construction* et non par relecture. Marquer `interpretation` d'un drapeau `garanti`
   remettrait le défaut en fail-open.
2. **La fermeture est dérivée de `ranges`**, dans `bandePlancher`, par `min` et jamais
   par index ni par couleur. Il n'existe pas de table d'ordre des couleurs, et il ne
   doit pas en exister : quatre instruments ont une grille inversée et plusieurs sont
   rédigées en `min` décroissant.
3. **Une fermeture incomplète n'est pas une fermeture.** Si une seule bande atteignable
   n'a pas de couleur exploitable — ou pas de `min` comparable —, la liste n'est *pas
   servie* et la règle s'éteint. La rédaction naturelle (filtrer ces bandes hors de la
   liste) **rétrécit** la fermeture et rend l'inclusion plus facile.

## Ce que les deux revues ont trouvé, et qui vaut plus que le lot

**La même leçon deux fois, sous deux formes.**

- Passe 1 — le point 3 ci-dessus était écrit à l'envers. Latent sur le catalogue
  actuel, donc invisible de toute suite verte. La passe 2 a ensuite **prouvé l'état
  atteignable** : une bande sans `min` numérique sort bien par le repli de plafond de
  `interpretRanges` (`questions.ts`, celui décrit pour `Q_MOD_01`). Le cas 9 du banc le
  visite désormais.
- Passe 2 — la branche `interpretation` portait un commentaire disant quel défaut son
  prédicat existait pour empêcher, et **aucun cas du dépôt ne pouvait le réfuter** :
  les deux seules zones `interpretation` posées sur un plancher valaient *exactement*
  la fermeture, donc la « réparation naïve » laissait la suite entièrement verte.
  Corrigé ; la mutation rougit maintenant sur deux cas.

**Un prédicat que rien ne peut réfuter n'est pas gardé.** C'est la troisième fois en
trois lots que cette classe se présente sous un visage neuf.

## Ce qui reste ouvert, nommé pour ne pas passer pour un oubli

- **L'audit ne distingue pas les deux comportements** : `orientationVersion` et
  `orientationSha256`, persistés avec chaque synthèse, couvrent maintenant deux moteurs
  pour la même table. Demande de versionner le moteur — autre lot.
- **La divergence gelé/recalculé change de sens** au lieu de disparaître : l'orientation
  peut proposer sur un plancher que le bloc `scores` gelé ne porte pas. `synthese-v16`
  en couvre un sens, pas l'autre.
- **`detail` n'est pas amputé comme `protocol`** : le `detail` de la bande `warning` du
  PSS-10 se termine par « stratégies de gestion du stress conseillées ». Il n'atteint
  pas le motif d'orientation (garde en place) mais voyage dans `scoresJson`.
- **Un trou de grille atteignable ferait mentir la fermeture** — inatteignable
  aujourd'hui (`Q_NEU_02`, items pairs), à rouvrir si une telle grille devient éligible.
- **Le dénominateur d'axe exclut les questions conditionnelles** : deux patients peuvent
  lire « sur 8 » et « sur 6 » pour le même axe.
- **Portée nulle sur l'existant** — `execute_sql` du 2026-08-05 : 10 passations sur les
  trois instruments, **aucune partielle**. Le lot est prospectif.

## Le lot suivant

**LOT-01 « Mon bilan »**, `docs/claude/campagnes/2026-08-04-reprise-chantiers-en-suspens/`.
Premier geste imposé par le lot lui-même : rebaser `feat/portail-bilan` sur `main`
(**78 commits d'écart**, base fin juillet, 16 fichiers +1103/−7) et **mesurer** avant de
décider reprise ou abandon. `schema.prisma` n'a pas `note_transmise` et a bougé depuis :
drift Prisma réel. Classe migration + clinique → T3, `wn-reviewer` avant de passer la
main, et vérification de la base **après** merge.

À traiter au passage : `ACTIVE_CAMPAIGN.md` et `.wn/state.json` disent `idle` alors que
le `CAMPAGNE.md` de cette campagne est `ouverte` — elle n'a jamais été enregistrée dans
l'orchestrateur.
