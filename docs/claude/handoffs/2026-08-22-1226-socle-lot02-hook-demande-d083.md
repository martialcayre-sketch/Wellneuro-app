# 2026-08-22 12:26 — Socle LOT-02 : le clinique s'écrit au niveau « demande », D-083 rendue

## Ce qui a changé

- **Huit fichiers cliniques au niveau « demande »** du hook d'écriture (six
  tables signées + deux fichiers de constantes) ; listes refus et demande
  Prisma inchangées au caractère près. **Banc neuf de 36 cas** — le hook n'en
  avait aucun.
- **Relecture adversariale intégrale** : BLOQUER intégré (évitement par
  segments refermé via `path.posix.normalize` — trou hérité qui touchait déjà
  Prisma ; banc complété à un cas par motif ; portée Edit/Write dite sans
  sur-promesse), puis **ACCEPTER en contre-vérification** avec mutants
  rejoués.
- **`D-083`** (go du responsable en session) : l'en-tête
  d'`orientationRulesV1` n'annonce plus le compilateur inexistant ; la
  période mensongère est datée dans le fichier même. Première confirmation en
  conditions réelles du hook posé par ce lot.
- **Mesure qui corrige le cadrage** : le sha épinglé couvre
  `JSON.stringify(ORIENTATION_RULES_V1)` — les données, pas le texte. 61/61
  vert sans ré-épinglage. Tracé dans le fichier de lot et dans D-083.

## À savoir pour la suite

- **Arbitrages responsables pendants, consignés au fragment changelog** :
  vestige `WN_ALLOW_RISKY_COMMAND` (contredit CLAUDE.md — le plus sérieux) ;
  `questionnaires/alimentaire.ts` (pilote `VERSION_SCORE_EQUILIBRE` sans
  protection) ; `stopRulesLibelles.ts` ; fixture `chaineC1Fixture` (mute
  `validationExterne` en runtime). Le banc du hook a des cas « silence » qui
  rougiront à chaque ajout — la mise à jour du banc suivra la décision.
- **Couverture Bash des fichiers cliniques** : suivi nommé du Socle (le hook
  ne voit que Edit/Write) — candidat naturel pour un lot ultérieur ou un
  ajout à `block-risky-commands.mjs` avec sa propre relecture adversariale.
- **Session parallèle** : travail synthèse non commité dans l'arbre
  (`synthese/route.ts` + test, zone budget de sortie). Ma branche de lot
  était extraite — vérifier la branche avant tout commit depuis l'autre
  session.

## Ouvert

- PR du lot à ouvrir (T2 en cours au moment du handoff) ; puis **LOT-03** —
  registre de gabarits de messages patient (`DC-26`), dernier lot du Socle.
- Arbitrage des régimes de garde (LOT-01, trois options) toujours pendant.
