---
id: "LOT-10"
titre: "retrait-du-journal"
statut: "livré — 2026-09-12"
dépend_de: "LOT-09 (le fil du jour porte enfin tout ce qu'on lui demandait)"
---

# LOT-10 — Le journal rétrospectif s'en va, et son filet avec lui

## Ce qui est retiré

- `lib/portail/journalDossier.ts` — la dérivation, et son banc.
- `components/patient/JournalDossier.tsx` — l'écran, et son banc.
- `api/portail/journal/route.ts` — la route, et son banc.
- `isJournalPortailEnabled` et le drapeau `WN_PORTAIL_JOURNAL`.
- **`lib/portail-visite.ts` et son bloc « Depuis votre dernière visite (N) »**.

Le repère (`PortailJournalRepere`, son modèle, son contrat SQL, sa ligne
d'effacement) **reste dans ce lot** : il part avec sa migration, au suivant.
« Migration seule » emporte le schéma et l'effacement — les séparer ferait
rougir T3 sur la dérive schéma ↔ migrations.

## Pourquoi `portail-visite.ts` part AUSSI, alors qu'on ne l'avait pas demandé

Parce qu'il est de la **même famille** que ce qui vient d'être refusé. Le
responsable a écrit : « "ce qui s'est passé dans votre dossier" ne me convient
pas, cela rajoute trop de bruit ». `portail-visite` produisait le même genre de
bloc, deviné d'un instantané `localStorage` au lieu d'être dérivé du serveur —
et il portait même un **compteur entre parenthèses**, ce que le fil du jour
s'interdit explicitement.

Il n'était resté que comme **filet** du journal (§ B.4). Le trapèze parti, garder
le filet aurait conservé le bruit en changeant seulement sa source. C'est un
élargissement du périmètre demandé, il est assumé et nommé, et il se défait par
un `git revert` de quelques lignes si l'arbitrage était mauvais.

## UNE AFFIRMATION FAUSSE, CORRIGÉE EN LA NOMMANT

§ B.4 disait : « la table `portail_journal_reperes` n'a rien perdu — aucun repère
n'avait encore été posé en treize minutes ». **C'était une supposition, pas une
lecture.**

La table a été lue en production (one-off-4288) : **une ligne**, **un dossier**,
`vu_jusqua = 2026-09-12 12:34:33`. Un patient a bien ouvert son journal pendant
ces treize minutes.

Ce qui rend l'erreur instructive : la § B.4 reproche, trois paragraphes plus
haut, d'avoir lu un 401 comme une preuve du drapeau. La même faute a été commise
dans le même document. **Une absence se CONSTATE, elle ne se suppose pas.**

## Deux traces laissées exprès

**Le trou dans la numérotation des drapeaux.** Le journal était le SIXIÈME ; la
série de `featureFlag.ts` va maintenant de cinquième à septième. Les ordinaux
disent la position à laquelle chaque drapeau a été POSÉ, pas un compte de ce qui
reste : les décaler ferait dire au fichier que le rappel patient fut le sixième,
ce qui est faux. Le motif du trou est écrit à l'endroit du trou.

**Un banc supprimé plutôt que désactivé.** `le hub questionnaires date sa visite
d'après le patient` gardait un appel qui n'existe plus. Un banc dont l'objet a
disparu ne garde pas moins : il garde du vide, et laisse croire qu'une surface
est surveillée alors qu'elle n'écrit plus rien. L'entrée `lib/portail-visite.ts`
a dû quitter `SURFACES` pour la même raison — le banc EXIGE au moins une clé par
surface listée, donc l'y laisser aurait échoué à la lecture du fichier plutôt
que de passer à vide. C'est le bon comportement pour une garde, et il a servi.

## Preuve

- T1 vert. T3 complet.
- **Aucune mutation jouée, et c'est motivé** : ce lot n'ajoute aucune logique.
  Muter du code supprimé n'a pas de sens ; ce qui reste à prouver est que rien
  ne référence plus ce qui n'existe pas, et c'est le compilateur qui le dit.
- T3 laisse **un rouge, et c'est `D-049`** : `portail-dossier-deux-voix`,
  iPhone 13/WebKit, `page.goto` expiré à **120 s exactement**, **aucune requête
  serveur** vers cette route, surface qu'aucun fichier du diff ne touche. Même
  signature que ce matin, que le CI a arbitrée verte. Non présenté comme vert.
