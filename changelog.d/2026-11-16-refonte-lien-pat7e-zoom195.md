### Refonte Lien, PAT-7e : plus de défilement horizontal au zoom 200 % du téléphone (195 px) — titres, volet du hub, « Mes choix », accusé de lecture (2026-11-16)

Quatrième lot de correction issu du constat de PAT-7 en partie
(`pat7-constat-partiel.md` §3.5), après PAT-7a, sur le choix du responsable
du 2026-11-16 (`20261116-1509-d`, « Un petit lot PAT-7e après PAT-7a ») :
la convention du dépôt prend 195 px CSS (390 px au zoom 200 %) comme
référence ([[D-506]]). Aucun texte neuf : des classes seules.

Mesure sur fixture, WebKit (iPhone 13), 195 × 422 : de 1 à 61 px de
débordement sur U10, U21 (qui renvoie au hub), U26, U34, U35, U37 et U38 ;
0 px sur les 24 écrans après correctif.

- **Retour à la ligne des mots trop longs** (`overflow-wrap: anywhere`) : un
  mot n'est coupé que s'il ne tient pas seul sur sa ligne, donc rien ne change
  aux largeurs habituelles. Il s'applique aux titres de `PatientPageHeader`
  (« Ma fiche de renseignements », U35 ; « Votre accompagnement », au hub), au
  titre « Bilan neuronutritionnel » (U26), au volet « Mon accompagnement » du
  hub (U10, son chevron sortait de 6 px), au texte des documents
  d'information (`DocumentTrust`), aux cartes du centre d'information (U37,
  U38) et au bouton « J'en ai pris connaissance » (U34).
- **Césure française sous 320 px** (`hyphens: auto`, `lang="fr"`) sur les
  mêmes éléments : à 195 px, les colonnes de texte ne font que 65 à 97 px, et
  la coupure se fait à la syllabe, avec un trait d'union, plutôt qu'au
  caractère. Rien au-delà de 320 px.
- **« Mes choix et autorisations »** (U37, U38) : la pastille d'état
  (« Non autorisé », « Non proposée ») passe sous le libellé quand les deux ne
  tiennent plus sur une ligne. Le libellé garde au moins 6 rem à côté de la
  pastille, qui ne se coupe plus en deux : à 390 px, « Non proposée » tient sur
  une ligne et son libellé passe sur trois, à hauteur égale.

Reste ouvert : à 195 px, la carte du portail garde 32 px de marge intérieure
de chaque côté, ce qui limite la colonne de texte. Aucune route, garde,
drapeau, schéma ni règle clinique modifiés ; aucun texte de consentement, de
droits ni de sécurité modifié ; aucun décor avant COM-1.
