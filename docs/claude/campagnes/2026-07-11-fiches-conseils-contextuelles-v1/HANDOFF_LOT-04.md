# Handoff — C3 V1 : validation de bout en bout, dettes et contrat d'extension

> Produit le 2026-07-18 (exécution LOT-04). Clôt la V1 de **C3 — Documents
> contextuels multi-destinataires**. **Documentaire + tests. Aucune migration.**

## 1. Ce que C3 V1 livre (rappel)

| Lot | Livrable | PR |
|---|---|---|
| LOT-00 | Audit existant + inventaire des blocs + décision persistance (a) | #122 |
| LOT-01 | Domaine pur `web/src/lib/documents/` (contrat de bloc, machine d'états, versionnage sans persistance) | #123 |
| LOT-02 | Composant `DocumentComposer` (vue deux colonnes + machine d'états) | #124 |
| LOT-03 | Rendus par destinataire + impression HTML + adaptateur `SyntheseIA → blocs` + extraction `buildBookletHTML` | #125 |
| LOT-04 | Parcours E2E (domaine), contrat d'extension C4/C5, handoff | (ce lot) |

**Parcours validé** (test `documents/parcours.test.ts`) : synthèse validée →
`blocsDepuisSynthese` → `assemblerDocument` → machine d'états
(`brouillon→relu→validé→envoyé`, franchissement de « validé » par action praticien)
→ `renderDocumentHtml` pour patient / médecin / praticien. La **frontière de données**
tient sur tout le parcours (champ interne praticien jamais dans un rendu
patient/médecin ; synthèse non validée → aucune diffusion).

## 2. Contrat d'extension bloc (C4/C5 — futurs fournisseurs)

C3 ne possède aucun contenu clinique (frontière **A2**). C4 (compléments) et C5
(alimentaire) publieront des blocs consommables **sans** que C3 les recalcule. Le
contrat à respecter par un fournisseur, pour produire un `Bloc` (cf.
`web/src/lib/documents/types.ts`) :

- **`provenance`** : `{ source, ancrageHash, version, statutSource?, dateValidation? }` —
  `ancrageHash`/`version` **doivent** pointer une vérité déjà persistée côté
  fournisseur (aucune nouvelle source de vérité créée dans C3).
- **`regime`** : `statique_valide` (affichable sans IA) ou `genere_ia` (exige un
  `statutSource` validé praticien — la garde `estBlocDiffusable` refuse tout bloc IA
  non validé).
- **`contenu`** : field-filter par destinataire — `praticien` requis ; `patient` /
  `medecin` **seulement** si le contenu est autorisé pour ce destinataire (matrice
  bloc → destinataire, `DOSSIER_AUDIT_LOT-00.md` §3). Un contenu médecin doit rester
  **non prescriptif** (`vocabulaire.ts`).
- Un fournisseur ajoutera au besoin une valeur à `SourceBloc` et, s'il apporte un
  nouveau type d'énoncé, à `TypeBloc` — sans toucher la garde de régime ni le
  field-filter.

**Pattern d'intégration** (comme `blocsDepuisSynthese`) : une fonction **pure**
`blocsDepuisX(sourceLue): Bloc[]` côté fournisseur ; la route possède la lecture
Prisma, le domaine reste sans I/O.

## 3. Dettes assumées et conditions d'ouverture

- **Montage en page de production** : `DocumentComposer` et `renderDocumentHtml`
  sont livrés et testés mais **non encore montés** dans une page praticien ni
  branchés sur une route d'envoi C3. Condition : une route lecture (blocs réels →
  document) + un point de montage cockpit ; sans persistance (option a), c'est un
  GET recomposant à la demande.
- **Persistance / historique immuable des documents composites** : **option (b)**
  non ouverte. Condition : besoin confirmé d'un historique immuable distinct des
  ancrages sources → **gate migration `bloqué_confirmation`** (additive-only, une
  seule migration nommée, backfill déterministe), jamais sans confirmation humaine
  explicite et distincte.
- **PDF natif** : différé (l'impression HTML couvre le besoin V1).
- **Signature électronique**, **authentification médecin** : différées.
- **Fil bidirectionnel médecin (discordance 5.0)** : voir §4.

## 4. Discordance 5.0 « fil de correspondance » — tranchée

Le programme 5.0 recadre le volet médecin en **fil de correspondance** (réponse du
médecin **dans le fil**, sans pièces jointes biologiques = **sans HDS**), postérieur
au cadrage figé de C3. **Décision de clôture V1** : C3 V1 livre le **rendu médecin
sortant** (document composé, non prescriptif). Le **fil bidirectionnel** (réception
et rattachement d'une réponse médecin) est une **extension à cadrer séparément** —
elle touche l'identité/l'accès médecin et la conservation des échanges, hors
périmètre V1. **Reportée**, non improvisée. À reprendre dans une campagne dédiée
(ou un lot d'extension C3) une fois l'accès médecin et le régime de conservation
arbitrés.

## 5. Suite

- Registre : pointeur C3 mis à jour (V1 exécutée) ; la frontière A2 reste la source
  normative. Aucune décision nouvelle n'est promue par ce handoff hors du report §4.
- Prochaine action possible : monter C3 au cockpit praticien (route + page) ou
  cadrer le fil de correspondance médecin.
