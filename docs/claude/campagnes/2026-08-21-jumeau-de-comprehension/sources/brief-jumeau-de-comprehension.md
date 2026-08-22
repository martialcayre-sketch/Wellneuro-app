# Brief — 6.0-D : Le jumeau de compréhension

## Objectif

La signature conceptuelle de 6.0 : un modèle **partagé** de la compréhension
du patient — pas un jumeau biologique. Les représentations du patient et du
praticien sur quatre dimensions (problème principal, cause perçue, priorité,
critère de réussite) sont posées côte à côte, versionnées, leurs écarts
rendus visibles, leur convergence suivie dans le temps. Le but n'est **jamais
de décider qui a raison** : un écart est un objet clinique en soi, il se
signale, ne se moyenne ni ne se supprime (`DC-30`).

Référence d'architecture : §8 de l'audit du 2026-08-21, et les patrons déjà
éprouvés dans le dépôt — append-only chaîné, versions hash-verrouillées façon
`web/src/lib/trust/contenus/registre.ts`, deux dates (événement / connaissance),
garde structurelle par test.

## Ce que l'objet est — et n'est pas

- Deux voix (patient, praticien) × quatre dimensions : problème principal,
  cause perçue, priorité, critère de réussite. Huit cases, en langage naturel.
- Aucune des quatre cases ne devient un score, ni un proxy de score
  (`DC-27` : score ≠ diagnostic ; ici, pas même de score).
- Une représentation patient n'est **jamais réinterprétée en donnée clinique
  sans validation praticien** — elle reste une parole, pas un signal
  (`DC-30` pour les écarts ; `DC-31`/`DC-32` : elle n'est ni diagnostic, ni
  hypothèse, ni orientation).
- Une case vide est une absence, pas une convergence ni une normale (`DC-24`).
- L'objet est rattaché à l'épisode de soin, versionné en append-only
  (patron supersedes : une version n'écrase jamais la précédente, elle la
  remplace en la chaînant).

## Lots esquissés (3) — le cadrage complet s'écrira à l'ouverture

1. **L'objet de données** : quatre dimensions × deux voix, append-only
   versionné (patron supersedes), corrigible par le patient — le canal
   « Ce n'est pas exactement ça » du 6.0-A est la voie de correction —
   rattaché à l'épisode. Deux dates par version (quand c'est dit / quand
   c'est su). Garde structurelle par test : le schéma ne porte aucun champ
   numérique de certitude, de poids ou de score (leçon `D-044`).
2. **Les deux écrans** : vue praticien avec écarts saillants (signalés,
   jamais moyennés — `DC-30`) ; vue patient en langage traduit, jamais en
   jargon clinique. UI en français.
3. **« Le prochain choix ensemble »** : à chaque jalon T0/J21/J42/J90, trois
   voies nommées — Consolider / Ajuster / Explorer — choisies par le
   praticien, montrables au patient. C'est la structure narrative du suivi,
   pas une recommandation automatique : le choix appartient au praticien
   (`DC-31`, `DC-32` — la voie n'est ni diagnostic ni orientation produite
   par la machine).

## Gates

- **6.0-A** (objectif, compréhension — fournit le canal « Ce n'est pas
  exactement ça ») : préalable du lot 1.
- **6.0-C** (hypothèses partagées) : préalable de la mise en regard des
  deux voix côté praticien.

## Invariants

- Une représentation patient n'est jamais réinterprétée en donnée clinique
  sans validation praticien.
- Les écarts patient/praticien se signalent, jamais ne se moyennent ni ne se
  suppriment (`DC-30`).
- Aucune des quatre cases ne devient un score (`DC-27`).
- Toute évolution de la sémantique de l'objet = décision `D-xxx` + fragment
  `changelog.d/` (`DC-17`, `DC-18`).
- Provenance : rien de généré par un LLM ne s'insère dans une voix comme si
  elle l'avait dit (`DC-01`, `DC-02`).

## Principe d'acceptation transverse

« Aucune stratégie n'est réellement optimale si elle est cliniquement
pertinente mais incomprise, irréalisable ou sans rapport avec ce qui compte
pour le patient. »

## Contraintes et interdits

- Aucune donnée patient réelle ; fixtures limitées à Sophie Nicola, Jennifer
  Martin, Michel Dogné.
- Migration Prisma : confirmation explicite, migration seule dans sa PR,
  chemin release-db uniquement.
- Dossier init-only : le cadrage complet (CAMPAGNE.md, lots/) s'écrit à
  l'ouverture de la campagne, jamais maintenant.
