### Import de biologie : l'intervalle et la marque imprimés par le laboratoire sont relevés et juxtaposés au résultat — BIO-INGEST LOT-07 (2026-10-05)

- **Pourquoi.** `D-267` : l'intervalle de référence et la marque d'anomalie
  imprimés sont des faits du compte rendu, perdus à la purge du document s'ils
  ne sont pas relevés. La v5 de « L'intelligence artificielle dans Wellneuro »
  les déclare déjà (#1328) ; les colonnes sont en base (#1326, #1332).
- **`bio-extraction-v2`.** Le schéma envoyé au modèle exige
  `intervalle_reference` et `marquage` (texte ou `null`), sans `maxLength`.
  La consigne demande de les recopier tels qu'imprimés, sans les compléter ni
  les reformuler, et interdit de déduire une marque en comparant la valeur à
  l'intervalle. Le parseur reste à clés exactes.
- **Un fait trop long se dit, il ne casse rien (`D-267` §10).** Au-delà de 300
  (intervalle) ou 50 (marque) caractères, mesurés en points de code comme la
  base, le fait reste vide et la ligne porte `intervalle_non_transcrit` ou
  `marquage_non_transcrit`. L'écran de validation l'affiche : « Imprimé mais
  trop long pour être transcrit ». Rien n'est tronqué, l'import n'échoue pas.
- **Restitution juxtaposée, attribuée, sans verdict (§5-§6).** À la validation
  et dans la série des mesures : « Imprimé par le laboratoire : intervalle … ·
  marque … ». Ni couleur, ni tri, ni statut, ni changement du choix proposé.
  Silences : aucun fait, unité lue différente de celle du résultat, résultat
  corrigé, valeur modifiée par le praticien à la validation (précision de
  `D-267` §5, revue Codex). Rien n'est copié sur `ResultatBiologique` (A5 intact) : la route des
  résultats lit les faits par la relation de la ligne qui a créé la mesure.
- **Sentinelle de vocabulaire.** La marque (« Élevé », « H ») est rendue dans
  un seul élément `data-fait-laboratoire="marquage"`. Le helper e2e
  `assertSentinelleBiologie` l'exempte, lui seul, à condition qu'il ne porte
  que le texte brut (ni enfant, ni classe, ni style) ; un spec l'exerce (`sentinelle-marquage.spec.ts`).
- **Banc BP-01 (§7).** Un second banc épingle, champ par champ, les sept
  modules qui écrivent, restituent ou transmettent les faits (charge
  `faitsLaboratoire` de la route comprise) : l'écran de décision et la
  restitution (les deux lecteurs de §7), plus les deux écrivains de
  l'extraction. L'enregistrement de la décision ne lit aucun fait.
- **Fait sans caractère visible.** Un NUL, un espace de largeur nulle ou des
  caractères de contrôle seuls valent `null` sans signal ; un NUL intérieur se
  retire (jamais imprimé, refusé par la base : il aurait fait échouer tout
  l'import). Un demi-caractère Unicode isolé invalide la sortie.
