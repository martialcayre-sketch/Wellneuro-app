### BP-12a : le code des fiches d'usage — structure signée vide, dépôt de brouillons sous secret, validation rubrique par rubrique à l'écran, outil de rédaction hors ligne (LOT-12, 2026-10-16)

- **Structure signée** (`web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts`) :
  identifiants seulement, livrée VIDE et verrou éteint (porte 23 : son
  contenu est celui du responsable). Empreinte épinglée ; vocabulaire fermé
  aligné sur la migration par un banc qui la lit ; codes d'analyte vérifiés
  au catalogue des migrations. Gardes de signature, de fraîcheur des claims
  et hook DC-17 étendus à `fiches-usage/`. Déclarée à la matrice de
  consommation.
- **Dépôt** : deux routes internes sous `RAG_INTERNAL_SECRET`
  (`/api/internal/fiches-usage/ingest`, `…/libelles/ingest`). Contrat fermé
  (aucun champ de validation, aucun champ serveur, aucune balise), contrôle
  contre la structure du jour ; idempotent sur le dernier dépôt.
- **Décision** : un acte par rubrique ou par libellé, sous verrou consultatif,
  empreinte du texte vu et jeton du dernier acte rejoués ; valider exige la
  relecture déclarée, la structure signée et une version non dépassée. État
  dérivé à la lecture : « à relire » quand la structure a été re-signée,
  « hors structure », « non conforme », « illisible » nommés tels quels.
- **Écran** : rayon « Fiches d'usage » de la Bibliothèque — fiches et
  vocabulaire, relecture d'une version rubrique par rubrique, déclaration par
  texte, retrait motivé. Rien n'atteint un patient (D-314 §7).
- **Outil hors ligne** `tools/corpus/fiches-usage/` : Claude rédige, GPT
  contre-lit chaque rubrique dans son contexte, vérificateur DC-03 bloquant ;
  tout ou rien par fiche. Consigne `fiche-usage-v1` épinglée. Document
  `docs/TRUST_IA_FICHES_USAGE.md` (projet, à valider par le responsable) et
  mention au dossier RGPD, rubrique 6.
- Gardes : seules les routes d'ingestion créent textes et libellés, seule la
  décision crée des actes ; les corps d'actes envoyés par l'écran portent
  toutes les clés exigées, la déclaration jamais en dur ; les journaux du
  module ne recopient aucun texte.
