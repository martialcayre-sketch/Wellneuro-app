---
id: "LOT-03"
titre: "Dette 4 — re-mesurer, puis garder contre le retour de la dérive"
statut: "en cours (2026-08-08) — re-mesure faite, garde d'écriture et contrat de production posés"
dépend_de: "LOT-00"
---

# LOT-03 — Dette 4 : re-mesurer, puis garder contre le retour de la dérive

## But

**Re-mesurer d'abord, garder ensuite.** Dans cet ordre, et jamais l'inverse.

## Pourquoi la re-mesure vient en premier

La mesure qui justifiait l'urgence de cette dette était **périmée à sa
publication**, et la correction est déjà portée dans
`../2026-08-05-cloture-des-dettes-wellneuro-5-0/DECLARATION_5_0.md`, section
dette 4 :

- affirmé d'après le LOT-02 (mesure du **2026-08-05**) : « 1 pack sur 8 en dérive
  réelle — `PACK_-bG21yeIvVYRhrdlYuWIMnFz`, `Q_SOM_09` absent du registre, non
  resynchronisé » ;
- lecture de production du **2026-08-08** : **0 divergence sur 8 packs**,
  `Q_SOM_09` présent des deux côtés du pack de base. Une écriture d'une **autre**
  campagne (`packs.updated_at = 2026-08-07 15:46`, LOT-00 de
  `2026-08-07-dettes-packs-residuelles`) l'avait resynchronisé au passage.

Le fait était vrai à sa mesure et faux à sa publication. Il a franchi T3, deux
passes de revue adversariale et le CI, **parce qu'on relit la valeur d'une mesure
citée, jamais sa date**. Ce lot ne repart donc d'aucune valeur écrite ailleurs :
il ouvre par une lecture `execute_sql` datée du jour, et l'inscrit avec sa date.

## Ce que la dette est, au 2026-08-08

**Il n'y a plus de dérive.** Ce qui manque n'est pas une resynchronisation mais
**un garde contre son retour** : les deux sources s'accordent aujourd'hui par
l'effet d'une écriture qui ne visait pas cet objectif, pas par un mécanisme.
C'est ce qui maintient le verdict *ouverte* et ce qui en abaisse l'urgence — d'où
la dernière place.

Et l'annonce du LOT-02 (« repli legacy journalisé ») décrivait mal le livré : le
cas qui compte, `ensembles_divergents`, était **déjà** en `logger.warn` **avant**
le lot ; le LOT-02 n'a ajouté que la branche INFO des deux cas bénins
(`registre_absent`, `registre_vide`), dont il mesure **zéro occurrence**. La
journalisation vit dans les deux appelants —
`api/portail/valider/route.ts:123` et `api/praticien/packs/assign/route.ts:154` —
pas dans `web/src/lib/consultation/packRegistry.ts`.

## Contraintes propres

- **Lecture seule sur la production**, exclusivement via l'outil MCP Supabase
  `execute_sql`. Aucune écriture, aucune migration.
- Vérifier à l'ouverture qu'**aucune écriture de pack n'est en vol** (campagnes
  `2026-08-04-agenda-alimentaire` et `2026-08-07-dettes-packs-residuelles`
  touchent la même table) — re-mesurer un état transitoire est précisément ce qui
  a périmé la mesure d'origine.
- Dépend du LOT-00 : le garde posé ici est du même genre que les siens, et
  bénéficie de la forme retenue (échouer vs réparer).

## Hors périmètre

- Les cinq dettes de packs sans lot d'accueil listées au `## Hors périmètre` du
  LOT-01 de `2026-08-07-dettes-packs-residuelles` (D-032).
- Toute resynchronisation manuelle de donnée : s'il y a dérive au jour J, elle
  est **constatée et datée**, et le geste de correction est un geste praticien.

## Correction mineure rattachée — la prémisse était fausse

Le cadrage annonçait « la date d'arbitrage HDS diverge d'un jour ». **Vérifié à
l'ouverture : il n'y a pas de divergence, ce sont deux évènements distincts.**

