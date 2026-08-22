---
id: "2026-08-18-echeance-hds-g-trust-04"
titre: "Échéance HDS — lever ou reconduire G-TRUST-04 avant le 2026-10-21"
statut: "en_cours (ouverte 2026-08-19 — D-078 a rendu l'arbitrage du LOT-01 par anticipation)"
créée_le: "2026-08-18"
mise_à_jour: "2026-08-19"
lot_courant: "LOT-01"
branche_campagne: "aucune"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Échéance HDS — lever ou reconduire G-TRUST-04 avant le 2026-10-21

## Objectif

Au **2026-10-21**, la dérogation G-TRUST-04 expire. Sans reconduction écrite,
le gate **et** le dossier RGPD reprennent la règle du dépôt le même jour :
patients fictifs seuls. La campagne aboutit à **un** des deux états, tracé :
hébergement HDS opérationnel (migration Scalingo exécutée), ou dérogation
reconduite par écrit avec un nouveau terme.

C'est la seule échéance du dépôt qui **avance sans nous**, et le seul
`blocking_issue` transverse de `.wn/state.json`.

**`D-078` (2026-08-19, le jour de l'ouverture) a écarté l'ordre « (a)
d'abord » sans changer la date** : le responsable de traitement a levé le
gate par écart assumé et
engagé la migration **sans attendre l'annexe HDS**. La revue du 2026-10-21
demeure — à cette date, l'annexe est signée et l'écart refermé par le haut,
ou le terme se reconduit explicitement, ou la règle du dépôt reprend.

## Ce que la campagne ne fait pas

Elle ne tranche pas. L'arbitrage des lots 1 et 4 appartient au **responsable de
traitement**, pas à l'assistant. Les lots réunissent les pièces, exécutent les
gestes matériels et consignent — rien de plus.

## État réel au cadrage — 2026-08-19

Le brief de la file (`sources/brief-echeance-hds.md`, 2026-08-18) écrivait
« réponse au ticket Scalingo attendue ». **Cette réponse est arrivée le
2026-08-11** et a été tranchée le jour même par `D-047`
(`docs/DECISIONS.md`, consignée `docs/DOSSIER_RGPD.md` §6). L'état ci-dessous
la prend en compte ; le brief ne l'a pas.

### Les deux conditions dures de `D-006`

| | État | Depuis |
|---|---|---|
| **(b)** périmètre HDS de la région `osc-fr1` | **LEVÉE** — Scalingo confirme par écrit que les ressources `--hds-resource` (application, add-on PostgreSQL, sauvegardes) sont couvertes par le certificat LNE n° 38436-2, pour les six activités du référentiel dont la 5 (administration et exploitation) et la 6 (sauvegardes externalisées) | 2026-08-11, `D-047` |
| **(a)** accord de sous-traitance | **OUVERTE, et recaractérisée** — `D-037` posait qu'il n'y avait rien à signer (documents généraux acceptés à la souscription). Scalingo répond l'inverse : l'accord se compose du **DPA** et d'une **annexe HDS distincte**, « l'acceptation des conditions générales seule ne suffit pas ». Reste à **obtenir l'annexe, la signer, archiver les deux pièces** | 2026-08-11, `D-047` |

Les réserves (3), (4), (5) de `D-006` sont inchangées.

### Le reste de l'état

- **Hébergement actuel instruit et négatif** (2026-07-21) : Supabase et Vercel
  absents de l'annuaire ANS des hébergeurs certifiés HDS.
- **Migration Scalingo décidée** (`D-006` du 2026-07-28, confirmée par `D-037`),
  **jamais exécutée**. L'orientation du 2026-07-22 « rester sur l'hébergement
  actuel » lui est antérieure de six jours et n'est plus courante.
- **Staging provisionné** (`wellneuro-staging`, `osc-fr1`, `HDS: true`,
  add-on PostgreSQL Business `running`), **validé au boot sur données fictives**
  — pas de recette fonctionnelle : les trois items de `CHECKLIST_FINALISATION.md`
  §A ne sont pas cochés et aucun rapport de recette n'existe. Détail et gestes :
  `docs/claude/propositions/2026-07-24-audit-migration-hds/RUNBOOK_MIGRATION_SCALINGO.md`.
- **`osc-secnum-fr1` n'est pas accessible sur ce compte** (relevé du
  2026-08-09 : `scalingo regions` ne rend qu'`osc-fr1`). La réponse écrite du
  2026-08-11, consignée `docs/DOSSIER_RGPD.md` §6 — et non le texte de `D-047`,
  qui ne la reprend pas — précise qu'elle est réservée aux clients demandant en
  plus le Visa SecNumCloud, et qu'elle est **hors périmètre** de la migration
  actuelle.
- **Les sept exigences du gate : aucune n'est ✅.** Une est ❌ (architecture
  d'hébergement), six sont partielles. La checklist le dit sans détour :
  « c'est un ET, pas un OU »
  (`campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`).
- **L'information des personnes est déjà échue** : son échéance au tableau §14
  de `docs/DOSSIER_RGPD.md` est « **au plus tôt** », pas le 2026-10-21. C'est un
  rattrapage, pas une échéance à tenir.
- **La dérogation se reconduit là où elle a été rendue** : la décision du
  responsable du 2026-07-21 vit dans la checklist du gate, qui exige que la
  reconduction soit « **datée et signée ici** ».

## Résultat observable

1. L'annexe HDS est **obtenue, signée, et archivée** avec le DPA — ou son refus
   / son impossibilité est écrit et daté.
2. ~~Le responsable de traitement a tranché **migrer ou reconduire**, au
   registre, avec un `D-xxx`.~~ **Fait — `D-078` (2026-08-19) : migrer, sans
   attendre l'annexe ; pas de nouveau terme, la revue reste au 2026-10-21.**
3. Si « migrer » : le runbook Scalingo est exécuté, en PR séparée du code qui en
   dépend, avec confirmation explicite à chaque geste d'infrastructure.
4. Le dossier RGPD est à l'état réel et l'information des personnes est
   rattrapée.
5. G-TRUST-04 porte un état neuf — levé ou reconduit — **avec sa preuve**, et
   `.wn/state.json` cesse de le déclarer bloquant sur une prémisse périmée.

## Contraintes non négociables

- ~~**Aucun stockage de donnée de santé réelle tant que le gate tient**~~ —
  **le gate est levé depuis le 2026-08-19 par écart assumé (`D-078`)**, pas
  par mise en conformité : les sept exigences restent ce qu'elles sont (une
  ❌, six partielles). E8 et D5 deviennent activables par décision du
  responsable — toujours hors périmètre de cette campagne.
