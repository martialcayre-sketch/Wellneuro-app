# Handoff — file D, lot `orchestrateur-cloud-cadrage` : D-540, cadrage de l'orchestrateur cloud (2026-11-18)

## 1. Branche et état Git

- Branche `docs/orchestrateur-cloud-cadrage`, tirée d'`origin/main` ff6aa26e le 2026-11-18 à 22:09Z, puis
  avancée par `--ff-only` sur da125214. Worktree `.claude/worktrees/orch-ci`.
- Les modifications restent non commitées jusqu'au push (D-518, commit tardif).
- Carnet : le lot `orchestrateur-cloud-cadrage` (file D, ordre 83) est pris le 2026-11-18 à 22:09Z. Le `merge_fait`
  de #2235 est accusé (`lu`).
- Session concurrente de la file D, en `git` et `gh` directs. La PR se déclare « prête » ; l'intégrateur merge.

## 2. Objectif

Cadrer sans code l'orchestrateur cloud (routine claude.ai) et le fixer par une décision. Le cadrage suit le plan du
super-orchestrateur (rapport hors dépôt, sections 3 à 7 ; L3, L4, L5) et les quatre exigences du responsable inscrites
au titre du lot :
- la succession des lots ;
- le `/clear` et le premier message ;
- le plafond, sans collision ;
- l'hygiène en constat.

La décision fixe aussi le périmètre, le budget, l'arrêt d'urgence et le journal. Aucune routine n'est créée ni lancée.

## 3. Décisions prises

- **D-540** (numéro réservé à la rédaction, `refs/tags/reserve/D-540`). Elle :
  - cite la réponse `20261117-0113-d` (« Partagé : files en cloud, intégrateur et E2E au Mac ») ;
  - amende D-510 §4, §6 et §7 pour les seules sessions lancées : un lot, puis arrêt ;
  - amende D-454 (filet) pour les seuls lots lancés : le filet revient à la file, sur la voie Mac ;
  - tranche l'automatisme sans session que D-503 et D-510 laissaient ouvert ;
  - complète D-503 §2 par une boîte `orchestrateur`.
- **Mécanismes retenus.**
  - Une ligne d'intention `<lot>--v<version>` est créée sans version avant chaque lancement.
  - Un lancement qui n'est pas pris dans les trente minutes est « sans prise » et part à la voie Mac.
  - Un lot n'est lancé en cloud que s'il porte exactement `lieu: cloud` et `nature: ordinaire`, aux champs valides
    (contrôles par regex). Tout le reste va au Mac, avec un signal à la boîte D.
  - Un lot orphelin ne se relance pas. Il part au Mac par D-510 §8.
  - Le document d'arrêt doit valoir exactement `false` pour qu'une passe lance.
  - Le journal porte des codes d'erreur, jamais de message brut.
- **Phases de mise en service.**
  1. Second essai à blanc : la routine, plus une session de sonde.
  2. Lot de mise en service, au Mac.
  3. Pilote sur la file D, `N` = 1, deux semaines (L4).
  4. Généralisation après le rapport du pilote, L3 et la parole du responsable.
- **Question ouverte écrite à la liste commune** : `20261118-2312-d`, nature ordinaire, date utile 2026-11-25. Elle
  porte les valeurs de départ (cadence, plafond quotidien, hygiène) ; option recommandée « Prudent ». Elle n'est pas
  tranchée d'office : la routine ne s'allume pas sans elle.