- **2026-07-21** — instruction de l'hébergement (Supabase et Vercel absents de
  l'annuaire ANS) et **dérogation** du responsable du traitement.
  `docs/DOSSIER_RGPD.md`, et la checklist du gate (lignes 50 et 61).
- **2026-07-22** — **arbitrage** : rester sur l'hébergement actuel, borner la
  phase de test, n'instruire aucune migration.
  `../2026-08-05-cloture-des-dettes-wellneuro-5-0/CAMPAGNE.md`, point 8.

`.wn/state.json` portait déjà les deux, correctement distingués — c'est la
lecture qui était fautive, pas les documents. Le geste n'est donc pas d'aligner
les dates (ce serait effacer un fait) mais de **nommer l'évènement à côté de
chacune**, aux deux endroits, pour que la confusion ne se reforme pas.
L'échéance, **2026-10-21**, est identique partout et ne bouge pas.

## Preuve attendue

- La lecture d'ouverture, **avec sa date**, dans la section `## Résultats`.
- Un garde qui détecte le retour d'une divergence registre/packs, mutation-testé
  (introduire une divergence fait rougir).
- T2 avant commit ; T3, le lot touchant les contrats de `web/prisma/checks/`.

## Question tranchée à l'ouverture — les DEUX, et une troisième

L'alternative telle qu'elle était posée reposait sur deux hypothèses fausses,
constatées avant d'écrire une ligne :

1. **Le contrat en CI serait « gratuit mais aveugle » : il serait surtout
   VACU.** La base du CI est construite par `migrate deploy` **seul**
   (`ci.yml:428-432`) : elle ne porte aucun pack. Une assertion de données y est
   vraie par vacuité, donc verte quoi qu'il arrive.
2. **Il manquerait un mesureur. Il en existe un**, complet sur les deux axes :
   `web/prisma/checkPackRegistryConsistency.ts` (`npm run check:pack-registry`),
   hors CI parce qu'il exige un `DATABASE_URL` réel. Ce qui manque est un
   **déclencheur**.

Et la re-mesure a fait apparaître une troisième voie, qui n'était dans aucune des
deux : **la dérive a un générateur, dans le chemin d'écriture** (voir
`## Résultats`). Retenu, donc :

- **Le chemin d'écriture cesse d'être silencieux.** `syncPackToRegistry` refuse
  un qid sans `QuestionnaireDefinition` au lieu de le jeter. Gratuit, continu, en
  production, éprouvable en Vitest — et c'est le seul geste qui aurait empêché la
  dérive du 2026-08-05.
- **Un préflight de production**, `packs_registre_coherence_v1.sql`, câblé dans
  `release-db.yml` sur le précédent `c5_ciqual_production_preflight.sql` : la
  seule lecture de production gratuite du dépôt, secret déjà en place, aucune
  infrastructure neuve. Il attrape ce que le garde d'écriture ne voit pas — une
  écriture SQL hors application.

**La lecture de production planifiée est écartée**, et le motif n'est pas le
coût : aucun workflow `schedule:` n'existe dans le dépôt, le CI n'a **aucun**
secret de production, et en introduire un ferait de GitHub Actions un second
chemin d'accès à la base — là où `CLAUDE.md` et `.claude/rules/db-prisma.md`
réservent la lecture de production à l'outil MCP piloté par un agent. Le
préflight de release donne 90 % du signal pour 0 % de cette surface.

## Résultats — lecture de production du 2026-08-08

Outil MCP Supabase `execute_sql`, lecture seule. La requête est **consignée
ci-dessous** : celle du 2026-08-05 ne l'avait pas été, et la re-mesure a dû la
réinventer.

| Fait | Valeur au 2026-08-08 |
|---|---|
| Packs legacy / miroirs relationnels | 8 / 8 |
| `ensembles_divergents` | **0** |
| `registre_absent` / `registre_vide` | 0 / 0 |
| Miroirs sans pack legacy | 0 |
| qids de pack absents de `questionnaires` | 0 |
| Packs actifs référençant un questionnaire inactif | 0 |
| Packs `actif = true` | **1 sur 8** — le pack de base ; les sept autres sont éteints |
| Dernière écriture de pack | `2026-08-07 15:46:34` — **rien en vol** |

