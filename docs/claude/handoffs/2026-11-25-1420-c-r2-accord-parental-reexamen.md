# Handoff — 2026-11-25 — File C, lot `r2-accord-parental-reexamen` : R2 réexaminé, ni acte courant ni acte usuel (D-537 §9)

## Branche et état du dépôt

- Branche `c-r2-accord-parental`, tirée d'`origin/main` puis avancée par
  `--ff-only`, dans le worktree `.claude/worktrees/suivi-c-h74-frise`.
  Session concurrente : cycle en `git`/`gh` direct.
- Documents seuls : aucun code, aucune migration, aucun drapeau, pas de
  release-db.
- D-454 : la PR est déclarée « prête @<sha> », puis l'intégrateur la merge.
- Boîte C : `merge_fait` de #2334 accusé au démarrage. Le lot est passé à
  `pris` au carnet.

## Objectif

Réexaminer la nécessité de l'accord parental et qualifier l'« acte usuel »
(D-537 §1, §4 R2, §9), sur les faits du contrat transcrits par #2334.

## Décisions prises

L'analyse est rédigée par la session dans la grille de la rubrique 4. Le
responsable a arbitré les trois conclusions en session le 2026-11-25 par la
réponse « A », lue comme A à chaque question, soit l'option recommandée :
- `20261125-1400-c` : ce n'est **pas un acte courant** (C. civ. art. 1148).
  Le jeune ne s'engage pas seul, et l'accord parental reste nécessaire
  jusqu'à 18 ans. D-537 §8 est confirmé.
- `20261125-1400-c-2` : ce n'est **pas un acte usuel** (art. 372-2). Il
  faut l'accord de **chaque titulaire** de l'autorité parentale, ou celui du
  seul titulaire, sur justificatif. Un titulaire injoignable ou opposé
  entraîne une instruction à la main, jamais une admission automatique.
  La règle du §5 n'est plus transitoire.
- `20261125-1400-c-3` : les huit points que les faits laissent ouverts sont
  **transmis au cadrage de J3-mineurs**.

Options écartées, avec leur motif dans la rubrique 4 :
- le jeune s'engage seul ;
- un seul titulaire sous les conditions du §1 ;
- un seul parent pendant trois mois, puis les deux ;
- ne pas qualifier.

## Fichiers modifiés

- `docs/DOSSIER_RGPD.md` :
  - rubrique 4 : bloc « R2 — Réexamen du 2026-11-25 », après la
    conclusion de R2 ;
  - trois renvois datés : admission, R2 « Nécessaire », R2 conclusion ;
  - rubrique 14 : ligne 4.
- `docs/decisions/D-537.md` : une ligne datée au §9, sur l'acte usuel.
- `docs/claude/plan-journal/H79/2026-11-25-02-r2-accord-parental-reexamen.md`.
- `changelog.d/2026-11-25-r2-accord-parental-reexamen.md`.
- Ce handoff.

## Validations exécutées

- Les citations des faits du contrat ont été recopiées depuis la rubrique
  4, sans reformulation. Le texte du responsable et le 2B sont inchangés.
- Références : uniquement celles de l'avis GPT de D-537, vérifiées le
  2026-11-17. Les exemples d'actes usuels donnés dans les questions sont
  des formes courantes, pas une jurisprudence vérifiée. Ils ne sont pas
  repris dans le dossier.
- Aucune identité réelle, aucune métrique de dossier.
- `npm run check` : voir la PR.

## Problèmes ouverts — transmis au lot `j3-mineurs-cadrage`

Points tranchés que le cadrage reçoit :
- l'accord parental est requis jusqu'à 18 ans ;
- il faut l'accord de chaque titulaire, ou du seul titulaire sur
  justificatif ;
- un titulaire injoignable ou opposé entraîne une instruction à la main ;
- l'accord vaut pour la prestation seule et n'ouvre aucun accès au
  portail ;
