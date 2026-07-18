---
id: "LOT-01"
titre: "Modèles documentaires et contrat de bloc (provenance, état, version)"
statut: "livré"
dépend_de: "LOT-00"
---

# LOT-01 — Modèles documentaires et contrat de bloc

> Compilé le 2026-07-18 depuis `../CAMPAGNE.md` et le registre **A2**. **Domaine
> pur — types et contrats, aucune UI, aucune migration** (sauf gate explicite si
> LOT-00 a retenu la persistance (b)).

## But

Définir le **contrat de bloc** que C3 compose : chaque bloc porte sa
**provenance** (source C1/C2/C4/C5/synthèse, hash/version d'ancrage), son **état**
(brouillon → relu → validé → envoyé) et sa **version**. Définir les **modèles
documentaires** (un modèle par intention) comme assemblages de blocs.

## Résultat observable

Un module de domaine pur (types + fabriques) : `Bloc`, `ModeleDocument`,
`DocumentComposite`, avec provenance et état typés, testable sans rendu ni base.
Un document se construit à partir des blocs sources déjà validés, sans recalcul de
clinique.

## Périmètre

- **Contrat de bloc** : `{ type, provenance (source + ancrage hash/version),
  contenuValidé, régime (statique validé | généré IA validé praticien) }`. Le
  régime IA exige la validation praticien (`SyntheseIA.statut ∈
  {Validee_Praticien, Corrigee_Praticien}`) — jamais de bloc IA non validé
  diffusable.
- **Provenance** : réutiliser les ancrages existants — `inputHash` C1,
  `supersedesDraftId`/`protocolDraftInputHash` C2, `versionPrompt`/`dateValidation`
  synthèse. Aucune nouvelle source de vérité clinique (frontière A2).
- **États** : machine `brouillon → relu → validé → envoyé`, validation humaine
  obligatoire pour franchir `validé`.
- **Versionnage** : réutiliser le **pattern append-only** de
  `web/src/lib/protocol/versioning.ts` (chaînage `supersedes…`), transposé au
  document composite — **sans** persistance en V1 si LOT-00 a retenu (a) : la
  version d'un document = tuple des versions de ses blocs sources.

## Hors périmètre

- Rendu / deux colonnes (LOT-02), rendus par destinataire (LOT-03).
- Génération de contenu clinique (interdit A2) ; C3 ne fait que composer.
- Migration/persistance, sauf gate (b) confirmé en LOT-00.

## Fichiers probables

- `web/src/lib/documents/` (nouveau domaine pur : `bloc.ts`, `modele.ts`,
  `document.ts`, `types.ts`)
- `web/src/lib/protocol/versioning.ts` (pattern réutilisé, lecture)
- `web/src/lib/anthropic/**` (`SyntheseSchema`, lecture)

## Interdits

- Interface / textes visibles : aucun ici (domaine pur). Le français s'applique
  dès qu'un texte destinataire apparaît (LOT-02/03).
- Aucun secret ; données patient fictives seulement.
- Aucune migration Prisma/SQL sans gate `bloqué_confirmation` confirmé.
- Aucune réimplémentation de scoring ou de clinique (propriété C1/`lib/equilibre`).

## Étapes

- [x] Figer la décision persistance (issue LOT-00) : option (a) sans persistance.
- [x] Définir `types.ts` (Bloc, Provenance, ÉtatDocument, ModeleDocument).
- [x] Fabriques pures : `construireBloc`, `assemblerDocument`.
- [x] Garde de régime : un bloc IA non validé n'est jamais diffusable.
- [x] Tests domaine (provenance, transitions d'état, régime IA).

## Tests

- `cd web && npm run type-check`
- Vitest domaine : provenance conservée ; transition d'état invalide refusée ;
  bloc IA non validé exclu de `validé`/`envoyé` ; version = tuple des versions
  de blocs.

## Critères de done

- [x] Contrat de bloc et modèle documentaire typés et testés.
- [x] Provenance ancrée sur les hash/versions existants (aucune nouvelle vérité).
- [x] Aucune migration (option (a) retenue ; gate (b) non ouvert).

## Risques / points de vigilance

- Tentation de persister trop tôt : rester sur (a) tant que le besoin d'historique
  immuable n'est pas confirmé.
- Ne pas laisser fuiter de donnée interne praticien dans un contrat destiné au
  patient/médecin (préparé ici, appliqué en LOT-03).

## Résultats

Livré le 2026-07-18. Domaine pur `web/src/lib/documents/` créé (aucune UI, aucune
migration) :

- `types.ts` — `Bloc`, `ProvenanceBloc` (source + `ancrageHash` + `version` +
  `statutSource`), `ContenuBloc` **par destinataire** (praticien requis ;
  patient/médecin optionnels → field-filter), `RegimeBloc`
  (`statique_valide`|`genere_ia`), `EtatDocument`
  (`brouillon→relu→valide→envoye`), `ModeleDocument`, `VersionDocument`,
  `DocumentComposite`.
- `bloc.ts` — `construireBloc` (valide l'ancrage : aucune vérité C3),
  `estBlocDiffusable` (garde de régime : bloc `genere_ia` diffusable seulement si
  `statutSource ∈ {Validee_Praticien, Corrigee_Praticien}`),
  `contenuPourDestinataire` / `blocsPourDestinataire` (field-filter).
- `versioning.ts` — transposition du patron append-only de
  `protocol/versioning.ts` : `deriveVersionDocument` = tuple des versions de blocs
  + hash `canonicalSha256` (sans horodatage) ; `memeVersion` (comparaison).
- `document.ts` — `assemblerDocument` (état initial `brouillon`, ordonné par
  modèle), machine d'états `peutAvancer`/`avancerEtat` (progression d'une étape,
  franchissement de `valide` seulement `parActionPraticien`).
- `modele.ts` — catalogue (`MODELE_SUIVI_21J`, vue deux colonnes).

Validations : `npm run type-check` vert ; `vitest` **19/19** (provenance conservée,
transition invalide/saut refusée, bloc IA non validé exclu, version = tuple).
