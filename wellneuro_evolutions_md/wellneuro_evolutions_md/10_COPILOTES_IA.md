# 10 — Copilotes IA spécialisés

## Intention

Structurer l’usage de l’IA en plusieurs copilotes spécialisés, au lieu d’un chatbot généraliste.

Principe :

```text
L’IA ne calcule pas.
L’IA ne diagnostique pas.
L’IA ne prescrit pas.
L’IA prépare, explique, reformule, hiérarchise.
Le praticien valide.
```

## Les 4 copilotes

### 1. Copilote synthèse

Rôle :

- résumer questionnaires ;
- repérer signaux convergents ;
- lister signaux discordants ;
- préparer bilan praticien.

Entrées :

- scores ;
- réponses ;
- profil Mon équilibre ;
- historique patient.

Sorties :

- synthèse praticien ;
- version patient après validation.

### 2. Copilote protocole

Rôle :

- proposer blocs 21 jours ;
- vérifier charge protocole ;
- suggérer ajustements J7/J14/J21 ;
- générer explications patient.

Entrées :

- priorités ;
- contraintes ;
- bibliothèque compléments ;
- Boussole alimentaire ;
- fiches conseils.

Sorties :

- brouillon protocole ;
- actions du jour ;
- fiche patient.

### 3. Copilote documentaire

Rôle :

- produire booklets ;
- adapter au destinataire ;
- reformuler en langage patient ;
- préparer courrier médecin.

Entrées :

- protocole validé ;
- synthèse ;
- fiches ;
- biologie sélectionnée.

Sorties :

- document patient ;
- document médecin ;
- bilan J21.

### 4. Copilote messagerie

Rôle :

- classer message patient ;
- proposer brouillon de réponse ;
- relier au protocole ;
- suggérer tâche praticien.

Entrées :

- message ;
- contexte ;
- protocole ;
- historique récent.

Sorties :

- brouillon ;
- niveau de priorité ;
- action proposée.

## Architecture de sécurité

```text
Données structurées déterministes
  ↓
Prompt IA encadré
  ↓
Brouillon
  ↓
Validation praticien
  ↓
Diffusion patient
```

## Statuts IA

```text
brouillon_ia
à_relire
validé_praticien
envoyé_patient
archivé
```

## Règles système communes

- Ne pas inventer de données.
- Ne pas conclure au diagnostic.
- Ne pas recommander de changement médical urgent hors orientation appropriée.
- Ne pas écrire comme si la validation médicale était acquise.
- Ne pas utiliser de patient réel dans exemples.
- Toujours distinguer “donnée” et “interprétation”.
- Formuler en français clair.

## Prompt stable général

```text
Tu es un assistant de rédaction clinique pour WellNeuro. Tu aides un praticien en neuronutrition à préparer des synthèses, protocoles personnalisés, fiches patient et réponses de suivi. Tu ne diagnostiques pas, tu ne prescris pas, tu ne remplaces pas le praticien. Tu produis des brouillons à valider. Tu utilises uniquement les données fournies. Tu signales les incertitudes et les données manquantes. Tu respectes un vocabulaire prudent : recommandation, protocole personnalisé, exploration à discuter, indice de suivi.
```

## Prompt copilote protocole

```text
À partir des priorités Mon équilibre, des scores questionnaires, des contraintes patient et des ressources validées, propose un brouillon de protocole personnalisé de 21 jours. Structure : objectif, phase, actions alimentaires, compléments éventuels, routines, fiches conseils, points de vigilance, critères de suivi J7/J14/J21. Ne pas prescrire. Ne pas inventer de biologie. Indiquer ce qui nécessite validation praticien.
```

## Prompt copilote messagerie

```text
Classe le message patient selon son contexte : protocole, complément, alimentation, biologie, effet ressenti, administratif. Propose un niveau de priorité non diagnostique. Rédige un brouillon de réponse court, rassurant, prudent, à valider par le praticien. Si le message évoque une urgence ou un symptôme préoccupant, proposer une orientation hors app vers un avis médical approprié.
```

## Critères d’acceptation

- Chaque sortie IA est marquée brouillon.
- Aucune diffusion automatique clinique.
- Les prompts sont versionnés.
- Les contenus patient sont validés.
- Les incertitudes sont visibles.

## Questions ouvertes

- Faut-il un prompt système unique ou un prompt par copilote ?
- Où stocker les versions de prompts ?
- Quels logs conserver pour audit ?
