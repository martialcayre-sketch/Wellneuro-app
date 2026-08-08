---
id: "LOT-03"
titre: "Dette 4 — re-mesurer, puis garder contre le retour de la dérive"
statut: "à ouvrir"
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

## Correction mineure rattachée

L'incohérence de date de l'arbitrage HDS, signalée et non tranchée à la clôture :
`../2026-08-05-cloture-des-dettes-wellneuro-5-0/CAMPAGNE.md:54` le date du
**2026-07-22**, `docs/DOSSIER_RGPD.md:20` et la checklist du gate du
**2026-07-21**. L'échéance, elle, est la même partout — **2026-10-21**.

## Preuve attendue

- La lecture d'ouverture, **avec sa date**, dans la section `## Résultats` du lot.
- Un garde qui détecte le retour d'une divergence registre/packs, mutation-testé
  (introduire une divergence fait rougir).
- T2 avant commit ; T3 si le garde touche les contrats de `web/prisma/checks/`.

## Question à trancher à l'ouverture

`web/prisma/checks/` (contrat rejoué en CI sur base éphémère, gratuit, mais
aveugle à la production réelle) ou lecture de production planifiée (seule à voir
la vraie dérive, mais à faire vivre) ? La dérive observée venait de la
**production**, pas d'un seed — le fait pousse vers le second, le coût vers le
premier.
