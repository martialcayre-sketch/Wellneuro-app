---
id: "2026-07-11-boussole-alimentaire-slice-v1"
titre: "C5 — Boussole alimentaire WellNeuro 5.0"
statut: "terminée — 8/8, trois verdicts émis, activation production demandée"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-18"
lot_courant: "aucun"
---

# C5 — Boussole alimentaire WellNeuro 5.0

## Objectif

Faire de C5 un Instrument de la Spirale qui éclaire une action alimentaire
validée par le praticien. C5 n'est ni un graphe, ni un score patient, ni un
moteur autonome de décision.

## Contrat 5.0

- C5A possède le profil intrinsèque d'un aliment : chiffré, sourcé, déterministe
  et versionné, sans donnée patient.
- C5B lit ce profil dans le contexte d'une priorité C1 sélectionnée et d'un
  protocole C2 actif. Il ne change jamais le profil intrinsèque.
- Le praticien voit les données chiffrées, leurs sources, versions et limites.
- Le patient reçoit seulement une restitution qualitative, une raison, une
  source, une limite et, si elle est validée, une alternative.
- Les 12 aliments vedettes forment un manifeste d'exposition et un sous-ensemble
  du registre de marqueurs JA. Ils ne limitent pas la distribution Ciqual
  nécessaire au calcul.
- Les assiettes versionnées appartiennent à C5B. JA publie uniquement une
  faisabilité factuelle et praticien-validée.
- Toute diffusion reste manuelle et suit Relu → Validé pour diffusion → Envoyé.

## Frontières

| Domaine | C5 possède | C5 consomme | C5 ne possède pas |
|---|---|---|---|
| C5A | Référentiel Ciqual borné aux constituants validés, mapping et profils intrinsèques | Codes et valeurs Ciqual sourcés | Données patient, priorité, protocole |
| C5B | Lecture contextuelle, catalogue d'assiettes, substitutions et vues Boussole | Priorité C1 sélectionnée, protocole C2 actif, faisabilité JA publiée | Décision C1, cycle C2, saisie/persistance JA |
| Diffusion | Références versionnées et hashées intégrées au protocole | Workflow de validation praticien existant | Envoi autonome, document C3 |

Le registre 5.0 et le présent cadrage prévalent sur les anciennes formulations
du brief compilé, de la spécification LOT-00 et du contexte historique.
Le dossier sources/ reste un matériau historique non exécutable.

## Lots canoniques

| Lot | Objet | Statut | Gate |
|---|---|---|---|
| LOT-00 | Audit et contrat C5 5.0 | **terminé — conformité 5.0 cadrée** | aucun |
| LOT-01 | Mapping clinique et gate de validation | **terminé — validation clinique et vecteurs signés** | gate acquis |
| LOT-02 | Référentiel Ciqual et gate migration | **terminé — référentiel ciqual importé et intègre** | migration et import appliqués ; intégrité, RLS et advisors vérifiés |
| LOT-03 | Moteurs et contrats versionnés | **terminé — contrats déterministes et protocole V2** | LOT-01 validé et LOT-02 intègre |
| LOT-04 | UX praticien « Observatoire » | **terminé — UX praticien Observatoire** | LOT-03 acquis |
| LOT-05 | UX patient « Jardin » | **terminé — UX patient Jardin qualitative et isolée** | LOT-04 et protocole approuvé |
| LOT-06 | Assiettes, substitutions et pont JA | **terminé — catalogue C5B versionné et pont faisabilité JA (lecture seule)** | LOT-03 et contrat JA publié |
| LOT-07 | Validation, conformité et handoff | **terminé — trois verdicts émis, dossier de preuves et handoff (`VALIDATION_FINALE_C5.md`)** | LOT-04, LOT-05 et LOT-06 |

## Séquence

LOT-00 → LOT-01 → LOT-02 → LOT-03 → LOT-04 → LOT-05 et LOT-06 → LOT-07.
LOT-05 et LOT-06 peuvent être exécutés séparément après leurs dépendances, mais
le go/no-go final reste découpé entre C5A, C5B praticien et C5B patient.

## Garde-fous globaux

- C5 demeure inactive jusqu'à une activation explicite. ACTIVE_CAMPAIGN.md et
  .wn/state.json ne sont pas modifiés par ce cadrage.
