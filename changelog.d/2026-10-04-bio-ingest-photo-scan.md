### Import de comptes rendus : photo ou scan accepté (BIO-INGEST LOT-03, 2026-10-04)

Le dépôt d'un compte rendu admet désormais une photo ou un scan (JPEG, PNG,
WebP) en plus du PDF, par le même pipeline : même staging, même écran de
validation, même procédé `bio-extraction-v1`. Seul le bloc d'entrée envoyé au
modèle change. Le format est reconnu à la signature du fichier, qui doit
concorder avec le type déclaré ; HEIC et GIF sont refusés. Une image est
réencodée au dépôt (dépendance directe `sharp`) : orientation appliquée,
métadonnées EXIF (dont la position GPS) retirées avant d'être consignées et
transmises. Plafonds de l'image préparée : 3,75 Mio (5 Mio en base64 chez le
fournisseur) et 8 000 pixels de côté. Aucune table, aucune migration ni voie
d'écriture nouvelle ; le drapeau `WN_BIO_INGEST_ENABLED`, déjà posé, sert
l'image dès le déploiement.
