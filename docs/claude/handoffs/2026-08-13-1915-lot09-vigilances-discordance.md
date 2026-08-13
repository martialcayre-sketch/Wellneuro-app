# LOT-09 — Les discordances atteignent la synthèse : livré après un NO-GO de revue

- **Branche** : `claude/lot-09-campagne-t0`, vivante, partie de `0bee8c052390`
  (`origin/main`, LOT-05 mergé).
- **Campagne** : chaîne T0 opérationnelle. Lot actif LOT-05 → LOT-09. Le LOT-09
  est **hors chemin critique** : il ne dépend que du LOT-01 dont il referme la
  seconde moitié de l'étape 5, sans lot d'accueil depuis le 2026-08-12.
- **Décision** : `D-057`, **quatre** arbitrages (le quatrième ajouté après
  revue), au registre.
- **Production inchangée au merge** : `contradictionsActives()` exige le drapeau
  **et** `tableSignee()`, et `CONTRADICTIONS_METADATA.validationExterne` vaut
  `false`. La signature reste un acte praticien distinct.

## Ce que le lot livre

1. **Conversion** des constats ouverts en lignes de vigilance —
   `description` + `actionSuggeree` mot pour mot, plus `regleId` et
   `limitations`, en **deux points de vigilance**.
2. **Injection** dans `vigilanceDeterministe`, aux côtés de l'anamnèse, par la
   fusion existante.
3. **Garde de fidélité** : une discordance portée en tête et contredite par une
   affirmation de concordance ailleurs dans la prose est journalisée.
4. **Trois portes fermées par bancs** : patient, médecin, non-divergence.

## La revue a rendu NO-GO, et elle avait raison

Quatre défauts, dont trois que j'introduisais **en affirmant le contraire dans
la documentation**. À lire avant de refaire un lot de cette forme.

- **Le critère d'« ouvert » divergeait du moteur d'arrêt.** J'avais paraphrasé
  `statut !== 'resolue'` en omettant `forme !== 'CONVERGENCE'`, que le moteur
  applique avec un motif écrit juste au-dessus — pendant que la docstring,
  `D-057`, le changelog et l'**interdit de la fiche** affirmaient tous quatre
  une parité exacte. Une règle `CONVERGENCE` publiée aurait été servie sous
  l'intitulé « discordance » tout en laissant l'extinction possible.
  **Leçon** : « même critère que X » écrit en commentaire n'est pas une parité ;
  seul un prédicat partagé l'est. `contradictionEstOuverte` est extrait, les
  deux consommateurs l'appellent, un banc compare les prédicats.
- **Le garde accusait la prose FIDÈLE** — six phrases mesurées sur sept.
  « incohérent » contient « cohérent » ; « n'est pas confirmé par » contient
  « confirmé par ». Et ces écarts sont **persistés** dans `donneesEntree`, pas
  seulement journalisés. **Leçon** : un vocabulaire de marqueurs cherché en
  sous-chaîne est aveugle à la négation et aux préfixes privatifs — en français,
  la moitié des façons de dire une discordance nie un mot de concordance.
- **Un banc affirmait dans son titre l'inverse de son assertion**, et c'est lui
  qui masquait le défaut précédent. **Leçon** : un `it('ne signale rien…')` qui
  attend un écart se relit comme un contrôle négatif par le prochain lecteur.
- **Une discordance sortait du praticien** : convertie en chaîne, elle perdait
  son `audience: 'praticien_seul'` et héritait du destinataire médecin du bloc
  « vigilance ». **Leçon** : une audience portée par un TYPE ne survit pas à une
  conversion en `string[]`.

S'y ajoutent, du même passage : `regleId` et `limitations` restitués, scission
en deux points (730 caractères contre un plafond de 500 — l'enregistrement d'un
brouillon aurait été refusé sans nommer la cause), intitulé par forme,
traçabilité de la table dans `metadonneesPrompt`, code d'événement propre.

## Le piège trouvé avant la revue, et qui n'était pas dans la fiche

Le cockpit lit **toutes** les passations du patient ; la route de synthèse
travaille sur `reponsesAdministrables`, un sous-ensemble filtré que tout le
reste de la route consomme. Lui passer ce sous-ensemble aurait fait rendre au
même dossier moins de constats en synthèse qu'au cockpit — sans rien casser : la
synthèse serait restée valide, simplement plus pauvre, et une vigilance
manquante n'a personne pour la réclamer. `reponses` (non filtré) est déjà chargé
au-dessus. Le banc structurel est **vérifié par mutation**.

## Ce qui reste ouvert

- **Injecter la discordance dans la consigne de synthèse.** C'est le vrai
  mécanisme : un modèle qui la reçoit ne peut plus la contredire par ignorance,
  et le garde retrouverait son rôle de filet. Aujourd'hui sa portée est étroite
  et `D-057` le dit — le modèle n'a guère de raison de citer un identifiant
  d'instrument près d'une affirmation de concordance. Bump de consigne, donc
  hors de ce lot.
- **Signature de la table de contradictions** — acte praticien, seul déblocage.
- **Écart dossier ↔ épisode** (`D-050`) : reconduit, non aggravé.
- **Une vigilance déterministe reste supprimable par un `PATCH` de brouillon
  praticien** : préexistant, commun aux vigilances d'anamnèse, mais l'arbitrage 3
  parlait d'insuppressibilité — elle vaut à la génération, pas après réécriture.

## Validation

- **T1 vert** ; suite Vitest complète verte : **401 fichiers, 4 758 tests**.
- **T3 non jouable dans ce conteneur** : `wn-test-worktree.sh` commence par
  `npx playwright install chromium webkit` et la politique réseau refuse le CDN
  Playwright (403). Le segment E2E relève du Mac et du CI (`D-049`) — **il reste
  à jouer**.

## Prochaine action

PR, CI, merge. Après merge, contrôle en lecture seule : la table de
contradictions est toujours non signée, donc aucune vigilance de discordance
n'est servie.
