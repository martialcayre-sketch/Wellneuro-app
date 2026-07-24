---
id: "LOT-04"
titre: "Agenda : modèle RendezVous, CRUD minimal, cartes « Pré-vol prêt »"
statut: "livré"
dépend_de: "LOT-01"
---

# LOT-04 — Agenda : modèle RendezVous, CRUD minimal, cartes « Pré-vol prêt »

Statut : livré (PR de ce lot). **Porte une migration** — gate confirmé
explicitement par l'utilisateur le 2026-07-23 (question de session « Le LOT-D
crée le modèle RendezVous » → « Oui »).

## Livré

- **Modèle `RendezVous`** (`schema.prisma`) + migration additive
  `20260723190000_ao_rendez_vous_v1` : table `rendez_vous`, FK
  `id_patient → patients(id_patient)` ON DELETE RESTRICT, 2 index, RLS
  deny-all. `date_heure` = donnée ; `cree_le` = base ; annulation = statut
  `annule` daté, jamais une suppression. SQL généré par `prisma migrate diff`
  (datamodel→datamodel, **sans base**) + en-tête et bloc RLS à la main.
- **Effacement de dossier** (`effacement.ts`) : `tx.rendezVous.deleteMany`
  ajouté — la FK RESTRICT l'exige, et la garde structurelle
  (`effacement.test.ts`, toute table `id_patient`) le vérifie.
- **Routes** : `GET/POST /api/praticien/rendez-vous` (liste fenêtrée
  aujourd'hui→+7 j bornée au praticien ; création avec garde d'appartenance,
  dossier clos = 409, `praticienEmail` de la session jamais du corps) et
  `POST …/annulation` (propriété vérifiée, statut `annule`, idempotent).
- **Page agenda** (`dashboard/agenda/page.tsx` + `components/agenda/
  AgendaPraticien.tsx`) : la maquette statique et sa `BanniereDiffere` sont
  remplacées par un CRUD minimal — formulaire (patient actif, date, heure,
  motif), liste par jour, annulation inline. Pas de calendrier, pas de
  récurrence.
- **Fil** : type `consultation_prevue` (+ refus + icône `CalendarClock`),
  constructeur `cartesConsultationsPrevues` (RDV du jour → « Pré-vol prêt »,
  href `/dashboard/copilote?idPatient=…` réutilisant le pré-vol SP-COP).
  Ordre : signalements d'abord, puis consultations du jour, puis l'ordre
  existant. `indexCarteImminente` raffiné : la consultation à venir la plus
  proche. `resumeFil` : « N consultation(s) » en tête.
- **Registres** : `REGISTRE_FRONTIERES.md` (R6/E5 « différé » → « socle
  rattaché ») et `ROADMAP_PRODUIT.md` (R6 produit : socle livré, chaînage
  Cal.com toujours différé).

## Hors périmètre (assumé)

- Le chaînage « zéro saisie » (Cal.com, assignation auto 48 h avant, rappel).
- La taxonomie du rail (l'entrée « Agenda » reste sous « Héritage 4.0 » —
  déplacement = décision produit distincte, non faite ici).

## Vérification

- Vitest : `cartesConsultationsPrevues` (jour civil, tri, clé, « dans X min »),
  ordre du Fil, `indexCarteImminente` (consultation proche / repli), routes
  (401/400/403/404/409/201, annulation idempotente), `AgendaPraticien`
  (formulaire, liste, annulation), effacement (garde structurelle).
- **T3 complet** : `migrate deploy` sur PostgreSQL éphémère + porte de dérive
  `migrate diff` (le SQL committé correspond bien à `schema.prisma`) + E2E.
- **Après merge** : vérifier la base de production (`execute_sql`, agrégat par
  nom de migration) — la migration s'est-elle appliquée au build Vercel.
- Revue adversariale `wn-reviewer` avant remise à Copilot (migration).
