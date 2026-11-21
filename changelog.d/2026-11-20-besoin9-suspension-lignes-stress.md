### Besoin 9 : cinq lignes du stress suspendues pour relecture, quatre tables re-signées, consigne `synthese-v39` (D-543, 2026-11-20)

Code de [[D-543]], qui applique [[D-541]] §6.1. Sans migration ; sous `release-db` (chemin clinique et table des indications biologiques).

- **Cinq lignes au statut `suspendue`** : `R-STR-01`, `R-STR-02` (orientation), `STOP-STR` (arrêt), `C-STR` (contradictions), `BIO-STR-01` (indications biologiques). Elles ne proposent plus d'exploration, n'éteignent plus rien, ne signalent plus de discordance, ne proposent plus de bilan. Leur texte reste écrit pour la relecture.
- **`STOP-STR` entre dans le lot** (`20261119-1635-a`, réponse C) : sans `R-STR-01`, elle aurait éteint la ligne BMS-10 devant une PSS-10 défavorable, contre [[D-053]] arbitrage 2. Effet accepté : les suggestions `R2-STR-01` à `R2-STR-03` restent servies même quand les trois instruments sont rassurants.
- **Quatre tables re-signées** par le responsable dans la session du lot (orientation, contradictions et indications biologiques le 2026-11-19, arrêt le 2026-11-20). Rien d'autre ne bouge : chaque banc de signature le prouve par contre-épreuve.
- **Information au praticien** : le service d'orientation sert la liste `lignesSuspendues` ; le cockpit et le bloc « Règles non appliquées par le service » de la synthèse en font une ligne, sans identifiant ni décompte. La consigne distingue cinq situations au lieu de quatre (`synthese-v39`).
- **Conséquences** : la condition PSS-10 de la convergence du besoin 9 cesse de compter (rattachement gardé) ; `C-STR` quitte la liste T0 des conditions souples ; deux lettres au médecin passent « ancrage périmé » ([[D-079]]) ; aucun protocole éteint.
- **Bancs** : `suspensionLignesStress.guard.test.ts` fige l'absence d'effet des cinq lignes, chacune avec sa contre-épreuve ; les bancs de mécanisme jouent les lignes repassées `publiee`. Les E2E d'orientation et de biologie sont re-ciblés sur un PSQI défavorable (`R-SOM-01`, `BIO-SOM-01`).
