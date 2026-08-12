### Ajouté

- **Le cockpit praticien reçoit réellement les constats de contradiction**
  (`D-050`). `POST /api/praticien/cockpit` les rend à côté de la revue clinique,
  et le panneau les affiche. La capacité d'affichage existait depuis l'étape 5
  du LOT-01 ; **aucun site d'appel ne la nourrissait**, et le critère de sortie
  du lot **sur le panneau cockpit** n'était pas tenu. Il l'est. L'autre volet de
  l'étape 5 — l'injection dans les vigilances déterministes de la synthèse —
  reste ouvert, et `D-050` le dit.
- **Deux bancs tiennent le fil, un par maillon** : que la route mette bien ce
  que le service rend, et que le composant affiche ce que la route rend. Un seul
  des deux laisserait passer un `contradictions: []` codé en dur — le banc du
  composant mocke `fetch` et ne voit pas la route.

### Éteint — et c'est toujours le point

- **Rien ne s'allume.** Le double verrou fail-closed est appliqué **dans le
  service** — drapeau d'environnement **et** signature clinique de la table —, et
  la table est livrée non signée : la liste est vide quel que soit le drapeau.
- **Le verrou est franchi avant toute lecture du dossier.** Un service qui
  lirait puis filtrerait à la sortie toucherait la donnée d'un patient pour un
  affichage qui n'a pas lieu — et le jour où le filtre de sortie s'oublie, la
  lecture est déjà faite. Un banc épingle qu'aucune requête ne part.

### Détails de conception

- **La conversion va vers un modèle d'affichage, et `D-050` complète `D-044`.**
  `D-044` écrit « l'injection cockpit convertit » **sans nommer de cible** ; la
  cible est nommée ici, et le choix n'était pas libre : `confidence` n'offre que
  `solide`, `probable`, `fragile`, `à_documenter`, et **aucune valeur ne dit
  « non applicable »**. Toute cible héritant de `ClinicalFindingBase`
  obligerait à inventer un degré de certitude, ce que le garde de `D-041`
  interdit. Le choix entre au registre plutôt que dans un journal : sans lui, le
  lecteur de `D-044` reste devant une conversion sans destination.
- **Le recalcul depuis `rawAnswers` est partagé, pas recopié.** L'en-tête du
  moteur en fait une obligation de l'appelant ; l'appelant réutilise la fonction
  d'`orientationService` plutôt que d'en dupliquer les cinq motifs de mise à
  `null`. Une fermeture clinique recopiée dans deux services est une fermeture
  qu'on peut oublier de corriger dans l'un des deux — c'est le motif qui avait
  déjà sorti le double verrou de la route d'orientation. La fonction a perdu
  « Orientation » de son nom : il désignait son seul consommateur d'alors, pas
  ce qu'elle fait.
- **Le champ est requis, pas optionnel**, dans le type de réponse de la route :
  un producteur qui l'oublierait ne compile pas. Deux fixtures de test ont dû
  être complétées, ce qui est exactement l'effet recherché.
- **Une passation écartée n'entre pas dans un constat, drapeau ou pas.** Le
  motif de validité du recalcul partagé est gaté par un drapeau éteint en
  production ; l'appelant applique donc le prédicat sans drapeau créé trois
  jours plus tôt par la revue du repère de synthèse. Différence assumée avec la
  synthèse, qui transmet tout et marque : un constat n'a pas de place où porter
  une réserve — il est vrai, ou il ne se produit pas.
- **Le périmètre n'est pas celui de `review`, et c'est dit** : la revue clinique
  est calculée sur les réponses incluses dans l'épisode T0 confirmé, les
  contradictions sur le dossier entier. Un constat peut donc reposer sur une
  passation laissée hors de l'épisode ; ses passations sont datées à l'écran.
  Aligner les deux périmètres est un arbitrage clinique qui n'a pas été rendu.
- **La matrice de consommation cesse de dire « affichage non câblé »** — la
  ligne était juste et ne l'est plus.
