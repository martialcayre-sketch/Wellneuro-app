### L'instruction de signature biologie était un piège ; elle est réécrite et gardée (2026-08-16)

Finding `E2` de la revue des PR `D-061`/`D-062`/`D-063`. L'instruction posée
par `D-063` dans `indicationsBiologieV1.ts` — « poser `shaPerimetre =
INDICATIONS_BIOLOGIE_SHA256` » — cassait ou neutralisait le verrou si on
l'exécutait telle quelle : la constante est déclarée après la métadonnée
(`ReferenceError` à l'import — crash, pas fail-closed), et réordonner pour
compiler rendait la comparaison tautologique — un SHA recalculé à chaque
chargement concorde toujours avec lui-même, la péremption que `D-063` a
construite n'aurait plus jamais été détectée. Le piège se serait déclenché
exactement au geste que `D-063` demande au praticien.

- **Instruction réécrite** : `shaPerimetre` se pose en **littéral figé** — la
  chaîne hex recopiée au moment de la relecture (patron `SHA_CONTENU_…` des
  priorités) — avec la mise en garde explicite contre l'ancienne écriture.
- **`indicationsBiologieV1.guard.test.ts`** (dette `T6` de la revue) : le SHA
  de la table vide est épinglé en littéral — la première règle ajoutée fait
  rougir le banc, et le remède documenté est de re-signer ; le texte du
  fichier est gardé contre l'écriture tautologique (indiscernable d'une
  signature légitime à l'exécution, seule la lecture du source la voit) ;
  la propriété « le littéral ferme le verrou dès que le périmètre bouge » est
  éprouvée plutôt qu'affirmée. Mutation jouée : l'écriture interdite posée
  dans le code fait rougir le banc, hors commentaires.

**Aucun contenu signé n'est modifié** : les valeurs de la métadonnée sont
intactes (`validationExterne: true`, reste `null`/vide — verrou fermé,
`D-063`), la table reste vide, et `INDICATIONS_BIOLOGIE_SHA256` est inchangé —
le banc l'épingle précisément. Diff : commentaires d'un fichier clinique et un
fichier de test ; pas de décision `D-xxx` nouvelle, la doctrine appliquée est
celle de `D-063`.
