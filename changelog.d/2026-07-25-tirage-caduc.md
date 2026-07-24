### Corrigé

- **Atelier corpus, voie rapide — un tirage caduc ne bloque plus la source.**
  Un tirage échantillonne un lot d'éligibles FIGÉ. Si, entre le tirage et sa
  conclusion, ce lot divergeait — des claims échantillonnés validés/rejetés en
  revue individuelle, ou une nouvelle ingestion —, le tirage devenait un
  DEADLOCK : plus signable (`etat_divergent`, égalité exacte exigée) et
  impossible à relancer (un seul tirage ouvert par source). La modale rouvrait
  alors un échantillon vide avec « Signer » ET « Basculer » grisés — sans issue.
  C'est l'état où s'est retrouvée WN-SRC-0056 (notebook 09), tous ses claims
  ayant été validés individuellement après le tirage.
  Nouveau geste : **clôture NEUTRE d'un tirage caduc** (`tirage_caduc`, cinquième
  type d'acte du journal des décisions) — elle conclut le tirage **sans changer
  aucun statut de claim et sans alléguer de défaut** (à la différence d'une
  bascule en revue individuelle, qui journalisait un défaut inexistant et figeait
  la prudence d'échantillon à 30 %). La caducité est **vérifiée côté serveur**
  (lot éligible courant ≠ éligibles figés) : clôturer un tirage encore vivant est
  refusé, la revue de l'échantillon ne se contourne pas. La modale détecte l'état
  caduc à la reprise et propose la clôture ; l'index d'unicité d'issue s'étend au
  nouveau type (un tirage a toujours au plus une issue). Migration
  `20260725100000_rag_claim_decisions_tirage_caduc_v1`.