- le jeune consent lui-même à ses données (H1) ;
- l'émancipé est admis comme un majeur, sur justificatif.

Points à trancher au cadrage, ouverts par les faits du contrat (liste de
la rubrique 4) :
1. « pour l'instant » ;
2. « participation bénévole », qui a deux lectures ;
3. les frais annexes : qui décide, qui paie, auprès de qui ;
4. la part des parents dans la poursuite après trois mois ;
5. le contenu du point à un an ;
6. quels parents sont prévenus de l'arrêt ;
7. l'issue d'un désaccord à l'arrêt ;
8. l'information des parents à la désactivation.

S'y ajoutent les points déjà reportés dans la ligne de carnet de
`j3-mineurs-cadrage` :
- la vérification de l'autorité parentale ;
- le consentement du jeune, fonction par fonction ;
- l'adresse e-mail propre ;
- les droits exercés par un parent ;
- `MESSAGE_CIRCUIT_MINEUR` ;
- la transition à 18 ans ;
- l'origine de la date de naissance ;
- le signal de sécurité de l'envoi d'un mineur.

Restent avant la première admission :
- J3-mineurs, cadré puis livré ;
- la notice adaptée (`notice-mineurs-15-17`, bloquée) ;
- la validation de l'AIPD (`aipd-mineurs-validation`, bloquée) ;
- l'accord de chaque titulaire, recueilli par le circuit.

Les questions `20261125-1400-c` à `-c-3` se closent au merge.

## Prochaine action exacte

1. Cycle de ce lot : `npm run check`, commit, push, PR (`--body-file`).
   Lancer `wn-attendre-ci` en fond, puis `wn-revue-pr-agent`, avec un
   verdict par constat. Déclarer « prête @<sha> » à la boîte
   `integrateur`, puis `/clear`.
2. Session suivante, après le merge, à coller :

```
File C, lot j3-mineurs-cadrage (H79) : cadrer J3-mineurs en mode Plan.
Point de départ : handoff docs/claude/handoffs/2026-11-25-1420-c-r2-accord-parental-reexamen.md
(points tranchés par R2, points à trancher) ; DOSSIER_RGPD rubrique 4 ;
D-537 ; docs/rgpd/AIPD_MINEURS.md (passages [J3]).

0. Vérifier que la PR de R2 est mergée, sinon s'arrêter. Lire et accuser
   la boîte C ; prendre le lot au carnet ; branche c-j3-mineurs-cadrage
   depuis origin/main à jour, dans le worktree suivi-c-h74-frise.
1. Mode Plan natif : relever au code l'existant (garde d'âge, écran de
   pause, 2B, consentement, fiche administrative) avant toute question.
2. Poser les arbitrages dans la liste commune, par thème, peu à la fois,
   chacun avec une mise en situation, des exemples et, par option, ce qui
   change pour le jeune, ses parents et le praticien.
3. Rédiger la D-xxx (numéro réservé à la rédaction) et le découpage en
   4 à 6 PR, dont la migration ; inscrire les lots au carnet.

Interdits : ne pas lever la porte 24 ; ni la frise ni cg (H63) ; aucune
identité réelle ni métrique de dossier ; aucun mot du 2B ni des faits du
contrat ne change ; n'admettre aucun mineur, la pause reste en service ;
l'AIPD ne se tient pas pour validée ; ne pas reposer R2 ; citer l'avis
comme un « avis GPT », sans le recopier.
```

## Interdits encore actifs

- Ne pas reposer R2 ni la qualification d'acte usuel : elles sont
  tranchées.
- Ne pas lever la porte 24. Ne toucher ni la frise ni cg (H63).
- Aucune identité réelle, aucune métrique de dossier.
- Aucun mot du 2B ni des faits du contrat ne change.
- N'admettre aucun mineur : la pause reste en service.
- L'AIPD ne se tient pas pour validée.
- Citer l'avis comme un « avis GPT », sans le recopier.
