---
id: "2026-08-07-dettes-packs-residuelles"
titre: "Dettes résiduelles des packs — l'instrument suspendu et la preuve de parcours"
statut: "terminé (2026-08-07)"
créée_le: "2026-08-07"
mise_à_jour: "2026-08-07"
lot_courant: "aucun"
branche_campagne: "campaign/2026-08-07-dettes-packs-residuelles/integration"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Dettes résiduelles des packs — l'instrument suspendu et la preuve de parcours

## Objectif

Fermer les deux dettes que la clôture de la campagne
`2026-08-06-packs-personnalises` (LOT-04, 2026-08-07) a nommées comme méritant un
lot, et **seulement celles-là** : un instrument suspendu soudé au pack de base
qu'aucun geste praticien ne peut retirer, et l'absence totale de preuve E2E sur
le parcours qui remplace désormais les packs.

La campagne n'ajoute pas de fonctionnalité. Elle rend possible un geste
aujourd'hui impossible, et rend observable un parcours aujourd'hui invisible aux
bancs.

**Le LOT-00 débloque une autre campagne en cours.**
`../2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:44-53` fait de
« **Aucun pack ne référence `Q_ALI_09`** » un **prérequis bloquant** de
l'allumage de `WN_AGENDA_ALI` :

```sql
SELECT nom, par_defaut, actif FROM packs WHERE 'Q_ALI_09' = ANY(qids);
-- attendu : 0 ligne
```

