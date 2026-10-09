# Handoff — 2026-10-09 — Idées suicidaires : encart d'urgence livré, constat et carte du Fil à faire (D-275)

## Branche et état Git

- Worktree `.claude/worktrees/securite-ideation`, branche `fix/securite-ideation`,
  partie de `origin/main` (12ad52b2, D-274 mergé). Un commit, PR de l'encart ouverte
  avec ce handoff. Lot hors campagne, issu de l'instruction BP-26 (LOT-26).

## Objectif

Fermer le trou de sécurité : quatre questions sur le suicide (BDI B7, MADRS Q010,
SIGH-SAD-SA SIGH_Q019, IDTAS-AE IA9) ne sont lues par aucune règle ; la case
« Idées noires ou suicidaires » de l'anamnèse n'alerte le praticien qu'à l'ouverture
du dossier, et le patient ne voit aucun numéro d'urgence.

## Décisions prises

- `D-275` (arbitrages du 2026-10-09) : §1 encart toujours visible, sans calcul
  (texte validé mot à mot) ; §2 toute réponse autre que la première (« non ») aux
  quatre questions = constat `adressage`, comme l'anamnèse ; §3 carte « Signal de
  sécurité à évaluer » au Fil pour tout constat de sécurité ouvert.
- `D-274` : portée de la garde de catalogue précisée (P2 Codex de la PR #1369).

## Fichiers modifiés

- `web/src/lib/securite/urgenceSuicide.ts` (liste, section, texte),
  `web/src/components/patient/EncartUrgenceSuicide.tsx`, insertion dans
  `GenericQuestionnaire.tsx` et `app/portail/[token]/page.tsx` (section `alertes`).
- Tests : `urgenceSuicide.guard.test.ts` (balayage du catalogue, ajouté à
  `test:court14`), `EncartUrgenceSuicide.test.tsx`.
- `docs/DECISIONS.md` (D-275, précision D-274),
  `changelog.d/2026-10-09-encart-urgence-suicide.md`.

## Validations exécutées

- T1 complet vert ; `test:court14` vert. T3 lancé avant la PR (résultat dans la PR).

## Problèmes ouverts

- **§2 et §3 de D-275 non livrés.** À planifier en mode Plan avant le code :
  - troisième producteur dans `clinical-engine/safetyFindings.ts`, à côté de
    l'anamnèse et des effets indésirables, sur les passations des quatre
    questionnaires ; provenance = `responseIds` de la passation (citable, à la
    différence de l'anamnèse) ; préfixe d'identifiant propre ;
  - table de quatre lignes (questionnaire, question, réponse « non ») signée sur une
    surface de relecture ([[D-195]]), verrou à cinq termes comme les autres tables ;
  - `partitionnerConstatsAdresses` ne lève que les constats d'anamnèse ([[D-257]]) :
    l'étendre aux constats de questionnaire, sinon le blocage ne se lève jamais ;
  - quelle passation compte (la dernière, ou toute passation non annulée) : à
    trancher avec le responsable, faits vérifiés avant la question ;
  - carte du Fil (`lib/fil/cartes.ts`, nouveau type) ; aucune n'existe aujourd'hui
    pour les constats de sécurité ;
  - lecture en production, en agrégats, des passations déjà déposées sur ces quatre
    questions (combien auraient produit un constat).
- Instruments du cabinet (`CAB_`) non couverts par la garde de l'encart.
- Autres défauts du dossier BP-26 (artefact claude.ai, hors dépôt) : à trier.

## Prochaine action exacte

CI de la PR de l'encart, passe Codex par le responsable, merge, déploiement
constaté. Puis, en session neuve : mode Plan pour D-275 §2-§3.

## Interdits encore actifs

- Aucun seuil inventé : la réponse « non » de chaque instrument est la seule borne.
- Une table de sécurité ne se signe que sur surface relue et déclaration du
  responsable ([[D-195]]).
- Pas de donnée patient réelle ni d'identifiant de dossier dans le dépôt.
- Pas d'auto-merge ; un merge à la fois, déploiement constaté.
