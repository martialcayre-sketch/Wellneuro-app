### BP-12a : le code des fiches d'usage — structure signée vide, dépôt de brouillons sous secret, validation par le responsable rubrique par rubrique, écran sur la page biologie, outil de rédaction hors ligne (LOT-12, 2026-10-16)

- **Structure signée** (`web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts`) :
  identifiants seulement, livrée VIDE et verrou éteint (porte 23 : son
  contenu est celui du responsable). Chaque fiche porte sa question
  (`QC_…`, liste fermée de la structure), ses besoins (1 à 12, D-312) et les
  trois axes de D-266 §3 — nature du lien, usage décisionnel et marqueur
  sécurité / admissibilité, statut d'usage —, tenus par la correspondance
  nature ↔ statut : une structure incohérente ne se signe pas (D-314 §9).
  Verrou à cinq termes (D-314 §2) : validation, date ISO canonique,
  `claimsSource` égale à l'union des claims des fiches, périmètre, cohérence.
  Statut réglementaire et renvois aux précautions reportés à BP-17.
  Empreinte épinglée ; vocabulaire fermé aligné sur la migration par un banc
  qui la lit ; codes d'analyte vérifiés au catalogue des migrations. Gardes
  de signature, de fraîcheur des claims (régime arbitré : sans `prescriptif`)
  et hook DC-17 étendus à `fiches-usage/`. Déclarée à la matrice de
  consommation.
- **Dépôt** : deux routes internes sous `RAG_INTERNAL_SECRET`
  (`/api/internal/fiches-usage/ingest`, `…/libelles/ingest`). Contrat fermé
  (aucun champ de validation, aucun champ serveur, aucune balise), contrôle
  contre la structure du jour ; idempotent sur le dernier dépôt.
- **Décision** : un acte par rubrique ou par libellé, sous verrou consultatif,
  empreinte du texte vu et jeton du dernier acte rejoués ; valider exige la
  relecture déclarée, la structure signée et une version non dépassée.
  **Réservée au responsable** : `WN_FICHES_USAGE_VALIDATEURS`, fermée par
  défaut (403 sinon) — les autres praticiens lisent sans geste. État dérivé à
  la lecture : « à relire » quand la structure a été re-signée, « hors
  structure », « non conforme », « illisible » nommés tels quels ; une
  validation privée d'effet se nomme comme telle (version à relire, structure
  non signée) ; parmi les libellés validés d'un terme, le plus récent fait
  foi, les autres sont « remplacés ».
- **Écran** : sur la page « Biologie fonctionnelle » — fiches et vocabulaire,
  relecture d'une version rubrique par rubrique, déclaration par texte,
  retrait motivé, offert aussi sur un libellé hors structure ; « Valider »
  n'est pas offert sur une version ou un libellé dépassé. Rien n'atteint un
  patient (D-314 §7).
- **Outil hors ligne** `tools/corpus/fiches-usage/` : Claude rédige, GPT
  contre-lit chaque rubrique dans son contexte, vérificateur DC-03 bloquant ;
  tout ou rien par fiche. Consigne `fiche-usage-v1` épinglée. Document
  `docs/TRUST_IA_FICHES_USAGE.md` (validé par le responsable le 2026-10-16, avant
  le merge) et mention au dossier RGPD, rubrique 6.
- Gardes : seules les routes d'ingestion créent textes et libellés, seule la
  décision crée des actes ; les corps d'actes envoyés par l'écran portent
  toutes les clés exigées, la déclaration jamais en dur ; les journaux du
  module ne recopient aucun texte. **Banc sur base réelle** (CI, après les
  contrats SQL) : l'empreinte JS du texte relu du JSONB est celle que le
  trigger recalcule (accents composés, emoji, `\r\n`, espaces insécables…), et
  deux validations concurrentes du même état, constatées en attente du
  verrou, n'en posent qu'une.
