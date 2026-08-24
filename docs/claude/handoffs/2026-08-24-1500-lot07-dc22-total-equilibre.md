# LOT-07 — le total de « Mon équilibre » n'a pas d'interprétation clinique, et il le dit

- Date : 2026-08-24
- Campagne : `2026-08-18-doctrine-executable`, LOT-07 (`DC-22`)
- Décision : `D-106`
- Branche : `clinique/lot07-dc22-total-equilibre`

## Ce qui a été mesuré avant de poser la question

La fiche imposait de mesurer, poser, **s'arrêter**. Trois faits ont rendu
l'arbitrage décidable :

1. **Aucun consommateur ne lit le total.** `GLOBAL_BALANCE` est bien émis comme
   objet clinique **portant sa valeur** (`clinicalSnapshot.ts:209`, donc dans le
   snapshot figé et son empreinte) — une première rédaction disait « simple code
   de vocabulaire », c'était faux et la revue l'a repris. Ce qui est vrai et
   suffit : tous les producteurs émettent `clinicalObjectCodes: []`, les
   consommateurs ne lisent que `balanceAssessment.needs`, et seule la **nullité**
   de `scoreGlobal` est lue (`availableDomains`).
2. **Le patient ne voit jamais le chiffre** (`showValue={false}`).
3. **Mais sa VARIATION est un signal présenté aux deux surfaces.** C'est le fait
   qui obligeait à trancher : si le total n'a pas de sens clinique, la variation
   de ce total n'en a pas non plus — et c'est elle, pas lui, que le patient
   lisait, sous la forme « **En progression** depuis votre dernier bilan ».

## L'arbitrage, et ce qu'il a produit

**Réponse : NON, le total n'a pas d'interprétation clinique** — et il n'est pas
retiré pour autant. `DC-22` bascule par sa **seconde branche** : le total est
**identifié** (`DC-20`), pas supprimé.

- Mention « Repère de suivi, pas un score clinique » là où le chiffre s'affiche —
  la fiche praticien, seul endroit du dépôt. Le patient ne la reçoit pas : lui
  servir « pas un score clinique » l'obligerait à démentir un score jamais lu.
- Libellé patient : « Votre indice « Mon équilibre » est en hausse… ». Pas
  « repère de suivi » — terme défini nulle part côté patient, et qui désignait
  **deux objets** dans le même widget (le total, puis les besoins).
- **L'asymétrie des trois libellés est CONSERVÉE.** `D7` « construction, jamais
  dégradation » interdit d'annoncer une chute ; symétriser aurait cassé une règle
  en croyant en servir une autre.

## Le défaut le plus important, trouvé en revue

`MomentumCard` affichait le delta du total en gras avec un badge **`success`**
sur une hausse et **`warning`** sur une baisse. C'est exactement l'interprétation
clinique retirée au libellé patient, servie au praticien **en couleur au lieu de
mots**. Corriger la phrase en laissant la couleur aurait retiré l'énoncé et gardé
le jugement. Badge neutre dans les trois sens, mention posée, et une règle de banc
interdit désormais qu'une tendance commande une valence (fail-closed : toute
tendance, pas la seule `momentum.tendance`).

## Le bloquant, et il était pire que ce que le lot avait posé

L'entrée `'lib/equilibre/natureIndiceGlobal.ts'` ajoutée à `SURFACES_PATIENT`
**ne mordait pas**. `fichiersSources()` appelle `readdirSync` sur chaque entrée ;
`readdirSync` lève `ENOTDIR` sur un **fichier** ; le `catch` rendait `[]`. Trois
documents de doctrine permanente affirmaient donc une protection **inexistante**.

**Corollaire préexistant, hors périmètre mais réparé ici** :
`lib/agenda-sommeil/rappelPortail.ts` était dégardé **depuis son ajout** — le
garde n'a jamais lu aucun de ses deux chemins de fichier.

Réparation : repli `statSync` pour les chemins de fichier, **plus une
non-vacuité PAR ENTRÉE**. C'est elle qui manquait : le plancher global (`> 20`)
est insensible à une entrée morte, puisqu'un dossier en apporte des dizaines.
Vérifié en injectant « bravo » dans le module déplacé — le garde rougit.

## Le banc, vu vert quatre fois avant d'être retenu

`natureIndiceGlobal.guard.test.ts` a été éprouvé par mutation. **Quatre
contournements trouvés et fermés** : total interpolé nu dans un `<p>`, composant
de jauge renommé, mention reléguée en commentaire, valence rétablie. Deux autres
avaient été fermés avant la revue (la mention cherchée n'importe où dans le
fichier — l'`import` suffisait ; le raisonnement par fichier — un
`showValue={false}` ailleurs dispensait tout).

Il lit désormais **toute balise dont les attributs citent le total**, plus les
**interpolations-enfants de valeur pure**, et ignore les conditions de rendu.
Un **test de rendu** monte la fiche, ouvre le tiroir et vérifie la mention dans
le DOM : le banc textuel ne peut pas savoir si `ObjetGauge` la rend.

## Les deux arbitrages adjacents

- **`SEUIL_EFFONDREMENT = 0,34` et `PLAFOND_FONDATION_CRITIQUE = 50` validés tels
  quels.** Ils portaient « calibrage v1, à valider », jamais fait, alors qu'ils
  commandent le plafonnement. **Aucun bump de `VERSION_SCORE_EQUILIBRE`** :
  aucune valeur ne bouge, aucun historique n'est cassé.
- **L'égalité entre besoins d'une strate est motivée** (`DC-21`) — c'était une
  pondération tacite, les deux autres étages étant motivés. La hiérarchie est
  portée par les **fondations critiques**, pas par des poids.

## Validation

- **T3 joué trois fois.** Segment **Vitest entièrement vert** aux trois :
  456 fichiers, 5 785 tests, 1 skip, **0 échec** (+ 402 en forme courte).
- **Segment E2E : un rouge, démontré étranger.** Le premier T3 (avant revue) était
  **vert de bout en bout, 156 E2E**. Les deux suivants ont rougi sur **un test
  différent chaque fois** — `portail-parcours.spec.ts` puis `trajectoires.spec.ts`
  —, toujours sur **iPhone 13 (WebKit)**, toujours « navigation expirée, AUCUNE
  requête de page émise ». Le harnais le classe seul ; le segment E2E relève du CI
  tant que `D-049` tient.
- Revue `wn-reviewer` : **NO-GO** initial (un bloquant, un majeur), **tous les
  points repris** — B1, M1, M2, Y1, Y3, plus les tests 1 et 2 de sa liste.

## Ouvert

- **`calculerDeltaMomentum` déclenche « hausse » sur `delta > 0`**, donc sur
  `+0,01` : le patient lit « en hausse » pour du bruit de mesure. Poser un seuil
  de significativité est un **changement clinique** avec sa décision et son bump.
- **Le banc suit la valeur par son NOM** : variable intermédiaire, spread
  d'attributs ou renommage du champ API la lui font perdre. Limite déclarée dans
  le banc ; la fermer suppose une analyse de flot.
- **Rien ne garde le bump de `VERSION_SCORE_EQUILIBRE`** que `constants.ts` exige
  désormais en toutes lettres. Règle déclarée, vérifiée par aucun banc.
- Pointeur de campagne : **LOT-11** (les actes en attente), puis **LOT-08**, la
  clôture terminale.
