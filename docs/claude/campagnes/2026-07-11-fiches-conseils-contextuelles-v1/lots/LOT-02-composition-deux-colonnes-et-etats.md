---
id: "LOT-02"
titre: "Composition deux colonnes et machine d'états"
statut: "livré"
dépend_de: "LOT-01"
---

# LOT-02 — Composition deux colonnes et machine d'états

> Compilé le 2026-07-18 depuis `../CAMPAGNE.md` (décision actée « vue de
> composition deux colonnes »). **UI praticien. Aucune migration.** Consomme le
> contrat de bloc LOT-01.

## But

Donner au praticien la **vue de composition deux colonnes** — sources praticien à
gauche, aperçu destinataire à droite — et la **machine d'états** du document
(brouillon → relu → validé → envoyé) avec validation humaine obligatoire.

## Résultat observable

Le praticien assemble un document à partir des blocs validés ; il voit en regard,
ligne à ligne, ce que le destinataire lira :

```text
Sources praticien             Aperçu destinataire
─────────────────             ────────────────────
Donnée déclarée               Ce que vous avez décrit
Score calculé                 Ce que cela suggère
Décision validée              Votre priorité actuelle
Action 21 jours               Ce que vous allez essayer
```

L'état du document est visible et ne peut avancer vers « validé » que par une
action explicite du praticien.

## Périmètre

- Composant praticien de composition (deux colonnes), monté au cockpit, réutilisant
  les blocs LOT-01 et la provenance affichée par bloc.
- **Colonne de droite = instanciation du mécanisme `PrévisualisationPatient`**
  (HC-F, `PatientPreview.tsx`) : aperçu en lecture seule, sans donnée interne
  praticien (le filtrage réel par destinataire est spécifié en LOT-03).
- Machine d'états `brouillon → relu → validé → envoyé` (contrat LOT-01), boutons
  d'action explicites, badge d'état.
- Réemploi du rendu HTML existant (`buildBookletHTML`, iframe `sandbox`) comme
  base d'aperçu.

## Hors périmètre

- Adaptation fine par destinataire et vocabulaire réglementaire (LOT-03).
- Envoi (réutilisé en LOT-03/04), PDF (différé).
- Persistance des états (sauf gate (b) LOT-00) : l'état vit dans la session de
  composition en V1(a).

## Fichiers probables

- `web/src/components/patient-cockpit/` (nouveau composant de composition)
- `web/src/components/PatientPreview.tsx` (réutilisé)
- `web/src/lib/documents/**` (contrats LOT-01)
- `web/src/app/api/praticien/booklet/route.ts` (`buildBookletHTML`, réemploi)

## Interdits

- **Interface 100 % en français** ; aucun secret ; données patient fictives seulement.
- Aucune donnée interne praticien (score brut, interprétation) dans la colonne
  d'aperçu destinataire.
- Aucune migration Prisma/SQL ni écriture Supabase sans confirmation distincte.
- Aucune transition d'état automatique vers « validé » (validation humaine obligatoire).

## Étapes

- [x] Composant deux colonnes (sources ↔ aperçu), provenance par bloc.
- [x] Aperçu par destinataire (field-filter du domaine LOT-01) ; câblage sur le vrai
      `PrévisualisationPatient` (rendu portail) reporté au LOT-03 avec le rendu HTML.
- [x] Machine d'états + actions explicites + badge.
- [~] Réemploi `buildBookletHTML` comme rendu d'aperçu : reporté au LOT-03 (extraction
      de `buildBookletHTML`, aujourd'hui module-privé) — l'aperçu LOT-02 est un rendu
      React deux colonnes.
- [x] Tests (rendu, transitions, absence de fuite de données praticien).

## Tests

- `cd web && npm run type-check` ; `bash scripts/check_no_secrets.sh`
- Vitest / jsdom : les deux colonnes s'alignent ; transition vers « validé »
  seulement sur action ; l'aperçu n'expose aucun champ interne.
- Smoke praticien + vérification mobile/tablette (touche une interface).

## Critères de done

- [x] Vue deux colonnes fonctionnelle, provenance visible par bloc.
- [x] États `brouillon→relu→validé→envoyé` avec validation humaine.
- [x] Aucune fuite de donnée interne praticien dans l'aperçu (test dédié).
- [x] Aucune migration.

## Risques / points de vigilance

- Ne pas réintroduire de score brut côté aperçu par le réemploi du booklet.
- Garder l'aperçu strictement lecture seule (contrat `PrévisualisationPatient`).

## Résultats

Livré le 2026-07-18. Composant `web/src/components/patient-cockpit/DocumentComposer.tsx`
(client, 100 % français, aucune migration) :

- **Vue deux colonnes** : « Sources praticien » (type + `contenu.praticien` +
  badge de provenance `source · version`) ↔ « Aperçu destinataire »
  (`blocsPourDestinataire` + `contenuPourDestinataire` du domaine LOT-01).
- **Sélecteur de destinataire** patient / médecin / praticien ; l'aperçu s'adapte,
  et n'affiche **jamais** le champ interne praticien pour patient/médecin
  (field-filter — test dédié).
- **Machine d'états** `brouillon→relu→validé→envoyé` via `avancerEtat`, avec badge
  d'état et actions explicites ; le passage à « validé » n'a lieu que sur clic
  (`parActionPraticien`), jamais automatiquement. L'état vit dans la session
  (V1 sans persistance).
- Tests jsdom **4/4** ; `npm run type-check` vert ; `check_no_secrets` OK.

Reports assumés (→ LOT-03) : l'**extraction de `buildBookletHTML`** (module-privé)
et le câblage sur le **vrai** `PrévisualisationPatient` (rendu portail /
impression HTML) sont livrés au LOT-03, avec les rendus par destinataire. Le
composant n'est pas encore monté dans une page de production : montage + adaptateurs
de blocs réels (SyntheseIA/cockpit → `Bloc`) au LOT-03.
