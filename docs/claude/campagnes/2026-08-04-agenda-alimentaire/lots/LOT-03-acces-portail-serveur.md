---
id: "LOT-03"
titre: "Accès portail serveur et contrat SQL"
statut: "livré"
dépend_de: "LOT-02"
---

# LOT-03 — Accès portail serveur et contrat SQL

Anciennement « L4a » dans la série agenda alimentaire (PR #562).

Statut : livré. Ouvre la première surface serveur — route portail `GET`/`POST`
sur `/api/portail/agenda-alimentaire`, avec son `authorize` dédié. Toujours
pas d'écran ; la saisie patient reste au lot suivant (LOT-04), et
`WN_AGENDA_ALI` reste éteint.

## Livré

- `web/src/lib/agenda-alimentaire/portail.ts` —
  `authorizeAgendaAlimentairePortail`, neuf barrières, `select` explicite
  (jamais `notes`).
- `web/src/app/api/portail/agenda-alimentaire/route.ts` — GET (frise, journées
  brutes, compteur `illisibles`) et POST (borne de corps, refus de doublon,
  pré-contrôle d'abstention).
- `web/prisma/checks/agenda_alimentaire_v1.sql` + étape correspondante dans
  `ci.yml` : la réserve du LOT-02 (aucun aller-retour contre une vraie base)
  est levée.
- Décision **D-015** (`docs/DECISIONS.md`) : trois arbitrages, six réserves.

## Constats majeurs

- La saisie exige désormais `Assignation.consentement = 'donne'` (défaut
  `non_donne`, sa seule garde était un écran de portail contournable par
  appel direct) ; la clôture de suivi (`Patient.suiviClotureLe`) ferme
  également la saisie.
- Un second envoi sur une date déjà notée est refusé en `409`, sauf
  `supersedesJourId` désignant la journée active de cette date ; le refus ne
  porte que sur la date dont une ligne est illisible, jamais sur l'agenda
  entier.
- Les états terminaux (annulation, clôture de suivi) sont vérifiés **avant**
  les gestes à poser (consentement) : l'ordre inverse enverrait le patient
  vers un geste impossible ou, pire, un geste exécuté sur un dossier qu'on
  s'apprête à fermer.
- Trois revues adversariales, trois NO-GO successifs avant le GO final —
  dont une régression introduite par la première passe de correctifs
  elle-même (nom de classe d'erreur anonymisé à tort, refus sur `illisibles`
  verrouillant tout l'agenda). Leçon retenue : ne jamais clore sur une passe
  de correctifs non re-revue.
- Problèmes ouverts, repris explicitement au LOT-04 (voir D-022) : aucune
  borne serveur aux 21 jours ; impasse d'ordre « date limite dépassée ×
  consentement absent » (paramètre `verifierDateLimite` porté par le seul
  POST, plus exemption `deverrouille` côté `api/patient/consentement`) ; la
  frise se ré-ancre en silence si la journée en quarantaine est la plus
  ancienne.

## Tests et validations

- Chaque assertion du contrat SQL éprouvée par mutation contre un PostgreSQL
  jetable (RLS désactivée, FK passées en CASCADE/SET NULL, index unique
  ajouté, colonnes `totalKcal`/`quantite_g` ajoutées, clés JSONB suspectes
  posées dans `reponses`, version de contrat inconnue, chaînage pendant ou
  franchissant patient/assignation/date) — toutes mordent, et les contrôles
  négatifs correspondants passent.
- T3 complet vert ; `verify` CI vert avant merge (checks Vercel seuls ne
  suffisent pas).
