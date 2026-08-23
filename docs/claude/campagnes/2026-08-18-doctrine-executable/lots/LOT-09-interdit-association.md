---
id: "LOT-09"
statut: "terminé (2026-08-23 — D-097 ; clause `DC-09` dans le cadre déontologique du prompt (synthese-v29), banc qui épingle la formule ET sa position, vue rouge sur les deux gestes ; second point de passage examiné et écarté avec motif écrit dans `verifierRestitutionOrientation.ts`)"
dépend_de: "— (aucune)"
---

# LOT-09 — `DC-09` : un claim associatif ne devient jamais une preuve

> Lot **créé le 2026-08-23** ([[D-096]]), après que le LOT-01 a établi que
> `DC-09` n'a ni décision, ni banc, ni véhicule — alors que l'audit du
> 2026-08-11 la désignait comme **le garde-fou le plus exposé de la chaîne**.
> Elle était l'une des quatre règles « les plus exposées » de ce constat ; les
> trois autres (`DC-27`, `DC-29`, `DC-30`) sont refermées. Elle reste seule.

## But

À la fin de ce lot, la restitution **ne peut plus** transformer une
association en preuve. `DC-09` mord à l'exécution : « X peut être associé à
Y » ne se restitue jamais en « X prouve Y », ni en « X explique Y ».

## État de départ, mesuré

- **Aucun garde-fou, nulle part** — ni dans le prompt, ni dans la validation
  de sortie (constat de l'audit, reconduit par la descente du LOT-01).
- Le **déterministe**, lui, tient déjà : `ContradictionFinding.description`
  impose une formulation neutre (`contradictionFinding.ts:130-136`, appliquée
  `contradictionsV1.ts:50-53`), et aucune table signée ne conclut. Le trou est
  **côté synthèse rédigée**.
- Le patron de fermeture existe et vient d'être validé sur la règle voisine :
  `DC-27` a été refermée par une clause de prompt (`anthropic.ts:480`,
  « Association n'est pas causalité ») **plus** une garde qui épingle la
  formule dans `SYSTEM_PROMPT_GOUVERNANCE`
  (`api/praticien/synthese/promptPassationCourante.guard.test.ts:70-78`, suite
  Vitest complète, `ci.yml:798`).

`DC-09` est la jumelle de `DC-27` : même fichier, même mécanisme, autre
interdit. L'une dit *association ≠ causalité*, l'autre *association ≠ preuve*.

## Périmètre

1. **Une clause de prompt** qui interdit de restituer une association comme
   une preuve ou une explication — formulée pour être **épinglable**, comme
   celle de `DC-27`.
2. **Une garde structurelle** qui épingle la formule dans le prompt servi, sur
   le patron exact du banc existant. Vue rouge quand on retire la clause.
3. **Vérifier d'abord s'il y a un second point de passage** : la validation de
   sortie (`verifierRestitutionOrientation.ts`) journalise sans censurer
   ([[D-011]]) et ses angles morts sont nommés (`:23-32`). Si un marqueur
   d'association-devenue-preuve y est dérivable **sans inventer de seuil**, le
   lot l'ajoute au journal ; sinon il s'abstient et le dit.
4. Décision `D-xxx` + fragment `changelog.d/` ; **bascule de `DC-09`**. Son
   marqueur **Orpheline** a déjà été retiré par [[D-096]] le jour où ce lot a
   été créé — il n'y a rien à retirer, seulement un statut à basculer.

## Interdits

- **Aucune règle clinique neuve, aucun seuil, aucun lexique inventé** : la
  clause interdit une forme de phrase, elle n'établit rien de clinique.
- **Ne pas empiéter sur `DC-03`** (justification générative) : ce lot ne
  traite pas la provenance de la justification, seulement le glissement
  association → preuve.
- **Ne pas transformer le détecteur de restitution en censeur** sans décision
  distincte : `D-011` a délibérément choisi le journal plutôt que le blocage,
  et renverser ce choix est un autre acte.
- Ne pas toucher au déterministe, qui tient déjà.
- Pas de bump de version de prompt sans le dire : une version de prompt qui
  bouge coupe des comparaisons, et ça se déclare.

## Dépendances

Aucune, dans les deux sens. Le lot est jouable à tout moment, y compris en
parallèle d'un autre.

## Étapes

1. Relire le prompt courant et localiser où la clause s'insère sans
   contredire une consigne voisine.
2. Proposer la formulation — **s'arrêter et faire trancher** (c'est un texte
   clinique, décision `D-xxx`).
3. Poser la clause et la garde ; voir la garde rouge en retirant la clause.
4. Trancher le point 3 du périmètre (second point de passage) et écrire le
   verdict, quel qu'il soit. Vérifier au passage que `DC-09` ne porte plus le
   marqueur **Orpheline** — retiré par [[D-096]] — et que le compte publié
   dans l'audit reste juste.
5. T3, revue `Agent(wn-reviewer)` — classe clinique.
6. `D-xxx` + `changelog.d/` ; `DC-09` basculée, marqueur **orpheline** retiré
   dans `CONSTITUTION_CLINIQUE.md`.

## Tests

- T3 avant la PR.
- Garde vue rouge : la clause retirée du prompt doit faire rougir le banc.
- **Limite à écrire, pas à masquer** : comme pour `DC-27`, la garde épingle
  **la consigne**, pas la sortie du modèle. Le lot ne prétend pas garantir que
  le modèle obéit ; il garantit qu'on ne lui a pas retiré l'interdit en
  silence.

## Critères de done

- [x] Clause de prompt posée, formulation tranchée par le praticien
      (`anthropic.ts:347`, cadre déontologique, `synthese-v29` déclarée).
- [x] Garde structurelle en CI, **vue rouge** sous retrait de la clause
      (`promptAssociationPreuve.guard.test.ts` — 4 rouges clause retirée, 1
      rouge sur le seul test de position quand la clause est déplacée sans
      qu'un mot change).
- [x] Le second point de passage est tranché — **écarté**, motif écrit dans
      `verifierRestitutionOrientation.ts:43` et dans [[D-097]] : pas de
      vocabulaire fermé, et l'y forcer demanderait un arbitrage chiffré neuf.
- [x] Aucun seuil, aucune règle clinique neuve — la clause interdit une forme
      de phrase.
- [x] T3 vert, revue `wn-reviewer` ; [[D-097]] +
      `changelog.d/2026-08-23-lot09-dc09-association-preuve.md`.
- [x] `DC-09` basculée à *acté* (son marqueur **Orpheline** avait bien été
      retiré par [[D-096]] — vérifié, rien à retirer).