```sql
-- Réplique de resolveQidsLogic : comparaison d'ENSEMBLES, ni cardinal ni ordre.
WITH legacy AS (
  SELECT p.id_pack, p.actif, p.updated_at,
         (SELECT array_agg(DISTINCT q ORDER BY q) FROM unnest(p.qids) AS q) AS legacy_qids
  FROM packs p
), registre AS (
  SELECT qp.pack_id,
         (SELECT array_agg(DISTINCT d.questionnaire_id ORDER BY d.questionnaire_id)
            FROM pack_questionnaires pq JOIN questionnaires d ON d.id = pq.questionnaire_id
           WHERE pq.pack_id = qp.id) AS registre_qids
  FROM questionnaire_packs qp
)
SELECT l.id_pack,
       CASE WHEN r.pack_id IS NULL THEN 'registre_absent'
            WHEN coalesce(array_length(r.registre_qids,1),0) = 0 THEN 'registre_vide'
            WHEN coalesce(l.legacy_qids,'{}') = coalesce(r.registre_qids,'{}') THEN 'ok'
            ELSE 'ensembles_divergents' END AS verdict
FROM legacy l LEFT JOIN registre r ON r.pack_id = l.id_pack ORDER BY l.id_pack;
```

**Ce que la re-mesure a révélé, et qui n'était écrit nulle part.**
`syncPackToRegistry` jetait **silencieusement** tout qid sans
`QuestionnaireDefinition`. La ligne de définition de `Q_SOM_09` a été créée le
**2026-08-06 14:59** (relevé en base) : le 2026-08-05, le miroir ne *pouvait pas*
le porter, et le pack de base repartait en `ensembles_divergents` à chaque
onboarding. `backfillQuestionnaireRegistry.ts:83-102` avait déjà le bon réflexe —
il abandonne avant toute écriture sur ce cas, en le nommant « précisément le type
de trou qui a rendu syncPackToRegistry silencieusement vide ». Le chemin
d'écriture praticien, lui, n'avait aucun pré-contrôle.

**L'invariant retenu, et sa borne.** « Une fois un pack miroité, le miroir est
fidèle. » Les trois assertions du contrat sont conditionnées à l'existence d'une
ligne `questionnaire_packs` — ce n'est pas une échappatoire mais la doctrine du
code : `registre_absent` décrit un pack neuf, entre sa création et sa première
synchro ; `ensembles_divergents` décrit une vraie dérive. Un contrat qui
rougirait sur un pack neuf recevrait tôt ou tard une exception, et une exception
creusée pour un cas légitime sert ensuite au défaut. Un miroir **présent mais
vide** face à un pack non vide, lui, n'est pas bénin : la comparaison d'ensembles
le prend.

La justification de cette borne a **changé en cours de lot**, et c'est à noter :
elle citait d'abord le seed, qui n'écrivait aucun miroir. Le garde d'écriture a
rendu cet état intenable en développement — toute sauvegarde de pack y rendait
409 — donc le seed écrit désormais le miroir du pack de base. Le témoin invoqué
au cadrage a disparu ; la borne, elle, tient sur le pack neuf. Cinq documents
citaient encore l'ancien témoin, tous corrigés.

## Ce qui est livré

- `web/src/lib/consultation/packRegistry.ts` — `QidsSansDefinitionError`, levée
  dans la transaction appelante, **avant** toute écriture du miroir. Les items
  écrits sont dédupliqués : `pack_questionnaires` porte
  `@@unique([packId, questionnaireId])`, et un doublon dans `packs.qids` faisait
  jusqu'ici échouer `createMany` en P2002.
