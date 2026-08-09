# Handoff — 2026-08-09 — HDS : D-037 tranchée, certificat consigné, deux prémisses non établies retirées

## Branche et état Git

- Branche `worktree-hds-decision-d035`, basée sur `origin/main` `f047792b`.
- Worktree `.claude/worktrees/hds-decision-d035`.
- Diff **documentaire pur** — la liste exhaustive est plus bas, et **aucun
  compte n'est écrit ici** : trois passes de revue ont montré qu'un nombre écrit
  à la main dans une prose qui décrit un objet vivant périme au geste suivant.
  `git status` fait foi. Aucun code, aucune migration, aucune écriture en base.
- **Hors campagne** : la campagne active `2026-08-08-dettes-ouvertes-5-0` exclut
  explicitement le HDS de son périmètre (« ce sont des décisions hors code… la
  campagne le porte comme jalon, pas comme lot »).

## Objectif

Trancher la contradiction décisionnelle qui bloquait tout travail HDS, consigner
la pièce de conformité acquise depuis le 2026-07-28, et retirer du dossier deux
prémisses non établies qui fabriquaient des bloqueurs inexistants.

## Décisions prises

- **`D-037`** — `D-006` est confirmée ; la revue de la dette HDS quitte le
  2026-10-21 pour la **réponse de Scalingo** au ticket envoyé le 2026-08-09.
  L'échéance de la dérogation G-TRUST-04 reste au 2026-10-21, portée par la
  majorité des trous du dossier RGPD — pas par tous (tableau §14).
  **L'ordre imposé de `D-006` tient intégralement**
  — aucune donnée réelle avant (a) accord de sous-traitance archivé et
  (b) périmètre HDS de la région confirmé par écrit.
- **La CPS n'est pas requise** (qualification du responsable de traitement :
  activité non réglementée ; précédent Pronutriconsult). Ce qui subsiste est une
  politique d'accès écrite, sans lot d'ingénierie.
- **Le DPA ne s'e-signe pas** chez ce fournisseur : documents généraux acceptés à
  la souscription. Reste une copie horodatée à archiver.

## Fichiers modifiés

- `docs/DECISIONS.md` — `D-037` en tête de la section active.
- `docs/DOSSIER_RGPD.md` — certificat LNE 38436-2 consigné (tableau + trois
  points de vigilance) ; trou « aucun DPA signé » nuancé pour Scalingo seul.
- `docs/claude/propositions/2026-07-24-audit-migration-hds/RUNBOOK_MIGRATION_SCALINGO.md`
  — l'orientation du 2026-07-22 passe au passé ; « validé de bout en bout » →
  « validé au boot » ; le compteur de migrations faux retiré ; `osc-secnum-fr1`
  noté inaccessible ; le DPA requalifié.
- `.../AUDIT_MIGRATION_HDS.md` — prémisse CPS **démentie sur place**, pas
  supprimée.
- `docs/claude/REGISTRE_FRONTIERES.md` — « migration à instruire » → « décidée,
  non exécutée », écart courant inchangé.
- `changelog.d/2026-08-09-hds-decision-confirmee-certificat-consigne.md` (nouveau).
- `docs/claude/handoffs/2026-08-09-1010-hds-decision-d037-certificat.md` (ce
  fichier, nouveau).
- `docs/claude/SESSION_LOG.md` — entrée de clôture, en append.

**Les fichiers hors du périmètre naturel du lot, à relire en priorité** — ils
appartiennent à d'autres campagnes et n'ont été touchés que pour ne pas laisser
une contradiction neuve :

- `docs/claude/campagnes/2026-08-05-cloture-des-dettes-wellneuro-5-0/DECLARATION_5_0.md`
  — **avenant daté sur une déclaration de clôture signée** (dette 8). Amende sans
  réécrire ; c'est le geste le plus lourd du lot.
- `.../2026-08-05-cloture-des-dettes-wellneuro-5-0/CAMPAGNE.md` — même avenant au
  point 8, parce que `DOSSIER_RGPD.md` désigne **cette** pièce comme sa source
  sur les deux dates.
- `docs/claude/campagnes/2026-08-08-dettes-ouvertes-5-0/CAMPAGNE.md` et
  `lots/LOT-04-garde-code-registre.md`, plus `.wn/state.json` — la réservation de
  `D-037` par le badge muet était invalide. **`LOT-04` est le lot courant d'une
  autre session** : `.wn/state.json` est un fichier partagé, risque de conflit
  assumé et signalé.
