---
id: "LOT-06"
titre: "Le barème de charge — mécanisme signé, première ligne du praticien"
statut: "terminé"
dépend_de: "LOT-02"
---

# LOT-06 — Le barème de charge

## But

La charge thérapeutique est « saisie manuelle, aucun calcul automatique » et son
barème n'a **jamais été validé**. Le LOT-02 a déjà refusé qu'elle se pose en silence ;
ce lot lui donne une matière.

**La machine ne peut pas l'écrire.** Aucun seuil, dose, poids ou borne ne s'invente
(`DC-19`, `DC-20`). Le lot livre le mécanisme ; le praticien écrit et signe ce que la
charge compte.

## Répartition, et elle n'est pas négociable

| Livré par le lot | Écrit par le praticien |
|---|---|
| La table signée, sur le patron de `INDICATIONS_BIOLOGIE_V1` | Ce que la charge compte |
| `shaPerimetre` et la vérification **à cinq termes** | La valeur de chaque borne |
| Le refus fail-closed si la table n'est pas signée | La signature et sa date |
| Le moteur pur qui la lit | — |
| L'enrôlement dans les bancs de garde | — |

La vérification à cinq termes est le patron de `D-063` : booléen de validation
externe, date ISO valide, claims non vides, SHA de périmètre concordant — **un flip
de booléen ne suffit plus**.

## Une règle d'ordonnancement, tirée d'un échec mesuré

**Table, première ligne et signature dans la même campagne.** Rien n'est livré tant
qu'au moins une ligne n'est pas signée. Le rendement de remplissage d'une table
livrée vide est mesuré à **zéro** au dépôt : `clinical_rules`, le catalogue d'alertes
compléments et les seuils d'ingrédient portent 0 ligne chacun, et le moteur `D-056`
qui en dépend « refuserait tout ».

## Résultat observable

Le constructeur propose un niveau de charge fondé sur une ligne signée ; le praticien
le garde ou le change. La charge **reste déclarée par lui** — `source: 'practitioner'`,
posé en dur et inchangé.

## Périmètre

- Une table TypeScript signée + son moteur pur (aucune migration).
- Le branchement dans `ProtocolMiniBuilder`, en **proposition** jamais en substitution.
- Décision `D-xxx` : périmètre, champs, régime de signature, banc textuel.
- La première ligne signée.

## Hors périmètre

- Tout calcul qui remplacerait la saisie.
- Toute borne non écrite par le praticien.
- L'étage 3 (table d'interventions), qui compterait des interventions plutôt que des
  actions.

## Interdits

- Pas de secret, pas de donnée patient réelle, pas de migration.
- **Aucun seuil, dose, poids ou borne inventé.** Si la première ligne n'est pas
  écrite, le lot ne se livre pas — il se reporte.

## Étapes

- [x] Rendre la décision (périmètre, champs, signature) + fragment — [[D-196]].
- [x] Écrire la table, son moteur, sa vérification à cinq termes.
- [x] Recevoir la déclaration de conformité du praticien — [[D-198]], après une
      signature retirée puis reposée sur une surface de relecture.
- [x] Brancher en proposition ; enrôler dans les bancs de garde.

## Tests

T1, T2, T3. Le banc de signature doit être vu ROUGE sur une table dé-signée.

## Critères de done

Une ligne signée existe ; la table refuse de servir si sa signature ne tient pas ; la
saisie praticien reste souveraine.

---

## LIVRÉ LE 2026-09-15 — mécanisme, surface, et première échelle ratifiée

### L'échelle écrite — mise en service le 2026-09-15 par la déclaration du praticien

Trois bandes sur `nombreActionsFermes`, contiguës, sans trou ni recouvrement :

| Bornes (inclusives) | Niveau | Motif |
|---|---|---|
| `null` – 1 | léger | « Au plus une action engagée : la charge reste minimale. » |
| 2 – 2 | modéré | « Deux actions engagées en parallèle. » |
| 3 – 3 | chargé | « Trois actions engagées, le maximum que le protocole permet. » |

**La signature a d'abord été RETIRÉE, puis posée par une déclaration séparée**
([[D-195]] §1, rendue le même jour) : l'outil qui a proposé le contenu ne pouvait pas
l'attester seul. L'échelle est donc partie **hors service** dans la PR #1122, puis la
déclaration a été demandée sur une surface produite avant elle ([[D-198]]). Le motif
de `CHARGE-01` porte la trace de cette relecture — voir la dernière section.

