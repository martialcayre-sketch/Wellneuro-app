# H95 part B — textes à valider mot pour mot avant le code (2026-11-17)

Lot `h95-b-code` (file B), décision [[D-513]]. Ce document porte les textes que
D-513 exige **validés mot pour mot avant leur implémentation** : le contrat de
sortie (§6), la consigne de la proposition de priorité (§7) et les textes du
§12. Rien n'est publié ici : chaque texte entre au code dans la PR qui le
consomme. Statut : **validé tel quel par le responsable le 2026-11-17**,
sur question à options (`20261117-0901-b` de la liste commune). La découpe
en deux PR est tranchée le même jour (`20261117-0900-b`) : la PR 1 porte les
sorties et la consigne (§1, §2), la PR 2 le flux et les textes (§3 à §7).

Relu contre D-519 (#2105, export PDF) : aucune contradiction. Dans sa liste
« Ne touche pas », D-519 écrit que les deux champs biologiques de la synthèse
restent hors de l'export. Seule la phrase de D-513 §7 « La biologie en reste
exclue, conformément à D-252 §4 » est datée : depuis D-519, l'export porte une
section 5 de faits du laboratoire. Ce que D-513 §7 exige de la projection de
la synthèse ne change pas.

## 1. Contrat de sortie (`SYSTEM_PROMPT_CONTRAT_JSON`, D-513 §6)

Deux clés s'ajoutent à la structure, après `points_de_vigilance` :

```
  "resume_biologie_praticien": "Restitution datée des résultats de biologie transmis, pour le praticien seul. Chaîne vide sans restitution biologique.",
  "points_de_vigilance_biologie": ["Valeur datée, avec son unité, l'intervalle du laboratoire et le contexte, et ce qui reste à vérifier pour la lire"],
```

Sous l'accolade fermante, une phrase reprend au mot près le texte déjà validé
au §6 :

> `resume_biologie_praticien` est une chaîne, vide en l'absence de restitution biologique. `points_de_vigilance_biologie` est une liste de chaînes, vide en l'absence de vigilance biologique. Ces champs sont exclus du document médecin, du téléchargement du portail patient, des exports — y compris pour une IA externe — et de l'appel de priorité d'objectif.

## 2. Consigne de la proposition de priorité, `priorite-v2` (D-513 §7)

La v1 reste en l'état. Une seule règle s'ajoute aux « Règles absolues »,
après « aucune recommandation de traitement, de complément ni d'examen » :

> - aucun résultat de biologie : ne reprends aucun nom d'analyse biologique,
>   aucune valeur et aucun intervalle de laboratoire. Si l'un des deux textes
>   en contient, ne t'en sers ni pour fonder ni pour justifier la priorité,
>   ne le qualifie pas, ne le situe par rapport à aucun intervalle et ne le
>   rapproche d'aucune autre donnée ;

`VERSION_CONSIGNE` passe à `priorite-v2`. Commentaire de version : « v2
(D-513 §7) : défense en profondeur. Le résumé validé ne porte plus de
biologie (champs dédiés, contrôle de contamination). La consigne interdit
quand même toute reprise. »

## 3. Dossier RGPD (D-513 §12)

### 3a. Rubrique 2 (texte de D-497) et rubrique 5 (ligne du contexte de prélèvement)

« rien n'en part à l'IA » devient :

> rien n'en part à l'IA, sauf dans la synthèse préparée pour le praticien
> depuis [[D-513]] (rubrique 2, « Biologie transmise à la synthèse »)

### 3b. Paragraphe neuf, rubrique 2, après §2 ter : « Biologie transmise à la synthèse ([[D-513]]) — déclarée AVANT ouverture (2026-11-17) »

> **Ce qui part.** À la génération d'une synthèse, les résultats de biologie
> non annulés du dossier partent à Anthropic, dans le message de la synthèse
> (rubrique 6). Pour chaque résultat, cela comprend :
> - la date du prélèvement et, si l'import l'a lue, son heure ;
> - la valeur et son unité ;
> - l'intervalle imprimé par le laboratoire, ou la raison de son absence ;
> - le nom du laboratoire tel que lu à l'import ;
> - le contexte du prélèvement ([[D-497]]), champ par champ.
>
> Ne partent pas : le marquage et le commentaire du laboratoire, les statuts
> et les constats du praticien, le compte rendu.
>
> **Ce qui est conservé.** Le bloc envoyé est conservé dans la trace de la
> synthèse (`donneesEntree`), comme le reste du message. La restitution du
> modèle va dans deux champs réservés au praticien. Ces champs n'entrent ni
> au document du médecin, ni au téléchargement du portail, ni à l'export du
> dossier, ni à l'appel de priorité.
>
> **Base légale et finalité.** Inchangées : celles de la synthèse (2 bis).
>
> **Ouverture.** Le flux est gardé par un drapeau propre, créé éteint.
> Le responsable le pose après trois préalables : ce paragraphe validé, la
> version 24 de « Vos données personnelles » et les conditions 7 servies et
> constatées, l'évaluation sur dossiers fictifs rendue.

### 3c. Rubrique 6, ligne Anthropic

« assistance d'IA pour la préparation des synthèses » devient :

> assistance d'IA pour la préparation des synthèses (**résultats de
> biologie, intervalles imprimés, laboratoire et contexte du prélèvement
> compris depuis [[D-513]]**, déclaré le 2026-11-17 avant ouverture —
> rubrique 2)

