---
id: "LOT-04"
titre: "Agenda alimentaire — aiguillage, hub patient, surface de saisie et borne des 21 jours"
statut: "fait"
dépend_de: "LOT-03"
---

# LOT-04 — Agenda alimentaire : la surface que le patient voit

> Anciennement « L4b » dans la série agenda alimentaire ; voir la correspondance
> dans [CAMPAGNE.md](../CAMPAGNE.md).

## But

Ouvrir au patient la surface de saisie de `Q_ALI_09`, qui n'existe pas encore : L4a n'a
livré que l'accès serveur (autorisation + route `GET`/`POST`). Une fois ce lot fait, un
patient à qui l'agenda est assigné le voit dans son hub, y entre depuis le portail, note
une journée en moins de 30 s, et le serveur refuse toute date hors de la fenêtre de
21 jours.

## Périmètre

- **Aiguillage** — `Q_ALI_09` route vers la surface d'agenda, pas vers le formulaire standard.
- **Hub patient** — l'agenda apparaît dans la liste des questionnaires, avec son avancement.
- **Surface de saisie** — une journée par écran, cible < 30 s/jour, consommant la route L4a.
- **Borne des 21 jours** — le `POST` refuse toute `dateJour` hors de `[dateDebut, dateDebut + 20]`
  (arbitrage [D-022](../../../../DECISIONS.md)).
- **Deux dettes L4a explicitement datées L4b par [D-015](../../../../DECISIONS.md)** :
  - un paramètre `{ verifierDateLimite: true }` porté par le **seul** `POST`, pour que
    « date limite dépassée » (`410`) morde avant le `403` de consentement ;
  - l'exemption `statutReponses = 'deverrouille'` côté `api/patient/consentement`.
- **E2E** — parcours portail → saisie d'une journée → relecture.

## Fichiers probables

- `web/src/app/portail/[token]/questionnaires/[idAssignation]/page.tsx` — aiguillage
- `web/src/lib/portail/hubQuestionnaires.ts`, `web/src/app/api/portail/assignations/route.ts` — hub
- `web/src/app/api/portail/agenda-alimentaire/route.ts` — borne, option `verifierDateLimite`
- `web/src/lib/agenda-alimentaire/portail.ts` — signature d'`authorizeAgendaAlimentairePortail`
- `web/src/lib/agenda-alimentaire/fenetre.ts` — ancre réutilisée, **pas** recalculée à la main
- `web/src/app/api/patient/consentement/route.ts` — exemption `deverrouille`
- surface de saisie : nouveaux composants sous `web/src/app/portail/…`
- `web/e2e/` — parcours

## Interdits

- **Aucune migration Prisma**, aucun `schema.prisma` touché.
- **Aucun index unique** sur `(id_assignation, date_jour)` : le modèle est append-only et
  `web/prisma/checks/agenda_alimentaire_v1.sql` l'interdit — la métrique de friction
  `count(lignes) − count(DISTINCT date_jour)` en dépend ([D-015](../../../../DECISIONS.md)).
- **Aucune colonne ni clé JSONB** de gramme, kcal, score, indice ou quantité : frontière
  « journal alimentaire, pas carnet de pesée », assérée par le même contrat SQL.
- **Ne pas toucher l'agenda du sommeil** — dette nommée dans [D-015](../../../../DECISIONS.md),
  hors périmètre.
- **Ne pas créer `WN_AGENDA_ALI` sur Vercel avant la fin du lot** : `IDS_SUSPENDUS` étant
  dérivé du drapeau, l'allumer rend `Q_ALI_09` assignable depuis la bibliothèque praticien
  sur des previews qui écrivent dans la base de production, sans écran pour le consommer.

## Tests

- **T1** `npm run check` après chaque édition.
- **T2** `npm run test:worktree -- --fast` pendant le lot — changement d'UI *et* d'API.
- **T3** `npm run test:worktree` complet avant la PR : le lot touche un chemin d'écriture
  de donnée de santé. E2E = **exclusivité du Mac**, jamais deux runs en parallèle.
- Unitaires ciblés sur la borne :
  - premier `POST` sur agenda vide → accepté, pose l'ancre ;
  - `dateDebut + 20` → accepté ; `dateDebut + 21` → refusé ;
  - correction d'une journée déjà notée dans la fenêtre avec `supersedesJourId` → acceptée ;
  - **journée d'ancre en quarantaine** → l'ancre **ne glisse pas**, et la borne avec elle
    ([D-023](../../../../DECISIONS.md)). Le report de [D-022](../../../../DECISIONS.md)
    (réserve 1) tenait à l'absence d'écran rendant le glissement visible ; ce lot livrant cet
    écran, le correctif est fait ici et le test doit **prouver la correction**, pas exercer le
    défaut — il attend un refus là où l'ancre glissante acceptait.
- Unitaires sur l'ordre des refus : assignation périmée **et** sans consentement → `410`,
  pas `403`.

## Critères de done

- Un patient voit l'agenda dans son hub et peut noter une journée depuis le portail.
- Le serveur refuse une 22ᵉ journée ; les corrections dans la fenêtre passent toujours.
- « Date limite dépassée » l'emporte sur « consentement absent ».
- T3 vert, `/wn-review` puis `Agent(wn-reviewer)` passés.
- `/wn-finish` et `/wn-handoff write` faits **avant** la PR (le merge est un squash).
- `WN_AGENDA_ALI=true` posé sur Development et Preview, **puis** redéploiement — en dernier.
