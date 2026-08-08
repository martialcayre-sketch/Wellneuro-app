---
id: "2026-08-08-dettes-ouvertes-5-0"
titre: "Les trois dettes ouvertes de 5.0 — et ce que « certifié » affiche sans le dire"
statut: "en cours (2026-08-08) — LOT-00 livré, trois lots ouverts"
créée_le: "2026-08-08"
mise_à_jour: "2026-08-08"
lot_courant: "LOT-01"
branche_campagne: "campaign/2026-08-08-dettes-ouvertes-5-0/integration"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Les trois dettes ouvertes de 5.0 — et ce que « certifié » affiche sans le dire

## Objectif

Fermer les trois dettes que
`../2026-08-05-cloture-des-dettes-wellneuro-5-0/DECLARATION_5_0.md` laisse
**ouvertes** — 6 (état réel), 5 (deux parcours patients), 4 (double source des
packs) — et **nommer** une quatrième que cette clôture n'avait pas vue : le badge
« Certifié » de l'UI praticien n'emporte nulle part la définition que D-034 pose.

La campagne n'ajoute aucune fonctionnalité et n'ingère aucun savoir. Elle pose
des **gardes** là où la clôture précédente a démontré, sur elle-même, qu'une
relecture ne suffisait pas.

## Résultat observable

1. Une vue dérivée qui ment sur sa source fait rougir un banc — pas une revue.
2. Le parcours patient legacy **n'existe plus** — arbitrage du 2026-08-08 :
   retrait immédiat plutôt que date-cible. Seule subsiste la redirection 307,
   pour les liens e-mail déjà partis.
3. Le badge « Certifié » ne peut plus être lu par un praticien comme une
   validation psychométrique : la définition de D-034 est à portée du badge.
4. Une dérive registre/packs qui reviendrait est **détectée**, et non retrouvée
   par hasard lors d'une lecture manuelle de production.

## Pourquoi la dette 6 en premier — et pour la bonne raison

Le motif écrit à la clôture (« tout jugement sur les autres dettes passe par
lui ») était **faux**, et la déclaration l'a corrigé elle-même : aucun des huit
verdicts n'a utilisé `wn-etat-reel.mjs`, tous ont été rendus en exécutant les
scripts et en lisant le code. **La dette 6 n'est le prérequis de rien.**

Le motif retenu est un **taux de récidive** :

- la campagne close a produit **quatre auto-déclarations fausses** sur huit lots ;
- et les **deux défauts de sa propre PR de clôture** sont exactement ce que les
  deux premiers gardes ci-dessous attraperaient — un troisième s'y ajoute, sur
  le lot courant, que la déclaration nomme comme comparé par rien :
  - `ACTIVE_CAMPAIGN.md` régénéré **avant** l'édition de `.wn/state.json` dont il
    dérive, donc publiant « Lot actif : LOT-06 » sous une source qui disait
    LOT-07 → **garde 1 : confronter la vue dérivée à sa source** ;
  - `validation.last_checked_at` périmé de quinze jours, seul écart que l'outil
    savait encore voir → **garde 2 : refuser un `last_checked_at` postérieur à
    `updated_at`**, l'inverse temporel d'une validation qui n'a pas été rejouée
    depuis la dernière écriture d'état.

Cet argument ne dit pas « d'abord parce que le reste en dépend ». Il dit **tôt et
pas cher** : des gardes qui coûtent une demi-journée protègent la classe de
défaut la plus fréquemment observée du dépôt sur les dix derniers jours.

## Contraintes non négociables

- Aucun secret en dur ; textes UI en français.
- Aucun patient réel ; exemples limités à Sophie Nicola, Jennifer Martin, Michel
  Dogné.
- **Aucune migration Prisma/SQL, aucune écriture Supabase.** La re-mesure du
  LOT-03 est une **lecture** `execute_sql` via l'outil MCP.
- Aucune modification de seuil clinique ; aucune nouvelle ingestion de savoir.
- Changements minimaux — le périmètre est celui des dettes nommées, rien d'autre.
- **Un garde qui assère une présence doit aussi refuser l'inversion exacte du
  défaut** — leçon de D-034 et du garde `promptAlimentaire.guard.test.ts`.

## Décisions prises

- **Les trois dettes ouvertes reçoivent chacune un lot**, dans l'ordre révisé de
  la déclaration : 6, puis 5, puis 4 re-mesurée d'abord.
- **Le badge « Certifié » entre au périmètre comme dette nommée** (LOT-02), pas
  comme correctif offert : D-034 a aligné la consigne système de synthèse — la
  seule surface du **runtime** qui revendiquait la validation — mais
  `BibliothequePanel.tsx:34` (« Certifié ») et `FichePatientPanel.tsx:138,147`
  (« Certifié Drive », « Certifié manuel EORTC ») affichent le mot **nu** au
  praticien. La décision existe, la définition est écrite dans
  `docs/claude/corpus/README.md` et `docs/DECISIONS.md` (D-034) ; **elle ne
  voyage pas jusqu'à l'écran**. Ce n'est pas fait, et rien dans cette campagne ne
  prétendra le contraire avant que le lot ne soit livré.
- **La dette 4 est re-mesurée avant d'être traitée.** La correction périmée est
  déjà portée dans `DECLARATION_5_0.md` (section dette 4, encadré du
  2026-08-08) : la mesure « 1 pack sur 8 en dérive » datait du 2026-08-05 et la
  lecture du 2026-08-08 rend **0 divergence sur 8 packs**. Le lot ne repart donc
  pas de la valeur citée mais d'une lecture datée du jour de son ouverture.
