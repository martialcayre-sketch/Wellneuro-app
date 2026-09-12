---
id: "LOT-01"
titre: "deriver-le-journal"
statut: "livré (2026-09-12)"
dépend_de: "—"
---

# LOT-01 — Dériver le journal : la vie du dossier cesse d'être devinée localement

## But

« Depuis votre dernière visite » ne consigne rien. `lib/portail-visite.ts` le dit
lui-même — « purement local et présentationnel » : un instantané `localStorage`
comparé au suivant puis écrasé, qui ne voit **que les assignations**, ne suit pas
la personne d'un appareil à l'autre, et est vide à la première visite par
construction. La vie du portail n'était donc pas consignée : elle était devinée,
localement, et jetée.

Le lot livre la **dérivation** — une fonction pure qui assemble la vie d'un
dossier depuis les tables existantes — et sa **route de lecture** au portail.

## Résultat observable

- `GET /api/portail/journal` rend, pour le porteur du cookie de session, les
  événements de son dossier — ce qu'il a transmis, ce qui lui a été remis, ce
  qu'il a dit sur son objectif — datés, du plus récent au plus ancien, et **du
  serveur** : identiques sur son téléphone et sur son ordinateur.
- Un **dossier neuf rend une ligne**, jamais une liste vide : l'entrée dans
  l'accompagnement est elle-même un événement.
- **Rien ne s'écrit.** Aucune migration, aucune ligne stockée une seconde fois.

## Périmètre

- `web/src/lib/portail/journalDossier.ts` — dérivation pure, sans accès base.
- `web/src/app/api/portail/journal/route.ts` — lecture seule, cookie de session.
- `WN_PORTAIL_JOURNAL` — drapeau neuf et éteint, documenté au §B de
  `docs/FEATURE_FLAGS.md`.

## Hors périmètre

- **L'écran** (LOT-03) et le **repère de fraîcheur** avec sa migration (LOT-02).
- **Le retrait de `portail-visite.ts`** : il reste en place tant que l'écran qui
  le remplace n'existe pas. Le retirer maintenant enlèverait au patient le peu
  qu'il a.
- **Notifier, compter.** Aucun canal sortant, aucune série, aucun score
  d'assiduité (`DC-19`/`DC-20`).

## Les quatre arbitrages, et où ils vivent dans ce lot

1. **Les gestes du praticien qui REMETTENT quelque chose** — synthèse publiée,
   bilan transmis, questionnaire proposé, objectif proposé ou reformulé. La
   ligne de partage est le **destinataire** du geste, pas sa nature.
2. **Tout le dossier, sans borne.** Aucun seuil inventé.
3. *(L'affichage replié/déplié appartient au LOT-03.)*
4. **L'entrée dans l'accompagnement est la première ligne** — d'où l'absence
   totale d'état vide à écrire.

## Preuves

- **T1 vert. T2 verte** (3 min 7 s, 196 E2E Chromium + WebKit).
- **Vingt mutations jouées, vingt mutants tués.** Dont les quatre qui comptent :
  le journal qui lève le drapeau de la compréhension, celui du dossier à deux
  voix, celui de « ce qui compte », et la lecture des brouillons de synthèse.

## Écart assumé, à dire plutôt qu'à taire

**Une surface fermée par drapeau ne produit aucune ligne, et le journal ne peut
pas dire pourquoi.** C'est correct — le patient n'a jamais vu cette surface non
plus — mais cela porte une conséquence qu'il faut nommer : le jour où une
surface s'ouvrira, le journal fera **apparaître d'un coup des faits anciens**.
Ils seront vrais, et datés de leur jour. Aucune ligne ne dira « ceci vous est
révélé aujourd'hui ».

**La date d'un questionnaire transmis est `date_derniere_modification`**, faute
de mieux : la table ne porte pas de date de soumission. Sur un questionnaire
verrouillé, la dernière modification EST la soumission — mais c'est une
propriété du verrou, pas une garantie de la colonne.

**Le journal se date sur l'ENREGISTREMENT (`cree_le`), jamais sur la date
déclarée** (`saisi_le`, `geste_le`, `exprime_le`). Ces dernières disent ce que le
patient a voulu dire d'un jour ; sans fuseau, un jour civil sérialisé en UTC peut
basculer d'une journée. Un journal de ce qui s'est passé se date sur ce que le
dossier a constaté. L'écart est invisible la plupart du temps, et réel le soir.
