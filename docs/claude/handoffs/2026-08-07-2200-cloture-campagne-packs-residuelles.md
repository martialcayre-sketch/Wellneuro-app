# Handoff — 2026-08-07 22:00 — Clôture de `2026-08-07-dettes-packs-residuelles`

**Campagne** : `2026-08-07-dettes-packs-residuelles` · **Statut** : terminé (2026-08-07)
**Activité primaire promue** : `2026-08-05-cloture-des-dettes-wellneuro-5-0` (LOT-06)

## Ce que la campagne ferme

Les deux dettes que le LOT-04 de `2026-08-06-packs-personnalises` avait nommées,
et **seulement** celles-là :

- **LOT-00** — un instrument suspendu soudé au pack de base. Code (PR #608) et
  donnée (geste praticien du 2026-08-07 15:46).
- **LOT-01** — le parcours orientation → file d'envoi → envoi → déduplication
  n'avait aucune preuve E2E. PR #614, `verify` vert, sept mutations rouges
  chacune sur une assertion distincte, précédées d'une passe de référence verte.

## La pièce a été RELUE à la clôture, pas reprise

La campagne précédente s'était close en bénissant une preuve **antérieure à la
dérive qu'elle avait elle-même produite**. Ne pas refaire ce chemin coûte une
requête. Lecture de production du 2026-08-07 en fin de journée :

- « Base de consultation » (`PACK_-bG21yeIvVYRhrdlYuWIMnFz`) : **actif**,
  **5 qids** (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_SOM_09`, `Q_ALI_01`),
  `updated_at` **inchangé à `2026-08-07 15:46:34.011`** — rien n'a réécrit ce pack
  depuis le geste praticien.
- **Aucun pack de la base ne référence `Q_ALI_09`** : le prérequis d'allumage du
  runbook agenda tient toujours.
- Un seul pack est `actif` ; les sept autres sont inactifs, conformément à la
  campagne qui a retiré les packs figés.

## Ce que ce lot a appris, et qui vaut au-delà de lui

**1. Deux verrous indépendants rendaient l'orientation injouable en test.**
`WN_ENABLE_ORIENTATION_NNPP2` n'était posé nulle part côté dépôt alors qu'il est
en production depuis le 2026-08-04 — il est désormais armé dans
`webServer.env`. Et même armé, le seed ne déclenche rien :
`scoresPourOrientation` **ignore le `scoresJson` stocké** et recalcule depuis
`rawAnswers`, qu'**aucune** des 14 passations seedées ne porte.

**2. Sur une liste chargée en client, une absence ne s'assère pas à l'écran.**
`brouillons` part de `[]` : `toHaveCount(0)` **et** « La file est vide » sont
vrais *pendant le chargement*. Les deux ont laissé VERTE une mutation qui cassait
réellement le produit. Le maillon se lit sur la réponse du GET — en testant
d'abord `unavailable`, la route rendant un JSON bien formé sur 401 comme sur 500.

**3. Un fait périmé a trompé deux fois.** `WN_G4_*`/`WN_G5_*` sont présentés
comme éteints en production par plusieurs commentaires de
`web/playwright.config.ts`, alors qu'ils y sont posés depuis le 2026-07-21/22 —
ce que `SESSION_LOG.md` avait déjà corrigé une fois. Je l'ai recopié, la revue
adversariale l'a attrapé. Le diff pose l'avertissement à côté ; **il ne réécrit
pas les commentaires eux-mêmes**.

## Ce qui reste ouvert, sans lot d'accueil

- **Les cinq dettes de packs** (D-032) : `seed.ts:288-294` upsert `update:{}`
  no-op au message de succès faux ; `questionnaire_packs.actif` jamais relu par
  `packRegistry.ts:89-123` ; aucune réactivation de pack depuis l'UI ;
  `schema.prisma:155-156` cite le pack en capitales ; suture
  `suggestedPackSelection` morte.
- **Un prérequis de runbook n'est re-vérifié par rien après l'allumage.** Celui de
  `WN_AGENDA_ALI`, satisfait le 2026-08-05, a été cassé le lendemain à 18:02 par
  une écriture sur le pack de base, sans alerte, sur un pilote déjà lancé. Aucun
  contrat de `web/prisma/checks/` n'assère « aucun pack actif ne référence un qid
  de `IDS_SUSPENDUS` » — et un tel contrat devrait se lire **dans la position du
  drapeau de son environnement**, sinon il rougit en CI sur un état sain.
- **Ce que le spec E2E ne couvre pas** : l'envoi du mail, le 409 `deja_assigne`,
  une cible pack, un patient sans email. Une règle vers une cible, pas la table.
- **Le recueil de l'agenda alimentaire est arrêté au premier jour** : 2 journées,
  toutes deux du 2026-08-05, sur 1 assignation. Sa campagne n'attend plus un
  correctif, elle attend des données que personne ne saisit.

## Prochain geste

`2026-08-05-cloture-des-dettes-wellneuro-5-0` / **LOT-06** — notices
psychométriques et exigences RGPD ; puis LOT-07 (déclaration 5.0), qui exige de
solder la PR #372.
