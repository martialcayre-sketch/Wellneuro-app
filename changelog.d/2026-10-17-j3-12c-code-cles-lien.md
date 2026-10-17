### Atelier corpus : les besoins servis et la rubrique d'usage se posent sur un claim (D-321, J3-12c, code)

- À la validation individuelle d'un claim, le praticien peut cocher les
  besoins qu'il sert (1 à 12) et choisir sa rubrique d'usage (une des dix des
  fiches d'usage) : les deux clés s'écrivent sur le claim dans la même
  transaction que la signature et se recopient dans l'élément du journal.
  Rien n'est coché ni choisi d'office ; une saisie partielle bloque la
  signature.
- Onglet « Validés » : chaque claim dit ses clés ou « Non étiqueté » ;
  « Étiqueter » (ou « Corriger l'étiquetage ») les pose sans re-signer, acte
  journalisé sous le type `etiquetage`, sans statut — un compte des
  signatures ne le voit pas.
- Route de décision : `action: 'etiqueter'` ; clés hors liste, partielles ou
  jointes à une autre décision que la validation refusées en 422 ; claim
  remis en attente entre l'écran et l'acte refusé en 409, rien d'écrit.
- L'ingestion refuse désormais `besoins` et `rubrique` dans la `metadata`
  d'un claim : ces clés se posent de la main du praticien seulement. La
  revue en lot n'en pose aucune.
