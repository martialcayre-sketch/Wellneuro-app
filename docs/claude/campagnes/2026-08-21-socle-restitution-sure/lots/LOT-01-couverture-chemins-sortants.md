---
id: "LOT-01"
statut: "terminé (2026-08-22, PR à venir) — carte posée, re-vérification du bilan au service (journalisante), quatre gardes vues rouges débranchées ; arbitrage des régimes instruit au handoff, non tranché"
dépend_de: "aucun"
---

# LOT-01 — La couverture des chemins sortants devient un contrat prouvé

## But

À la fin de ce lot, chaque chemin sortant de texte clinique est couvert par un
banc qui **rougit quand sa garde est débranchée**, et le bilan du portail ne
sert plus un contenu sans re-vérification. Aujourd'hui les gardes existent
mais en ordre dispersé — trois mécanismes, trois régimes, aucune carte — et
rien n'empêche un chemin neuf (ce que les campagnes 6.0 vont précisément
créer) de s'ouvrir sans garde, en silence.

## L'état mesuré, chemin par chemin (2026-08-22)

| Chemin | Garde actuelle | Régime |
|---|---|---|
| Synthèse (génération) | `verifierRestitutionOrientation` + `verifierRestitutionComplements` + `verifierRestitutionDiscordances` (`api/praticien/synthese/route.ts:560-587`) | **Journalisant** (`logger.warn`, « on journalise, on ne censure pas ») |
| Booklet (envoi email) | `termeAnxiogene` sur `narratif_patient` (`api/praticien/booklet/route.ts:238`) | Refus **confirmable** (`REGISTRE_ANXIOGENE`) — la cécité à la négation est assumée et documentée |
| Courrier médecin biologie | `assertRenduMedecinNonPrescriptif` au chokepoint `renderDocumentHtml` (`documents/rendu.ts:78`, appelé par `biology-library/courrier.ts:159`) | **Refus dur** (lève) ; joue aussi à la prévisualisation (`DocumentsPanel.tsx`) |
| Bilan portail (service) | **Aucune garde propre** (`api/portail/bilan/route.ts`) — sert le dernier `BookletEnvoi` `'Envoye'`, garanti seulement par la garde d'envoi | Rien au service |
| `correspondance-medecin` | Gardes structurelles seules (refus d'un `@`, longueurs) | Hors périmètre : consignation d'un texte praticien, l'application ne génère ni n'envoie rien |
| Emails templatés (assignations, relances, accusés…) | Gabarits fixes, sans prose clinique générée | Traité au LOT-03 (registre) |

## Résultat observable

1. Un banc par chemin gardé, qui **échoue si la garde est débranchée** (retrait
   de l'appel, motif vidé) — le critère du brief : une garde toujours verte
   sans sujet ne prouve rien.
2. Le bilan portail **re-vérifie au service** ce qu'il sert (même registre que
   l'envoi) : un contenu devenu non conforme entre l'envoi et la lecture est
   **journalisé** — pas retenu : la garde d'envoi est confirmable, et retenir
   ce que le praticien a confirmé changerait un verdict (interdit ci-dessous).
   *(Précisé à l'exécution — la première rédaction disait « ne part plus tel
   quel », incompatible avec l'interdit du lot.)*
3. Une **carte des chemins sortants** vit en tête du module de garde — la
   table ci-dessus, tenue à jour, avec la consigne pour tout chemin neuf.

## Périmètre

- Bancs nouveaux (Vitest) prouvant le câblage des gardes existantes — sans en
  changer le comportement.
- `api/portail/bilan/route.ts` : re-vérification au service (seul changement
  de comportement du lot, additif — il ne peut que retenir, jamais élargir).
- La carte, en commentaire d'en-tête du module de garde choisi comme point
  d'ancrage (`documents/vocabulaire.ts` ou `verifierRestitutionOrientation.ts`
  — à trancher au lot, au vu de ce que les bancs regardent).

## Interdits

- **Ne changer aucun verdict existant** — journalisant reste journalisant,
  confirmable reste confirmable. Le passage éventuel de la garde de synthèse à
  un régime bloquant est une **décision du responsable** (`D-xxx`) que ce lot
  peut instruire (constat + options), jamais prendre.
- **Aucun terme ajouté aux registres** (anxiogène, prescriptif) sans source :
  un mot de registre est une règle clinique (`DC-19`, `DC-20`).
- Ne pas fusionner `documents/vocabulaire.ts` et
  `supplement-library/vocabulaire.ts` — deux objets sans rapport.
- Aucun écran, aucun contenu nouveau.

## Dépendances

Aucune.

## Tests

- Chaque banc : vert câblé, **rouge débranché** — la preuve se joue en
  mutation (retirer l'appel, voir rouge, remettre) avant de conclure.
- Bilan portail : un envoi conforme se sert sans journalisation ; un contenu
  rendu non conforme (fixture) est servi ET journalisé (champ, jamais terme).
  Patient fictif uniquement.
- T2 avant commit ; le segment E2E existant du portail ne doit pas bouger.

## Critères de done

- [ ] La carte existe et nomme chaque chemin, sa garde, son régime.
- [ ] Un banc par chemin, chacun vu rouge garde débranchée.
- [ ] Le bilan portail re-vérifie au service ; prouvé par banc.
- [ ] Aucun verdict existant modifié ; si l'arbitrage journalisant/bloquant
      est instruit, il est consigné en question ouverte avec options — pas
      tranché ici.
- [ ] T2 vert ; fragment `changelog.d/` écrit.
