# Grille de constats — reprise du bilan avant le 2026-10-04

## Pourquoi elle est écrite maintenant, avant qu'il y ait quoi que ce soit à voir

Suite n° 5 du `BILAN.md` : *« reprendre ce bilan avec les constats de la fenêtre,
et conclure `D-093` dans un sens ou dans l'autre »*.

Cette grille est rédigée **le 2026-08-28, alors que les sept tables portent zéro
ligne**. C'est délibéré : une grille façonnée après coup se façonne autour de ce
qu'on a trouvé. Écrite avant, elle engage — et elle peut conclure **non**.

**Elle ne remplace pas le bilan** : elle dit ce qu'il faudra regarder, et ce qui
comptera comme une réponse. Le bilan, lui, reste à réécrire à la lumière des
constats.

---

## Ce qui a changé depuis le `BILAN.md`

Le bilan a été écrit le 2026-08-26. Cinq faits l'ont modifié, et ils changent ce
qu'on peut observer :

| Fait | Date | Conséquence sur les constats |
|---|---|---|
| `WN_OBJECTIF_PROPOSE` **posé** (`=true`) | 2026-08-28 | le moteur n'est plus fail-closed ; la condition (b) devient **productible** |
| La table de priorités passe de **2 à 4 règles** (`D-116`, `D-117`) | 2026-08-28 | le classement a désormais de quoi classer ; deux axes de plus peuvent apparaître |
| La source signée est **vérifiée au serveur** (`D-115`) | 2026-08-28 | un candidat que le registre ne publie pas est **écarté sans un mot** — à surveiller |
| Contrainte d'identité de cycle **appliquée en base** (`D-114`) | 2026-08-28 | deux cycles ne peuvent plus partager une ligne |
| Contre-revue adverse **jouée** — 5 réfutées sur 25 | 2026-08-27 | les défauts qu'elle a trouvés sont corrigés ; ce qui sera observé l'est sur un appareil durci |

**Une précision que le bilan n'avait pas à faire.** Tant que le drapeau était
éteint, la question du périmètre ne se posait pas.
`WN_OBJECTIF_PROPOSE_PATIENTS` est **vide**, et vide signifie **tous les dossiers
courants** — pas les trois du périmètre `D-093`. Donc :

- des propositions peuvent apparaître sur des dossiers **hors** périmètre
  `D-093`, et c'est conforme à `D-094` ;
- mais la **condition (a)** de `D-093` porte, elle, sur **les trois dossiers du
  périmètre**. Une proposition ailleurs ne la satisfait pas.

Confondre les deux ferait lever `D-093` sur un matériau qui ne le concerne pas.

---

## Condition (a) — un objectif rédigé, puis une réponse du patient

**Énoncé du bilan** : *« qu'un objectif soit rédigé sur l'un des trois dossiers
du périmètre, puis qu'un patient y réponde »*.

### Ce qu'il faut constater

1. Au moins une ligne dans `objectifs_negocies` **sur un dossier du périmètre
   `D-093`**.
2. Au moins une **réponse du patient** à cet objectif — ratification,
   contestation, ou « le dire autrement » : une ligne dans
   `ratifications_objectif` ou `amendements_objectif` rattachée à cet objectif.

### Ce qui ne suffit pas, et pourquoi

- **Un objectif seul.** Le bilan dit « rédigé, PUIS qu'un patient y réponde ».
  Un objectif sans réponse prouve que le praticien a écrit, pas que la boucle a
  tourné.
- **Une réponse sur un dossier hors périmètre.** Voir la précision ci-dessus.
- **Une ligne écrite en test.** Si la ligne vient d'une manipulation de
  vérification et non d'une consultation, elle ne constate rien. Le bilan devra
  le dire — c'est une information que la base ne porte pas, et qui n'existe que
  dans la mémoire de qui a fait le geste.

### Lecture (conteneur, lecture seule)

