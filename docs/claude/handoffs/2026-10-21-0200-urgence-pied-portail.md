# Handoff — Numéros d'urgence au pied du portail ; l'encart quitte l'écran de dépôt

## Branche et état Git

`lot/urgence-pied-portail` (worktree `act4-ouverture`), partie de `origin/main` ae8b6121 (#1613 mergée). Sans migration ni `schema.prisma`.

## Objectif

Appliquer l'amendement de D-293 §3 du 2026-10-21 : retirer l'encart d'urgence de l'écran de dépôt et poser les numéros au pied de toutes les pages du portail, dans la même PR.

## Décisions prises

- Textes validés tels quels par le responsable le 2026-10-21 :
  - pied : « Besoin d’aide maintenant ? Idées suicidaires : 3114 · Danger immédiat : 15 ou 112 · Par SMS : 114 », chaque numéro en `tel:` ;
  - phrase du pied : « Vos informations sont transmises à votre praticien, qui ne les lit pas en temps réel. » ;
  - au dépôt, sous le bouton, en texte simple : « Vos documents sont transmis à votre praticien, mais il ne les lit pas en temps réel : n’attendez pas sa réponse. ».
- « Mes échanges », les questionnaires et l'anamnèse gardent leur encart.

## Fichiers modifiés

- `web/src/lib/securite/urgenceSuicide.ts` (`PIED_URGENCE_PORTAIL` ; `depot_documents` retiré de `DELAI_ENCART_PAR_ECRAN`).
- `web/src/components/patient/PiedDePageUrgence.tsx` (neuf) ; `web/src/app/portail/layout.tsx` (pied de page) et `layout.test.tsx`.
- `web/src/components/patient/collecte/DepotDocuments.tsx`, `textesDepot.ts` (`DELAI_LECTURE_DEPOT`) et `DepotDocuments.test.tsx` ; `web/src/components/patient/EncartUrgenceSuicide.test.tsx`.
- `docs/DECISIONS.md` (D-293, amendement), `docs/FEATURE_FLAGS.md`, `changelog.d/2026-10-21-urgence-pied-portail.md`, `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

Vitest ciblé : 24/24. T1 et T2 `--fast` : résultats dans la PR.

## Problèmes ouverts

- Les bases visuelles des pages du portail changent (pied de page) : workflow `visual-baselines` puis ne committer que les bases refusées par le CI.
- Gestes du responsable sur le dossier de test : retirer le PDF de test, déposer une photo ; constats par conteneur à faire.

## Prochaine action exacte

CI de la PR ; si `visual.spec.ts` rougit, régénérer les bases refusées ; revue CodeRabbit de la tête ; merge ; déploiement constaté.

## Interdits encore actifs

- Aucune fenêtre, aucun seuil, aucune règle clinique changés.
- Aucune migration ni `schema.prisma` sans accord du responsable.
- Fixtures neutres seulement.
- Production lue par conteneur et par identifiant seulement ; agrégats seuls dans les fichiers durables.