- **Les deux corrections mineures voyagent avec le lot le plus proche** : les
  commentaires de `orientationEngine.ts:212` et `orientationRulesV1.ts:229` qui
  déclarent encore ouverts trois moteurs fermés partent au LOT-01 ; la date
  d'arbitrage HDS divergente d'un jour (2026-07-21 / 2026-07-22) part au LOT-03.

## Échéance du 2026-10-21 — elle court pour deux dossiers, pas un

La dette 8 est **arbitrée et reportée** au 2026-10-21, et cette date n'est pas
seulement celle du gate G-TRUST-04 : `docs/DOSSIER_RGPD.md:20` borne la
dérogation au **2026-10-21**, et **les quinze trous du dossier portent tous cette
même date d'échéance** (`docs/DOSSIER_RGPD.md:290-304`), dont neuf attendent une
décision du responsable et trois un conseil qualifié.

**Conséquence pour cette campagne** : aucun de ses lots ne lève le gate, et aucun
ne comble un trou RGPD — ce sont des décisions hors code. Mais l'échéance est
**une seule** : sans reconduction écrite au 2026-10-21, ce sont le gate **et** le
dossier RGPD qui reprennent la règle du dépôt le même jour. La campagne le porte
comme **jalon**, à rappeler à sa clôture, pas comme lot.

## Questions ouvertes

- ~~Le garde de cohérence vue/source du LOT-00 doit-il **échouer** ou
  **régénérer** ?~~ **Tranché au LOT-00 : il échoue.** Un garde qui répare
  efface la récidive qu'il est censé compter ; la réparation reste un geste
  explicite, et elle n'est pas la même pour les trois gardes (le détail est dans
  l'entête de `scripts/wn-coherence-etat.test.mjs`).
- ~~La date-cible de retrait du parcours legacy (LOT-01)~~ **Tranchée le
  2026-08-08 : retrait immédiat.** La mesure d'usage qu'invoquait
  `next.config.mjs` n'existait pas, et le parcours était inatteignable depuis
  trois jours — la produire pour dater un retrait acquis aurait coûté plus que
  le retrait lui-même.
- Le badge du LOT-02 doit-il porter une infobulle, un libellé plus long
  (« Scoring vérifié ») ou un lien vers la définition ? Le mot « Certifié » est
  employé par le praticien à l'oral : le renommer a un coût d'usage.
- Le garde anti-dérive du LOT-03 doit-il vivre dans `web/prisma/checks/` (contrat
  de données, rejoué en CI sur base éphémère) ou en lecture de production
  planifiée ? Seul le second voit la vraie dérive ; seul le premier est gratuit.

## Dépendances

- `2026-08-05-cloture-des-dettes-wellneuro-5-0` — **close** (2026-08-08). Cette
  campagne est l'accueil de ses dettes ouvertes ; elle ne les rouvre pas, elle
  les reprend. Aucun lot ne se recouvre : les huit lots de la campagne close sont
  livrés.
- `2026-08-04-agenda-alimentaire` (parallèle, en attente de recueil) et
  `2026-08-07-dettes-packs-residuelles` (close) touchent toutes deux les
  **packs**. Le LOT-03 lit la même table : vérifier à son ouverture qu'aucune
  écriture de pack n'est en vol, sous peine de re-mesurer un état transitoire —
  c'est précisément ce qui a périmé la mesure de la dette 4.
- G-TRUST-04 et `docs/DOSSIER_RGPD.md` : jalon du 2026-10-21 ci-dessus, hors
  périmètre de code.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Dette 6 — trois gardes contre la récidive d'auto-déclaration | livré (2026-08-08) | — |
| LOT-01 | Dette 5 — le parcours legacy retiré (arbitrage : retrait immédiat) | livré (2026-08-08) | — |
| LOT-02 | « Certifié » à l'écran sans la définition de D-034 | à ouvrir | — |
| LOT-03 | Dette 4 — re-mesurer, puis garder contre le retour de la dérive | à ouvrir | LOT-00 |

## Done de campagne

À cocher **sur preuve relue**, jamais sur la prose d'un lot — et en vérifiant la
**date** de chaque mesure citée, pas seulement sa valeur.

- [ ] Une vue dérivée désynchronisée de sa source fait rougir un banc, démontré
      par mutation (désynchroniser volontairement, le banc rougit).
- [ ] `last_checked_at` postérieur à `updated_at` est refusé, et le test le
      prouve par mutation.
- [ ] Le lot courant de `.wn/state.json` est confronté à `CAMPAGNE.md`.
- [x] Le parcours legacy est **retiré** (le cadrage prévoyait une date-cible ;
      l'arbitrage du 2026-08-08 a préféré le retrait).
- [x] Aucun `href` interne ne vise `/patient/:idAssignation` — il vivait dans
      la page supprimée.
- [ ] Le badge « Certifié » ne peut plus se lire comme une validation
      psychométrique, et un banc l'assère.
- [ ] La dérive registre/packs est re-mesurée à l'ouverture du LOT-03, avec sa
      date, et un garde détecte son retour.
- [ ] Les corrections mineures : commentaires de scoring **faits** (LOT-01) ;
      date d'arbitrage HDS divergente d'un jour, encore à faire (LOT-03).
- [ ] Le jalon du 2026-10-21 est rappelé à la clôture, pour le gate **et** pour
      le dossier RGPD.
- [ ] T2 avant chaque commit UI/API, T3 avant la PR de campagne ; anti-secrets.
