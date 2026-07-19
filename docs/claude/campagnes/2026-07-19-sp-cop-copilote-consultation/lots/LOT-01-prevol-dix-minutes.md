---
id: "LOT-01"
titre: "Pré-vol T-10 min"
statut: "livré"
dépend_de: "aucun"
---

# LOT-01 — Pré-vol T-10 min

> Compilé le 2026-07-19. **Migration-free**, **lecture seule intégrale**.

## But

Donner au praticien, dans les dix minutes qui précèdent une consultation, une
lecture ordonnée et sourcée de ce qui a changé depuis la dernière fois, des
discordances à vérifier et des questions qu'il peut poser.

## Résultat observable

L'entrée de rail « Consultation copilote » — aujourd'hui réservée mais morte —
ouvre une vue réelle. Pour un patient donné : ce qui a changé (réponses reçues,
points d'étape, épisodes confirmés), les discordances `practitioner_only`, et
des questions suggérées. Chaque ligne cite **instrument, date, `versionScore`**.
Sans matière, la vue le dit — elle n'invente rien.

## Périmètre

- Surface `/dashboard/…` branchée sur l'entrée de rail existante.
- Composition **entièrement recalculée** à l'ouverture, à partir du runtime
  clinique et des objets C2A déjà persistés.
- Réemploi du patron « pourquoi maintenant » du Fil et des patrons
  `ModeConsultation` / `TwoLevelReading`.

## Hors périmètre

- **Les discordances ne sont pas recopiées ici** (arbitrage d'exécution du
  2026-07-19). Elles sont produites par le runtime clinique et déjà lues au
  poste de pilotage, phase « Compréhension ». En faire une seconde composition
  dans le pré-vol exigerait de dupliquer l'assemblage du `ClinicalSnapshot` de
  `api/praticien/cockpit` — deux chemins qui pourraient diverger sur un objet
  clinique. Le pré-vol **pointe** vers le poste de pilotage. Si le besoin d'un
  résumé de discordances dans le pré-vol se confirme, il passera par une
  extraction partagée, jamais par une copie.
- Toute écriture, toute persistance, tout snapshot.
- L'écoute ambiante, l'audio, la transcription (**SP-AMB**, gate CNIL/RGPD
  bloquant — A6-3).
- Le pré-remplissage de clôture (**LOT-02**).
- La météo d'adhésion (**SP-MET**), la lecture d'un état passé (**SP-TT**).
- Toute modification de la logique clinique ou des seuils.

## Fichiers probables

- `web/src/app/dashboard/copilote/…` (nouvelle route praticien).
- `web/src/lib/copilote/prevol.ts` (composition, domaine pur) + test.
- `web/src/components/ui/SidebarRail.tsx` (activation de l'entrée).
- Lecture : `web/src/lib/clinical-engine/`, `web/src/app/api/praticien/cockpit/`.

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ni d'écriture Supabase.
- Pas de refactor hors lot.

## Étapes

- [ ] Définir le contrat de la composition pré-vol (entrées, sorties, sources).
- [ ] Implémenter le domaine pur + tests.
- [ ] Monter la surface et activer l'entrée de rail.
- [ ] Vérifier que chaque affirmation est sourcée et recalculable.
- [ ] Exécuter les validations, relire le diff, documenter.

## Tests

- Unitaires : composition avec/sans matière, ordre, citation des sources,
  abstention explicite.
- Garde-fou : aucune discordance ne fuit hors `practitioner_only`.
- E2E : l'entrée de rail ouvre la vue ; la vue s'affiche pour un patient fictif.

## Critères de done

- La vue existe, est atteignable, et n'affirme rien qu'elle ne source.
- Aucune écriture en base.
- Anti-secrets, type-check, lint, Vitest, `test:worktree` verts.

## Résultats

À compléter à la clôture.
