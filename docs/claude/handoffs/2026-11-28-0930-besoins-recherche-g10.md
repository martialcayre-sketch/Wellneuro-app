# Handoff — 2026-11-28 — Candidats G-10 : sources de fidélité des instruments servis (lot besoins-recherche-g10, file D)

## 1. Branche et état Git

- Branche `claude/exciting-cray-95vkt0` (session cloud de reprise de
  l'orchestrateur), repartie d'`origin/main` (`4e7e876f`).
- Un commit de documentation. Il remplace la tentative de la passe
  `20261128-0809-orch` (branche `claude/clever-mayer-2opyuv`, handoff seul,
  non mergé, qui n'a pas à l'être).

## 2. Objectif

Écrire `docs/claude/besoins/candidats/G10.md`. Pour chaque instrument servi,
lister les sources de fidélité, en identifiants seulement. Une source n'est
gardée que si son DOI ou son PMID se résout et que son emplacement a été lu.
Réponse `20261127-2046-b` : « la passe cloud cherche et vérifie elle-même ».

## 3. Décisions prises

- Le blocage de la passe `20261128-0809-orch` venait du réseau : l'environnement
  cloud refusait PubMed, eutils, doi.org et Crossref. Le responsable a choisi
  d'ouvrir les hôtes, par deux voies concordantes : réponse `20261128-0842-b`
  en séance principale, et choix en séance cloud. Les six hôtes ont été
  ajoutés à l'environnement « Wellneuro-app » de la routine ; constat :
  réponses 200, et 302 pour doi.org.
- Le lot porte une ligne d'intention : le script de passe l'écarte donc pour
  toujours (`deja_tente`). Sur le choix du responsable, il est mené par la
  session de reprise de l'orchestrateur, comme le lot 129.
- Les lots 138 et 139, rangés `bloque` en attendant le réseau, sont repassés
  `pret`. Message `20261128-0846-d` à la file B.
- La recherche a été répartie entre trois agents de lecture. Tous les
  identifiants ont ensuite été contre-vérifiés en session principale, et les
  validations françaises recontrôlées à la source.

## 4. Fichiers modifiés

- `docs/claude/besoins/candidats/G10.md` (nouveau)
- `changelog.d/2026-11-28-besoins-recherche-g10.md`, ce handoff

## 5. Validations exécutées

- Les 74 PMID et les 52 DOI cités se résolvent (esummary et doi.org), avec
  0 échec. Pour chaque ligne de tableau, le couple PMID-DOI et l'année
  concordent avec PubMed (0 écart).
- Recontrôlés à la source :
  - absence de test-retest de la HADS française (section Discussion,
    PMC) ;
  - test-retest limité à l'addendum PSQI-A (section Résultats, PMC) ;
  - résumés de Blais 1997, Gentile 2003, Savard 1998 et Kaminska 2010 ;
  - résumés des questionnaires de fréquence alimentaire et d'activité
    physique français.
- Vérification qu'aucune valeur chiffrée issue d'une source n'est recopiée.
- `npm run check` (T1 complet) : code 0.

## 6. Problèmes ouverts

- Trois sources francophones restent à lire en texte intégral avant tout
  usage : PMID 9488928 (PSQI, Québec), PMID 12641557 (MFI-20, France) et
  PMID 9933941 (HADS, Québec). Les éditeurs sont fermés au réseau cloud :
  la lecture se fait au Mac, ou les textes sont versés au dossier privé.
- Retenir une source pour G-10 reste le geste du responsable (H13). Ce
  document ne décide rien.
- Le script de passe écarte pour toujours un lot rangé `bloque` après une
  intention (`deja_tente`), même quand la cause est levée. C'est un constat :
  la règle est voulue (`D-540`, amendement du 2026-11-20). Rien n'est changé
  ici.

## 7. Prochaine action exacte

1. CI et PR-Agent de la PR de ce lot à 0, PR hors brouillon, puis
   « prête @<sha> » et ligne `prete` à la boîte `integrateur`.
2. Au merge, passer le lot `besoins-recherche-g10` à `fait`, avec son champ
   `pr`.

## 8. Interdits encore actifs

- Aucune référence de mémoire, aucune valeur chiffrée recopiée, aucun item
  ni titre reproduit. Aucune ingestion, et aucune modification du registre
  ou de `measurement_evidence.json`.
- Ne pas merger : l'intégrateur merge. Ne pas sortir une PR du brouillon
  après « prête ».
- Aucune adresse de page privée dans le dépôt ; ne jamais supprimer une
  ligne des registres.
