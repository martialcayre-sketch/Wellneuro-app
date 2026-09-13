### Synthèse — la priorité d'un axe se choisit, elle ne se présume plus

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

**La liste des priorités rejoint le validateur qui la fait respecter.**
`PRIORITES_AXE` est désormais exportée de `synthese-praticien.ts` et alimente le
sélecteur — même motif que `MAX_AXES_PRIORITAIRES` (`D-107`) : l'écran et le
serveur ne peuvent plus diverger sur ce qu'est une priorité recevable.

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