- **Trois fragments `changelog.d/` non publiés d'autres lots**, amendés pour que
  le CHANGELOG ne publie pas une affirmation et sa réfutation dans la même
  release : `2026-08-05-runbook-hds-staging.md` (orientation du 2026-07-22 et
  « validé de bout en bout »), `2026-08-07-lot06-dossier-rgpd.md` et
  `2026-08-08-gardes-coherence-etat-machine.md` (compteur de trous rendu faux
  par la ligne que ce lot ajoute au tableau §14).

**Piège de l'arbre** : `web/next-env.d.ts` est **régénéré à chaque
`npm run check`** (il régresse une URL de documentation Next). Le restaurer
(`git checkout -- web/next-env.d.ts`) **juste avant le commit**, sinon il entre
dans un diff annoncé « documentaire pur ». Il est revenu deux fois ici.

## Validations exécutées

- **T1 (`npm run check`) — vert, code de sortie 0**, lancé depuis `web/` avec le
  chemin littéral. Dont `decisions-check` : « OK : 37 décisions, D-001 à D-037,
  sans doublon ni trou ». Anti-secrets : « aucun secret évident ».
- T2/T3 non joués : diff documentaire, aucune surface UI ni API.
- Revue adversariale `wn-reviewer` lancée sur le diff avant la PR.

## Gestes hors dépôt

- **Ticket Scalingo envoyé** le 2026-08-09 (six demandes : périmètre HDS de
  `osc-fr1`, certificat ISO 27001 n° 38435, DPA et copie horodatée, sous-traitants
  ultérieurs, accès à `osc-secnum-fr1`, rétention des journaux).
- **`Force HTTPS` activé** sur `wellneuro-staging` — vérifié `true` par
  `apps-info`.

## Problèmes ouverts

- **(b) périmètre HDS de la région non levé.** Le certificat ne nomme aucune
  région ; la réponse au ticket est la seule pièce qui tranchera.
- **`osc-secnum-fr1` n'est pas accessible** sur le compte (`scalingo regions` ne
  rend qu'`osc-fr1`) : la recommandation de l'audit visait une région à demander.
- **Rollback sans critère de déclenchement, sans fenêtre, sans geste de retour**,
  et **aucun GO/NO-GO de migration** n'existe.
- **L'état de schéma du staging n'est pas mesuré** depuis le 2026-07-24. Ne pas
  en inférer un retard : l'auto-déploiement sur `main` rejoue `db:deploy` à
  chaque merge. `prisma migrate status` exige un conteneur `scalingo run` avec
  TTY — inatteignable depuis une session d'assistant.
- **La réserve (3) de D-006 — confirmation DPO** — n'est ni levée ni traitée, et
  elle est elle-même suspendue à la contradiction DPO non tranchée du dossier
  RGPD (G-TRUST-02 vs D-005).
- **La qualification « pas de CPS » n'a pas été posée au fournisseur** : le
  ticket du 2026-08-09 porte six questions, celle des art. 9.4/10.3 n'en fait
  pas partie. À poser au prochain échange.
- **Aucun contrat CI ne couvre pgvector** — extension `vector`, deux index HNSW,
  signatures `match_*` : un index perdu dégraderait le RAG en scan séquentiel
  sans qu'aucune suite ne rougisse.
- Trous RGPD inchangés ; **la plupart au 2026-10-21, pas tous** — le tableau §14
  fait foi : information des personnes (« au plus tôt », donc échue), base légale
  non qualifiée, durées de conservation, AIPD à qualifier, pentest, DPA des
  autres sous-traitants (« avant bascule Scalingo »).
- Seconde app `wellneuro` au statut `new`, toujours pas instruite.

## Prochaine action exacte

Contrat SQL pgvector en CI (`web/prisma/checks/`), en lot séparé — il ne partage
aucune finalité avec celui-ci et est utile dès aujourd'hui sur Supabase.

## Interdits encore actifs

- **Aucune donnée réelle sur Scalingo** tant que (a) et (b) ne sont pas levées.
- Les secrets et flags du staging se posent par le responsable, **jamais** en
  transitant par l'assistant.
- Pas de migration Prisma ni d'écriture en base dans ce périmètre.
