### LOT-06 — biologie opérante sans valeurs : moteur, courrier, arbitrage, révision (D-059)

- **Moteur de statuts biologie** (`biology-library/statuts.ts`) : six statuts
  (`recommandé | optionnel | conditionnel | non_indiqué_actuellement |
  déjà_documenté | à_répéter`) dérivés du tableau clinique par la table
  d'indications TS signée (`indicationsBiologieV1.ts`, patron orientation —
  conditions typées, claims épinglés). **Table livrée vide et non signée**
  (`validationExterne: false`) : les règles réelles arrivent avec la
  proposition de catalogue validée ligne à ligne par le praticien. Fail-closed
  à chaque porte (table non signée, zéro règle, catalogue vide), motif en
  français ; un déclencheur non rempli s'affiche `conditionnel` avec sa
  condition, jamais absent ; deux règles sur un même panel = discordance
  signalée, panel écarté (DC-30). Aucun délai de répétition inventé : `à
  répéter` n'existe que si la règle en déclare un, sourcé.
- **Courrier médecin** (`biology-library/courrier.ts`) : gabarit non
  prescriptif rendu par l'unique chokepoint `renderDocumentHtml(…, 'medecin')`
  (garde `assertRenduMedecinNonPrescriptif`) ; un libellé prescriptif refuse le
  courrier au lieu de le contourner ; texte consignable tel quel par
  `preparerCorrespondance`. Remise manuelle, aucun envoi automatique.
- **Arbitrage sans valeurs** (`api/praticien/biologie/arbitrage`, panneau
  fiche patient) : verdict `confirme | infirme | sans_objet` posé côté serveur
  (`arbitrePar` = session, `arbitreLe` = base), `infirme` sans note refusé,
  ancré sur la version active seule, un arbitrage par intention et par version
  (unicité SQL). Fail-closed sans `WN_CB_ENABLED`. Aucune valeur d'analyse ne
  transite ni ne se stocke ; contrat SQL négatif dédié
  (`cb_arbitrage_biologique_v1_negatif.sql`, câblé en CI).
- **Révision** : l'arbitrage ne crée pas la version — le praticien applique
  les verdicts (nouvelle version via la route de versionnement existante,
  `supersedesDraftId`), sous la garde serveur `resolution_sans_arbitrage` :
  résoudre une intention `conditionnelle_biologie` sans arbitrage lié est
  impossible, la résolution suit le verdict (`confirme` ⇒ `active`, `infirme`
  ⇒ `non_indiquee_actuellement` conservée et motivée dans `limitations`),
  `sans_objet` ne fonde aucune résolution (lecture conservatrice de D-059 §4).
  La caducité d'approbation existante force la re-validation ; le portail sert
  l'ancienne version approuvée entre-temps.
- **Carte de Fil** `biologie_arbitree` (« Biologie arbitrée — protocole à
  réviser ») : différence entre deux artefacts persistés (arbitrage résolutif
  présent, version non supplantée), au patron `jalon_j21` ; s'éteint d'elle-même
  à la révision. Lecture gatée par `WN_CB_ENABLED`.
- Suites nommées (hors de cette PR) : migration de DONNÉES du catalogue niveau
  1 (PR séparée, contenu validé praticien) ; route/écran de proposition de
  bilan et bouton courrier (n'ont de sens qu'avec un catalogue publié — les
  verrous les rendraient morts aujourd'hui) ; stockage de
  `RequiresMedicalValidation` par analyte (aucune colonne : le moteur le reçoit
  en entrée, prouvé sur fixture).
