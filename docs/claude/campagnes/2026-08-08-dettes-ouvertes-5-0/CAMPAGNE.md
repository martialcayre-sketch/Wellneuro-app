---
id: "2026-08-08-dettes-ouvertes-5-0"
titre: "Les trois dettes ouvertes de 5.0 — et ce que « certifié » affiche sans le dire"
statut: "en cours (2026-08-08) — LOT-00 à LOT-03 livrés, LOT-04 ouvert (dettes nommées par D-036)"
créée_le: "2026-08-08"
mise_à_jour: "2026-08-08"
lot_courant: "LOT-03"
branche_campagne: "campaign/2026-08-08-dettes-ouvertes-5-0/integration"
branche_lot_courant: "lot-03-garde-derive-packs"
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
  d'arbitrage HDS « divergente d'un jour » part au LOT-03 — **où elle s'est
  révélée n'être pas une divergence** : le 2026-07-21 date l'instruction de
  l'hébergement et la dérogation, le 2026-07-22 l'arbitrage qui en découle. Deux
  évènements, pas deux versions d'un même. Le LOT-03 a donc nommé l'évènement à
  côté de chaque date au lieu de les aligner.

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
- **Jusqu'à quand garder la redirection `/patient/*` ?** Le LOT-01 a retiré le
  parcours mais laissé sa redirection **sans échéance** : la dette « une date
  qui n'existe pas » s'est déplacée, elle ne s'est pas fermée. Elle sert des
  liens e-mail déjà partis, dont on ignore la durée de vie réelle — une mesure
  d'accès sur la redirection trancherait (constat de la revue du 2026-08-08).
- **`api/patient/assignations` n'a plus d'appelant** depuis le LOT-01. Retrait
  d'une route d'API = décision séparée ; porté ici pour ne pas le redécouvrir
  dans six semaines.
- **`seuils_points` reste ouvert dans la classe « recueil partiel »** : il ne
  garde que le recueil entièrement vide, et son porteur `Q_ALI_01` est allumé en
  production. Aucune règle d'orientation publiée ne lit sa bande — c'est la
  seule raison pour laquelle il attend. Fermer ce moteur est un geste clinique
  qui demande sa propre décision.
- ~~Le badge du LOT-02 doit-il porter une infobulle, un libellé plus long
  (« Scoring vérifié ») ou un lien vers la définition ?~~ **Tranchée le
  2026-08-08 : le libellé, et sur toute la famille des libellés** (`D-036`). Le
  coût d'usage oral est accepté ; une infobulle native est hover-only et
  `UX_WELLNEURO_3_0.md` la remplace explicitement par un bouton d'information.
- **Le vocabulaire de l'écran et celui du dossier ont divergé, et c'est voulu.**
  Le LOT-02 n'a renommé aucune donnée : `instrument_registry.json`,
  `StatutCertificationRuntime` et la valeur `'certifie'` gardent le mot. Faut-il
  un jour aligner le dossier sur l'écran ? Ce serait une campagne de registre, et
  la dépendance irait dans le bon sens ; rien ne l'exige aujourd'hui.
- **Le seed omet une clé que le moteur produit.** Les **15** blocs `scoresJson` de
  `web/prisma/seed.ts` ne portent aucune `certification`, alors que les moteurs la
  propagent. Aucun E2E n'assère donc les libellés de passation — mais **rien ne
  l'en empêche** : c'est une assertion qui manque, pas une impossibilité. Étendre
  le seed et poser l'assertion : geste séparé, non fait au LOT-02. Et le geste ne
  suffira pas seul — Sophie Nicola porte **cinq** passations, dont **quatre**
  déclarent `certification` ; la cinquième est le PSQI, muet.
  **Arbitré le 2026-08-08 : LOT-04.**
- **Le badge est muet pour 21 des 65 instruments, production comprise.** Mesuré
  le 2026-08-08 sur le catalogue résolu : 38 `certifie`, **21 `inconnu`**, 6
  `ambigu`. Croisés au registre : **18 des 21 portent `scoring_verifie`**, dont le
  PSQI (`Q_SOM_01`) ; les trois autres non (`Q_GEO_04` `contenu_verrouille`,
  `Q_SOM_09` `droits_verifies`, `Q_ALI_09` `repere`) — pour le MMSE, « Statut
  inconnu » est l'écho du registre, pas une divergence. Le lot traite le badge qui
  rassure à tort ; celui qui ne dit rien reste.
  **Arbitré le 2026-08-08 : ce n'est PAS un lot, c'est une décision produit** —
  faire parler le badge suppose de choisir la source d'autorité d'une affirmation
  clinique, ce que `D-034` fige. Elle se prendra **sur la liste que produit le
  LOT-04**, et s'écrira en `D-037` : arbitrer aujourd'hui reviendrait à décider
  sur un chiffre relevé une fois à la main.
