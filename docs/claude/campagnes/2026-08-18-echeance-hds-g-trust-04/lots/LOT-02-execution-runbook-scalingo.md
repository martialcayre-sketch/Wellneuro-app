---
id: "LOT-02"
statut: "à faire — conditionné : ne s'ouvre que si le LOT-01 tranche « migrer »"
---

# LOT-02 — Exécution du runbook Scalingo — CONFIRMATION OBLIGATOIRE

> **Ce lot ne s'ouvre pas de lui-même.** Il est conditionné à deux choses, dans
> cet ordre : le `D-xxx` du LOT-01 tranche **migrer**, et la condition (a) de
> `D-006` est **effectivement levée** — annexe HDS signée et archivée, pas
> seulement caractérisée. Ouvrir ce lot sans l'une des deux créerait un
> intervalle couvert ni par la dérogation ni par un contrat HDS signé.

## But

L'application et la base de production tournent sur Scalingo `osc-fr1`
`--hds-resource`, données réelles migrées, Vercel/Supabase gardés chauds comme
filet de rollback court puis décommissionnés avec preuve d'effacement écrite.

## Objet

Ce lot **n'invente aucune procédure**. Il exécute
`docs/claude/propositions/2026-07-24-audit-migration-hds/RUNBOOK_MIGRATION_SCALINGO.md`,
qui porte les gestes ops, les cinq étapes et les pièges appris en provisionnant
le staging. Le rôle du lot est de **séquencer, confirmer et prouver** — pas de
réécrire le runbook au fil de l'eau.

## Ce qui manque avant même de commencer

Le staging est **validé au boot, pas en recette**. Trois manques nommés, à
combler avant l'étape 2 du runbook :

1. **Les secrets ne sont pas posés** (tableau §3 du runbook) — par le
   responsable, jamais en les faisant transiter par l'assistant.
2. **Les drapeaux produit de la production ne sont pas posés** sur le staging.
   Sans eux, le staging n'exerce pas le périmètre fonctionnel de la prod et sa
   recette ne prouve rien de ce qui compte.
3. **Les trois items fonctionnels de `CHECKLIST_FINALISATION.md` §A** — login
   praticien réel, synthèse IA en SSE, parcours Fil/fiche/RAG — ne sont pas
   cochés et aucun rapport de recette n'existe.

## Périmètre

- Gestes ops en console/CLI Scalingo — **hors dépôt**, à la main du responsable.
- Au dépôt : le rapport de recette, la preuve d'effacement du décommissionnement,
  et la mise à jour du runbook sur ce que l'exécution apprend.

## Interdits

- **Aucune donnée réelle avant (a) levée** — c'est l'ordre imposé de `D-006`, et
  il ne se contourne pas par un « staging au sens lâche » : les patients réels
  n'atterrissent que sur une app prod HDS dûment provisionnée
  (`--hds-resource`, `DB_SSL_CA`, secrets prod, contrôles d'accès de niveau
  prod). **Aucun garde runtime ne l'empêche** — la seule barrière est cette
  règle.
- **Aucun secret par l'assistant.** `scalingo env` rend les valeurs et
  `env-set` réaffiche celle qu'il pose : ni l'un ni l'autre ne sert à vérifier
  une configuration. `apps-info`, `addons` et `ps` suffisent.
- **Ne pas merger `sauvegarde/runbook-scalingo-staging`** : forkée du
  2026-07-24, elle supprimerait des dizaines de milliers de lignes de
  documentation créée depuis et annulerait deux PR mergées — dont celle qui
  corrige exactement la région `osc-fr1` / `--hds-resource` qu'elle prétend
  apporter. Toute reprise se fait par retouche ciblée sur la version de `main`.
- **Aucun compteur de migrations écrit à la main.** Le seul contrôle valable est
  `prisma migrate status` rendant « up to date » sur un conteneur
  `scalingo run` — il exige un TTY, donc ni une session d'assistant ni un
  script non interactif ne peuvent le lancer.
- **Une migration et le code qui en dépend ne voyagent pas dans la même PR.**

## Confirmations distinctes — à demander au moment de chaque geste

Chacune est une frontière du dépôt, aucune ne se franchit sur l'autorisation
d'une précédente :

- provisionnement de l'app et de l'add-on de production ;
- pose des variables et secrets ;
- **migration des données réelles** (dump Supabase → restore Scalingo) ;
- cutover DNS ;
- **décommissionnement de Vercel/Supabase**, avec preuve d'effacement écrite au
  registre RGPD.

## Dépendances

LOT-01, **intégralement** — son arbitrage et sa condition (a).

## Tests

Recette fonctionnelle sur staging avec secrets et drapeaux posés (les trois
items §A), puis contrôle de l'état des migrations par `prisma migrate status`
sur conteneur. Le palier du dépôt (T1/T2/T3) porte sur le code, pas sur ces
gestes — un lot ops ne se prouve pas par une suite Vitest.

## Critères de done

- [ ] Recette staging passée et **écrite** — les trois items §A cochés sur
      preuve, pas sur prose.
- [ ] App de production HDS provisionnée, `HDS: true`, add-on `running`,
      migrations « up to date » sur conteneur.
- [ ] Données réelles migrées **après** l'archivage de l'annexe signée, la
      chronologie étant vérifiable par les dates des deux `D-xxx`.
- [ ] Cutover fait, Vercel/Supabase gardés chauds puis décommissionnés avec
      **preuve d'effacement écrite** au registre RGPD.
- [ ] Le runbook porte ce que l'exécution a appris ; aucun compteur figé
      n'y est entré.
