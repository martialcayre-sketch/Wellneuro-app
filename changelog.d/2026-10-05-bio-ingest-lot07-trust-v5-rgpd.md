### TRUST et RGPD : l'intervalle et la marque imprimés par le laboratoire sont déclarés avant d'être relevés — BIO-INGEST LOT-07 (2026-10-05)

- **Pourquoi.** `D-267` §8 : `bio-extraction-v2` recopiera aussi l'intervalle
  de référence et la marque d'anomalie tels qu'imprimés. La déclaration vient
  d'abord. Aucun code d'extraction dans ce changement.
- **« L'intelligence artificielle dans Wellneuro » v5, sans accusé.** Le
  paragraphe du relevé nomme les deux mentions du laboratoire, recopiées sans
  être complétées ni reformulées. L'outil ne déclare lui-même aucune valeur
  normale ou anormale. Le reste du document est identique à la v4.
- **« Vos données personnelles » reste en v12** : sa phrase demeure vraie,
  aucun accusé nouveau.
- **Dossier RGPD.** Le §2 ter, la table des données de santé et la rubrique 8
  nomment `intervalle_lu` et `marquage_lu`. Ce n'est pas un flux nouveau, mais
  une donnée conservée au-delà de la purge. Une note est versée au réexamen
  AIPD (rubrique 13). La ligne de `WN_BIO_INGEST_ENABLED` exige la v5 avant
  `bio-extraction-v2`.
- Bancs : `registre.test.ts` garde les vingt-deux versions et prouve que seul
  le paragraphe du relevé change entre la v4 et la v5.
