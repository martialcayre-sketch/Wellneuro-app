### Import de comptes rendus : image animée refusée (BIO-INGEST LOT-03, suivi de revue, 2026-10-04)

Un WebP ou un PNG animé passait le contrôle de signature, puis `sharp` n'en
gardait que la première trame : les autres étaient perdues en silence, ni
consignées ni lues. Une image de plusieurs trames est désormais refusée au dépôt
(415, « déposez une photo fixe »). Constat de la revue Copilot de #1310.
