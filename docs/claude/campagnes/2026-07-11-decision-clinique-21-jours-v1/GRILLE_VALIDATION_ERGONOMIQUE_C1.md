# Grille de validation ergonomique C1

## Statut

**Non exécutée.** Cette grille exige un praticien réel et un chronométrage
humain. Une émulation Playwright ne constitue pas une validation ergonomique.

## Préparation

- Utiliser uniquement Sophie Nicola, Jennifer Martin ou Michel Dogné avec des
  données entièrement fictives.
- Fournir une fixture C1 préparée contenant des manques documentés, une
  priorité sélectionnée et trois actions fictives complètes.
- **Support prêt à l'emploi (harnais dev, PR #90)** : en local
  (`cd web && npm run dev`), ouvrir la fiche d'un patient avec le paramètre
  `?validationErgo=c1` — la fixture déterministe (manques documentés,
  discordance, priorité sélectionnée, protocole relu à trois actions) est
  construite côté serveur (`validationErgoFixture.ts`) et injectée dans la
  vraie fiche patient. Développement uniquement : la route
  `/api/dev/validation-ergo` répond 404 en production. Téléphone physique
  recommandé (réseau local).
- Ne donner aucune explication du cockpit avant le départ du chronomètre.
- Chronométrer séparément compréhension et préparation.

## Épreuve 1 — Comprendre la décision

Le praticien ouvre la fiche et annonce :

1. ce qui manque pour décider ;
2. la priorité sélectionnée ;
3. les trois actions ;
4. si le protocole est relu, validé pour diffusion et transmis.

Succès : quatre réponses exactes en moins de **2 minutes**. Consigner durée,
erreurs, hésitations et aide éventuellement demandée.

## Épreuve 2 — Préparer le protocole

Le praticien saisit trois actions fictives avec plans idéal, minimal et de
secours, choisit manuellement la charge, renseigne le critère J21, marque le
brouillon comme relu puis valide l’aperçu pour diffusion.

Succès : brouillon complet en moins de **10 minutes**, sans confusion entre
revue, validation et transmission, et sans tentative d’envoi.

## Relevé

| Élément | Résultat |
|---|---|
| Praticien / date | Non renseigné |
| Patient fictif | Non renseigné |
| Compréhension | Non exécutée |
| Durée compréhension | Non renseignée |
| Préparation | Non exécutée |
| Durée préparation | Non renseignée |
| Observations | Non renseignées |

Sans relevé réel réussi, le verdict est **ergonomie à valider**. Il ne doit
jamais être converti implicitement en GO.