## 4. « Vos données personnelles » v24

### 4a. Paragraphe du contexte de prélèvement (v23, D-497)

La dernière partie, « Seul votre praticien les voit ; l’application ne les
envoie à aucun outil d’intelligence artificielle. », devient :

> Seul votre praticien les voit. Elles sont transmises, avec vos résultats,
> à l’outil d’intelligence artificielle qui prépare le brouillon de la
> synthèse destinée à votre praticien (voir « L’intelligence artificielle
> dans Wellneuro »).

La phrase suivante, « Elles sont conservées et effacées avec votre
dossier. », ne change pas.

### 4b. Prestataires, ligne Anthropic

« pour la préparation des synthèses » devient :

> pour la préparation des synthèses, résultats de vos analyses biologiques
> compris

### 4c. Résumé du changement (`changeSummary`)

> Vos résultats d’analyses et les circonstances de leur prélèvement peuvent
> désormais être transmis à l’outil qui prépare le brouillon de la synthèse
> destinée à votre praticien. Le reste ne change pas.

## 5. « L’intelligence artificielle dans Wellneuro » v9

La v8 dit : « La préparation du brouillon de la synthèse de votre bilan, à
partir de vos réponses aux questionnaires et des éléments transmis à votre
praticien. » Elle ne nomme pas la biologie. Rédaction proposée :

> La préparation du brouillon de la synthèse de votre bilan, à partir de vos
> réponses aux questionnaires, des éléments transmis à votre praticien et,
> s’il y en a, des résultats de vos analyses biologiques avec les
> circonstances de leur prélèvement. L’outil ne les déclare ni normaux ni
> anormaux et n’en tire aucune conclusion. Ce qu’il en dit est réservé à
> votre praticien : la synthèse que vous recevez mentionne seulement que
> votre praticien a reçu un bilan, à sa date.

Résumé du changement :

> La synthèse préparée pour votre praticien peut désormais tenir compte de
> vos résultats d’analyses biologiques. Le reste ne change pas.

## 6. Conditions d’utilisation v7 (D-292 §5)

Parties reprises : « Vos données personnelles » v24 et « L’intelligence
artificielle » v9. La partie 5 reste celle de la v6.

### 6a. Résumé

> Les parties “Vos données personnelles” et “L’intelligence artificielle”
> disent que vos résultats d’analyses peuvent désormais être transmis à
> l’outil qui prépare le brouillon de la synthèse destinée à votre
> praticien. Le reste ne change pas.

### 6b. E-mail `conditions_utilisation@7`, phrase de tête

Le reste du corps est celui de la @6 au caractère près.

> Les conditions d’utilisation de votre espace Wellneuro évoluent : vos
> résultats d’analyses et les circonstances de leur prélèvement peuvent
> désormais être transmis à l’outil qui prépare le brouillon de la synthèse
> destinée à votre praticien.

L'envoi reste votre geste, après le déploiement ([[D-292]] §3).

## 7. Drapeau

Nom proposé : `WN_SYNTHESE_BIOLOGIE_ENABLED`. Il est inscrit à
`docs/FEATURE_FLAGS.md`, créé éteint, et exige aussi `isCbResultsEnabled`.
Seule la valeur `true` l'allume.
