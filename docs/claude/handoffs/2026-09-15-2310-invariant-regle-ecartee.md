# Le troisième invariant du périmètre de classement — son épreuve manquante

**Contexte** : le responsable a relu le périmètre du classement sans le signer.
Une contre-expertise Codex sur la surface de relecture a rendu **BLOQUER la
signature en l'état**, sur une réserve technique ciblée — fondée.

## Le défaut

`INVARIANTS_PRODUCTEUR.regleEcarteeProduitUnCandidat` appartenait au périmètre
ATTESTÉ sans qu'aucune épreuve ne le tienne. Le moteur filtre par
`statut !== 'ecarte'` sans consulter l'invariant ; le banc comportemental de
`D-185` ne couvrait que `rangSequentielDepuis` et `confianceUnique`.

Rejoué par mutation **avec réancrage**, la méthode que cette campagne a adoptée :

| | Avant | Après |
| --- | --- | --- |
| `regleEcarteeProduitUnCandidat: false → true`, puis empreinte réancrée | **49/49 verts** | rouge |

## La correction, et pourquoi celle-ci plutôt que l'autre

Deux voies : retirer l'invariant du périmètre en déclarant qu'il n'est pas
prouvé, ou lui écrire son épreuve. **La seconde**, pour deux raisons :

1. elle prouve une propriété clinique réelle — une règle écartée par la gate de
   population ne remonte pas comme candidat ;
2. **le fichier signé ne bouge pas d'un octet.** `da1ba306c0551d7b` tient, donc
   la relecture déjà faite par le responsable **reste valide** : corriger une
   preuve ne doit pas l'obliger à tout relire.

L'épreuve LIT la valeur déclarée au lieu de la recopier. `.toBe(false)` en dur —
ce que fait le banc voisin de la gate, qui garde le comportement et non le
périmètre — laisserait la mutation passer.

## Ce qui reste ouvert

**L'attestation n'est PAS posée.** `relu: false`, et c'est l'état juste : le
geste appartient au responsable.

**La légitimité clinique des deux premiers termes n'est pas tranchée** — que la
plainte dominante passe devant la priorité intrinsèque de la règle relève du
jugement soignant, pas d'une preuve technique. Le périmètre la décrit fidèlement,
il ne la justifie pas.