```sql
-- Objectifs et réponses, par dossier. AUCUN texte patient n'est lu : seuls des
-- comptes et des dates. Le rapprochement avec le périmètre `D-093` se fait
-- ensuite, à la main, sur les identifiants — jamais sur des noms.
SELECT o.id_patient,
       count(DISTINCT o.id) AS objectifs,
       count(DISTINCT r.id) AS ratifications,
       count(DISTINCT a.id) AS amendements,
       min(o.cree_le)       AS premier_objectif,
       max(greatest(r.cree_le, a.cree_le)) AS derniere_reponse
FROM objectifs_negocies o
LEFT JOIN ratifications_objectif r ON r.id_objectif = o.id
LEFT JOIN amendements_objectif  a ON a.id_objectif = o.id
GROUP BY o.id_patient
ORDER BY premier_objectif;

-- Le SENS de la réponse, et non son seul décompte. Un objectif CONTESTÉ
-- satisfait la condition (a) autant qu'un objectif ratifié — le patient a
-- répondu —, mais il ne raconte pas la même chose et le bilan doit le dire.
SELECT sens, count(*) FROM ratifications_objectif GROUP BY 1 ORDER BY 2 DESC;
```

---

## Condition (b) — un bilan écrit sur le COMPORTEMENT du classement

**Énoncé du bilan** : *« un bilan sur la façon dont le classement s'est comporté
suppose qu'il se soit comporté »*. C'est la condition qui était **non
productible** ; elle ne l'est plus.

### La distinction qui commande tout

> **« La table n'est plus vide » n'est pas « ça a servi ».**

Des lignes peuvent exister sans qu'aucun classement se soit comporté : une seule
ouverture de cockpit écrit une assemblée, et une assemblée d'une proposition ne
classe rien. Un bilan de comportement demande de la **variété** — plusieurs
dossiers, plusieurs axes, et au moins une occasion où l'ordre aurait pu être
différent.

### Ce qu'il faut constater

1. **Des propositions servies sur plusieurs dossiers** — un seul dossier
   documente une exécution, pas un comportement.
2. **Plus d'un axe représenté.** Quatre règles sont publiées : si toutes les
   propositions citent la même, le classement n'a jamais eu à départager.
3. **Au moins une assemblée à deux propositions ou plus**, où la plainte
   dominante a effectivement remonté un axe en tête — c'est le seul cas où
   l'ordre est une décision et non une conséquence.
4. **Le sort des dispositions** : combien de propositions ont été reprises,
   écartées, laissées sans suite (`dispositions_proposition`). Une proposition
   que personne ne regarde ne dit rien de la pertinence du classement.

### Ce qui compterait comme un constat NÉGATIF, et qui doit être écrit tel quel

La grille ne sert à rien si elle ne peut que confirmer. Sont des constats à part
entière, et ils **empêchent** de lever `D-093` :

- **Toutes les propositions citent le même axe** ⇒ le classement n'a rien classé.
- **Les candidats du cockpit sont systématiquement écartés** par la résolution
  serveur (`D-115`) ⇒ le cockpit propose des identifiants que le registre ne
  publie pas. À l'écran, cela se lit « la machine n'a rien trouvé sur ce
  patient » — un CONSTAT sur lui, là où la vérité est une inadéquation de
  référentiel. **C'est le risque le plus insidieux de la fenêtre.**
- **Des propositions produites mais aucune disposition** ⇒ la surface est servie
  et non lue ; on ne saura rien de la pertinence de l'ordre.
- **Zéro ligne au 2026-10-04** ⇒ voir « Ce que dit l'absence », plus bas.

### Lecture (conteneur, lecture seule)

```sql
-- 1. Volume et variété. `hash_sources` distingue des assemblées réellement
--    différentes de la même assemblée relue plusieurs fois (idempotence par
--    empreinte : deux appels sur les mêmes sources n'écrivent rien).
SELECT count(*)                          AS lignes,
       count(DISTINCT id_patient)        AS dossiers,
       count(DISTINCT hash_sources)      AS assemblees_distinctes,
       min(cree_le), max(cree_le)
FROM propositions_objectif;

-- 2. Quels axes ont réellement été servis. Si une seule règle apparaît,
--    le classement n'a jamais eu à départager.
SELECT fragment->'source'->>'regle' AS regle, count(*)
FROM propositions_objectif p,
     LATERAL jsonb_array_elements(p.fragments) AS fragment
WHERE fragment->'source'->>'nature' = 'regle_signee'
GROUP BY 1 ORDER BY 2 DESC;

-- 3. Le périmètre signé effectivement écrit. Il doit valoir celui de la
--    signature en vigueur au moment de l'écriture — jamais une valeur reçue
--    du navigateur (`D-115`).
SELECT DISTINCT fragment->'source'->>'shaPerimetre' AS sha
FROM propositions_objectif p,
     LATERAL jsonb_array_elements(p.fragments) AS fragment
WHERE fragment->'source'->>'nature' = 'regle_signee';

-- 4. Le sort des propositions. La colonne est `geste` (reprise ou écart
--    motivé), pas un statut : la disposition est un ÉVÉNEMENT, jamais un
--    update sur la proposition.
SELECT geste, count(*) AS n, count(motif) AS avec_motif
FROM dispositions_proposition GROUP BY 1 ORDER BY 2 DESC;

-- 5. Propositions servies mais JAMAIS disposées — le cas « la surface est
--    servie et non lue », qui empêche de conclure sur la pertinence de l'ordre.
SELECT count(*) AS propositions_sans_disposition
FROM propositions_objectif p
WHERE NOT EXISTS (
  SELECT 1 FROM dispositions_proposition d WHERE d.id_proposition = p.id
);
```

