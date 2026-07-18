---
id: "LOT-00"
titre: "Audit et contrat C5 5.0"
statut: "terminé — conformité 5.0 cadrée"
dépend_de: "aucun"
---

# LOT-00 — Audit et contrat C5 5.0

## But

Transformer les sources historiques en un contrat C5A/C5B conforme au paradigme
WellNeuro 5.0, sans modifier l'application.

## Résultat observable

Un audit daté, une campagne à huit lots et des frontières sans ambiguïté :
C5 est un Instrument de la Spirale, jamais un graphe ni un moteur autonome.

## Périmètre

- Classer C5A comme profil intrinsèque sans donnée patient.
- Classer C5B comme lecture contextuelle dépendante de C1 et C2.
- Confirmer les 12 vedettes comme sous-ensemble du registre JA.
- Établir la préséance du registre 5.0 sur les sources historiques.

## Hors périmètre

Code, clinique opérationnelle, SQL, migration, import, activation et diffusion.

## Fichiers probables

CAMPAGNE.md, CAMPAIGN_DRAFT.md, AUDIT_CONFORMITE_5_0.md, spécification LOT-00,
contexte Boussole, registre, programme et index des campagnes.

## Interdits

- Ne pas modifier ACTIVE_CAMPAIGN.md, .wn/state.json, web/ ou archive/gas-legacy/.
- Ne pas inventer de code Ciqual, poids, seuil ou recommandation clinique.
- Ne pas écrire de secret ni de donnée patient.

## Étapes

- [x] Auditer les frontières, les données, les UX, JA et l'activation.
- [x] Arbitrer les contradictions par ordre de préséance.
- [x] Compiler huit lots atomiques avec gates explicites.
- [x] Marquer C5 inactive et LOT-01 bloqué par validation clinique.

## Tests

- Statut de campagne attendu : 1 lot terminé sur 8.
- Audit de campagne sans dérive d'activation.
- Absence de placeholders exécutables et contrôle du diff documentaire.

## Critères de done

- Les frontières C5A/C5B/JA/C1/C2/C3 sont explicites.
- Les 12 vedettes ne sont pas confondues avec la distribution de référence.
- Les sources historiques sont préservées et déclassées.
- Aucun fichier applicatif ou état actif n'est modifié.

## Risques / points de vigilance

Une documentation historique peut encore contenir une idée différée ; son
statut historique doit être visible avant toute future implémentation.

## Résultats

Terminé le 2026-07-18. Voir AUDIT_CONFORMITE_5_0.md.
