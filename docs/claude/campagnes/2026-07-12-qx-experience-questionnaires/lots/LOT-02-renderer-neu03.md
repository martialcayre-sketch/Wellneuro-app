---
id: "LOT-02"
titre: "Pilote renderer Q_NEU_03"
statut: "terminé"
dépend_de: "LOT-01"
---

# LOT-02 — Pilote renderer Q_NEU_03

## But

Brancher `micro_batch` uniquement sur `Q_NEU_03`, certifié, avec rendu mobile, clavier et lecteur d'écran.

## Garde-fous

- Les renderers `focus`, `guided_sections` et `compact_repeated_scale` restent bloqués jusqu'aux certifications et fixtures requises.
- Payload et score doivent être strictement identiques avant/après.
- Aucun mélange nominal n'est exécuté.

## Résultats

- Renderer `micro_batch` branché exclusivement sur `Q_NEU_03`, avec neuf lots
  visuels qui conservent l'ordre des 25 items et de leurs options.
- Progression calculée sur les réponses, navigation clavier avec reprise de
  focus, blocage défensif des lots incomplets et groupes radio accessibles.
- Brouillon, payload de soumission, API et scoring inchangés ; tests ajoutés
  pour l'ordre, la navigation, le payload réel et le score de référence.
- Tests ciblés Vitest (11/11), type-check, `scoring-check` et contrôle
  anti-secrets validés. Le client Prisma a été généré localement pour le
  type-check, sans migration ni accès à la base.
- Contrôle navigateur avec API mockée validé à 375 px et à largeur équivalente
  au zoom 200 %, sans débordement horizontal ; radios accessibles au clavier.
