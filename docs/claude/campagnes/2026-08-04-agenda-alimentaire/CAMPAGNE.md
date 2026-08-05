---
id: "2026-08-04-agenda-alimentaire"
titre: "Agenda alimentaire 21 jours (Q_ALI_09)"
statut: "en_cours"
créée_le: "2026-08-04"
mise_à_jour: "2026-08-05"
lot_courant: "LOT-05"
---

# Agenda alimentaire 21 jours (Q_ALI_09)

> Campagne créée rétroactivement le 2026-08-04 pour rapatrier une série de lots
> qui a vécu jusqu'ici hors de `docs/claude/campagnes/`, dans
> `docs/claude/handoffs/` puis `docs/claude/lots/`. Les cinq premiers lots sont
> désormais livrés — `LOT-04` (surface de saisie patient) l'a été le
> 2026-08-05. Le même jour, le drapeau a été allumé en Production et un recueil
> pilote démarré sur un dossier de contrôle (`RUNBOOK-allumage-drapeau.md`) :
> le premier jour est noté. `LOT-05` consigne ce recueil et ouvre un lecteur
> praticien ; le **barème** descend en `LOT-06`, toujours reporté jusqu'à ce
> qu'un recueil suffisant pour calibrer existe — c'est l'ordre « collecte
> d'abord, calibrage ensuite » tenu depuis `LOT-01`. Le recueil a démarré ; il
> n'est pas encore suffisant.

## Objectif

Ouvrir au patient un journal alimentaire de 21 jours (`Q_ALI_09`) : domaine de
recueil pur, catalogue assignable, persistance, accès portail serveur, puis
surface de saisie patient. La série suit délibérément l'ordre « collecte
d'abord, calibrage ensuite » — aucun barème ni indice n'est posé avant qu'une
première distribution réelle existe.

## Résultat observable attendu

- Un patient à qui l'agenda est assigné le voit dans son hub, y entre depuis le
  portail, note une journée en moins de 30 s, et le serveur refuse toute date
  hors de la fenêtre de 21 jours.
- Le drapeau `WN_AGENDA_ALI` est allumé en Production depuis le 2026-08-05,
  `LOT-04` étant livré (`D-025`) — l'allumage était conditionné à la surface de
  saisie, et cette condition est tombée. Le geste, décrit par
  `RUNBOOK-allumage-drapeau.md`, s'est fait en deux temps, hors lot : il n'est
  le dernier geste d'aucun lot, il n'y a pas eu de PR à écrire pour lui.

## Correspondance des lots

**La numérotation d'origine saute L2, et ce trou n'est pas un oubli.** L2 est le
**barème**, et il est reporté *par conception* : « il ne livre ni saisie (L4) ni
barème (L2) : l'ordre reste **collecte d'abord, calibrage ensuite** »
(`changelog.d/2026-08-04-agenda-alimentaire-l3-persistance.md`). Calibrer avant
d'avoir recueilli une seule journée n'aurait rien à calibrer — c'était vrai au
moment où c'était écrit : la production comptait **0 ligne** dans
`agenda_alimentaire_jours` jusqu'au recueil pilote du 2026-08-05, qui en a
posé la première (`RUNBOOK-allumage-drapeau.md`, section « Rejeu du
2026-08-05 »).

La renumérotation `LOT-00` → `LOT-04` est donc **positionnelle, pas
chronologique** : elle ordonne ce qui est livré, elle ne déclare pas la série
close. **Le barème reste à faire et prend désormais `LOT-06`** — `LOT-05`
consigne le recueil pilote et ouvre un lecteur praticien — c'est précisément
l'ordre que L3 a posé. La table ci-dessous fait la correspondance vers les
noms encore cités par le code, les décisions (`docs/DECISIONS.md`) et les
handoffs.