- **Revue `wn-reviewer`, premier passage : GO conditionnel.**
  - Quatre P1, tous corrigés :
    - D-510 était amendée sans le dire ;
    - une file pouvait geler sur un lot orphelin ou renvoyé, et le filet n'avait pas de règle cloud ;
    - aucun champ structuré n'excluait les lots réservés ;
    - l'adresse des registres était inaccessible à une session lancée.
  - P2-5 à P2-14 corrigés : double lancement, définition de « vivante », interrupteur, injection par le premier
    message, branche de reprise, automatisme non nommé, sonnerie, liste des lots `mac`, Playwright dans
    `test:worktree`, famine.
  - P3 corrigés : sortie de `repo-hygiene` et `.wn/state.json` absent en clone, D-518 mal cité, choix du modèle
    présenté comme tel, codes d'erreur, fuseau, création de la routine par le seul responsable, signalements
    dédoublonnés.
  - Questions du relecteur :
    - « faut-il une relecture du responsable avant d'accepter ? » La routine ne s'allume que par son geste et sa
      réponse à `2312-d` ; le texte reste « accepté », sur sa demande du 2026-11-17 ;
    - « un seul E2E » vise `test:e2e` ; `test:worktree` en parallèle au Mac reste permis, comme le dit le §5.
  - **Second passage, sur l'écart : GO conditionnel, aucun P1.** Cinq P2, tous corrigés :
    - contrôles de branche et de handoff conditionnés à leur présence (un lot neuf passe), et regex de branche
      durcie (`git check-ref-format`) ;
    - lot non lançable découvert par la session : `lieu` passé à `mac` et lot remis à `pret`, au lieu d'un motif de
      blocage hors de D-510 §3 ;
    - session vivante : elle cesse de l'être si son lot est `fait`, orphelin ou repris ;
    - échéance de l'intention portée par le premier message, et aucune prise passé ce délai ;
    - D-454 amendée explicitement pour le filet des lots lancés.
  - Ses P3 sont corrigés aussi : désignation sans priorité, quatre heures comptées sur `tenu_le`, signaux à la boîte
    de la file, bail global renvoyé à la généralisation, affichage de `wn-etat-reel`, portée de l'arrêt. Les bancs
    correspondants sont ajoutés à la phase 2.

## 4. Fichiers modifiés

- `docs/decisions/D-540.md` (neuf)
- `changelog.d/2026-11-18-orchestrateur-cloud-cadrage.md`
- ce handoff
- Hors dépôt :
  - carnet : ligne `orchestrateur-cloud-cadrage` ;
  - liste commune : question `20261118-2312-d` ;
  - registre : message `20261117-2350-integrateur-d-2235` accusé.

## 5. Validations exécutées

- `npm run check:rapide` : code 0. `decisions-check` reconnaît D-540, sans doublon ; les trous D-496, D-527 et D-532,
  qui préexistaient, restent en avertissement.
- T1 complet avant le commit : voir la PR.
- Pas de T2 : aucun code, ni UI ni API, n'est touché. Pas de relecture ui-ux-pro-max : aucun écran n'est touché.

## 6. Problèmes ouverts

- La question `20261118-2312-d` attend le responsable.
- Phase 1, second essai à blanc : la création de la routine depuis l'interface est un geste du responsable. Rien n'est
  inscrit au carnet pour elle tant que la question n'est pas répondue.
- Phase 2, lot de mise en service, au Mac : à inscrire au carnet après la phase 1. Il versera les mises à jour de
  `CLAUDE.md` et de `ROLES_MACHINES.md` qu'appelle l'amendement de D-510.
- L3 (outillage durci de l'intégrateur) n'est pas inscrit au carnet ; la généralisation l'attend.
- Restent pris pour la file D : le lot `autonomie-pieges-restes` (suite de la partie 5, handoff 2026-11-17-1246 §6) et
  le lot `synthese-conflit-texte-conserve` (ordre 93), qui absorbe `synthese-succes-synthese-ouverte` (94, question
  `20261118-2307-d`).

## 7. Prochaine action exacte

1. T1 complet, commit tardif, push, PR (`--body-file`) ; verdict de `wn-reviewer` déposé sur la PR.
2. `node scripts/wn-attendre-ci.mjs <N>` en fond, puis la preuve PR-Agent (`node scripts/wn-revue-pr-agent.mjs <N>` →
   0).
3. Un verdict pour chaque commentaire. Poser `pr` au carnet, puis « prête @<sha> » sur la PR et au registre (ligne
   `prete` à l'intégrateur).

## 8. Interdits encore actifs

- Aucune routine créée ni lancée. Ni migration, ni schéma, ni clinique, ni donnée patient. Rien de
  `web/src/lib/clinical/` ; pas de `prisma format`. Aucune écriture en production.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Aucune adresse de page privée dans le dépôt (il est public).
- Horodater en lisant l'heure système, jamais à l'estime. Pas d'allongement du délai ni de retries.
- Porte 24 non levée.
- Ne pas prendre le lot 94 seul.
