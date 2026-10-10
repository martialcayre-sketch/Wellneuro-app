---
id: "LOT-12"
titre: "Clôture de la campagne : B2 sous sa forme exacte, D4 et dossier RGPD, écarts fiche/code, constat d'usage"
statut: "terminé"
dépend_de: "LOT-11"
---

# LOT-12 — Clôture de BIO-INGEST

## But

Fermer la campagne sur des documents qui disent vrai. On solde ce que la
contre-revue adverse du 2026-10-10 a laissé ouvert (B2, D4), on corrige les
fiches que le code a dépassées, et on verse le constat d'usage dû au Done.

## Résultat observable

- B2 est inscrite sous sa forme exacte (ci-dessous et dans la fiche LOT-08).
- D4 est constatée. La seule partie fausse par omission, la rétention des
  sauvegardes, est établie et déclarée au patient par « Vos données
  personnelles » **v14**. Le texte est validé par le responsable le 2026-10-10.
- Les fiches LOT-02 et LOT-07 ne contredisent plus le code.
- Le constat d'usage en agrégats est versé.
- La campagne est close.

## Périmètre

Documentation, plus une version de texte patient (`registre.ts`) et son banc.
Aucune migration, aucune règle clinique, aucun drapeau.

## Hors périmètre

- La localisation de l'inférence et la rétention des entrées chez Anthropic :
  réserve déjà ouverte au dossier RGPD (rubrique 7), non levée ici.
- La durée de conservation de la trace d'import (empreinte, extractions,
  lignes lues) : trou de la rubrique 8, échéance du 2026-10-21.
- La rétention des sauvegardes pour les autres données du dossier : seul le
  compte rendu purgé portait une promesse de suppression datée.
- M1 à M11 et M15 de la passe des mutations : aucun résultat versé, aucune
  seconde passe sans signal.

## 1. B2 — forme exacte

L'énoncé de la contre-revue disait : « Un import ne reste donc jamais
"en cours" au-delà de la péremption. » C'est faux pour la colonne et juste pour
le sens (`REVUE_CODEX_ADVERSE_2026-10-10.md`, P1-1). La garantie s'inscrit
ainsi :

