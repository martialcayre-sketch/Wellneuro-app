# Matrice de frontières — TRUST LOT-00

> Fixée le 2026-07-16 pour l'exécution V1. Complète la section « Frontière
> fondatrice » du CAMPAGNE.md avec les décisions d'implémentation.

## TRUST V1 implémente (périmètre exécuté)

| Objet | Implémentation | Lot |
|---|---|---|
| Documents normatifs versionnés | Registre en code (`web/src/lib/trust/contenus/`), hash canonique, versions conservées | LOT-01 |
| Configuration de gouvernance | `web/src/lib/trust/gouvernance.ts` (responsable, contact droits, sous-traitants réels, bloc urgence France) | LOT-01 |
| Règle d'orientation effet indésirable | `REGLE_ORIENTATION_EI_V1` déterministe, versionnée, validée praticien | LOT-01 |
| Accusés de lecture, choix append-only, signalements, demandes de droits | 5 tables Prisma additives (migration `trust_v1`, confirmée le 2026-07-16) + routes portail/praticien | LOT-migration |
| Premier accès « Avant de commencer » (4 écrans) | Wizard portail, patients existants inclus (une fois) | LOT-02 |
| Centre permanent « Informations, confidentialité et droits » | `/portail/[token]/informations` + lien pied de page | LOT-02 |
| Mes choix et autorisations (partage médecin, communications non essentielles) | Grant/retrait append-only, historique | LOT-03 |
| Signaler un problème (3 parcours structurés) | Effet indésirable / incident de confidentialité / demande de droits | LOT-03/04 |
| File praticien | Page « Confiance & droits » + cartes du Fil | LOT-03/04 |
| Transparence IA | Carte IA (registre des cas d'usage réels), précision du footer booklet | LOT-05 |
| Notification praticien générique sur signalement | nodemailer, zéro donnée sensible | LOT-migration |

## TRUST V1 diffère explicitement (documenté au handoff)

| Objet | Vers | Raison |
|---|---|---|
| Délégations / aidants (`DelegatedAccessGrant`) | campagne IDP | exige une identité patient durable |
| `CommunicationEvent` persisté (journal des notifications) | campagne dédiée | infrastructure email sans file d'attente aujourd'hui |
| Cycle de vie du compte (`suspended`/`closed`/`archived`) | IDP | dépend du modèle d'identité |
| Partage ponctuel au médecin traitant (envoi effectif) | C3 | TRUST enregistre le choix, C3 possède le document |
| Refonte auth (magic link, passkeys, sessions) | IDP | frontière posée par le cadrage LOT-06 |
| Version audio / version simplifiée des contenus | dette accessibilité | éditorial, non bloquant V1 |
| Décommission du flux legacy `/patient/[idAssignation]` | lot technique futur | mesuré au LOT-06 |

## Frontières avec les autres campagnes (inchangées du cadrage)

- **HC-F** : TRUST consomme la charte patient (composants `Patient*`), n'en
  crée pas de nouvelle grammaire.
- **QX** : les notices contextuelles avant questionnaire restent des
  surfaces QX ; TRUST fournit le texte versionné.
- **C1/C2** : les états proposé/validé/publié appartiennent au moteur
  clinique ; TRUST les reflète (badges), ne les modifie pas.
- **C3** : documents personnalisés hors TRUST ; un document C3 référencera
  une version TRUST sans la copier.
- **SP-AMB** (programme 5.0) : le consentement double niveau de l'écoute
  ambiante (décision A6-3) s'inscrira dans le modèle documentaire TRUST.
- **Scoring/seuils/questionnaires** : intouchés. La règle d'orientation EI
  v1 n'est pas un scoring : c'est un aiguillage de message déterministe sur
  la sévérité **déclarée par le patient**.
