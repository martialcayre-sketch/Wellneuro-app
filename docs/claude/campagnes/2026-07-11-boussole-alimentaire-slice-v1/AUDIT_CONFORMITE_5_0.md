# Audit de conformité C5 — WellNeuro 5.0

Date : 2026-07-18

Périmètre : documentation C5A/C5B uniquement

Verdict : **partiellement conforme avant recadrage ; conforme au niveau du
contrat documentaire après recadrage**

## Sources normatives et ordre de préséance

1. REGISTRE_FRONTIERES.md et PROGRAMME_WELLNEURO_5_0.md.
2. CAMPAGNE.md et les huit lots canoniques C5.
3. Arbitrages JA 5.0 et contrepoint/adaptation JA.
4. SPEC_SLICE_BESOIN_1_LOT-00.md amendée.
5. BOUSSOLE_ALIMENTAIRE_CONTEXTE.md amendé.
6. BRIEF_COMPILED.md et sources/ comme matériau historique.

## Matrice d'audit

| Sujet | Constat antérieur | Exigence 5.0 | Verdict après recadrage |
|---|---|---|---|
| Nature de C5 | Instrument implicite, risque de moteur autonome | Instrument de la Spirale, jamais graphe ni décideur | conforme |
| C5A/C5B | Frontière intrinsèque/contextuelle correcte | C5A sans patient ; C5B dépend de C1/C2 | conforme |
| Données | Dataset statique limité aux vedettes | Distribution Ciqual complète pour les constituants validés, 12 vedettes séparées | conforme au cadrage, implémentation gated |
| Clinique | Codes, poids et formule non figés | Validation humaine, preuve et versions avant code | conforme, LOT-01 bloqué |
| Patient | Score contextuel historiquement visible | Restitution qualitative sans chiffre ni classement | conforme au cadrage |
| Praticien | UX sombre globale et lot partagé | Espace clair, rail sombre, lot Observatoire distinct | conforme au cadrage |
| Scan/OFF | Présent dans l'ancien V1 | Différé hors C5 V1 | conforme |
| Assiettes | Possession JA et valeurs codées en dur | Catalogue versionné possédé par C5B | conforme au cadrage |
| JA | Risque de modifier le score depuis le journal | Faisabilité publiée, factuelle, sans altérer l'intrinsèque | conforme |
| Sécurité | Référentiel futur non tranché | PostgreSQL, RLS deny-all Data API, Prisma autoritatif | conforme au cadrage, migration gated |
| Protocole | Référence C5 non versionnée | Compatibilité V1, nouvelle référence V2 versionnée et hashée | conforme au cadrage |
| Activation | Statut ambigu « en cours » | Campagne inactive jusqu'à activation explicite | conforme |

## Écarts fermés par le recadrage

- Les sept lots mixtes sont remplacés par huit lots décision-complets.
- Les UX praticien et patient sont séparées.
- Le stockage statique est remplacé dans la cible par un référentiel PostgreSQL
  versionné, sans déclencher de migration.
- Les 12 vedettes deviennent une vue éditoriale du registre JA et non la
  population statistique.
- Le scan et Open Food Facts sortent explicitement du V1.
- Les assiettes changent de propriétaire fonctionnel : C5B, avec compatibilité
  de lecture JA V1.

## Garde-fous de migration future

La future table publique n'est pas accessible directement aux rôles Data API :
RLS activée, aucune policy, aucun grant anon ou authenticated. L'accès serveur
reste contrôlé par les routes authentifiées et Prisma. L'historique
web/prisma/migrations demeure l'unique historique. Migration et import sont deux
opérations distinctes, chacune précédée d'un dry-run et d'une confirmation.

## Décision

- **GO documentaire** pour les huit lots.
- **NO-GO code** avant la validation clinique explicite de LOT-01.
- **NO-GO migration** et **NO-GO import** avant leurs confirmations distinctes.
- **NO-GO patient** avant validation praticien, protocole diffusé et intégrité
  complète du référentiel.

Aucun code, schéma, SQL, import, flag ou état d'activation n'est modifié par cet
audit.
