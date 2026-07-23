# Validation des claims à deux vitesses — proposition **À VALIDER**

> **Statut : proposition, non actée.** Décision de gouvernance clinique
> réservée au praticien. Rédigée le 2026-07-23 en réponse à la question :
> « la validation peut-elle se faire par un test de lecture global avec
> questionnaire, comme l'ancienne procédure NotebookLM ? » Rien dans ce
> document ne modifie le comportement actuel de l'Atelier (revue individuelle).

## Constat

Le lot pilote LOT_001 porte 136 claims pour 6 sources (~23/source). Projeté
sur 88 sources : **~2 000 claims**. En revue individuelle avec confrontation
au verbatim (~1 à 2 min/claim), c'est ~50 h de travail praticien — intenable.
La revue pièce à pièce ne passe pas l'échelle ; la porte D-003, elle, doit
tenir.

Distribution mesurée du pilote (base prod, 2026-07-23) :

| | déclaré | observé | interprété | total |
|---|---|---|---|---|
| **prescriptif** | 24 | — | 14 | **38 (28 %)** |
| non prescriptif | 63 | 24 | 11 | **98 (72 %)** |

## Ce qui ne se négocie pas (D-003 inchangé)

1. **Aucun claim ne remonte sans signature praticien.** La barrière
   `match_wellneuro_rag_claims` reste l'arbitre.
2. La signature reste un **acte explicite** : `validateur + valide_at` posés
   sur chaque claim (une signature de lot estampille chaque claim du lot —
   schéma inchangé).
3. La **modalité** de validation est tracée : « échantillonnage + questionnaire,
   lot X » est distinguable de « revue individuelle » dans l'audit.

Ce qui change n'est pas la porte, c'est la **procédure de revue** en amont de
la signature — sa granularité, comme `NOTEBOOK_VALIDATIONS` posait déjà un
verdict CONFORME **par notebook** (preuve + validateur + date), jamais par
paragraphe.

## Ce que la machine garantit déjà

- **Banc A/B/C** : chaque dosage nombre+unité de la lecture brute survit dans
  les deux lectures IA (100 % sur 85 pages) — le risque clinique n°1 est
  contrôlé en amont.
- **Drafting 2 IA** : GPT-5.4 contre-vérifie la fidélité de chaque claim de
  Sonnet 5 au verbatim ; désaccord → exclu (53/189 exclus au pilote, 28 % —
  le filtre travaille).
- **Provenance sha-épinglée** : gardes `sources_absentes` / `source_derivee`
  à la signature ; version de claim immuable.

Risque résiduel couvert par l'humain : la **nuance clinique** — claim fidèle
au texte mais trompeur hors contexte, emphase déplacée, sur-généralisation.

## Proposition

### Voie rapide — claims non prescriptifs (72 % du pilote)

Par source :

1. **Questionnaire de restitution global** : l'ancienne procédure NotebookLM
   rejouée **sur le RAG lui-même** (les réponses citent les claims) — teste en
   prime la chaîne de récupération de bout en bout.
2. **Échantillon aléatoire tiré par le serveur** (jamais choisi par le
   praticien — anti-biais) : min. 5 claims ou 20 % de la source, confrontés
   au verbatim.
3. **Zéro défaut → signature du lot entier** de la source. **Un défaut → la
   source entière bascule en revue individuelle** (pas de tri sélectif : un
   défaut échantillonné est un signal sur le lot).

### Voie lente — claims prescriptifs (28 % du pilote)

**Revue individuelle obligatoire, sans exception.** Dosages, recommandations,
conduites : ~6-7 claims par source, quelques minutes. Aucun claim
`prescriptif = true` ne peut être signé par lot.

### Troisième levier — validation à la demande

Rien n'oblige à valider tout le corpus d'avance : l'attente est **sûre par
construction** (barrière vide). Valider en priorité les sources utiles aux
consultations en cours ; le reste attend sans risque.

### Chiffrage à l'échelle 88 sources

~560 prescriptifs en individuel (~14 h, étalables) + 88 questionnaires et
échantillons (~10 h) ≈ **~24 h étalées et priorisables**, contre ~50 h de
tout-individuel d'un bloc. La validation à la demande étale ce coût sur les
mois d'usage réel.

## Esquisse d'implémentation (Atelier v2)

- `web/src/lib/rag/claims/revue.ts` : transition `valider_lot` (par source,
  claims non prescriptifs seuls, garde `statutAttendu` conservée) ; le
  prescriptif reste sur la transition individuelle existante.
- Tirage de l'échantillon **côté serveur**, seedé et journalisé.
- **Journal des décisions** (dette v1 comblée) : table dédiée — modalité,
  échantillon tiré, verdicts, questionnaire joint, signature. C'est une
  **migration** → processus d'exception complet (revue adversariale
  `wn-reviewer` avant merge, vérification base après).
- Écran Atelier : vue par source, questionnaire + réponses RAG citées,
  échantillon à confronter, signature de lot ; motif de rejet (dette v1).

## Décisions à trancher (praticien)

1. Taux d'échantillon : min. 5 / 20 % — ou plus prudent au démarrage
   (ex. 30 % les 10 premières sources, puis relâcher si zéro défaut) ?
2. Les 11 « interprété » non prescriptifs : voie rapide ou individuelle ?
   (l'interprétation est le terrain naturel de la sur-généralisation)
3. Questionnaire : réutiliser la trame `NOTEBOOK_VALIDATIONS` existante, ou
   trame nouvelle par source ?
4. Validation à la demande : actée comme politique, ou tout valider d'avance ?
5. Le pilote actuel (136 claims) : première application de la procédure à
   deux vitesses, ou revue individuelle intégrale comme baptême du feu de
   l'Atelier v1 ?