| Fichier | Ancien nom | État | Source |
|---|---|---|---|
| `LOT-00-domaine.md` | L1 | livré (PR #481) | `changelog.d/2026-07-30-agenda-alimentaire-l1-domaine.md` |
| `LOT-01-catalogue.md` | L1-bis | livré (PR #554) | `changelog.d/2026-08-03-agenda-alimentaire-l1bis-catalogue.md` |
| `LOT-02-persistance.md` | L3 | livré (PR #557) | `changelog.d/2026-08-04-agenda-alimentaire-l3-persistance.md`, `docs/claude/handoffs/2026-08-04-0150-agenda-alimentaire-l3.md` |
| `LOT-03-acces-portail-serveur.md` | L4a | livré (PR #562) | `changelog.d/2026-08-04-agenda-alimentaire-l4a.md`, `docs/claude/handoffs/2026-08-04-1254-agenda-alimentaire-l4a.md` |
| `LOT-04-portail-saisie.md` | L4b | livré | `changelog.d/2026-08-05-agenda-alimentaire-l4-portail-saisie.md`, `docs/DECISIONS.md` (D-023) |

Cette table renvoie vers les noms encore cités par le code, les décisions et
les handoffs — mais elle ne couvre pas la renumérotation du 2026-08-05 :
avant cette date, « LOT-05 » désigne le **barème** dans `D-025` et les
handoffs antérieurs ; ce lot est devenu `LOT-06`, et `LOT-05` désigne
désormais le dossier de contrôle et le lecteur praticien.

## Contraintes non négociables

- Aucun secret en dur.
- Aucune donnée patient réelle (seuls Sophie Nicola, Jennifer Martin, Michel
  Dogné peuvent apparaître en démo).
- Aucune migration Prisma/SQL sans confirmation distincte.
- Aucun barème, indice ou seuil clinique posé sans données réelles recueillies
  au préalable — arbitrage tenu depuis L1-bis, reconduit ici.
- Frontière « journal alimentaire, pas carnet de pesée » : aucune quantité,
  gramme, kcal, score ou indice, assérée par `web/prisma/checks/agenda_alimentaire_v1.sql`.
- Changements minimaux, un lot = une finalité.

## Décisions actées

Les arbitrages structurants de la série sont tracés dans `docs/DECISIONS.md` :
**D-015** (consentement, clôture de suivi, doublon au chemin d'écriture — lot
`LOT-03`), **D-022** (borne des 21 jours par la date, drapeau posé après la
surface — arbitrage pris avant `LOT-04`) et **D-023** (ancre calculée sur les
dates enregistrées et non sur les seules relues, quarantaine bornée à la vraie
tête de chaîne, borne supérieure seule, et l'exemption qui ne vaut que si les
quatre portes du parcours la connaissent — lot `LOT-04`) et **D-025** (le
drapeau s'allume en Production, la Preview étant inatteignable par le praticien —
amende le point 2 de D-022, hors lot).

## Hors périmètre

- Le barème et l'indice de l'agenda — `LOT-06`. Une distribution réelle existe
  depuis le 2026-08-05 (un dossier de contrôle, une journée), insuffisante
  pour calibrer.
- L'agenda du sommeil (série distincte, patron déjà livré).
- Toute activation de `WN_AGENDA_ALI` avant la fin de `LOT-04` — condition
  **satisfaite** depuis la livraison de `LOT-04`, et non levée. La position du
  drapeau est désormais réglée par **D-025**, qui amende le point 2 de `D-022` :
  l'allumage en Production est autorisé, la Preview étant inatteignable par le
  praticien. Marche à suivre : `RUNBOOK-allumage-drapeau.md`.

## Lots

| Lot | Objet | Statut | Dépend de |
| --- | --- | --- | --- |
| LOT-00 | Domaine pur du recueil 21 jours | livré | — |
| LOT-01 | Catalogue : `Q_ALI_09` assignable, sans score | livré | LOT-00 |
| LOT-02 | Persistance et abstention au contrat | livré | LOT-01 |
| LOT-03 | Accès portail serveur et contrat SQL | livré | LOT-02 |
| LOT-04 | Portail patient : aiguillage, hub, saisie, borne des 21 jours | livré | LOT-03 |
| LOT-05 | Dossier de contrôle et lecteur praticien | livré | LOT-04 |
| LOT-06 | Barème et indice — **pas avant un recueil suffisant pour calibrer (clôture des 21 jours)** | à écrire | recueil pilote (`RUNBOOK-allumage-drapeau.md`) |

**Le recueil qui bloquait le barème a démarré, sans être encore suffisant pour
calibrer.** Le drapeau a été allumé en Production, le pilote assigné au
dossier de contrôle `PAT006` (`ASS_Ip45TpzqWujWgkOdEex-wxRj`), et une première
journée notée le 2026-08-05. `LOT-06` reste à écrire — un jour de recueil ne
calibre rien à lui seul — et `LOT-05` en est le préalable documentaire et
outillé : consigner le pilote, rejouer les assertions, donner au praticien un
lecteur avant de poser un seuil sur ce qu'il lit.

## Consigne finale

Passer en mode Plan avant toute modification de code sur les lots de cette
campagne. `LOT-06` ne s'ouvre qu'après un recueil suffisant pour calibrer, pas
après la seule première journée qui a débloqué `LOT-05`.