- `web/src/app/api/praticien/packs/route.ts` — trois changements.
  1. Les trois `catch`, jusqu'ici nus, rendent un `409 qid_sans_definition`
     **nommant les qids** et journalisent
     (`ASSIGNATION.PACK.REGISTRE_QID_SANS_DEFINITION`). Sans ce passage, le garde
     aurait remplacé une dérive silencieuse par un échec silencieux.
  2. **Le message se scinde** (`messageQidsSansDefinition`) : « à retirer du
     pack » n'est dit que des qids que l'écran sait montrer. Les deux catalogues
     diffèrent — `normaliserQids` filtre sur le SCORING, l'écran ne sert que
     l'AFFICHAGE — et `Q_NEU_12` est dans l'écart.
  3. **`DELETE` ne passe plus par `syncPackToRegistry`** — changement de
     comportement d'une route de production, motivé au point suivant. Il propage
     `actif` au miroir par `updateMany`, rien d'autre.
- `web/prisma/checks/packs_registre_coherence_v1.sql` — préflight lecture seule,
  câblé **trois** fois : `release-db.yml` avant `migrate deploy` (production),
  `ci.yml` sur base vide (vacu, assumé et écrit) et `ci.yml` **après le seed**,
  seule position où il porte sur des données en CI.
- `web/prisma/checks/packs_registre_coherence_v1_negatif.sql` — **huit** formes
  de dérive doivent lever, **quatre** états sains doivent passer. Les deux
  moitiés sont aussi nécessaires : la première interdit un prédicat trop
  permissif, la seconde un prédicat trop strict — qui, sur un préflight
  fail-closed, bloquerait une release sur une base parfaitement saine.
- `web/src/lib/packsRegistreCoherence.guard.test.ts` — le prédicat est écrit deux
  fois : ce banc refuse qu'ils divergent (par **appartenance** assertion par
  assertion, jamais par comptage), refuse qu'un contrat de `checks/` reste non
  câblé, refuse que le préflight passe **après** `migrate deploy`, refuse que le
  contrat perde son `BEGIN READ ONLY` ou gagne un verbe d'écriture, refuse qu'il
  se restreigne aux packs actifs ou perde son `DISTINCT`, et refuse que le
  fichier **négatif** (qui écrit) soit câblé contre la production.
- `web/prisma/seed.ts` — le miroir du pack de base est désormais écrit, **depuis
  la ligne en base et jamais depuis la constante**.
- `web/prisma/checkPackRegistryConsistency.ts` — sa divergence délibérée avec le
  contrat (miroir vide = avertissement là, échec dur ici) est écrite.

## Ce que la revue adversariale a rattrapé

Premier verdict **NO-GO**, trois bloquants ; tous corrigés, revue relancée sur les
correctifs.

- **Le garde partait dans le mauvais sens sur `DELETE`.** La désactivation ne
  touche pas `qids` et ne peut créer aucune divergence — la refuser rendait le
  pack en dérive **indésactivable**, donc actif et assignable. Le garde
  interdisait de retirer le pack qu'il dénonce. `DELETE` ne propage plus que
  `actif`.
- **Le geste nommé n'était pas possible pour toute une classe de qids.**
  `normaliserQids` filtre sur le catalogue de SCORING, l'écran ne montre que le
  catalogue d'AFFICHAGE — et `Q_NEU_12` est dans l'écart. « Retirez-le du pack »
  désignait une case inexistante. Le message se scinde désormais.
