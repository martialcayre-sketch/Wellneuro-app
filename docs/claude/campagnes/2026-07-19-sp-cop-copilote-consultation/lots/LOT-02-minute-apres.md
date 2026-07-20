---
id: "LOT-02"
titre: "La minute d'après"
statut: "livré"
dépend_de: "LOT-01"
---

# LOT-02 — La minute d'après

> Compilé et livré le 2026-07-20. **Migration-free**, **lecture seule intégrale**.

## But

Donner au praticien, juste après la consultation, l'état de la chaîne qui mène
un contenu au patient — **Relu → Validé pour diffusion → Envoyé** — et la liste
de ce qui la bloque, pendant que tout est encore frais.

## Résultat observable

Sur `/dashboard/copilote?idPatient=…`, sous le pré-vol : la priorité retenue et
la date d'enregistrement de la version active, puis les trois étapes, chacune
avec son statut, sa date de franchissement et son « pourquoi maintenant ». Quand
la chaîne est incomplète, les blocages sont énoncés en clair. Quand elle est
complète, l'écran le constate — et rappelle que l'envoi se déclenche ailleurs.

## Périmètre

- Domaine pur `web/src/lib/copilote/minuteApres.ts` : composition de l'état de
  clôture à partir de la version active, de l'approbation active et des
  synthèses du patient.
- Route de lecture `GET /api/praticien/copilote/cloture`, gardée par
  `verifierAppartenancePatient`.
- Surface `web/src/components/copilote/ClotureMinuteApresPanel.tsx`, montée sur
  la page copilote existante.

## Décisions d'exécution

- **L'écran ne franchit aucune étape.** La relecture et l'approbation de
  diffusion ont déjà leurs routes (`/api/praticien/protocoles`,
  `.../diffusion`) ; la minute d'après y renvoie au lieu de les redoubler.
  Deux chemins d'écriture sur le même invariant finiraient par diverger — même
  argument que le refus de recopier les discordances dans le pré-vol (LOT-01).
- **`caduque` ≠ `a_faire`.** Une approbation ancrée sur une version supplantée a
  bien été donnée ; c'est le contenu qui a changé. Les confondre ferait perdre
  au praticien l'information qui compte.
- **`indisponible` ≠ `a_faire`.** Sans protocole enregistré, les trois étapes
  n'ont pas d'objet ; les afficher « à faire » laisserait croire qu'il suffit de
  cocher.
- **Le chaînage append-only n'est pas réimplémenté** : `resolveActiveVersion` et
  `resolveActiveApproval` (C2A) restent les seules implémentations de cette
  règle. Le domaine reçoit des têtes déjà résolues.
- **La clôture porte sur le fil de la carte de décision la plus récente.** Mêler
  les fils antérieurs ferait apparaître « à faire » des étapes closes sur un
  protocole précédent.

## Hors périmètre

- Tout envoi, toute écriture, toute persistance, tout snapshot.
- La composition du contenu documentaire lui-même (**C3**, déjà livrée).
- L'écoute ambiante, l'audio, la transcription (**SP-AMB**, gate CNIL/RGPD
  bloquant — A6-3).
- Toute modification de la logique clinique ou des seuils.

## Correction incidente

La page `/dashboard/copilote`, livrée au LOT-01, listait **tous** les patients
actifs sans filtrer sur le praticien connecté, et rendait la fiche d'un patient
d'un autre praticien. Elle applique désormais `filtrePatientsDuPraticien`,
comme les routes gardées en #156. Aucun effet en production — les 17 patients
appartiennent au même praticien — mais l'écart devait être fermé avant qu'il en
existe un second.

## Tests

- Unitaires (20) : chaîne complète, chaque étape non franchie prise isolément,
  caducité, statuts de synthèse non diffusables, dates illisibles, absence de
  protocole, cohérence de la liste des statuts diffusables avec C3.
- Composant (5) : rendu des trois étapes, constat de complétude,
  **aucun bouton ni formulaire** quel que soit l'avancement, blocages listés,
  échec de lecture jamais présenté comme « prêt ».
- E2E : l'écran s'affiche, énonce qu'il n'envoie rien, et n'émet aucune requête
  mutante.

## Critères de done

- Les trois étapes sont toujours rendues, sourcées et datées.
- Aucun envoi, aucune écriture depuis cette surface.
- Anti-secrets, type-check, lint, Vitest, `test:worktree` verts.

## Résultats

Livré. 45 tests E2E verts (`test:worktree --fast`, 1 min 17 s), aucune dérive
schéma ↔ migrations, aucune migration introduite.
