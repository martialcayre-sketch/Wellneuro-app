### Ajouté

- **Dossier RGPD de l'expérimentation** (`docs/DOSSIER_RGPD.md`) : quatorze
  rubriques — responsable, finalité, base légale, catégories de personnes et de
  données, destinataires et sous-traitants, transferts, durées de conservation,
  droits, sécurité, information des participants, hébergement, AIPD — chacune
  **sourcée dans le dépôt** ou **marquée TROU** avec porteur et échéance, plus un
  tableau récapitulatif des trous. Il ferme l'item 7 du reste-à-faire de
  G-TRUST-04 pour sa **partie documentaire seulement** : la qualification de la
  base légale, l'AIPD et la signature des DPA restent externes. **Il ne lève pas
  le gate.**

### Modifié

- Le LOT-06 reposait sur six faits périmés ou faux, corrigés à son cadrage :
  « onze notices » (il y en a **10**), un chemin de checklist inexistant, la
  date d'arbitrage du gate (**2026-07-21**, pas le 07-22), un test « à créer »
  qui **existe déjà**, la confusion des deux numérotations du fichier de gate,
  et l'état de l'escalade SIIN de Q_GEO_04 — elle **existe et reste ouverte**,
  c'est sa **trace datée** qui manque, et elle porte les bandes HAS 2011, non
  les droits (réserve distincte, sur PAR).
- `docs/securite_rgpd.md` dit désormais ce qu'il est — une consigne d'hygiène du
  dépôt — et renvoie au dossier RGPD, qu'il ne remplace pas.
- COSMIN : l'inconnu est **assumé une fois pour les 65 instruments**, avec sa
  raison (`docs/claude/corpus/README.md`), plutôt que soixante-cinq motifs
  identiques. Le champ n'est pas alimentable à la main — le banc refuse tout
  grade sans étude concordante.

### Trois trous apparus à l'écriture

- L'information délivrée aux personnes **sur l'écart d'hébergement** n'est
  consignée nulle part, alors qu'elle porte la moitié de l'argumentaire qui
  autorise la phase de test.
- Le **fournisseur SMTP réel** n'est toujours pas identifié.
- **Sentry** est un sous-traitant de fait (`@sentry/nextjs` dans
  `web/package.json`) absent de la liste montrée aux personnes.
