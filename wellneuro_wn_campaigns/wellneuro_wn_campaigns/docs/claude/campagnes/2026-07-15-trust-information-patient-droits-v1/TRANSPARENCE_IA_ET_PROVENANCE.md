# Transparence IA et provenance — TRUST V1

## 1. Objectif

Permettre au patient et au praticien de comprendre :

- quand une IA intervient ;
- pour quelle tâche ;
- quelles données sont utilisées ;
- ce qui relève d’un calcul déterministe ;
- ce qui relève d’une génération ;
- ce qui a été relu ;
- ce qui a été validé ;
- qui reste responsable.

## 2. Cartographie des usages

Chaque usage IA doit être inscrit dans un registre fonctionnel.

```ts
type AIUseCase = {
  id: string;
  title: string;
  purpose: string;
  audience: 'practitioner' | 'patient' | 'internal';
  modelProvider: string;
  modelName: string;
  modelVersion: string | null;
  promptVersion: string;
  inputCategories: string[];
  outputType: string;
  humanValidationRequired: boolean;
  patientVisible: boolean;
  retentionPolicy: string;
  transferInformation: string;
  status: 'draft' | 'approved' | 'suspended' | 'retired';
  reviewedAt: string;
};
```

## 3. Rôle autorisé en V1

L’IA peut aider à :

- structurer une synthèse ;
- reformuler ;
- classer des informations déjà disponibles ;
- préparer un brouillon ;
- repérer des données manquantes à confirmer ;
- adapter un texte au destinataire.

Elle ne peut pas :

- publier seule ;
- décider seule ;
- modifier un traitement ;
- activer un protocole ;
- répondre à une urgence ;
- conclure à partir d’un texte libre sans validation ;
- masquer l’incertitude ;
- créer une donnée clinique comme si elle avait été observée.

## 4. Étiquetage

### Côté patient

Badge principal :

```text
Préparé avec une assistance IA
```

Complété par :

```text
Validé par votre praticien
```

Ne pas utiliser « validé » si la validation n’est pas persistée.

### Côté praticien

Afficher :

- fournisseur/modèle ;
- version du prompt ;
- date ;
- sources utilisées ;
- limites ;
- données manquantes ;
- statut de validation ;
- modifications humaines.

## 5. Provenance patient

Un contenu peut porter plusieurs sources :

```text
Déclaré par vous
Calcul automatique
Indicateur d’orientation
Hypothèse à discuter
Préparé avec une assistance IA
Validé par votre praticien
Résultat de laboratoire transmis
Information médicale communiquée
```

### Règles

- « calcul automatique » = règle déterministe versionnée ;
- « assistance IA » = sortie générative ou modèle probabiliste ;
- « validé » = action humaine explicite ;
- « publié » = contenu visible au patient ;
- « résultat de laboratoire » = source documentaire, non validation Wellneuro ;
- aucune couleur seule ne porte le statut.

## 6. Chaîne de statut

```text
source reçue
  ↓
calcul ou génération
  ↓
brouillon
  ↓
relecture
  ↓
validation
  ↓
publication
  ↓
révision éventuelle
```

Le patient ne voit pas un brouillon interne.

## 7. Information patient

### Résumé

> Certaines tâches peuvent être préparées avec une assistance d’intelligence
> artificielle. Une information destinée au patient doit être relue et validée
> avant publication. Le praticien reste responsable de son utilisation.

### Détail

- fonctions concernées ;
- données utilisées ;
- données exclues ;
- fournisseur ;
- hébergement et transferts ;
- conservation ;
- réutilisation pour entraînement ou non ;
- supervision humaine ;
- correction ;
- contact.

Aucune phrase ne doit être publiée tant que l’architecture réelle n’est pas
connue.

## 8. Interaction directe future

Si un chatbot est ajouté :

- signaler qu’il s’agit d’une IA avant le premier message ;
- rappeler qu’il ne s’agit pas d’un service d’urgence ;
- limiter les usages ;
- séparer information générale et dossier patient ;
- prévoir sortie vers un humain ;
- journaliser ;
- empêcher une recommandation autonome ;
- tester les refus ;
- définir une politique de conservation ;
- analyser la qualification réglementaire.

Ce cas est hors V1.

## 9. Contrôle humain

La validation exige :

- identité du validateur ;
- date ;
- version de l’objet ;
- version du modèle/prompt ;
- sources ;
- statut ;
- éventuelles modifications ;
- possibilité de rejeter.

Un simple affichage du contenu ne vaut pas validation.

## 10. Explication et contestation

Action patient :

```text
[Comprendre l’origine de cette information]
```

La vue montre :

- source ;
- date ;
- type de traitement ;
- validation ;
- limites ;
- bouton « Signaler une erreur ».

L’explication ne révèle pas de prompt système secret ni de données d’un tiers.

## 11. Minimisation

Avant tout appel IA :

- exclure les identifiants non nécessaires ;
- limiter le contexte ;
- exclure les pièces hors périmètre ;
- utiliser des catégories ou pseudonymes lorsque possible ;
- contrôler les logs ;
- définir la conservation ;
- vérifier les contrats du fournisseur.

## 12. Qualité

Mesures :

- taux de rejet humain ;
- taux de modifications ;
- erreurs factuelles ;
- omissions ;
- hallucinations ;
- divergences entre versions ;
- incidents ;
- délai de validation ;
- retours patients.

Aucun indicateur ne devient un score clinique.

## 13. Tests

- badge correct selon l’état ;
- aucun badge « validé » avant action ;
- patient ne voit pas le brouillon ;
- version du prompt persistée ;
- modèle/fournisseur affichable ;
- rejet sans publication ;
- modification crée une version ;
- aucune donnée d’un autre patient ;
- information IA cohérente avec la configuration ;
- parcours de contestation ;
- accessibilité du badge.

## 14. Gate de production

Avant activation :

- [ ] cas d’usage inscrit ;
- [ ] responsable désigné ;
- [ ] fournisseur et contrat connus ;
- [ ] données et transferts documentés ;
- [ ] information patient validée ;
- [ ] validation humaine techniquement bloquante ;
- [ ] tests d’erreur ;
- [ ] rollback ;
- [ ] surveillance ;
- [ ] date de revue.