- **Le fichier négatif laissait passer cinq réécritures du prédicat**, dont deux
  qui auraient transformé le préflight fail-closed en **bloqueur de release sur
  base saine** (perte du `DISTINCT`, sensibilité à l'ordre). Quatre cas ajoutés.
- **Le banc de non-divergence comptait au lieu d'appartenir** : six occurrences
  de `questionnaire_packs qp` pour trois assertions, donc un seuil « ≥ 3 »
  restait vert après le retrait d'une jointure.
- **Toute base seedée perdait l'écran des packs** — le seed ne créait aucune
  définition, donc toute sauvegarde rendait 409. Corrigé à la source.

Second verdict **NO-GO**, et le bloquant venait d'un **correctif** :

- **Le seed corrigé miroitait la CONSTANTE, pas la ligne en base.** L'upsert du
  pack est un `update: {}` : dès que les deux divergent — un pack de base édité
  depuis l'écran en dev, ou un changement de `PACK_BASE.qids`, qui a déjà eu lieu
  une fois — le seed écrivait un miroir qui ne correspondait pas au legacy.
  C'est-à-dire qu'il **fabriquait la dérive du 2026-08-05**, sur le pack qui part
  à chaque onboarding, et le développeur retrouvait le 409 que ce correctif
  devait supprimer. Un `select` et un identifiant de variable.
- **Aucune étape de CI ne pouvait le voir** : le contrat tournait sur base vide,
  le seed peuple quelques étapes plus loin. D'où la troisième position du
  contrat, **après le seed** — la seule où il porte sur des données en CI.
- **La preuve de la borne était morte dans le même diff** : cinq documents
  citaient encore « le seed n'écrit aucun miroir » comme justification, phrase
  que le correctif venait de rendre fausse. C'est la classe connue du dépôt — une
  clôture qui bénit une preuve qui la dément.

## Un piège de relecture, mesuré : DEUX diffs sont quatre fois trop gros

| fichier | annoncé | réel | CRLF sur `main` → indexé |
|---|---|---|---|
| `web/src/app/api/praticien/packs/route.ts` | 470 / 376 | **110 / 16** | 376 → 0 |
| `web/prisma/seed.ts` | 434 / 341 | **97 / 4** | 341 → 0 |

L'écart est une **normalisation de fins de ligne**, et elle n'est pas un choix :
`.gitattributes:1` porte `* text=auto eol=lf` — **le dépôt impose LF**, et `git
add` normalise. Ces deux fichiers avaient été committés en CRLF **contre la
politique du dépôt** ; la moindre écriture les remet en conformité. Il n'est pas
possible d'indexer du CRLF sans désarmer l'attribut, ce qui ne serait pas un
correctif.

À relire avec :

```bash
git diff --ignore-cr-at-eol -- web/src/app/api/praticien/packs/route.ts web/prisma/seed.ts
```

**Balayage exhaustif des 20 fichiers indexés** (`numstat` avec et sans
`--ignore-cr-at-eol`) : ces deux-là, et eux seuls. La première rédaction de cette
section n'en citait qu'un et affirmait « aucun autre » — une exhaustivité annoncée
sans avoir été balayée, la troisième de cette forme dans ce lot.

## Critères de done

- [x] Re-mesure datée du jour d'ouverture, requête consignée.
- [x] Garde d'écriture mutation-testé (banc Vitest, contrôles négatifs inclus).
- [x] Contrat de production mutation-testé : **10 mutants joués, 9 tués**, témoin
      vert, sur un PostgreSQL jetable — les trois assertions une à une, plus les
      réécritures plausibles nommées par la revue (cardinaux, inclusion, perte du
      `DISTINCT`, perte de l'`ORDER BY`, restriction à `p.actif` sur l'assertion
      1 **puis sur l'assertion 2 seule**, qui survivait au cas de la première).
      Le survivant est un mutant **équivalent**, mesuré : `array_agg(DISTINCT x)`
      rend déjà un tableau trié — aucun cas de donnée ne peut le tuer, et c'est
      le banc textuel qui l'épingle.
- [x] Le seed ne fabrique pas la dérive, éprouvé de bout en bout : base migrée,
      seedée, contrat vert ; ligne `packs` rendue divergente de la constante ;
      seed rejoué ; **contrat toujours vert**, miroir aligné sur la base
      (`{Q_MOD_03,Q_INF_03,Q_STR_01}`).
- [x] `BEGIN READ ONLY` vérifié non décoratif : à travers `prisma db execute`, un
      `CREATE TABLE` y est refusé par le serveur et la table n'existe pas ensuite.
- [x] Prémisse HDS vérifiée et corrigée aux deux endroits.
- [x] T1, T2 et T3 verts — **4 229 Vitest sur 374 fichiers**, 340 au banc courte
      forme, **130 E2E passés**, build de production.
- [x] Revue `wn-reviewer` (NO-GO, 4 bloquants + 5 majeurs), correctifs, revue
      relancée sur les correctifs.
