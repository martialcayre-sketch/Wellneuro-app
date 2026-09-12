### La lecture d'une carte du Fil s'écrit comme une lecture — migration seule

Le Fil du jour fait **une carte par geste** du patient sur son objectif, ancrée
sur sa ligne source. PAT006 en porte donc deux, identiques, parce qu'il a
ratifié deux fois à dix secondes d'écart. Et rien ne les retire : le seul geste
qui écarte une carte est « Écarter », un **refus explicite**. Le praticien qui a
ouvert la fiche, lu la réponse et repris l'objectif retrouve les mêmes cartes le
lendemain — et doit refuser une à une des paroles qu'il vient de lire.

`fil_card_lectures` ouvre la voie à l'autre geste : **lire**.

**Pourquoi une table, et non la table des refus.** Le Fil distingue déjà, et
exprès, « écartée sans avoir été vue » de « traitée » — `lib/fil/inbox.ts`
l'écrit noir sur blanc, et le dépôt porte pour cela une table de lecture
praticien dédiée. Écrire une lecture parmi les refus ferait afficher « Carte
écartée — … » pour une carte qu'on a traitée : le dossier dirait que le
praticien l'a refusée. Un écran qui ment sur ce que son lecteur a fait est pire
qu'un écran qui ne dit rien.

**Ancrée sur le dossier et le type, jamais sur la carte** — arbitrage du
responsable. Une lecture n'est pas l'acquittement d'une ligne : c'est le constat
qu'on a ouvert la phase où ces gestes se lisent, et on les y voit tous. Ancrer
sur la clé laisserait à PAT006 une carte orpheline après la lecture, qu'il
faudrait écarter à la main — c'est-à-dire refuser une parole qu'on vient de
lire. `lue_le` fait la coupure ; un geste postérieur reparaît, et c'est voulu.

**Réversible, comme un refus.** Pas d'unicité : « Remettre » est une seconde
ligne (`lue = false`) qui supplante la première. Une carte qui part toute seule
doit pouvoir revenir — le lien peut avoir été ouvert par mégarde.

Sept promesses éprouvées par contrat SQL négatif, dont deux cas positifs plutôt
qu'un (la seconde lecture, l'annulation chaînée) et le `DEFAULT lue = true`
éprouvé deux fois : par le comportement, et par la promesse déclarée.

**Migration SEULE** (`D-087`) : aucun code consommateur ne part avec elle. Les
deux tables du Fil entrent au registre des traitements, rubrique 5 — la
nouvelle, et sa sœur `FilCardRejection` qui traînait au passif depuis le
2026-09-09.
