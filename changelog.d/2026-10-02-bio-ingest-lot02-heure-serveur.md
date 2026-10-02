### BIO-INGEST LOT-02 : heure exigée par le serveur, délai d'appel à 180 s (2026-10-02)

- **L'heure du prélèvement est exigée aussi par le serveur.** Une ligne a pu
  être lue sans heure, ou sans date. Si sa validation renvoie encore minuit de
  Paris, elle est refusée (`heure_absente`, 400) et rien n'est écrit. L'écran
  l'exigeait déjà ; le serveur le tient désormais pour tout client. Arbitrage
  du 2026-10-02. Limite connue : une heure réellement imprimée « 00:00 » ne se
  distingue pas d'une heure absente, faute d'une colonne « heure lue ».
  L'ajouter est proposé avec la migration de purge.
- **Délai d'appel au fournisseur : 180 s, sans nouvelle tentative**, au lieu
  de 120 s avec une seconde tentative. Un compte rendu de 200 lignes est estimé
  à environ 95 s. Le pire cas reste sous la péremption de 5 min d'un import en
  cours, et un test garde cette inégalité. Un échec se relance à la main.
- Le drapeau `WN_BIO_INGEST_ENABLED` reste éteint. Aucune migration.