- Aucun code, SQL, changement Prisma, import Supabase ou activation dans le
  recadrage documentaire.
- Aucun code C5 hors lot d'implémentation ni avant les gates LOT-02 applicables.
- Aucune migration ou import avant leurs confirmations distinctes en LOT-02.
- Aucun seuil, poids, code constituant ou recommandation clinique inventé.
- Aucune donnée patient réelle, aucun secret, aucune exposition inter-patient.
- Déploiement futur derrière WN_C5_ENABLED=false par défaut.
- Scan, Open Food Facts, chronobiologie, menus, panier, analyses journée/semaine,
  biologie et documents C3 restent hors périmètre.

## Go / no-go actuel

- **GO** : contrat clinique LOT-01 signé et documentation des huit lots.
- **GO migration** : confirmation acquise et migration appliquée en production
  le 2026-07-18.
- **GO import** : confirmation distincte acquise sous la référence
  `C5-LOT02-IMPORT-MC-2026-07-18-v1` ; 55 744 lignes importées et contrôlées
  en Production, déclencheur temporaire retiré.
- **GO LOT-05** : le Jardin patient est livré, strictement qualitatif, borné au
  protocole V2 approuvé et protégé contre l'énumération ou l'accès inter-patient ;
  C5 est à `6/8` et reste inactive.
- **GO LOT-06** : catalogue d'assiettes C5B versionné (`c5b-plate-catalog-v1`) et pont
  de faisabilité JA en lecture seule (`ja-action-feasibility-v1`, factuel, praticien-
  validé) ; aucune substitution automatique, opt-out par défaut, profil C5A intact et
  aucune migration ; C5 passe à `7/8` et reste inactive.
- **GO LOT-07 (clôture)** : validation, conformité et handoff livrés
  (`VALIDATION_FINALE_C5.md`, `MATRICE_CONFORMITE_ET_TESTS_C5.md`, `HANDOFF_C5.md`,
  `ACTIVATION_RUNBOOK_C5.md`, `DETTE_C5.md`) ; matrice technique verte (573 tests),
  advisors sans alerte bloquante. C5 passe à `8/8`.
- **Trois verdicts indépendants** : **C5A GO**, **C5B praticien GO**, **C5B patient
  GO conditionnel** (dettes humaines D-C5-01→04 ouvertes : accessibilité, E2E boussole
  des 3 fixtures, vocabulaire, revue visuelle). C5B patient ne peut être GO sans C5A
  intègre et C5B praticien validé — condition satisfaite.
- **Activation production** : demandée par le responsable (Martial CAYRE, session
  2026-07-18). Mécanique : `WN_C5_ENABLED=true` dans Vercel Production + redéploiement
  (`ACTIVATION_RUNBOOK_C5.md`). Rollback = flag `false` (non destructif, aucun DROP/DELETE).

## Références exécutables

- AUDIT_CONFORMITE_5_0.md
- SPEC_SLICE_BESOIN_1_LOT-00.md, amendée par le contrat 5.0
- docs/claude/REGISTRE_FRONTIERES.md
- docs/claude/campagnes/PROGRAMME_WELLNEURO_5_0.md
- docs/claude/propositions/2026-07-16-journal-alimentaire-5-0/ARBITRAGES_JA_5_0.md

## Direction UX 5.0 — poste de pilotage & A5-R2 (aligné le 2026-07-18)

> Alignement additif. Voir `docs/claude/propositions/2026-07-18-refonte-ux-5-0/`
> et le registre (A6-R1 poste de pilotage, A5-R2 canvas mid-tone).
> **Aucun contrat clinique figé de cette campagne n'est modifié.**

- Les UX livrées **« Observatoire » (LOT-04, praticien)** et **« Jardin » (LOT-05, patient)** sont alignées sur la direction : côté praticien, la boussole devient un **instrument à tiroir** du poste de pilotage (chiffres, sources et versions visibles) ; côté patient, la restitution reste **séquentielle et qualitative, sans score**. Frontières C5A/C5B et verdicts LOT-07 **inchangés**.
- Canvas mid-tone (ardoise / sable) et typographie remontée — différés au lot d'implémentation Vague 1 (revue visuelle D-C5-04 en synergie).
