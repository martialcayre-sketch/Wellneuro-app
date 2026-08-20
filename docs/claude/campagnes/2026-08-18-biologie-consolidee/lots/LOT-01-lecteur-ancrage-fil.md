---
id: "LOT-01"
statut: "à faire"
dépend_de: "aucun"
---

# LOT-01 — Le fil relit l'ancre, et dit si elle tient

## But

À la fin de ce lot, une lettre biologique du fil de correspondance dit **si son
ancre concorde avec la table d'indications courante** — et une lettre qui n'en
porte pas ne dit rien plutôt que de se faire passer pour périmée. Les colonnes
de `D-073` cessent d'être en écriture seule : elles deviennent la garde
qu'elles promettaient.

## Résultat observable

Dans le fil d'un dossier, une lettre établie aujourd'hui porte une mention de
concordance ; la même lettre, après une re-signature de la table, porte une
mention de péremption ; une lettre antérieure à `D-073` n'en porte aucune.

## Le point exact

`web/src/app/api/praticien/correspondance-medecin/route.ts` — la constante
`SELECTION` (aux alentours de la ligne 115) liste les champs servis par le fil.
Elle ne porte **ni** `ancrageSha256` **ni** `ancrageVersion` : les colonnes
sont écrites par le POST du courrier, et plus jamais relues. Le contrat SQL
`web/prisma/checks/c3_correspondance_ancrage_v1_negatif.sql` garde déjà
l'écriture (une ancre à moitié est rejetée) ; c'est le chemin de lecture qui
manque, et lui seul.

## Le verdict — trois états, et c'est le cœur du lot

| État | Condition | Ce que l'écran en fait |
|---|---|---|
| `concordante` | `ancrageSha256` **et** `ancrageVersion` présents, égaux au vivant | mention sobre de concordance |
| `perimee` | les deux présents, **l'un des deux** diffère | mention de péremption |
| `sans_ancrage` | les deux nuls | **rien** — aucun badge |

**`sans_ancrage` n'est PAS `perimee`, et confondre les deux serait la faute du
lot** (`DC-24` : une donnée absente n'est jamais un défaut). Une lettre sans
ancre est une lettre antérieure à `D-073`, ou une correspondance qui n'est pas
un courrier biologique. La présenter comme périmée ferait porter un soupçon à
tout l'historique.

**Le vivant, c'est `INDICATIONS_BIOLOGIE_SHA256`** (recalculé à l'import depuis
les règles publiées) **et** la version `'indications-biologie-v1'` — les deux,
jamais le SHA seul : une table re-signée sous une version neuve doit se voir.

## Périmètre

- `web/src/app/api/praticien/correspondance-medecin/route.ts` — `SELECTION`,
  et le **verdict calculé côté serveur**. Le SHA brut ne traverse pas HTTP : le
  client n'en ferait rien de juste, et l'exposer invite à le recomparer mal.
- Le composant du fil (`web/src/components/**`) — la mention, en français.
- Bancs : la route et le composant.

## Interdits

- **Ne pas toucher aux tables signées** (`indicationsBiologieV1.ts`,
  `statuts.ts`, `courrier.ts`) : ce lot lit une empreinte, il ne touche pas à
  ce qu'elle mesure.
- **Ne pas servir le SHA au client** ni recalculer le verdict côté navigateur.
- **Ne pas afficher de badge pour `sans_ancrage`** — le silence est le rendu
  juste, et il évite de bruiter tout l'historique.
- **Ne pas élargir `SELECTION` au-delà des deux colonnes** : le fil sert des
  lettres, pas le schéma.
- Aucune migration.

## Dépendances

Aucune. Le LOT-02 couvrira ce verdict par un parcours ; il n'est pas requis
pour livrer celui-ci.

## Tests

- Banc de route : les trois états, chacun sur sa donnée.
- **Banc par mutation, obligatoire** : remplacer le verdict par une
  comparaison sur le seul `ancrageSha256` doit **rougir** — sinon un
  changement de version passerait pour une concordance.
- Banc de composant : `sans_ancrage` ne rend aucun badge.
- Palier **T2** avant commit (API + UI).

## Critères de done

- [ ] `SELECTION` porte les deux colonnes ; le verdict est calculé côté
      serveur et seul le verdict traverse HTTP.
- [ ] Les trois états existent, `sans_ancrage` distinct de `perimee`.
- [ ] La mutation « comparaison sur le seul SHA » rougit — vérifié, pas
      supposé.
- [ ] Textes en français ; aucun badge sur les lettres sans ancre.
- [ ] T2 vert ; fragment `changelog.d/` écrit.
