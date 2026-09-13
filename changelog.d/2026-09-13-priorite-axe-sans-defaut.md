### Synthèse — la priorité d’un axe se choisit, elle ne se présume plus (2026-09-13)

`ajouterAxe` semait `niveau_priorite: 'modere'` sur tout axe créé par le
praticien, et `validerBrouillonPraticien` l'exigeait ensuite comme s'il avait
été choisi. L'oubli était donc **indiscernable d'un « modéré » assumé** — le
fail-open exact que `D-146` nomme : « un champ dont le défaut vaut *valide*
rend l'oubli indiscernable de l'affirmation ». Sur une bande clinique, cette
indistinction se propage : la priorité part dans le document praticien et
médecin sous un libellé que personne n'a posé.

Un axe créé naît désormais sans priorité, le sélecteur ouvre sur « Choisir la
priorité… », et l'enregistrement reste fermé tant qu'un axe n'a pas la sienne —
avec un message qui dit combien il en reste, pour éviter de les rouvrir un par
un. Aucune valeur nouvelle n'est introduite : les trois bandes sont les mêmes,
et aucun seuil ne bouge.

**La liste des priorités devient importable par l'écran, et un banc interdit
qu'elle diverge.** `PRIORITES_AXE` est exportée de `synthese-praticien.ts` et
alimente le sélecteur. Ce n'est pas pour autant une source unique — la revue l'a
relevé, et l'écrire aurait sur-promis : le contrat du modèle porte sa propre
liste (`NIVEAUX_PRIORITE`, `lib/anthropic.ts`), et `SyntheseSchema` en porte une
troisième forme, son union de type. La duplication est structurelle :
`lib/anthropic.ts` instancie le client Anthropic, et un composant client qui en
importerait une valeur tirerait le SDK dans le bundle.

Ce qui interdit la divergence est donc un banc, `prioritesAxeUneSeuleListe.guard.test.ts`,
qui compare les deux listes — valeurs ET ordre, parce que l'ordre compose le
message de violation servi au modèle à la relance — dans un fichier de test où
importer `lib/anthropic` ne coûte rien. L'union de type, elle, est tenue à la
compilation par les `Record` exhaustifs de l'éditeur. Ajouter une quatrième
valeur exige de toucher les trois ; l'oubli rougit au lieu de se glisser.

**Pourquoi la garde vit à l'écran et pas au serveur.** Elle est déjà au serveur
pour le brouillon praticien : `validerBrouillonPraticien` refuse toute valeur
hors liste. Mais l'autre chemin d'écriture — l'édition d'un brouillon IA — passe
par `validateSyntheseSchema`, tolérant **par construction**, parce qu'il relit
des blobs écrits sous des schémas antérieurs (« strict à l'entrée, tolérant à la
relecture — et jamais l'inverse »). Le resserrer rejetterait des synthèses déjà
en base. L'éditeur étant le seul producteur de cette valeur, la garde se pose là
où la valeur **naît**, pas là où on la relit : rien d'invalide ne part sur l'un
ni sur l'autre chemin.

Ce point n'est pas théorique. `depuisSynthese.ts` indexe `NIVEAU_LABEL` sans
repli : une bande vide qui atteindrait la base rendrait « Axe (undefined) » dans
un document **sortant**. C'est ce que la garde à la source empêche, et c'est
pourquoi elle est éprouvée par mutation — remettre `'modere'` fait rougir deux
cas sur trois.

Les synthèses existantes ne sont pas touchées : seule la création d'un axe
change, jamais la relecture d'un axe déjà écrit.