**Ces bornes n'ont aucune source clinique, et la table le dit d'elle-même** — un banc
textuel l'exige. Rien au dépôt ne traite de la charge thérapeutique, aucun claim ne
les porte. C'est une **convention d'organisation** : proposée parmi trois échelles,
relue en entier, puis **ratifiée par le praticien**. D'où l'absence de `claimsSource`,
là où `INDICATIONS_BIOLOGIE_V1` en porte vingt-neuf.

**Ce qui les contraint est structurel** : `MAX_ACTIONS_PROTOCOLE_21J` vaut 3, donc
chaque terme est borné à 0–3.

**`excessive` n'est atteignable par aucune ligne**, et c'est l'arbitrage : un comptage
ne peut pas savoir qu'un protocole de deux actions est excessif pour quelqu'un qui
traverse un déménagement.

### Les six arbitrages du 2026-09-15

1. **Quatre termes mesurés**, tous dérivés du protocole donc jamais périmés.
2. **Le barème propose, le praticien déclare** — aucun refus n'est opposé à un écart.
3. **La charge de la version active redevient lisible** : elle était écrite,
   obligatoire, hachée — et relue par AUCUN écran en usage normal.
4. **Une échelle sur un seul terme**, sans trou ni recouvrement — devenu une **garde**.
5. **Hors barème : le silence.**
6. **Un niveau « excessif » se lit en avertissement**, sans ouvrir d'avance le champ
   de justification.

### Ce que la construction a trouvé en chemin

1. **La table signée ne peut pas être lue par l'écran** — elle importe `crypto`, et
   la suggestion doit s'afficher PENDANT la composition. La partie pure est séparée ;
   le verrou reste au serveur, en un point unique, et l'écran ne reçoit que des lignes
   déjà vouchées : il ne peut pas se signer un barème à lui-même.
2. **Une garde du dépôt a mordu** : toute table signée doit figurer à
   `docs/FEATURE_FLAGS.md` (`verrousSignatureDocumentes.guard.test.ts`).
3. **Un banc ne prouvait rien** : il appelait le verrou sur la table réelle — alors
   vide — et rendait `[]` que la garde tienne ou non. Constaté **par mutation** ;
   la fonction est désormais paramétrée et le banc l'exerce sur une table non vide.
4. **`suggererCharge` serveur n'avait aucun appelant** — le travers que cette
   campagne a passé son temps à fermer. Retiré.

### Vérifications

T1 vert. T2 : **9 326 bancs unitaires verts, 198 E2E verts, aucun rouge.** Vingt bancs
neufs sur le barème, neuf sur l'écran. Deux mutations vues ROUGES avant de déclarer
vert, restaurées depuis une copie.

---

## LA SURFACE DE RELECTURE (2026-09-15) — mécanisme écrit, bancs verts, table VIDE

Le mécanisme est livré sur la branche locale `lot06-bareme-charge`, **non poussée** :
`web/src/lib/clinical/baremeChargeV1.ts` et son banc de garde, **dix bancs verts**.
Rien ne partira tant qu'une ligne n'est pas écrite et signée — la règle
d'ordonnancement ci-dessus tient, et `DC-19`/`DC-20` m'interdisent d'inventer une
borne.

### Ce que le mécanisme mesure — quatre termes, tous DÉRIVÉS du protocole

Ils se recalculent à chaque lecture, donc ils ne se périment jamais en silence. Ce
qui reste à décider, c'est **où passent les bornes** — pas ce qu'on mesure.

| Terme | Ce qu'il compte |
|---|---|
| `nombreActions` | Les actions du protocole, suspensions comprises |
| `nombreActionsFermes` | Les actions **réellement engagées** — une action en attente de bilan n'en est pas |
| `typesDistincts` | Les types d'action distincts parmi les actions fermes |
| `actionsAvecEcartDePlan` | Les actions dont le plan idéal **diffère** du plan minimal — la seule mesure qui parle de l'effort et non du volume ; c'est l'écart que le patient vit les jours difficiles |

### La forme d'une ligne, et ce que vous avez à écrire

```ts
{
  id: 'CHARGE-01',                   // identifiant stable, survit à une réécriture du libellé
  terme: 'nombreActionsFermes',      // l'un des quatre ci-dessus
  min: 3, max: null,                 // bornes INCLUSIVES ; `null` = pas de borne de ce côté
  niveau: 'loaded',                  // 'light' | 'moderate' | 'loaded' | 'excessive'
  motif: '…',                        // ce que le praticien lira sous la suggestion
  statut: 'publiee',                 // 'publiee' | 'brouillon'
}
```