- **Rien ne relie le libellé au barreau dont il emprunte le nom.** « Scoring
  vérifié » reproduit `scoring_verifie` du registre, mais lit
  `def.scoring.certification.status` du catalogue de code, et
  `verifier_registre_instruments.js` ne compare jamais les deux.
  **Arbitré le 2026-08-08 : LOT-04, et non le LOT-03.** Les deux gardent une
  « dérive entre deux sources », mais ne partagent aucun mécanisme — deux tables
  Postgres et `web/prisma/checks/` d'un côté, deux fichiers du dépôt et
  `scripts/lib/` de l'autre. Ce garde est en outre l'**instrument de mesure** de
  la dette ci-dessus : sa sortie EST la liste des divergences.
- ~~Le garde anti-dérive du LOT-03 doit-il vivre dans `web/prisma/checks/` ou en
  lecture de production planifiée ?~~ **Tranché le 2026-08-08 : les deux
  hypothèses de la question étaient fausses.** Le contrat en CI n'est pas
  « aveugle mais gratuit », il est **vacu** (base construite par `migrate deploy`
  seul, aucun pack) ; et il ne manquait pas de mesureur —
  `checkPackRegistryConsistency.ts` existe, hors CI. Retenu : un garde dans le
  **chemin d'écriture** (qui ferme le générateur découvert à la re-mesure) plus un
  **préflight de production** dans `release-db.yml`. La lecture planifiée est
  écartée : elle exigeait un secret de production dans GitHub Actions. Détail
  dans le fichier du LOT-03.

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
| LOT-02 | « Certifié » à l'écran sans la définition de D-034 | livré (2026-08-08) — renommé « Scoring vérifié » | — |
| LOT-03 | Dette 4 — re-mesurer, puis garder contre le retour de la dérive | en cours (2026-08-08) | LOT-00 |
| LOT-04 | Le libellé « Scoring vérifié » relié au barreau `scoring_verifie`, et le seed aussi fidèle que le moteur | à_faire | LOT-02 |

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
- [x] Le badge « Certifié » ne peut plus se lire comme une validation
      psychométrique, et un banc l'assère. **Renommé « Scoring vérifié »**, sur
      les neuf libellés de la famille et les trois proses du tiroir cabinet
      (`D-036`). Preuve relue le 2026-08-08 :
      `certificationLibelles.guard.test.ts` (table écrite à la main,
      exhaustivité par le typage, refus de `/certifi/i` sur les valeurs rendues,
      auto-test du motif), **neuf mutations rendues rouges** — dont **cinq
      trouvées par deux passes de revue adversariale, et trois qui passaient
      encore vertes après le premier correctif** : le SENS de la prose cabinet
      inversé sans le mot interdit, un libellé nu posé directement dans le
      composant, `variant="success"` codé en dur (tous les états en vert), la
      clause `statutCertification === 'certifie'` retirée du `||`, et le badge
      masqué pour l'état `inconnu`. S'y ajoutent deux bancs de rendu qui assèrent
      le texte **et la couleur** (`BibliothequePanel.test.tsx` pour les **six**
      états du catalogue, `FichePatientPanel.test.tsx` pour la colonne
      « Qualité ») et le sélecteur E2E du badge cabinet.
      Réserves à ne pas effacer : le seed omet une clé que le moteur **produit**
      (assertion manquante, pas impossibilité) ; le badge est **muet pour 21 des
      65 instruments**, production comprise ; et rien ne relie le libellé au
      barreau `scoring_verifie` dont il emprunte le nom.
- [x] La dérive registre/packs est re-mesurée à l'ouverture du LOT-03, avec sa
      date, et un garde détecte son retour. Lecture de production du
      **2026-08-08** : **0 divergence sur 8 packs**, requête consignée dans le
      fichier de lot (celle du 2026-08-05 ne l'était pas). La re-mesure a
      découvert le **générateur** de la dérive : `syncPackToRegistry` jetait
      silencieusement tout qid sans `QuestionnaireDefinition` — la définition de
      `Q_SOM_09` n'existait que depuis le 2026-08-06 14:59. Deux gardes, non un :
      le chemin d'écriture refuse désormais (409 nommant les qids, journalisé), et
      `prisma/checks/packs_registre_coherence_v1.sql` tourne en **préflight de
      production** dans `release-db.yml`. Trois mutations du prédicat, trois
      rouges, témoin vert, sur un PostgreSQL jetable. La **lecture de production
      planifiée est écartée** : elle exigeait un secret de production dans
      GitHub Actions, second chemin d'accès à la base.
- [x] Les corrections mineures : commentaires de scoring **faits** (LOT-01) ;
      **la « divergence » de date HDS n'existe pas** — le 2026-07-21 est
      l'instruction et la dérogation, le 2026-07-22 l'arbitrage. Deux évènements.
      L'évènement est désormais nommé à côté de chaque date aux deux endroits
      (LOT-03).
- [ ] Le jalon du 2026-10-21 est rappelé à la clôture, pour le gate **et** pour
      le dossier RGPD.
- [ ] T2 avant chaque commit UI/API, T3 avant la PR de campagne ; anti-secrets.