- ~~**L'ordre imposé de `D-006` tient intégralement**~~ — **son application
  est suspendue pour la condition (a) par `D-078` §4** (le contenu reste au
  registre, `D-047` reste vraie). Ce qui tient, dit par `D-078` : le
  ~~**décommissionnement de Vercel/Supabase reste subordonné à la signature
  de l'annexe**~~ — **subordination levée par `D-080` (2026-08-22)** :
  décommissionnement programmé au **2026-09-01** après fenêtre de stabilité
  de dix jours, annexe signée ou non, preuve d'effacement toujours due — et
  la fenêtre bascule→signature est **moins couverte qu'avant** — couverte
  ni par la dérogation (qui vise Vercel) ni par une option HDS active ; le
  responsable en a été informé et maintient son choix. **La bascule et le
  cutover sont faits le 2026-08-22** (données 03:24, DNS au matin — dossier
  RGPD rubrique 12).
- **Production lue uniquement via l'outil MCP `execute_sql`** ; toute migration
  passe par `release-db`, jamais par le build Vercel.
- **Une migration et le code qui en dépend ne voyagent pas dans la même PR.**
- **Aucun secret ne transite par l'assistant** : les variables du staging et de
  la production se posent par le responsable. `scalingo env` rend les valeurs et
  `env-set` réaffiche celle qu'il pose — ces commandes ne servent pas à
  vérifier une configuration (`apps-info`, `addons`, `ps` suffisent).
- **Aucun compteur figé** dans les documents de cette campagne (migrations
  appliquées, trous du dossier RGPD) : un compteur écrit à la main sert ensuite
  de contrôle et dérive en silence — le lot du 2026-08-09 en a périmé trois.

## Décisions qui bornent la campagne

- `D-006` (2026-07-28) — cible « Scalingo seul », ordre imposé, réserves.
- `D-037` (2026-08-09) — `D-006` confirmée ; **sa requalification du DPA était
  fausse**, cf. `D-047`.
- `D-047` (2026-08-11) — (b) levée, (a) ouverte et recaractérisée.
- **`D-078` (2026-08-19) — gate levé par écart assumé, migration engagée sans
  attendre l'annexe ; l'ordre « (a) d'abord » suspendu (contenu conservé au
  registre) ; décommissionnement subordonné à la signature ; revue au
  2026-10-21.**
- Décision du responsable du 2026-07-21 — phase de test avec personnes réelles,
  bornée au 2026-10-21, « écart assumé, borné et daté — pas une mise en
  conformité ».

## Questions ouvertes — humaines, aucun lot ne les ferme

