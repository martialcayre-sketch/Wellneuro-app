# Handoff — t34 : le barème de charge ignore les actions vides (D-339)

## Branche et état du dépôt

- Branche `lot/t34-charge-actions-vides`, worktree `d281-lot3-portail`,
  partie de `origin/main` (bf6d2235). Sans migration, sans drapeau, sans
  re-signature.

## Objectif

F76 (m13, file A) : « Reprendre cette charge » figeait un niveau gonflé par des
emplacements d'action vierges, qui restait après leur suppression.

## Décisions prises

- Arbitrage du responsable du 2026-10-21 (file D, m13) transcrit en `D-339`
  (numéro libre sur main au bf6d2235, D-338 pris par #1626) : amende D-273 §5.
- « Vide » = rien saisi (type, intitulé, trois plans, limitations, références,
  statut, attente) : l'emplacement que crée « Ajouter une action ». Une action
  sans type mais saisie compte toujours (D-273 §5 maintenu sur ce point).
- Filtre dans `mesurerProtocole` (`estActionVide`), pas dans l'écran.

## Fichiers modifiés

- `web/src/lib/clinical/baremeChargePur.ts` ; `baremeChargeV1.guard.test.ts`.
- `web/src/components/patient-cockpit/ProtocolMiniBuilder.tsx` (commentaire) ;
  `ProtocolMiniBuilder.test.tsx` (cas de composition, banc « actions vierges
  supprimées »).
- `docs/DECISIONS.md` (D-339), `docs/claude/PLAN_WELLNEURO.md` (F76 soldée),
  `changelog.d/2026-10-21-t34-charge-actions-vides.md`, SESSION_LOG.

## Validations exécutées

- Vitest ciblé (3 fichiers, 143 tests) ; mutation : sans le filtre, 3 cas du
  banc rougissent. T1 rapide vert ; T3 complet vert (7 min, 282 E2E) ; T1
  complet avant commit.
- Contre-revue `wn-reviewer` : GO ; deux retouches de D-339 appliquées
  (« non observable en production », portée du second exemple de D-273 §5),
  test de garde étendu champ par champ.

## Problèmes ouverts

- Pas de garde d'exhaustivité : un champ ajouté demain à `ProtocolAction`
  serait ignoré par `estActionVide` (écarté : aucune liste de clés à
  l'exécution sans dupliquer le type).
- Une action V4 rechargée garde `interventionStatus: 'active'`, invisible :
  vidée à la main, elle reste comptée (comportement antérieur, conforme à
  D-339 §2).

## Prochaine action exacte

CI, CodeRabbit sur la tête, merge, déploiement constaté ; t34 → « fait » au
suivi ; puis t37 (arbitrages du 2026-10-21 : vide au retour Non → Oui,
« Sans objet » retiré sous « Oui »).

## Interdits encore actifs

- Un merge à la fois ; aucun auto-merge ; aucune image antérieure à 257807e3
  redéployée ; rien de clinique sans D-xxx ; revérifier D-339 libre sur main
  au merge ; #1622 et #1626 appartiennent à d'autres sessions.
