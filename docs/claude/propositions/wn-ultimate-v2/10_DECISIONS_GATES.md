---
id: "wellneuro-decisions-gates-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Décisions et gates

## A. Moteur clinique

- seuils de fondations critiques ;
- classification domino ;
- poids de priorité ;
- règles de convergence ;
- conditions d’abstention ;
- données bloquantes ;
- contre-factuels obligatoires.

## B. Mon équilibre

- maintien exact du 60/20/20 ;
- statut des cinq objets cliniques ;
- formule de stabilité métabolique ;
- traitement de questionnaires partiels ;
- fenêtre maximale d’un AssessmentEpisode ;
- comparabilité entre versions.

## C. Protocole

- trois actions maximum ;
- barème de charge ;
- seuil excessif ;
- règles de dérogation ;
- types d’intervention autorisés ;
- critères observables minimum.

## D. Journal

- liste finale des 25 marqueurs ;
- neuf axes V1 ;
- seuils de couverture ;
- politique de fiabilité ;
- jours atypiques ;
- rattrapage ;
- règles de projection ;
- seuils d’action outcome ;
- durée de conservation.

## E. Boussole

- sources autorisées ;
- axes intrinsèques ;
- statut d’un score intrinsèque ;
- règles de contextualisation ;
- aliments du pilote ;
- vocabulaire patient.

## F. Corpus

- droits SIIN ;
- taxonomie ;
- autorité documentaire ;
- schéma claims ;
- conflits bloquants ;
- publication ;
- expiration ;
- audit des doses ;
- interventions autorisées ;
- go/no-go sommeil.

## G. Sécurité et réglementation

- règles d’orientation ;
- interactions ;
- statut des compléments ;
- vocabulaire ;
- frontières médecin/praticien ;
- consentement ;
- HDS ;
- RLS ;
- logs ;
- rétention.

## Gates formels

| Gate | Objet | Autorité |
|---|---|---|
| G0 | droits sources | responsable projet |
| G1 | taxonomie et contrats | praticien + tech |
| G2 | qualité extraction | documentaire |
| G3 | claims/règles pilote | praticien |
| G4 | firewall/runtime | sécurité + tech |
| G5 | migration DB/vector | confirmation séparée |
| G6 | go/no-go pilote | praticien |
| GM | toute migration clinique | confirmation explicite |
| GD | diffusion document patient | validation praticien |
| GP | activation protocole | validation praticien |