- ~~**Migrer ou reconduire** : l'objet même du LOT-01.~~ **Rendue par
  anticipation le 2026-08-19 (`D-078`) : migrer, sans attendre l'annexe.**
- **`D-TRUST-02`** — confirmation par un conseil qualifié, ouverte depuis la
  Vague 2.
- **Registre physique des violations (EX-3)**, hors dépôt.
- **AIPD** et **qualification de la base légale** : conseil qualifié, ni l'un ni
  l'autre rédigeable ici.
- **Pentest / revue externe** : prestataire à engager (exigence 7 du gate).

## Dépendances

- **Scalingo** (externe) : fourniture de l'annexe HDS. Le canal est ouvert —
  le ticket du 2026-08-09 a reçu réponse le 2026-08-11 ; la **relance du
  2026-08-19 est pendante, sans réponse** (`D-078`).
- **`D-TRUST-02`** peut avancer en parallèle, il ne bloque aucun lot.
- ~~Le LOT-02 dépend **entièrement** de l'issue du LOT-01.~~ **`D-078` a
  débloqué le LOT-02** (arbitrage rendu, ordre (a)-d'abord suspendu) ; ses
  confirmations obligatoires geste par geste demeurent, et son
  décommissionnement reste gaté par l'annexe signée.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-01 | Annexe HDS obtenue et signée ; ~~arbitrage migrer/reconduire~~ (rendu par `D-078`) | en cours — réduit à l'annexe (demandée 2026-08-12, relancée 2026-08-19 ; canal et dates vérifiés au fil le 2026-08-20, sans réponse) | — |
| LOT-02 | Exécution du runbook Scalingo — **confirmation obligatoire à chaque geste** | débloqué par `D-078` ; décommissionnement subordonné à l'annexe signée | `D-078` (rendu) |
| LOT-03 | Dossier RGPD à l'état réel + rattrapage de l'information des personnes | **terminé (2026-08-19)** — information consignée, §6/§12/§14 réconciliés avec `D-078`, support v2 préparé (publication = lot TRUST distinct) | — |
| LOT-04 | ~~G-TRUST-04 change d'état~~ (fait par `D-078`) — reste la revue du 2026-10-21 | recentré | LOT-01, et LOT-02 si la bascule est faite |

## Done de campagne

À cocher sur preuve relue, jamais sur la prose d'un lot.

- [ ] L'annexe HDS et le DPA sont **archivés signés**, ou leur absence est
      écrite et datée au dossier RGPD.
- [x] ~~Un `D-xxx` du responsable de traitement tranche migrer ou
      reconduire.~~ **Fait — `D-078` (2026-08-19) : migrer, sans attendre
      l'annexe.**
- [ ] ~~Si « migrer » : aucune donnée réelle n'a atteint Scalingo avant que
      (a) soit effectivement levée~~ — ordre écarté par `D-078` §4 ; le
      critère devient : **la chronologie réelle des deux événements (bascule
      des données, signature de l'annexe) est consignée avec ses dates** —
      c'est elle qui borne la fenêtre de moindre couverture — et **aucun
      décommissionnement n'a eu lieu avant la signature**.
- [x] Le tableau §14 de `docs/DOSSIER_RGPD.md` ne porte plus de ligne dont
      l'échéance est passée sans mention — **LOT-03, 2026-08-19** : rubrique
      11 (« au plus tôt », échue) consignée, son renouvellement indexé sur la
      bascule ; ligne DPA (« avant bascule Scalingo ») réconciliée avec
      `D-078` ; **ligne « preuve fonctionnelle de la piste d'audit »** dont
      l'échéance « premier dossier ouvert » était **dépassée sans que
      personne l'ait relevé** (`D-075`, `D-077`) — annotée et reportée. Deux
      lignes rubrique 11 sont **ajoutées** pour les manques qui subsistent.
- [x] L'information des personnes sur l'écart HDS est consignée — **rubrique
      11**, sur déclaration du responsable (session du 2026-08-19) : forme
      orale, en consultation ; contenu, l'écart d'hébergement. **Consignation
      PARTIELLE, et le dossier le dit** : date de délivrance non établie
      (l'ancrage « depuis la souscription HDS » n'est pas tenu pour acquis par
      le dépôt), modalité de retrait non consignée, aucune trace écrite par
      participant, périmètre des personnes non établi. Renouvellement
      post-`D-078` dû avant la bascule (brouillon prêt, publication = lot
      TRUST distinct).
- [ ] La checklist du gate porte l'état neuf, **daté et signé**, et
      `.wn/state.json` le reflète.
- [ ] Aucun secret n'a transité par l'assistant ; anti-secrets vert ; changelog
      par fragments.
