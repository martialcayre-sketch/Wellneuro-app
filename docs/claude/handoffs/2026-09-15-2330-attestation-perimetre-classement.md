# Le périmètre du classement est attesté

**Attestation clinique du responsable**, 2026-09-15, sur l'empreinte
`da1ba306c0551d7b`. Elle a été demandée et donnée **en toutes lettres** : le
dépôt exige qu'elle soit décidée, pas déduite d'un « relue ».

## La chronologie fait la valeur

1. Périmètre posé INERTE et haché AVANT relecture ([[D-185]]) — pour que « ce
   qui est relu » soit mesurable.
2. Contre-expertise : trois des cinq objets ne pilotaient rien → liaison par
   comportement.
3. Contre-expertise : le banc ne couvrait que ce qu'il avait pensé à nommer →
   trois mutations vertes sur 46 cas.
4. Le responsable relit **et ne signe pas** : une réserve, fondée → le troisième
   invariant n'avait aucune épreuve ([[D-197]]).
5. La correction **ne touche pas au périmètre** → relecture toujours valide.
6. Le responsable atteste.

**Trois corrections de la preuve, zéro du contenu relu.**

## Ce qui est neuf, et ce qu'il faut savoir

**L'attestation se périme, et le contournement habituel ne marche plus.**

| Geste | Avant | Après |
| --- | --- | --- |
| Éditer un texte du périmètre | l'ancre rougit | l'ancre **et** l'attestation |
| Éditer **puis réancrer** | tout vert | **l'attestation rougit** |

`shaRelu` est un LITTÉRAL FIGÉ. Toute édition du module déplace `empreinte()`, le
littéral ne suit pas, et le banc réclame une re-signature en le disant.

**Si tu touches à `perimetreClassementV1.ts`** : ce n'est PAS une empreinte à
reporter. Retirer l'attestation (`relu: false`, dates et sha à `null`), écrire une
décision qui dit ce qui a bougé, et la redemander au responsable.

**L'écran a bougé** : la liste « Ajoutées par le moteur (hors périmètre signé) »
est SCINDÉE, parce qu'elle mélangeait les quatre textes relus et le motif de la
gate, qui ne l'est pas. L'écran LIT `ATTESTATION_CLASSEMENT` — retirée, les
textes retombent seuls sous « hors périmètre signé ».

## Ce qui reste ouvert

**La légitimité clinique des deux premiers termes n'est pas attestée.** Que la
plainte dominante prime sur la priorité intrinsèque — une règle de priorité 1
passe derrière une priorité 2 dès que le patient cote l'autre plus haut —
appellera son propre arbitrage. Le périmètre la décrit ; il ne la justifie pas.
