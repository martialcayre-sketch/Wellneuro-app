### Le journal rétrospectif du portail s'en va, et son filet avec lui (2026-09-12)

Retirés : la dérivation (`lib/portail/journalDossier.ts`), l'écran
(`JournalDossier.tsx`), la route (`api/portail/journal`), le drapeau
`WN_PORTAIL_JOURNAL` et `isJournalPortailEnabled` — et **`lib/portail-visite.ts`
avec son bloc « Depuis votre dernière visite (N) »**.

**Ce dernier n'avait pas été explicitement demandé, et son retrait est assumé.**
Il est de la même famille que ce qui vient d'être refusé : un récapitulatif
rétrospectif, deviné d'un instantané `localStorage` plutôt que dérivé du serveur,
et portant un compteur entre parenthèses — ce que le fil du jour s'interdit. Il
n'était resté que comme filet du journal ; le trapèze parti, garder le filet
aurait conservé le bruit en changeant seulement sa source.

**UNE AFFIRMATION FAUSSE A ÉTÉ CORRIGÉE, EN LA NOMMANT.** La § B.4 de
`docs/FEATURE_FLAGS.md` disait : « la table `portail_journal_reperes` n'a rien
perdu — aucun repère n'avait encore été posé en treize minutes ». C'était une
supposition, pas une lecture. La table a été lue en production (one-off-4288) :
**une ligne, un dossier**, `vu_jusqua = 2026-09-12 12:34:33`. Un patient avait
bien ouvert son journal pendant ces treize minutes. La même § B.4 reproche trois
paragraphes plus haut d'avoir lu un 401 comme une preuve — la faute est de la
même nature, dans le même document : **une absence se constate, elle ne se
suppose pas.**

**Deux traces laissées exprès.** Le trou dans la numérotation des drapeaux de
`featureFlag.ts` (le journal était le sixième) n'est PAS comblé : les ordinaux
disent la position à laquelle chaque drapeau a été posé, pas un compte de ce qui
reste. Et un banc dont l'objet avait disparu a été supprimé plutôt que laissé —
un banc sans objet ne garde pas moins, il garde du vide.

Le repère lui-même — modèle Prisma, contrat SQL, ligne d'effacement — part avec
sa migration, au lot suivant : « migration seule » emporte le schéma et
l'effacement.
