---
id: "wellneuro-audit-sources-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Audit des sources documentaires

## 1. Inventaire

Le manifeste reçu contient **391 sources**, de `WN-SRC-0001` à `WN-SRC-0391`.

### Statuts initiaux

- CANONIQUE : 151
- SECONDAIRE : 172
- PATIENT : 38
- AUDIT : 28
- ARCHIVE : 2

### Vigilance

- faible : 222
- modérée : 63
- élevée : 97
- critique : 9

### Autres caractéristiques

- prescriptives : 46
- non prescriptives : 345
- doublons identifiés : 2
- année 1 : 187
- année 2 : 204

## 2. Interprétation

Ces statuts constituent un audit documentaire initial, pas une autorisation runtime.

Une source marquée CANONIQUE n’est pas automatiquement :

- scientifiquement suffisante ;
- autorisée juridiquement ;
- publiable ;
- applicable à toute population ;
- utilisable pour une règle ;
- adaptée au patient.

## 3. Transformation du manifeste

Champs à remplacer :

```text
validation_praticien
→ validation_praticien_requise
→ clinical_review_status
```

Le champ `statut` est éclaté en :

- importance documentaire ;
- cycle de vie ;
- audience ;
- statut clinique.

Ajouter :

- hash ;
- version ;
- droits ;
- langue ;
- juridiction ;
- date de modification ;
- nombre de pages ;
- domaines ;
- populations ;
- date de prochaine revue.

## 4. Quarantaine initiale

Exclure du runtime :

- AUDIT ;
- ARCHIVE ;
- vigilance critique ;
- prescriptif non revu ;
- droits inconnus ;
- questionnaires non certifiés ;
- cas non anonymisés ;
- supports patient non harmonisés.

## 5. Priorité de traitement

1. pilote sommeil et chronobiologie ;
2. fondements et 12 besoins ;
3. alimentation et aliments vedettes ;
4. sécurité micronutritionnelle ;
5. stress ;
6. axe intestin-cerveau ;
7. autres domaines.

## 6. Machine-readable

Le manifeste original et sa proposition normalisée sont fournis dans le pack
portable externe, mais ne sont pas copiés dans cette branche documentaire.

La proposition reste candidate et ne doit pas être publiée sans G0/G1.

Dans l'intégration Git actuelle, ces fichiers machine-readable ne sont pas
importés : les 391 entrées ont des droits à vérifier, aucune revue clinique
et aucun hash de contenu. Ils restent dans le paquet source local jusqu'aux
gates G0/G1.
