# Handoff — 2026-09-13 10:05 — Clôture : le fil du jour est en service, et ses accusés ont écrit

Ce fragment clôt la session du 2026-09-12 soir. Le handoff précédent
(`2026-09-12-1950`) reste valable pour le détail ; celui-ci porte ce qui a été
constaté APRÈS lui, et une correction qui compte.

## La campagne est close des deux côtés

`2026-09-12-vie-du-portail-patient` — douze lots. Quatre PR fusionnées dans un
ordre qui n'était pas négociable :

| PR | Contenu |
| --- | --- |
| **#1061** | Les lectures entrent au fil — table `portail_lectures_patient`, route, accusé |
| **#1063** | Retrait du journal rétrospectif — **le code quitte la production AVANT la migration destructive** |
| **#1066** | `DROP TABLE "portail_journal_reperes"` — `release-db` verte |
| **#1067** | La doctrine : `D-172` amendée en tête, `D-175` posée |

`D-175` est en ligne, le numéro n'avait pas été pris entre-temps.

## Constaté au conteneur, jamais à la couleur d'un workflow

**Le 2026-09-12 à 19:40** (one-off-729), juste après `release-db` :

| Lecture | Valeur |
| --- | --- |
| `portail_journal_reperes` — `information_schema.tables` | **0** |
| `portail_journal_reperes` — `pg_class` | **0** |
| `portail_lectures_patient` — lignes | **0** |
| `…_portail_journal_repere_drop` | fini `17:39:52 UTC`, `rollback=NULL` |

Les **deux** catalogues, parce qu'une seule vue ne prouverait qu'une moitié.

**Le 2026-09-13 à 10:02** (one-off-1057), au réveil :

```
lectures_lignes=2
lectures_par_espece=bilan:1
lectures_par_espece=synthese:1
reperes_encore_la=0
```

**Le chemin d'écriture des accusés a été emprunté en production.** Hier soir il
n'était tenu que par ses bancs et un E2E ; ce matin un patient a ouvert un bilan
et une synthèse, et les deux lignes sont là. C'était le point que la clôture de
la veille désignait comme le plus fragile — il est levé.

Aucune variable `WN_PORTAIL_JOURNAL` ne subsiste côté Scalingo (vérifié sur un
`env` rendant bien ses 50 lignes et 29 drapeaux `WN_`, pas sur un `grep` muet).

## L'ERREUR DE LA SESSION, ET ELLE N'EST PAS TECHNIQUE

J'avais annoncé au responsable que `release-db` demanderait son approbation et
que ce serait **le dernier moment pour dire non**. Mes `POST` d'approbation
revenant en **422 — « No pending deployment requests to approve or reject »**,
j'en ai conclu que l'environnement n'avait aucune porte de relecture et que le
run était parti seul. **Je l'ai écrit dans quatre documents avant de vérifier.**

C'est faux, et les deux lectures qui le montrent étaient à un appel de distance :

```
gh api repos/{owner}/{repo}/environments/release-db --jq '.protection_rules'
  → required_reviewers (martialcayre-sketch), wait_timer: 5, branch_policy

gh api repos/{owner}/{repo}/actions/runs/<ID>/approvals
  → github-actions[bot] / "5 minute wait timer"
  → martialcayre-sketch / state: approved
```

**Le responsable avait approuvé lui-même.** Le point d'arrêt existait, et il
l'a utilisé. Le 422 pendant le minuteur était **déjà consigné comme trompeur
depuis le 2026-09-11** — relu de travers, puis transformé en propriété de la
configuration. C'est la faute que le `LOT-11` reproche à la § B.4 trois
paragraphes plus haut : une supposition présentée comme un constat.

**Une configuration se lit. Elle ne se déduit pas d'un code d'erreur.**

Second piège de la même soirée : **la notification de tâche de fond rapporte le
code du dernier `echo`**, pas celui de la commande. Elle a annoncé « exit code
0 » sur un `T1-EXIT=1`, deux fois. Lire le texte du fichier, jamais le résumé.

## UN PIÈGE D'OUTILLAGE, TROUVÉ EN FERMANT LA CAMPAGNE

`wn-campaign-audit.mjs` imprime `"ok": true` **même quand il sort en 1**. Le
champ `ok` ne reflète que `errors`, pas les `--fail-on-warning-codes` passés en
argument — et c'est ce drapeau qui décide du rouge de T1. J'ai failli conclure au
vert sur la lecture du JSON. **Lire le code de sortie, pas le champ `ok`.**

Il n'accepte par ailleurs qu'un vocabulaire fermé pour un lot clos :
`terminé`, `livré`, `abandonné`, `fait` (préfixes, insensible à la casse).
« clos » n'en fait pas partie et laisse le lot ouvert sans le dire autrement que
par un avertissement. `LOT-04`, sans objet, est donc `abandonné`.

## État Git au moment d'écrire

`main` a avancé de trois PR d'une autre session depuis #1067 — **#1068**
(drapeaux : synthèse par rideau en service), **#1069** et **#1070** (fiche :
compte des reçus, annulation d'envoi). Non relues ici ; citées pour que la tête
de `main` ne surprenne personne.

`main` local reste détenu par le worktree `courrier-corps-null` :
`gh pr merge --delete-branch` affiche « main is already used by worktree » après
chaque fusion — **cosmétique**, le merge passe. Vérifier
`gh pr view --json state`, ne jamais relancer.

## Reste ouvert

- **La clôture de l'agenda alimentaire** : `a_transmettre` n'a pas de CTA. Le
  patient ne peut pas fermer son recueil depuis le fil. C'est le trou le plus
  visible du fil du jour, et il est côté patient.
- **L'arbitrage du second `T0`**, hérité d'une autre session.
- **La lettre DPA à Anthropic** et les **trois trous du § 7 RGPD**.
- `portail_lectures_patient` rend un décompte **possible** — borné trois fois et
  gardé par un test qui **n'est pas une contrainte de base** (`D-175` point 6).
  Si la table grossit, c'est la première chose à réexaminer.
