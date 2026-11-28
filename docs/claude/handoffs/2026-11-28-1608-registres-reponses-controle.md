# Handoff — registres-reponses-controle : le contrôle des registres lit la collection `reponses` (2026-11-28)

## 1. Branche et état Git

- Branche `chore/registres-reponses-controle`, tirée d'`origin/main` à 8390f5ea (#2414) dans le worktree
  `.claude/worktrees/orch-ci`. La branche de la partie 22 (`chore/autonomie-pieges-partie22`) n'a pas été
  avancée : son lot est clos.
- Commit tardif, juste avant le push (D-518).
- Démarrage : `merge_fait` de #2408 (`20261128-0907-integrateur-d-2408`) passé à `traite`. La ligne du carnet
  `autonomie-pieges-restes` est bien à `fait` (4e7e876f). Le lot `registres-reponses-controle` (rang 98, voie
  Mac) a été pris au carnet le 2026-11-28 à 15:01Z.
- Boîte D : deux lignes attendent un geste du responsable et ont été laissées telles quelles :
  `20261128-0811-orchestrateur` (`besoins-recherche-g10`, réseau cloud), déjà `lu`, et
  `20261128-1437-orchestrateur` (`besoins-recherche-hierarchie`, #2415, avance de branche refusée par D-518),
  encore `emis`.
- Report du cockpit (règle « Le report », au démarrage) : la ligne `reponses`
  `20261125-1005-d--20261125T130513-vseh` (file D, `ordinaire`, source `cockpit`, `par` présent) était
  `envoyee`. Elle a été reportée dans la question `20261125-1005-d` (`statut: repondue`, `reponse_par:
  responsable, par le cockpit`, `reponse_le` = le `le` de la ligne), puis passée à `reportee`.

## 2. Objectif

Fiche du carnet : `wn-registres.mjs` et `scripts/lib/registres.mjs` lisent la collection `reponses`. Ils
contrôlent les lignes (champs, source `cockpit`, `par`) et rendent l'action due « réponse `envoyee` sans
report » quand la liste commune ne la reflète pas. Règles transcrites de `docs/ROLES_MACHINES.md`, rien
d'ajouté. Le travail est strictement additif. T1 seul.

## 3. Décisions prises

- **`reponses` est facultative** (`COLLECTIONS_FACULTATIVES`) : `COLLECTIONS` ne change pas, parce que
  `wn-superviseur.mjs` l'importe. Sans dossier, elle va dans `lu.nonExportees` et pas dans `absentes`.
  Un manifeste qui ne la déclare pas n'est en écart que si elle est exportée. Déclarée, elle se confronte
  comme les autres.
- **Une ligne `envoyee` à écarter est une action, pas une anomalie.** Une ligne `reportee` que la règle
  écartait (sans `par`, autre source, `migration`, question encore ouverte) est une anomalie. Une ligne
  `ecartee` sans `motif` n'est qu'un avis : la règle dit « avec son motif » mais ne nomme pas le champ.
- **Actions** : la plus récente des lignes valides d'une question l'emporte (règle « Le report »).
  - `reponse_sans_report` : la question est ouverte ou en séance. Si la ligne est clinique, l'action
    rappelle `profiles`, puis `D-xxx` et `changelog.d/`.
  - `reponse_reportee_non_marquee` : la question reflète déjà la réponse (même `reponse`, même
    `reponse_le`, `reponse_par` du cockpit).
  - `reponse_a_ecarter` : question déjà `repondue` ou `close` avec une autre réponse, `migration`, sans
    `par` ou d'une autre source.
  - `reponse_remplacee` : les lignes plus anciennes, seulement quand la plus récente est reportable.
  - `reponse_a_verifier` : question absente de l'export, ou plus récente non reportable.
- Les imports de `wn-orchestrateur-passe.mjs` (`BOITES_FILES`, `SANS_NOUVELLES_MS`) n'ont pas changé.

## 4. Fichiers modifiés

- `scripts/lib/registres.mjs` : `ETATS_REPONSE`, `SOURCE_REPONSE`, `REPONSE_PAR_COCKPIT`,
  `controlerReponses`, `actionsReponses`, `analyser` (comptes et actions `reponses`).
- `scripts/wn-registres.mjs` : `COLLECTIONS_FACULTATIVES`, `lireExport` (`reponses`, `nonExportees`),
  `lireManifeste`, `rendre`, sortie JSON `non_exportees`.
- `scripts/lib/registres.test.mjs` : énumérations confrontées au texte de la règle, et quatre cas neufs
  (conforme, anomalies, actions, CLI facultative avec manifeste).
- `docs/ROLES_MACHINES.md` (§ « Le contrôle des registres ») ; `changelog.d/2026-11-28-registres-reponses-controle.md` ;
  ce handoff.

## 5. Validations exécutées

- `node --test scripts/lib/registres.test.mjs` : 24 sur 24. Rejoués aussi verts :
  `scripts/wn-superviseur.test.mjs` et `scripts/wn-orchestrateur-passe.test.mjs`.
- Quatre mutations, toutes rouges après ajout d'un cas : remplacement forcé, `reponse_le` non comparé (il
  survivait au premier passage, cas « même texte, autre heure » ajouté), avis `ecartee` retiré, écartement
  sans `par` ou d'une autre source retiré. Fichier restauré à l'identique (`cmp`).
- Export réel des quatre collections, dans le bloc-notes et jamais au dépôt : les cinq lignes `reponses`,
  toutes `reportee`, ne lèvent ni anomalie ni action. Les autres anomalies relevées sont antérieures à ce
  lot et étrangères à `reponses`.
- T1 complet (`npm run check`) : joué avant le commit, résultat dans la PR.

## 6. Problèmes ouverts

- La question `20261125-1005-d` est maintenant `repondue` (cadrer une voie Mac automatisée et bornée). Sa
  suite n'est pas inscrite : le lot de cadrage décrit dans l'option retenue n'est pas au carnet. C'est au
  responsable ou au guichet de l'inscrire. Le contrôle la rendra en `question_sans_suite` d'ici là.
- Le nom du champ du motif d'une ligne `ecartee` n'est pas écrit dans la règle (`motif` est supposé, d'où
  l'avis). À fixer dans `ROLES_MACHINES.md` si le responsable le veut.
- Hérités, hors de ce lot : `banc-codex-tmpdir-course` (rang 131), `journal-erreur-routes-patient` (rang 132),
  `superviseur-protection-fusion` (99), puis `gh-rest-rerun-check-runs` (101, après 99).

## 7. Prochaine action exacte

1. T1 complet à 0, commit, push, PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond.
2. `node scripts/wn-revue-pr-agent.mjs <N>` → 0, verdict pour chaque focus area, puis relire la boîte D et
   les `reponses` de la file D, puis « prête @<sha> » sur la PR et au registre (boîte `integrateur`). Plus
   aucune écriture sur la PR ensuite (D-546).
3. Lot suivant de la file D au carnet : `superviseur-protection-fusion` (rang 99).

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`.
- Ne jamais supprimer une ligne des registres. Pas de compaction du journal (gel `D-372` §2).
- `orchestrateur/arret` : seule la parole du responsable le change.
- Aucune adresse de page privée dans le dépôt. Horodater en lisant l'heure système.
- Ne tuer aucun processus. Ne supprimer aucun reste de tmpdir sans accord.
- Aucun export des registres au dépôt : il reste dans le bloc-notes.
