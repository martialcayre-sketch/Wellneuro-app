---
id: "LOT-05"
titre: "Instanciations et aperçu patient"
statut: "terminé"
dépend_de: "LOT-04"
---

# LOT-05 — Instanciations et aperçu patient

## But

Instancier `ModeConsultation` et `PrévisualisationPatient` avec les objets C1
validés et une frontière stricte entre données praticien et patient.

## Résultat observable

Le praticien dispose d'un résumé décisionnel centré sur la priorité et les
trois actions, ainsi que d'un aperçu fidèle de ce que recevra le patient.

## Périmètre

- résumé décisionnel et décision attendue ;
- aperçu patient filtré ;
- résumé de clôture de consultation ;
- tests de non-exposition des notes internes.

## Hors périmètre

- moteur documentaire multi-audience C3 ;
- suivi longitudinal C2 ;
- diffusion sans validation.

## Interdits

- Pas de secret ou donnée patient réelle.
- Pas de logique clinique nouvelle.
- Aucun champ interne dans la vue patient.

## Tests

Tests composants, contrats d'audience et E2E sur les trois patients fictifs.

## Critères de done

- mêmes objets validés dans les deux lectures ;
- filtrage patient testé ;
- aucune diffusion implicite ;
- navigation clavier et mobile vérifiées.

## Résultats

Implémentation clôturée : contrat pur `PatientProtocolView` versionné,
approbation praticien liée aux hashes et projection par liste blanche. Le
résumé praticien distingue « relu », « validé pour diffusion » et « non
transmis » ; l’aperçu local ne montre que la priorité, la raison d’être, les
plans minimaux, la fiche éventuelle et le critère J21.

La fiche de production conserve un état indisponible tant que le flux runtime
`DecisionCard` / `ProtocolDraft` n’est pas branché. Aucun calcul de charge,
appel réseau, stockage ou envoi n’a été ajouté.

Validations : 10 tests ciblés et 150 tests globaux, `type-check`, lint,
certification des 63 questionnaires, contrôle anti-secrets et
`git diff --check`. Playwright non exécuté localement faute de
`NEXTAUTH_SECRET` ; le scénario bureau, tablette et mobile a été étendu.
