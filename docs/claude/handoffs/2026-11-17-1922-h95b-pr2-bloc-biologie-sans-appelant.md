# Handoff — 2026-11-17 — H95 part B, PR 2 : bloc de biologie livré sans appelant ; arbitrages F3 et E

## Branche et état du dépôt

- Branche `b-h95-b-code-pr2`, dans le worktree `.claude/worktrees/b-f34-etape3-1`.
- Avancée par `--ff-only` jusqu'à `b8f0af61e`. Aucun fichier commun avec main.
- Un seul commit, poussé avec la PR. La session ne merge pas : c'est l'intégrateur qui merge, sur « prête @<sha> ».
- Le chemin `web/src/lib/clinical/` déclenche `release-db`. Il n'y a aucune migration.

## Objectif

Lot `h95-b-code` (file B, carnet ordre 72), PR 2 de D-513 :
- le constructeur du bloc de biologie ;
- le drapeau `WN_SYNTHESE_BIOLOGIE_ENABLED`, créé éteint ;
- les textes du §12 ;
- l'évaluation sur dossiers fictifs.

## Décisions prises

- **Évaluation sur dossiers fictifs rendue NON CONFORME**, avec le bloc dans l'appel principal. Le détail est au journal H95 (`2026-11-17-02`).
- **Question `20261117-0816-b` → E.** La restitution passe par un second appel IA, qui ne voit ni l'anamnèse ni les questionnaires. Avis Codex : E. Audit GPT : E, confiance élevée.
- **Question `20261117-1356-b` → F3.** La biologie fonde un axe, mais par un évaluateur signé. F2 est écartée. Avis Codex : F3, confiance forte.
- **D-539 réservée** (`refs/tags/reserve/D-539`) pour écrire ces deux arbitrages. Elle n'est pas encore rédigée.
- **PR 2 « débranchée, livrée inerte »** (choix du responsable) :
  - le branchement dans `generation.ts` est retiré ;
  - le banc de chaîne et le banc d'évaluation sont retirés et mis de côté pour la PR du second appel. Ils sont hors du dépôt, et les dossiers fictifs sont à reconstruire depuis le journal ;
  - le lecteur reste sans appelant.
- **Réserves de `wn-reviewer` appliquées :**
  - la ligne de provenance est ôtée du §2 quater du dossier RGPD ;
  - la date passe par `dateJourParis` ;
  - une unité vide est traitée comme absente.

## Fichiers modifiés

- Nouveaux, sous `web/src/lib/clinical/` : `blocBiologieSynthese.ts`, `blocBiologieSyntheseService.ts`, `syntheseBiologieDrapeau.ts`, et leurs trois tests.
- `web/src/lib/biology-library/publie.ts`, ainsi que trois gardes sous `web/src/lib/bio-parcours/`.
- `web/src/lib/trust/contenus/registre.ts` et son test : v24, IA v9, conditions v7.
- `web/src/lib/correspondance/registreGabarits.ts` et son test : `conditions_utilisation@7`.
- `docs/DOSSIER_RGPD.md` et `docs/FEATURE_FLAGS.md`.
- `changelog.d/2026-11-17-h95b-pr2-bloc-biologie.md`, `docs/claude/plan-journal/H95/2026-11-17-02-part-b-code-pr2-bloc-evaluation.md`, et ce handoff.

## Validations exécutées

- Vitest ciblé : clinical (bloc, lecteur, drapeau) et les gardes bio-parcours, 148 tests passent. Registre et gabarits verts.
- T1 rapide : 0.
- T3 complet, E2E compris : vert en 9 min 59 s sur la version branchée, puis vert en 9 min 57 s sur la version débranchée (`b8f0af61e` et ces changements).
- Revue `wn-reviewer` : GO avec réserves, aucun P0 ni P1, quatre P2, dont trois sont appliqués.
- Contre-revue Codex P0 (`wn-codex-avis.mjs --mode revue`) : aucun constat.
- Évaluation réelle : 3 dossiers fictifs, 2 passages, modèle de production. Résultat non conforme, voir ci-dessus.

## Problèmes ouverts

- **Ligne 757 du dossier RGPD.** Elle dit « Aucun destinataire, aucun sous-traitant, aucun flux nouveau » pour le contexte de prélèvement. Elle est à amender, car l'audit GPT le demande avant activation. Le texte est à faire valider, et D-539 peut le porter.
- **Divergence de l'export** (`biologieExport.ts`, antérieure au lot). Une ligne v1 y sort « non imprimé », alors que le bloc et le cockpit disent « non renseigné ». C'est à router vers la file de l'export.
- Le P2 sur l'encodage de U+2028 et U+2029 n'a pas été appliqué : le texte du §2 est validé, et un durcissement demanderait l'accord du responsable.
- Le carnet doit passer `h95-b-code` à `pr`. Les pages BioFlow (ligne p50) et le résumé `resumes/bioflow` de la file D sont à mettre à jour.

## Prochaine action exacte

1. Après « prête », rédiger **D-539** dans une PR de doc :
   - E et F3 ;
   - la consigne du second appel, à valider mot pour mot ;
   - les critères d'acceptation de l'évaluation rejouée (l'audit GPT proposait 24 dossiers × 3 passages, zéro violation : à adopter ou non) ;
   - l'amendement de D-266 R5 et de la ligne 757 du dossier RGPD.
2. Ensuite, la PR de code du second appel et de l'assemblage par le code.
3. Rejouer l'évaluation.

## Interdits encore actifs

- Aucune pose du drapeau, aucune ouverture, aucun envoi de l'e-mail @7 : ce sont des gestes du responsable.
- Le bloc n'entre jamais dans l'appel principal de la synthèse (E).
- Aucune règle, aucun seuil, aucun texte clinique inventés. Le croisement entre biologie et anamnèse passe par l'évaluateur signé, jamais par la consigne (F3).
- Identités de fixture seulement ; aucun dossier réel visé par un seed ou un E2E.
- Forme opaque (D-251 §4).
- La session ne merge pas.