**Le `motif` est écrit par vous, jamais dérivé** : « trois actions engagées, dont deux
à fort écart de plan » est un motif ; « seuil atteint » n'en est pas un.

### Ce que le mécanisme refuse, et c'est déjà gardé par des bancs

- **Table vide** ⇒ aucune suggestion. Signer zéro ligne n'atteste aucune relecture.
- **Booléen seul** ⇒ refus. Il faut la date ISO canonique ET le SHA de périmètre
  concordant (patron `D-063` : un flip de booléen ne suffit plus).
- **Une ligne ajoutée après la signature** ⇒ le SHA ne concorde plus, le barème se
  referme. C'est exactement le défaut que `D-063` a fermé ailleurs.
- **Deux lignes publiées qui prescrivent deux niveaux** ⇒ aucune suggestion. C'est une
  discordance du barème, et le dépôt refuse de moyenner une discordance (`DC-30`).
- **Une ligne en brouillon** ⇒ ignorée, même sous une signature valide.

### Ce que le barème ne fera jamais

Il **propose**, il ne remplace pas la saisie : `TherapeuticLoad.source` vaut la
constante `'practitioner'`, posée en dur. L'écran affiche la suggestion et son motif ;
c'est la valeur du praticien qui s'enregistre.

### Ce qu'il me faut pour livrer

**Une ligne, au moins.** Dès qu'elle est écrite, je la pose, je calcule le SHA de
périmètre, je reporte votre attestation et sa date, et je pousse la PR. Je ne pose
jamais la signature moi-même — le garde interdit le câblage, pas la recopie, et
c'est la recopie d'une attestation que vous avez donnée.


---

## DÉCLARÉE CONFORME LE 2026-09-15 — et la relecture a corrigé une phrase

La déclaration de conformité a été rendue en séance, après lecture des trois lignes
**et de ce que chacune affiche aux quatre valeurs possibles** de
`nombreActionsFermes` — la surface exigée par [[D-195]] §2, produite avant la demande
et non après.

### Ce que la relecture a trouvé, et c'est la preuve qu'elle a eu lieu

`CHARGE-01` a `min: null` : elle couvre donc **zéro**. Or un protocole dont les trois
actions attendent un bilan ([[D-190]], sans plafond sur le nombre de suspensions)
n'engage rien — et le motif proposé, « Une seule action engagée : un pas à tenir »,
affirmait alors faux à l'écran. Le praticien a demandé une phrase qui couvre les deux
cas : « **Au plus une action engagée : la charge reste minimale.** »

Le périmètre a changé avec elle. L'ancien SHA — `e2ac8539…bb969910` — reste écrit
au-dessus du nouveau dans le module, **marqué jamais signé** ([[D-195]] §4) : aucune
déclaration ne l'a porté. Le périmètre déclaré conforme est
`40f5057e…3dd4757d`, recopié en littéral figé avec
`dateValidation: '2026-09-15T00:00:00.000Z'`.

### Les quatre cas, tels qu'ils s'affichent

| Actions engagées | Niveau suggéré | Phrase |
|---|---|---|
| 0 | léger | « Au plus une action engagée : la charge reste minimale. » |
| 1 | léger | « Au plus une action engagée : la charge reste minimale. » |
| 2 | modéré | « Deux actions engagées en parallèle. » |
| 3 | chargé | « Trois actions engagées, le maximum que le protocole permet. » |

Un banc les parcourt sur la **table réelle signée**, pas sur une fixture : il rougit
si une borne ou un motif bouge sans que la déclaration soit reposée.

### Deux gestes de garde posés le même jour

- **Enrôlement immédiat** de la table dans `shaPerimetreLitteral.guard.test.ts`, le
  jour de sa première signature — le retard d'enrôlement est ce que `D-067` puis
  `D-084` ont eu à rattraper après coup.
- **Le registre d'avertissement « excessif » est nommé DORMANT** dans le code :
  aucune ligne ne l'atteint, aucun banc ne l'exerce sur la table réelle. Il s'arme le
  jour où une ligne y montera — l'arbitrage a préféré le garder écrit plutôt que
  d'avoir à re-décider le registre à ce moment-là.

### Ce qui reste dû, et n'appartient pas à ce lot

La **mesure d'usage** : savoir si un praticien reprend ou écarte la suggestion se lit
en production, par identifiant, au conteneur — et la forme `run -d -- bash -c "psql …"`
est refusée par le classifier du mode auto. Dette portée par le bilan de campagne.