---

## Trois vérifications de provenance, à faire sur la PREMIÈRE ligne écrite

Elles ne concernent pas `D-093` mais la santé de ce qui vient d'être livré. À
faire une fois, tôt, pendant qu'une seule ligne existe et qu'elle se lit d'un
coup d'œil :

1. **La règle citée est publiée au registre** — `PRIO-DIG-01`, `PRIO-PON-01`,
   `PRIO-SOM-01` ou `PRIO-DOU-01`. Toute autre valeur signifie qu'un chemin
   contourne la résolution serveur.
2. **Le `shaPerimetre` écrit est celui du serveur**, jamais une valeur reçue.
3. **Le texte servi n'est pas celui du navigateur** : il doit être le `libelle`
   de la règle au registre, au caractère près.

Si l'une des trois échoue, ce n'est pas un constat de fenêtre — c'est un défaut,
et il se traite comme tel avant de continuer à observer.

---

## La réponse d'étape (LOT-05) demande une condition de plus

Elle exige **un `T0` confirmé** sur le dossier, en plus de l'objectif ratifié.
Aucun n'existait au 2026-08-26.

Depuis `D-113`, l'ancre s'appelle `T0`, `T1`, `T2`… et depuis `D-114` la base
tient son unicité. La lecture à faire :

```sql
SELECT milestone, count(*), count(DISTINCT id_patient) AS dossiers
FROM assessment_episodes GROUP BY 1 ORDER BY 1;
```

**Sans ancre confirmée, aucune fenêtre de jalon ne s'ouvre**, quelle que soit
l'ancienneté du dossier. Un bilan qui constaterait « aucune réponse d'étape »
sans vérifier ce point attribuerait à la surface un silence qui vient d'ailleurs.

---

## Ce que dit l'ABSENCE, et ce qu'elle ne dit pas

**`D-093` prévoit que le périmètre se REFERME** passé le 2026-10-04 sans les
deux conditions. Il ne s'étend pas par défaut.

**Une absence de constat n'est pas un feu vert** (`DC-24`, appliqué à la
gouvernance) — mais elle n'est pas non plus un verdict sur la fonctionnalité.
Le bilan devra distinguer, et le dire :

- **personne n'a ouvert la surface** — un constat d'usage, pas de produit ;
- **la surface a été ouverte et n'a rien produit** — un constat de produit, qui
  demande d'aller voir pourquoi ;
- **elle a produit, et ce qu'elle a produit ne permet pas de conclure** — le cas
  le plus délicat, et celui où la tentation d'étirer le matériau est la plus
  forte. C'est précisément ce que `DC-19` interdit : fabriquer la provenance que
  ce lot avait pour but de **recueillir**.

---

## Le dossier de signature du classement

Sa condition d'existence est la même que celle de `D-093` (a). Il ne se prépare
qu'après, et seulement si le matériau le justifie : signer un classement,
c'est certifier la provenance de l'ordre dans lequel des candidats sont
présentés. Zéro présentation ⇒ rien à certifier, et un dossier rédigé sur cette
base **supposerait** un comportement au lieu de le documenter.

---

## Rappel de méthode

- Lecture de production **par conteneur** (`scalingo run -d`), jamais par le MCP
  Supabase — qui lit la base gelée au cutover, pas la production.
- **Aucune identité patient** dans le bilan ni dans ce document : les dossiers se
  désignent par leur identifiant, jamais par un nom ou une adresse.
- Les requêtes ci-dessus ne lisent **aucun texte de patient** : des comptes, des
  dates, des identifiants de règle. C'est volontaire, et suffisant pour ce que
  les deux conditions demandent.
