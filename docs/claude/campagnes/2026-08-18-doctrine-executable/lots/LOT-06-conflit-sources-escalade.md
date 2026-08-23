---
id: "LOT-06"
statut: "à_faire"
dépend_de: "LOT-04 — PLUS le LOT-02 depuis l'arbitrage du 2026-08-23"
---

# LOT-06 — V1 achevé : conflit de sources, escalade, sort de la convergence

## But

À la fin de ce lot, la forme `CONFLIT_SOURCES` **a un producteur et une
politique de résolution** (`DC-54`), dont l'escalade praticien est une issue
et non un échec (`DC-55`). Et le sort de la forme `CONVERGENCE` est
**tranché**, dans un sens ou dans l'autre.

## Pourquoi V1 a changé de nature

Le brief prévoyait « étendre l'objet de discordance du LOT-01 » et prévenait
que la fenêtre se fermait. Elle s'est fermée, et l'objet a été livré :
`contradictionFinding.ts` ([[D-041]], [[D-044]]) porte **un objet, trois
formes** — `DISCORDANCE`, `CONVERGENCE`, `CONFLIT_SOURCES` — avec les quatre
niveaux de `DC-29` typés mot pour mot et une garde structurelle qui interdit
tout champ de certitude sous quelque nom que ce soit.

La structure est donc **faite**, et bien faite. Ce qui manque n'est plus
l'architecture : ce sont les **producteurs** et la **politique**. Seule
`DISCORDANCE` est peuplée ; les deux autres formes sont vides à la livraison,
et le fichier le dit explicitement.

## Périmètre

1. **La politique de résolution `DC-54`**, écrite comme une procédure
   déterministe et versionnée : identifier la contradiction · ne pas fusionner
   arbitrairement · comparer niveau de preuve, contexte, date, population ·
   produire la **position la plus prudente**.
   **Trois des quatre axes sont mécanisables, le quatrième ne l'est pas** :
   `niveau_preuve` et `classe_autorite` sont au claim depuis l'origine,
   `valide_at` porte la date — mais **la population n'est pas sur le claim**
   et n'y sera pas (arbitrage du 2026-08-23, LOT-02). La politique doit donc
   **dire qu'elle ne compare pas les populations**, plutôt que faire comme si.
   Un axe manquant qu'on tait est un axe qu'on croit couvert.
2. **Le producteur `CONFLIT_SOURCES`** : deux claims du corpus qui se
   contredisent sur un même objet. La détection est déterministe, jamais
   générative.
3. **L'escalade `DC-55`** : un conflit non résolu à impact clinique
   significatif remonte au praticien comme **issue de la politique**. À ne pas
   confondre avec `D-003` (validation praticien en sortie), qui n'est pas
   déclenchée par un conflit identifié — l'audit le dit nommément.
4. **L'arbitrage `DC-29`** : produire une convergence est une **règle clinique
   neuve**. Rien dans le corpus ne dit aujourd'hui à partir de combien de
   sources indépendantes on écrit `CONVERGENCE_MODEREE` plutôt que
   `CONVERGENCE_FAIBLE` — et inventer cette graduation violerait `DC-19`.
   **Défaut assumé en l'absence de provenance : la forme reste vide**, et le
   lot l'écrit comme un état légitime, sur le patron des quatre règles à ne
   pas armer. Si une provenance existe, elle se signe ; sinon `DC-29` reste
   « typée, sans producteur », ce qui est une information et non une dette.

## Interdits

- **Aucun champ de certitude, de probabilité, de score ou de confiance** sur
  l'objet, sous quelque nom que ce soit — la garde existante l'assère **sur le
  type**, et [[D-044]] rappelle qu'un objet voisin y avait déjà échoué.
- **Aucune graduation de convergence inventée** (`DC-19`) : pas de « trois
  sources = forte » sans une ligne signée qui le dise.
- **Ne pas fusionner deux claims contradictoires** ni en dériver un troisième
  : `DC-05` interdirait de masquer les parents, et aucun claim dérivé n'existe
  aujourd'hui — en créer un ouvrirait un sujet que cette campagne n'a pas.
- Aucune résolution générative : la politique compare des champs, elle ne
  rédige pas un arbitrage.
- Une convergence n'est **jamais** une certitude, y compris à l'écran : la
  restitution reprend le vocabulaire de `DC-29` (« plusieurs éléments
  convergent … sans valeur diagnostique en soi »).

## Dépendances

En amont : **LOT-04** (un conflit à impact de sécurité passe par l'objet de
sécurité, pas par un second canal). **Le LOT-02 n'est plus une dépendance**
depuis l'arbitrage du 2026-08-23 — la politique perd son axe population et le
déclare, elle ne l'attend pas.
En aval : aucun.

## Étapes

1. Écrire la politique de résolution et la faire trancher — décision `D-xxx`.
2. Producteur `CONFLIT_SOURCES` déterministe, claims épinglés selon le patron
   des tables signées ; le banc de fraîcheur les découvre automatiquement et
   rougira tant que le contrat ne les porte pas — **c'est voulu**.
3. Escalade praticien comme issue nommée de la politique.
4. Arbitrage `DC-29` : provenance ou forme vide, écrit noir sur blanc.
5. Gardes vues rouges ; T3 ; revue `wn-reviewer` ; passe Codex (P0).
6. Fragment `changelog.d/` ; bascule de `DC-54`, `DC-55`, et statut final de
   `DC-29`.

## Tests

- T3 avant la PR, contrat de fraîcheur des claims épinglés compris.
- Garde structurelle : aucun champ de certitude — vue rouge par ajout d'un
  champ, quel que soit son nom.
- Un conflit résolu et un conflit non résolu : le premier produit la position
  prudente, le second escalade — et **une convergence non résolue ne bloque
  pas** (invariant déjà tenu par le banc du LOT-08 de la chaîne T0 : seules
  `DISCORDANCE` et `CONFLIT_SOURCES` interdisent).

## Critères de done

- [ ] Politique de résolution écrite, déterministe, versionnée, décidée —
      **et déclarant l'axe population comme non comparé**.
- [ ] `CONFLIT_SOURCES` a un producteur ; ses claims sont épinglés et gardés
      par le contrat de fraîcheur.
- [ ] L'escalade praticien est une issue nommée, distincte de `D-003`.
- [ ] `DC-29` tranché : provenance signée, ou forme vide assumée et écrite.
- [ ] Aucun champ de certitude ; garde vue rouge.
- [ ] T3 vert, revue `wn-reviewer`, passe Codex ; `D-xxx` + `changelog.d/`.
