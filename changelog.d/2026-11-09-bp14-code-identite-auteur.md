### BIO-PARCOURS : BP-14, le serveur écrit l'auteur des versions de protocole et des validations pour diffusion (D-459, 2026-11-09)

PR de code, sans migration, file C, place 8.

- `creePar` est posé à la création par la route des versions (seulement dans
  la branche `create` de l'upsert), par l'instantané JA de la route praticien
  et par l'activation JA. Il reste nul pour un instantané déposé depuis le
  portail.
- `validePar` est posé par les deux approbations de la diffusion, y compris
  celle qui se fait dans la transaction. `approvedBy` ne change pas.
- L'e-mail vient de la session, normalisé par `emailPraticien`, jamais de
  l'écran ni du corps de la requête. Chaque colonne est posée une fois et
  n'est jamais réécrite.
- Trois bancs : nominatif, historique (une ligne nulle ou déduite ne casse
  ni la diffusion, ni le portail, ni le calendrier, et aucune lecture ne
  nomme les colonnes) et effacement.
- Registre RGPD, rubrique 5 : une phrase sur l'entrée en écriture.
- Aucun écran, export, IA ni route de lecture des colonnes (§7).