**Au cadrage du 2026-08-07, la production en rendait 1** — le pack de base ;
**elle en rend 0 depuis le retrait du 2026-08-07 15:46** (LOT-00 livré,
`packs.updated_at = 2026-08-07 15:46:34.011`). Motif donné par le runbook : c'est
**le seul chemin qui assignerait l'agenda sans clic praticien**,
`assignPackToPatient` (appelé par l'onboarding portail) n'écartant que
`IDS_SUSPENDUS`, et rien ne validant les `qids` d'un pack contre cette liste. Le
retrait de `Q_ALI_09` du pack de base est donc **requis, pas à arbitrer**.

**Risque en clair** : tant que cette ligne existe, allumer `WN_AGENDA_ALI`
auto-assignerait l'agenda alimentaire à **chaque patient onboardé, sans décision
praticien** — précisément ce que [[D-025]] protège.

## Résultat observable

1. Le pack de base ne porte plus `Q_ALI_09`, et un geste praticien existe pour
   ôter d'un pack un qid de `IDS_SUSPENDUS` — vérifiable par lecture SQL de
   production et par l'écran « Questionnaires & packs ».
2. Un parcours E2E couvre orientation → file d'envoi → envoi → déduplication,
   sur patient fictif, envoi de mail neutralisé.

## Contraintes non négociables

- Aucun secret en dur.
- Tous les textes UI en français.
- Aucun patient réel ; exemples limités à Sophie Nicola, Jennifer Martin et
  Michel Dogné.
- **Aucune migration Prisma/SQL** : la correction du pack de base est un geste de
  donnée par l'UI praticien, comme le retrait du LOT-03 de la campagne
  précédente.
- Les E2E sont **exclusifs au Mac** : jamais deux runs en parallèle, les fixtures
  sont partagées (`docs/ROLES_MACHINES.md`).
- LOT-00 touche un instrument clinique suspendu : `changelog.d/` obligatoire,
  revue adversariale `wn-reviewer` avant PR.

## Décisions prises

- **Seule la dette `Q_ALI_09` reçoit un lot parmi les dettes de packs nommées à
  la clôture** (arbitrage du 2026-08-07) — et elle le reçoit d'autant plus qu'elle
  bloque l'allumage de `WN_AGENDA_ALI` (ci-dessus). Les **cinq** autres — le
  `upsert` no-op de `web/prisma/seed.ts:288-294` au message de succès faux,
  `questionnaire_packs.actif` jamais relu
  (`web/src/lib/consultation/packRegistry.ts:89-123`), aucune réactivation de
  pack depuis l'UI, le commentaire en capitales de
  `web/prisma/schema.prisma:155-156`, la suture `suggestedPackSelection` morte —
  sont écrites sans lot d'accueil dans
  `../2026-08-06-packs-personnalises/lots/LOT-04-validation.md`. C'est un choix,
  pas un oubli : aucune n'a d'effet clinique observable aujourd'hui.
- **La dette « `seed.ts` porte 5 qids » est, elle, dans le périmètre du
  LOT-00** : le retrait de `Q_ALI_09` du pack de base doit se refléter dans le
  seed. À ne pas confondre avec le `upsert` no-op ci-dessus — **deux défauts
  distincts sous le même mot `seed`**.
- Le parcours E2E manquant part en **lot nommé** plutôt qu'en extension du LOT-04
  de la campagne précédente, dont le « Hors périmètre » exclut tout nouveau
  développement.

## Questions ouvertes

- Le geste de retrait d'un qid suspendu doit-il être un bouton dédié dans
  l'écran d'édition de pack, ou l'affichage en lecture seule du qid suspendu avec
  une case décochable ? (à trancher en ouverture de LOT-00, sur l'écran réel)
- L'E2E du LOT-01 doit-il asserter l'envoi du mail récapitulatif, ou s'arrêter à
  l'assignation créée ? (à trancher au LOT-01, selon le point de neutralisation
  disponible)

## Dépendances

- Campagne `2026-08-06-packs-personnalises`, close le 2026-08-07 : c'est son
  LOT-04 qui nomme ces deux dettes et leurs preuves.
- Campagne `2026-08-04-agenda-alimentaire` (en cours) : **elle dépendait de ce
  LOT-00**, pas l'inverse. Son prérequis d'allumage « aucun pack ne référence
  `Q_ALI_09` » (`RUNBOOK-allumage-drapeau.md:44-53`) est **de nouveau satisfait
  depuis le 2026-08-07 15:46** — 0 ligne. Le déblocage ne lui ouvre pas `LOT-06`
  pour autant : `../2026-08-04-agenda-alimentaire/CAMPAGNE.md:123` et `:151`
  gardent le barème derrière « un recueil suffisant pour calibrer (clôture des
  21 jours) », et le recueil en est à **2 journées, toutes deux du 2026-08-05,
  sur 1 assignation**.
- Campagne `2026-08-05-cloture-des-dettes-wellneuro-5-0` (LOT-06/07 ouverts) :
  activité primaire depuis la clôture ci-dessus. Vérifier au cadrage qu'aucun lot
  ne se recouvre.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Q_ALI_09 dans le pack de base — auto-assigné à l'onboarding drapeau allumé, irretirable drapeau éteint | livré (2026-08-07) — code (PR #608) et donnée (geste praticien du 2026-08-07 15:46) | — |
| LOT-01 | Parcours E2E orientation → file d'envoi → envoi → déduplication | livré (2026-08-07) — PR #614, `verify` vert, sept mutations rouges | — |

## Done de campagne

- [x] Le pack de base ne porte plus `Q_ALI_09` (lecture SQL de production du
      2026-08-07 : 5 qids, `pack_questionnaires` à 5 lignes en `ordre`
      `[0,1,2,3,4]`, 0 ligne au `WHERE 'Q_ALI_09' = ANY(qids)`).
- [x] Un geste praticien retire un qid suspendu d'un pack, avec banc
      (`web/src/components/PacksPanel.tsx:635-649`,
      `web/src/components/PacksPanel.test.tsx:314` et `:351-385`).
- [x] Le parcours orientation → file d'envoi → envoi → déduplication a une
      couverture E2E, verte en CI (`web/e2e/orientation-file-envoi.spec.ts`,
      PR #614 mergée le 2026-08-07 19:16, `verify` lu vert sur le commit de
      fusion ; sept mutations rouges, chacune sur une assertion distincte,
      précédées d'une passe de référence verte).
- [x] `changelog.d/` posé pour le volet clinique
      (`changelog.d/2026-08-07-packs-retirer-instrument-suspendu.md` pour le
      geste, `changelog.d/2026-08-07-pack-de-base-sans-agenda-alimentaire.md`
      pour son effet en production).
- [x] Handoff final produit avant la PR de clôture
      (`docs/claude/handoffs/2026-08-07-2200-cloture-campagne-packs-residuelles.md`).

## Clôture — 2026-08-07

**La pièce du LOT-00 a été RELUE à la clôture, pas reprise.** La campagne
précédente s'est close le 2026-08-07 en bénissant une preuve antérieure à la
dérive qu'elle avait elle-même produite ; ne pas refaire ce chemin coûte une
requête. Lecture de production du **2026-08-07 en fin de journée** :
« Base de consultation » (`PACK_-bG21yeIvVYRhrdlYuWIMnFz`) est **actif**, à
**5 qids** (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_SOM_09`, `Q_ALI_01`),
`updated_at` **inchangé à `2026-08-07 15:46:34.011`** — donc rien n'a réécrit ce
pack depuis le geste praticien. Et **aucun pack de la base ne référence
`Q_ALI_09`** : le prérequis d'allumage du runbook agenda tient toujours.

**Ce que la campagne ferme.** Les deux dettes que le LOT-04 de
`2026-08-06-packs-personnalises` avait nommées : l'instrument suspendu soudé au
pack de base (LOT-00, code et donnée) et l'absence de preuve de parcours
(LOT-01). Rien d'autre — c'était le périmètre déclaré.

**Ce qu'elle ne ferme pas, et qui n'a toujours pas de lot d'accueil.** Les cinq
dettes de packs listées au `## Hors périmètre` du LOT-01 (D-032). La réserve
nommée au LOT-00 : **un prérequis de runbook vérifié à l'allumage n'est
re-vérifié par rien ensuite** — celui de `WN_AGENDA_ALI`, satisfait le
2026-08-05, a été cassé le lendemain à 18:02 sans aucune alerte, sur un pilote
déjà lancé ; aucun contrat de `web/prisma/checks/` n'assère « aucun pack actif ne
référence un qid de `IDS_SUSPENDUS` ». Et la question clinique ouverte sur
`R2-SOM-05` (Horne sans la porte `RYTHME_BIOLOGIQUE`), qui est une décision
praticien.

**Les deux questions ouvertes de la campagne sont tranchées.** Le geste de
retrait est une case décochable dans un bloc distinct, pas un bouton dédié
(LOT-00). Et l'E2E **s'arrête à l'assignation créée** : l'envoi du mail n'est pas
asséré, `SMTP_URL` étant vide sur le banc — c'est écrit dans le spec et dans le
fait 2 amendé de la campagne précédente.
