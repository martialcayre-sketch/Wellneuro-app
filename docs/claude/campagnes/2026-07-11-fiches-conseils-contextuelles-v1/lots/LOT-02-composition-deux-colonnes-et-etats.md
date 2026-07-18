---
id: "LOT-02"
titre: "Composition deux colonnes et machine d'états"
statut: "à_faire"
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

- [ ] Composant deux colonnes (sources ↔ aperçu), provenance par bloc.
- [ ] Câbler l'aperçu sur le mécanisme `PrévisualisationPatient`.
- [ ] Machine d'états + actions explicites + badge.
- [ ] Réemploi `buildBookletHTML` comme rendu d'aperçu.
- [ ] Tests (rendu, transitions, absence de fuite de données praticien).

## Tests

- `cd web && npm run type-check` ; `bash scripts/check_no_secrets.sh`
- Vitest / jsdom : les deux colonnes s'alignent ; transition vers « validé »
  seulement sur action ; l'aperçu n'expose aucun champ interne.
- Smoke praticien + vérification mobile/tablette (touche une interface).

## Critères de done

- [ ] Vue deux colonnes fonctionnelle, provenance visible par bloc.
- [ ] États `brouillon→relu→validé→envoyé` avec validation humaine.
- [ ] Aucune fuite de donnée interne praticien dans l'aperçu.
- [ ] Aucune migration.

## Risques / points de vigilance

- Ne pas réintroduire de score brut côté aperçu par le réemploi du booklet.
- Garder l'aperçu strictement lecture seule (contrat `PrévisualisationPatient`).

## Résultats

À compléter à la clôture.