> L'appel d'extraction est borné en totalité, flux compris (240 s, signal
> d'abandon). Avec la transaction des lignes (20 s) et une marge, il reste sous
> la péremption d'un import en cours (5 min). **Tant que le processus vit**,
> un import se clôt donc avant la péremption. **S'il meurt**, l'import reste
> `en_cours` en base. Il est alors **réputé abandonné au-delà de 5 min** :
> l'écran l'affiche comme une lecture interrompue et rouvre la relance, et
> aucun geste ne l'attend. Il est **clos `echec`/`delai_depasse` au geste
> suivant** (relance, écart) **ou à l'échéance de purge** (30 jours), ou
> **supprimé avec le document** par un retrait. Deux extractions du même
> document ne tournent jamais en même temps.

Vérifié dans l'arbre le 2026-10-10 : `verrou.ts` (péremption),
`lancerExtraction.ts:104-111`, `ecart.ts:75-82` et `purge.ts:41-51` (clôture
`delai_depasse`), `retrait.ts:62-72` (suppression), `lecture.ts:171` (état
« périmé » lu par l'écran).

## 2. D4 — constat, et dossier RGPD

| Volet de D4 | Constat du 2026-10-10 |
|---|---|
| Modèle et version enregistrés à chaque extraction | **Vrai.** Les 9 imports de production portent `claude-sonnet-5-5` et une version du procédé (`v1` : 1 ; `v3` : 8). |
| Sous-traitant | **Vrai.** Anthropic, nommé par `usage_ia` v6 et `donnees_confidentialite` v13, et au dossier (§2 ter, rubrique 6). |
| Données envoyées : le document entier | **Vrai.** Les deux textes disent « transmis en entier, y compris votre nom et les autres mentions qui vous identifient ». |
| Conservation du document | **Vrai** : purgé au plus tard 30 jours après le dépôt ([[D-258]]). |
| … sauvegardes comprises | **Faux par omission jusqu'à ce lot.** Le dossier disait « durée à établir », le texte patient n'en disait rien. |

**Établi le 2026-10-10.** La base est sur le plan `postgresql-business-512`.
Selon la politique publiée par Scalingo, elle garde une sauvegarde quotidienne
7 jours, une hebdomadaire 8 semaines et une mensuelle 12 mois. La restauration
à un instant donné couvre 7 à 14 jours. Le constat par la CLI concorde : une
sauvegarde par jour sur les 8 derniers jours, puis une par dimanche depuis le
2026-08-23. Une copie s'éteint donc **au plus tard 12 mois après la purge**.

**Déclaré.** Le responsable a choisi (2026-10-10) de déclarer dans ce lot
plutôt que dans une suite séparée. Il a validé la phrase, insérée après celle
de la purge :

> Des copies peuvent en subsister jusqu'à 12 mois après sa suppression dans les
> sauvegardes de notre hébergeur, qui ne servent qu'à rétablir le service en
> cas d'incident ; elles s'effacent ensuite d'elles-mêmes.

- `donnees_confidentialite` **v14**, accusé exigé (motif de la v10 : sans lui,
  l'accusé dû sur la v13 s'effaçait). Chaque patient repasse donc par « Avant
  de commencer ».
- Banc : `registre.test.ts`, phrase mot pour mot, un seul paragraphe changé.
- Dossier RGPD, rubrique 8 ; précision datée sous [[D-258]].
- **Reste à constater après déploiement** : l'empreinte de la v14 servie par
  l'image ([[D-248]]).

## 3. Écarts entre fiche et code

| Fiche | Écrit | Code et production | Suite |
|---|---|---|---|
| LOT-07 | procédé `bio-extraction-v2` ; « reste à constater : une extraction réelle porte `v2` et des faits non nuls » | `bio-extraction-v3` depuis #1336 (2026-10-06 : NUL retiré, prompt et schéma de la v2 inchangés). Aucune extraction de production ne porte `v2`. Les 5 extractions `v3` réussies portent 38 intervalles lus sur 57 lignes. Aucune marque lue. | Fiche annotée ; constat versé. |
| LOT-02 | resolver « 101 entrées, 43 analytes » | Re-signé par [[D-263]] : 145 entrées, 79 analytes. La table du code compte 145 entrées. Les 98 de la surface de relecture sont ceux de [[D-259]], historiques. | Fiche annotée. |

## 4. Constat d'usage

Lecture seule par conteneur (`one-off-8044`, transaction `READ ONLY`), le
2026-10-10, en agrégats, sans identifiant de dossier. Il **remplace** le
constat pris plus tôt le même jour : entre-temps, les premières transmissions
patient sont arrivées.

- `resultats_biologiques` : **60 lignes**, toutes `saisie_praticien`, sur
  **2 dossiers**, saisies du 2026-10-03 au 2026-10-07. Toutes les voies
  écrivent `saisie_praticien` : la ligne validée devient la saisie du
  praticien, et la provenance passe par la ligne candidate.
- Comptes rendus : **6**, sur 3 dossiers.
  - **3 déposés par le praticien** : 2 purgés à la décision, 1 non purgé.
  - **3 transmis par le patient**, tous le 2026-10-10 : 2 écartés
    `document_non_conforme`, 1 en attente.
- Imports : **9**. 6 extraits (1 en `v1` le 2026-10-03, 5 en `v3` du
  2026-10-07 au 2026-10-10) et 3 en échec `document_illisible` le 2026-10-10.
- Lignes candidates : **115**. 60 validées, 17 écartées, 38 proposées.

Lecture ([[D-125]]) : ces chiffres disent ce qui existe, pas un parcours. Ils
ne suffisent pas à conclure qu'un patient a été servi ou bloqué.

## 5. Suivi BioFlow

La page du responsable (hors dépôt) est mise à jour au même geste : LOT-12
fait, campagne close, LOT-05 transféré.

## Critères de done

- [x] B2 sous sa forme exacte, ici et dans la fiche LOT-08.
- [x] D4 constatée ; rétention des sauvegardes établie, v14 validée et écrite.
- [x] Écarts fiche/code soldés (LOT-02, LOT-07).
- [x] Constat d'usage versé.
- [x] Suivi BioFlow mis à jour.
- [ ] Après merge : déploiement constaté, empreinte de la v14 servie.
