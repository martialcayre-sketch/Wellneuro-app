# LOT-04 — chaîne C1 rebranchée, table de priorités livrée non signée

- **Branche** : `claude/lot-04-campagne-t0-nettoyage-smqjgf`, vivante, partie
  de `e351c17b` (`origin/main` contenu). La PR #669 du même nom n'a porté que
  l'**ouverture** du lot (bookkeeping, mergée) ; le code du lot part dans une
  PR `feat(lot-04)` distincte.
- **Campagne** : chaîne T0 opérationnelle, lot courant LOT-04. Le statut du
  lot reste `en_cours` — la bascule `terminé` est un chore post-merge (patron
  #668).
- **Décision** : `D-054` (10 arbitrages + dettes), écrite avant le code.

## Ce que le lot livre

- `web/src/lib/clinical/priorityRulesV1.ts` : table de priorités (2 règles
  publiées — digestif, pondéral/métabolique — 4 écartées avec motif), patron
  orientation complet (claims vérifiés en production, SHA épinglé,
  métadonnée **non signée**). Verrou auto-portant `tablePrioritesSignee()` :
  tant qu'un praticien n'a pas signé, **rien ne change en production** — pas
  de candidat, pas d'abstention évaluée, pas de `ClinicalRuleRef`.
- `web/src/lib/clinical-engine/chaineC1.ts` : construction unique
  snapshot→review→carte ; abstention explicite (`required` motivé si canal
  non mesurable — et alors **zéro candidat**, `DC-25`) ; plainte dominante
  `Q_MOD_03` + objectif patient en tête du cockpit, jamais écrasés par
  l'agrégat.
- `web/src/lib/clinical-engine/verifierChaineC1.ts` : anti-forge en deux
  temps — la carte soumise est recoupée contre **sa propre empreinte**
  (`decisionCardId` seul exclu), puis contre la reconstruction complète
  depuis la base (trois `inputHash` + deux JSON canoniques) ; 409
  `chaine_c1_divergente` sur `POST /api/praticien/protocoles` **et**
  `/versions`. Hors verrou de signature, à dessein (contrôle d'intégrité).
- Golden case (digestion 8 / surpoids 9 ⇒ 2 candidats classés, plainte en
  tête), gardes de fraîcheur étendues (`FICHIER_VERS_TABLE`,
  `TABLE_EXIGE_PRESCRIPTIF: false` motivé, contrat SQL + négatif N9).

## Revue (wn-reviewer, NO-GO puis refermé)

**B1 (bloquant)** : le recalcul comparait le recalcul aux **empreintes
déclarées par le client** — une carte au contenu réécrit sous empreintes
honnêtes passait ; les deux bancs d'intrusion d'alors passaient au vert pour
une raison annexe. Refermé (deux temps ci-dessus) ; les nouveaux bancs ont été
**vus rougir sous mutation** sur les deux routes. M2 (négatif jamais évalué
reformulé), M3 (abstention `required` ⇒ zéro candidat, arbitrage 10) : fermés.

## Dettes nommées (D-054), à ne pas redécouvrir

- **Signer la table ne suffira pas** : la procédure d'abstention vit dans
  `chaineC1.ts`, hors périmètre signé (`DC-17`, `DC-26`) — elle doit entrer
  dans le contenu signable avant toute signature. Bloc « À LIRE AVANT DE
  SIGNER » au-dessus de `PRIORITY_RULES_METADATA`.
- **Le 409 garde la carte, pas le protocole** (M4, préexistant) : sur
  `POST /protocoles`, le `draft` arrive construit du navigateur,
  `validateDecisionCard` n'y est pas rejouée.
- Chaque règle V1 repose sur **un item unique** de `Q_MOD_03` (`DC-28`,
  mitigé par `limitations`) — c'est ce que la signature assumera.
- `safetyFindings` câblé à 0 : aucun producteur de constat de sécurité
  n'existe ; le chemin « sécurité ⇒ abstention » attend son producteur.
- Aucun candidat n'est **sélectionnable** : même signée, la table ne permet
  pas encore un protocole (lot suivant).

## Collision de numérotation, réglée ici

La planification LOT-08 (#670) réservait « D-054 » pour l'arbitrage
`group_majority` ; ce lot a pris le numéro en écrivant sa décision le premier.
**La décision attendue du LOT-08 devient D-055** — références de
`.wn/state.json` et de la fiche LOT-08 à rafraîchir au prochain passage.

## Validation

T1 vert ; Vitest ciblé 663/663 ; réplique T3 conteneur : anti-secrets, audit,
bancs Node, certification, scoring, type-check, **4 603 + 396 Vitest**, lint,
PostgreSQL éphémère (migrate deploy, dérive, 18 contrats SQL, seed), build —
tout vert. **Segment Playwright non joué ici** (proxy du conteneur refuse
`cdn.playwright.dev`) : couvert par le `verify` du CI, conformément à `D-049`.
