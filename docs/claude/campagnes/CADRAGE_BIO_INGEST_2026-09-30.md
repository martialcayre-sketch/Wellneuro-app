# Cadrage — acquisition multicanale des résultats biologiques (BIO-INGEST)

> Posé le 2026-09-30. Chantier ouvert par l'audit adverse BIO-INGEST (cette
> session, agent `wn-fable`, lecture seule, aucun code touché). Ce document
> est le LOT-00 : il ne livre aucun code, aucune migration.
>
> **D-xxx non réservé.** Ce cadrage a été produit sur la branche
> `wn-ci-parallele-2026-09-30`, pas sur `main` — la réservation d'un numéro de
> décision se fait depuis `main` pour éviter une collision avec une session
> concurrente. Le dernier numéro connu au 2026-09-30 est `D-255` ; ce cadrage
> vise donc `D-256` (à confirmer et réserver depuis `main` avant toute PR de
> migration).

## 1. Arbitrages rendus le 2026-09-30

**A1 — La saisie n'a pas été essayée, pas rejetée.** Le drapeau
`WN_CB_RESULTS_ENABLED` est posé en production depuis le 2026-09-09 ; 0 ligne
sur 28 dossiers actifs au 2026-09-30. Confirmé par le praticien : **aucun
bilan n'a eu l'occasion d'être saisi depuis cette date**, ET la saisie
unitaire actuelle (`EstimeMesurePanel`, un geste par valeur) est déjà jugée
trop coûteuse pour un bilan complet. Les deux raisons coexistent — ce n'est
pas un signal d'abandon de la fonctionnalité, c'est un signal de priorité sur
le geste de saisie. **Conséquence : LOT-01 (saisie groupée) reste le premier
lot, sans attendre de mesure supplémentaire.**

**A2 — Stockage des documents source : en base Postgres HDS.** Texte/bytea en
base, jamais de stockage objet externe pour la V1. Cohérent avec le précédent
des fiches d'assiette (dépôt public, texte en base seulement) : zéro
sous-traitant HDS nouveau, zéro contrat à ouvrir pour démarrer.

**A3 — Saisie groupée : tout-ou-rien transactionnel.** Préflight de toutes
les lignes proposées, refus détaillé si une seule est invalide, écriture par
`$transaction` uniquement si toutes passent. Si 9 lignes sont valides et la
10e échoue, **rien n'est écrit** — cohérent avec le patron déjà en usage dans
le dépôt (validation complète puis écriture, refus qui laisse la saisie en
place) plutôt qu'un best-effort ligne par ligne.

**A4 — Extraction PDF : IA vision (Anthropic).** Pas de saisie assistée sans
IA, pas d'OCR auto-hébergé pour la V1. **Condition de sortie non négociable,
posée avant tout code d'extraction** : amendement du registre RGPD et du
document patient « L'intelligence artificielle dans Wellneuro » (TRUST v3,
D-251) déclarant explicitement l'envoi de comptes rendus biologiques
(données de santé identifiantes) au sous-traitant IA. Le drapeau
d'activation ne se pose **qu'après** cet amendement — l'ordre inverse a déjà
été un écart documenté une fois (`WN_CB_RESULTS_ENABLED` posé avant mise à
jour du registre, `docs/DOSSIER_RGPD.md` rubriques 2/5) ; il ne se répète pas.

