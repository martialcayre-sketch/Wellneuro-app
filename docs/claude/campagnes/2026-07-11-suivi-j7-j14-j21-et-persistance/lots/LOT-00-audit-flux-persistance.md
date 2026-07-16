---
id: "LOT-00"
titre: "Audit des flux et besoins de persistance"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-00 — Audit des flux et besoins de persistance

> Compilé le 2026-07-16 depuis `../sources/lots/LOT-00-audit-flux-persistance.md`,
> à lire avec `../CAMPAGNE.md` (arbitrages A1, scission C2A/C2B) et
> `../SPEC_LOT-01_MODELE_PERSISTANCE.md` (proposition à valider).

## But

Identifier exactement ce qui doit être stocké et les contraintes d'accès, en
partant de l'état réel post-C1 : `AssessmentEpisode`, `ClinicalSnapshot`,
`ClinicalReview`, `DecisionCard` et `ProtocolDraft` existent en mémoire
seulement (`web/src/lib/clinical-engine/`), rien n'est persisté.

## Arbitrage compilé (exigé par la campagne)

**V1 avec persistance.** Une campagne intitulée « persistance » ne reste pas
ambiguë : la cible V1 persiste les épisodes confirmés, les protocoles relus
et leurs check-ins. L'exécution reste néanmoins entièrement suspendue au gate
migration (LOT-02 `bloqué_confirmation`) : sans confirmation humaine
explicite et distincte, la campagne s'arrête à la spécification (LOT-01) sans
modifier une ligne de `schema.prisma`.

## Résultat observable

Contrat de persistance minimal et matrice des droits create/read/update par
acteur (praticien NextAuth, patient via assignation R8-lite).

## Périmètre

- Auditer auth patient (cookie `wn_portail`), routes praticien, modèles
  Prisma existants et génération de document.
- Lister les événements de cycle de vie du protocole (brouillon, relu,
  validé, envoyé, check-in, révision).
- Définir les données strictement nécessaires aux check-ins J7/J14/J21.
- Confronter la proposition `../SPEC_LOT-01_MODELE_PERSISTANCE.md` à cet
  audit (la corriger, pas s'y conformer).

## Hors périmètre

- Écrire le schéma.
- Créer une migration.
- Modifier les contrats `clinical-engine`.

## Fichiers probables

- `web/prisma/schema.prisma` (lecture seule)
- `web/src/app/api/**`
- `web/src/lib/patient-session.ts`, `web/src/lib/auth.ts`
- `web/src/lib/clinical-engine/**` (lecture seule)
- Composants protocole C1 (`web/src/components/patient-cockpit/**`)

## Interdits

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L'IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [ ] Cartographier acteurs et droits.
- [ ] Définir les données minimales (minimisation RGPD, pas de biologie).
- [ ] Vérifier HDS/RGPD sans inclure la biologie.
- [ ] Produire la matrice create/read/update.
- [ ] Amender la spec LOT-01 si l'audit contredit la proposition.

## Tests

- Aucun diff DB.
- Relecture sécurité.
- `node scripts/wn-campaign-audit.mjs` (vert).

## Critères de done

- [ ] Le besoin est réduit au minimum.
- [ ] Les droits patient/praticien sont explicites.
- [ ] La spec LOT-01 est confirmée ou amendée par l'audit.

## Risques / points de vigilance

- Stocker des champs narratifs inutiles.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
