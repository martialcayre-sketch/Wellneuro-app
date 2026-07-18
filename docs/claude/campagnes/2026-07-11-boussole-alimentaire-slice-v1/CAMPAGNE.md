---
id: "2026-07-11-boussole-alimentaire-slice-v1"
titre: "C5 — Boussole alimentaire WellNeuro 5.0"
statut: "en cours — LOT-03 terminé, LOT-04 à faire, inactive"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-18"
lot_courant: "LOT-04"
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
| LOT-04 | UX praticien « Observatoire » | à_faire | LOT-03 |
| LOT-05 | UX patient « Jardin » | à_faire | LOT-04 et protocole approuvé |
| LOT-06 | Assiettes, substitutions et pont JA | à_faire | LOT-03 et contrat JA publié |
| LOT-07 | Validation, conformité et handoff | à_faire | LOT-04, LOT-05 et LOT-06 |

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
- **GO LOT-04** : moteurs déterministes, références versionnées et compatibilité
  protocole V1/V2 vérifiés ; C5 est à `4/8` et reste inactive.
- **NO-GO activation** : C5 reste inactive tant que les lots applicatifs et le
  go/no-go LOT-07 ne sont pas terminés et explicitement validés.
- **NO-GO patient** : sans praticien validateur, protocole diffusé et référentiel
  complet et intègre.

## Références exécutables

- AUDIT_CONFORMITE_5_0.md
- SPEC_SLICE_BESOIN_1_LOT-00.md, amendée par le contrat 5.0
- docs/claude/REGISTRE_FRONTIERES.md
- docs/claude/campagnes/PROGRAMME_WELLNEURO_5_0.md
- docs/claude/propositions/2026-07-16-journal-alimentaire-5-0/ARBITRAGES_JA_5_0.md