**A5 — Provenance portée par le lot d'import, jamais par le résultat.**
`resultats_biologiques` n'accueille aucune colonne nouvelle et son `source`
reste à deux valeurs (`saisie_praticien`, `import_labo`). Le canal fin
(document, laboratoire, mécanisme d'extraction, confiance de mapping, page
d'origine) vit exclusivement sur une table de lot d'import et ses lignes
candidates, référencées **depuis** le staging **vers** le résultat canonique
créé à la validation — jamais l'inverse. La liste blanche du contrat SQL
(`cb_resultats_biologiques_v1_negatif.sql`) reste intacte.

## 2. Ce que le dépôt porte, constaté par l'audit du 2026-09-30

- Catalogue (`BiologyAnalyte`, `BiologyNabmActe`, `BiologyAnalyteNabm`,
  plages, ratios, panels) : complet, correspondance analyte↔NABM **manuelle
  et signée**, jamais par rapprochement de libellés (AUDIT-SOURCE-NABM).
  Aucune colonne LOINC nulle part.
- `ResultatBiologique` : 11 colonnes exactement, liste blanche par contrat
  SQL, append-only (`supersedesResultatId`, D-124), unicité partielle
  `(patient, analyte, prélèvement) WHERE supersedes IS NULL`, quantitatif
  seul (`valeur Decimal`), `preleveLe` avec heure (cortisol matin/soir déjà
  couvert).
- Routes `GET/POST /api/praticien/biologie/resultats` : gardes fail-closed,
  unité relue serveur, 409 `doublon_mesure`, 409 `correction_source_labo`
  (une mesure `import_labo` ne se corrige pas par saisie praticien — régime
  déjà réservé).
- `EstimeMesurePanel` : saisie **unitaire** uniquement, un POST par valeur.
- Consommateurs : le panneau (documentaire), `portesBiologiquesService`
  (D-245/246/247, claims + dernier résultat en texte, jamais comparés),
  effacement IDP2. **Le moteur clinique ne lit pas `resultats_biologiques`**
  (frontière D-122 volontaire — hors périmètre de ce chantier).
- Portail patient : session par lien magique à usage unique, consentement
  versionné par finalité. **Aucune infrastructure de fichiers dans
  l'application** (zéro upload, zéro colonne binaire, zéro stockage objet).
- `import_labo` : au CHECK, rendu à l'UI, protégé en correction — mais ne
  distingue pas deux laboratoires (métadonnée à porter par le lot, pas par
  le résultat, cf. A5).

## 3. Ce qui est explicitement écarté

- Une couche « Biology Ingestion » générique : le dépôt a déjà les trois
  patrons qui la remplacent (proposition → validation humaine, snapshot+sha
  versionné, correspondance signée). Pas de doublon conceptuel.
- Tout mapping analyte tranché par LLM : le resolver reste une table d'alias
  **curée et signée** (patron `BiologyAnalyteNabm`) ; le LLM propose au mieux
  un candidat que l'écran marque ambigu, jamais un choix final.
- Toute conversion d'unité silencieuse : une unité divergente se **refuse
  visiblement**, elle ne se convertit jamais (D-157 : « convertir serait
  interpréter »).
- Toute colonne qualitative sur `resultats_biologiques` en V1 : une ligne non
  quantitative (positif/négatif, génotype, commentaire) est **refusée à
  l'import**, pas généralisée sans besoin démontré.
- Faire lire `resultats_biologiques` au moteur clinique : hors périmètre,
  décision séparée si elle vient (frontière D-122).
- La saisie vocale (ex BIO-INGEST-06) : aucune infrastructure voix au dépôt,
  bénéfice marginal une fois la saisie groupée livrée, flux tiers
  supplémentaire non justifié par un besoin démontré. **Non planifiée.**

## 4. Lots

| Lot | Objet | Migration | Dépend de |
|---|---|---|---|
| LOT-00 | Ce cadrage | non | — |
| LOT-01 | Saisie groupée praticien — formulaire multi-lignes, route batch transactionnelle (A3), réutilise `garderResultats`/`validerSaisieResultat` | **non** | LOT-00 |
| LOT-02 | Staging import (lot d'import + lignes candidates, A5) + extraction PDF par IA vision (A4, condition de sortie RGPD/TRUST avant activation) + écran de validation (extension de l'écran du LOT-01) | **oui — seule dans sa PR (D-087)** | LOT-01, amendement RGPD/TRUST préalable |
| LOT-03 | Photo/scan — réutilise le pipeline du LOT-02, seul l'extracteur change | non | LOT-02 |
| LOT-04 | Transmission portail patient — upload document, statut en attente/reçu/validé/refusé, validation praticien obligatoire ; nécessite mise à jour consentement/registre RGPD **avant** ouverture | probable (table document transmis) | LOT-02, consentement RGPD à jour |
| LOT-05 | Adaptateur laboratoire (pilote Barbier Metz) — format réel requis avant tout code ; décision « rectificatif labo » à prendre à ce moment (sœur de D-124) | dépend du format reçu | LOT-02 |
| Écarté | Saisie vocale | — | réexamen sur besoin exprimé après usage du LOT-01 |

Condition de sortie commune à LOT-02/03/04/05 : aucune ligne extraite ou
importée n'atteint `resultats_biologiques` sans validation humaine explicite
dans l'écran (aucune écriture automatique).

## 5. Prochaine action

1. Réserver `D-256` (ou le numéro suivant réel) depuis `main`, fragment
   `changelog.d/`, reprenant les arbitrages A1-A5 ci-dessus.
2. Démarrer LOT-01 : mode Plan pour le détail technique (route batch,
   composant multi-lignes) avant toute modification — ce cadrage ne remplace
   pas le plan d'implémentation.
3. Avant LOT-02 : amendement du registre RGPD et du document patient TRUST
   pour l'usage IA vision sur données biologiques (A4) — geste distinct,
   antérieur à toute ligne de code d'extraction.
4. Décider si ce chantier devient une campagne suivie dans
   `docs/claude/campagnes/README.md` (ligne de table + `ACTIVE_CAMPAIGN.md`)
   ou reste une suite de PR directes vers `main` comme la Vague 2 — geste à
   faire depuis `main`, pas depuis cette branche.
