### Modifié

- **Hub patient — la décision d'étape du moment devient testable.** `affichage` et
  `calculerActionRecommandee` quittent le composant client pour
  `lib/portail/hubQuestionnaires.ts` (domaine pur) : cette logique décide ce que le
  patient voit **en premier** et n'avait aucune couverture. 25 tests l'exercent —
  priorité de l'agenda devant un brouillon, retour de la main quand la nuit est notée,
  agenda jamais commencé non prioritaire, agenda déverrouillé dont l'état praticien
  prime, agenda absent des assignations, deux agendas, plus une garde de vocabulaire sur
  les badges que le banc du module de rappel ne couvrait pas.
- **E2E `portail-hub-agenda`** : le parcours réel en navigateur — un agenda jamais
  commencé ne prend pas la première place, et une fois la nuit d'hier notée, « Noter ma
  nuit » devient l'étape du moment avec son compte de nuits et sans vocabulaire de
  reproche. Une suite Vitest verte ne prouve rien sur les parcours.

### Corrigé

- **`resetPortailState` échouait dès qu'une nuit d'agenda restait en base** : la clé
  étrangère `agenda_sommeil_nuits_id_assignation_fkey` n'a pas de cascade, si bien que
  la suppression des assignations levait une violation — et faisait tomber **tous** les
  specs suivants du même patient, avec un message qui ne désignait pas le coupable. Les
  nuits sont désormais supprimées d'abord.

### Documentation

- **`REGISTRE_FRONTIERES.md` — ce que « pas de relance » interdit, et ce qu'il
  n'interdit pas** (arbitrage daté du 2026-07-30). L'interdit porte sur la relance
  automatique ou autonome, jamais sur le geste praticien ; la phrase « jamais de relance
  ni de notification patient » d'une proposition est scopée à l'observance. Trois
  invariants opposables à tout lot de relance, plus deux exigences pour un chemin
  d'envoi. Et ce que « reprise sans pression » n'interdit pas : rendre visible une tâche
  périssable.
