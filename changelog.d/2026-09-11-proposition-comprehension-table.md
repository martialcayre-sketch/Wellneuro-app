### Schéma — la table des tirages du résumé global

« Ce que j'ai compris de vous » arrive vide, et rien ne le pré-remplit. La
reformulation de l'objectif, elle, arrive remplie depuis le 2026-09-11 — si bien
que la phase 3 demande deux fois au praticien de dire ce qu'il a compris, dont
une fois en repartant de zéro. L'arbitrage du 2026-09-11 ouvre la seconde voie :
un résumé global du dossier, proposé, à relire. Cette table en garde les tirages.

**Elle n'est ni `propositions_priorite_ia`, ni `syntheses_comprehension`.** La
première propose UN LIBELLÉ de 200 caractères à partir d'UNE synthèse et d'UN
dépôt ; celle-ci propose un TEXTE LONG à partir de PLUSIEURS synthèses validées
et des désaccords déjà signalés. La seconde porte ce que le praticien a écrit et
signé ; celle-ci porte ce que la machine a proposé. Rien n'est publié depuis
ici : un tirage doit être repris, relu et modifié avant d'exister comme
compréhension.

**La matière est plurielle, et c'est ce qui change tout.** Deux colonnes `text[]`
remplacent les deux colonnes d'identifiant de la priorité, et trois promesses en
découlent que l'autre table n'a jamais eu à tenir.

**Deux synthèses validées au minimum, dans la base.** La règle vient du
responsable : un dossier qui n'a pas fait deux tours n'a pas de quoi nourrir un
résumé global. Elle n'est pas seulement dans la route — un refus vaut mieux qu'un
texte produit sur une matière trop mince. `coalesce(array_length(…, 1), 0)` fait
la moitié du travail : `array_length('{}', 1)` rend **NULL et non 0**, si bien
qu'un CHECK écrit sans lui aurait valu NULL sur un tableau vide, donc serait
passé. La contrainte censée exiger deux sources aurait accepté zéro source. Le
contrat éprouve précisément ce cas, et sa mutation le tue.

**Aucune source vide, aucun trou NULL.** Une liste qui nomme une source
inexistante rend la ligne irrejouable sans que rien ne le dise. L'ordre des deux
tests compte : `'' = ANY(arr)` vaut NULL dès qu'un élément est NULL, et `NOT
NULL` vaut NULL, donc passe. C'est le test de NULL qui rend le test de vide digne
de confiance ; retirer le premier désarme le second en silence. Là encore, la
mutation le prouve.

**L'ordre des synthèses fait partie de la clé.** `{B,A}` n'est pas `{A,B}` :
l'ordre des sources est précisément ce que le texte produit reprend — l'arbitrage
du 2026-09-11 veut que la hiérarchie du résumé soit celle qu'un praticien a déjà
validée, jamais une hiérarchie neuve. Deux ordres ne rendent donc pas le même
texte et n'ont pas à partager une série de rangs.

**Append-only.** Le bouton « une autre » écrit une ligne de plus, de `rang`
suivant ; rien n'est écrasé. Un index unique interdit à deux tirages de partager
un rang, sans quoi resservir le tirage courant n'aurait pas de réponse
déterministe à horodatage égal. `rang` compte des ÉCRITURES, jamais des sujets
(`DC-19`/`DC-20`) : la liste blanche de colonnes fige cette absence.

**La borne de 4 000 caractères est celle du champ qu'il pré-remplit.**
`LONGUEUR_MAX_SYNTHESE` vaut 4 000 ; un tirage plus long que le champ où il doit
atterrir serait inutilisable. Il se refuse dans la base, au lieu d'être coupé
plus tard — tronquer serait l'altération de donnée que `lib/patient/ceQuiCompte.ts`
nomme en contre-patron.

**`modele` et `version_consigne` portent une promesse faite au patient.** La v2
de « L'intelligence artificielle dans Wellneuro » lui dit que le modèle et la
version du procédé sont enregistrés à chaque fois. Vides, la phrase deviendrait
fausse sans que rien ne rougisse.

**Une branche que la production ne peut pas prouver.** Il y a zéro désaccord en
base au 2026-09-11 : la seconde liste de sources ne sera jamais exercée par une
donnée réelle avant qu'un patient ne conteste. Le cas positif du contrat en est
la seule preuve, et il est écrit pour cela.

**L'effacement du dossier la couvre.** Toute table portant `id_patient` part avec
le dossier, par un appel nommé et non par une FK en cascade — les tirages écartés
aussi, puisqu'ils restent de la matière tirée de la parole du patient.

Migration seule, sans son code consommateur (`D-087`). Purement additive : une
table neuve, aucune colonne existante touchée.
