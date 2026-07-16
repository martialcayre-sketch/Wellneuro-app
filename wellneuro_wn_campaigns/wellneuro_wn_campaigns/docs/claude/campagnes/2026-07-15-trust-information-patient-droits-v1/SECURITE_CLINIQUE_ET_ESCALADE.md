# Sécurité clinique, alertes et nutrivigilance — TRUST V1

> Ce document décrit une architecture de sécurité relationnelle. Il ne définit
> aucun seuil clinique activable. Toute règle nécessite une validation clinique,
> juridique et organisationnelle avant mise en production.

## 1. Principe

Une notice statique ne suffit pas si une réponse du patient peut révéler une
situation préoccupante.

Le produit doit distinguer :

```text
informer → détecter un signal → afficher une consigne →
notifier selon le niveau → tracer → revoir
```

Il ne doit jamais prétendre :

- surveiller en continu ;
- garantir une réponse ;
- qualifier automatiquement une urgence médicale ;
- remplacer les services d’urgence ;
- établir une causalité entre un produit et un symptôme.

## 2. Charte de disponibilité

Texte patient recommandé :

> Vos réponses et messages ne sont pas suivis en continu. Wellneuro n’est pas
> un service d’urgence. Si votre état vous inquiète ou s’aggrave rapidement,
> contactez les services médicaux adaptés à votre situation.

La disponibilité réelle du praticien doit être annoncée :

- délai indicatif de lecture ;
- horaires ou jours de présence ;
- conduite à tenir pendant les absences ;
- canal administratif ;
- canal de correction ;
- urgence.

Aucun délai ne doit être annoncé sans capacité opérationnelle.

## 3. Niveaux d’escalade

```ts
type SafetyLevel =
  | 'immediate_external_action'
  | 'prompt_medical_contact'
  | 'practitioner_review'
  | 'routine';
```

### `immediate_external_action`

Le patient reçoit immédiatement une consigne extérieure au portail.

Exemples de familles à soumettre à validation :

- danger immédiat ;
- symptôme aigu majeur ;
- réaction sévère ;
- idées suicidaires avec danger ;
- perte de connaissance ;
- détresse respiratoire.

Le portail n’attend pas la lecture du praticien.

### `prompt_medical_contact`

Consigne de contact médical rapide, sans attendre un retour Wellneuro.

### `practitioner_review`

Création d’une tâche prioritaire dans le cockpit praticien, avec information
honnête au patient :

> Votre réponse a été signalée pour relecture. Cela ne remplace pas une
> consultation urgente si votre état vous inquiète.

### `routine`

Le signal est intégré au dossier sans notification urgente.

## 4. Règles activables

Chaque règle comporte :

```ts
type SafetyRule = {
  id: string;
  version: string;
  title: string;
  sourceReferences: string[];
  inputContractVersion: string;
  triggerDefinition: string;
  level: SafetyLevel;
  patientMessageVersion: string;
  practitionerAction: string;
  ownerClinicalRole: string;
  approvedAt: string | null;
  reviewDueAt: string | null;
  enabled: boolean;
};
```

Interdits :

- seuil non documenté ;
- activation implicite ;
- règle dérivée d’un prompt libre ;
- modification sans version ;
- contenu patient construit par IA au moment de l’alerte ;
- signal silencieux.

## 5. Messages patient

Les messages sont déterministes et versionnés.

### Modèle urgence

> Cette réponse peut correspondre à une situation qui nécessite une aide
> immédiate. N’attendez pas une réponse dans Wellneuro. Contactez les services
> d’urgence adaptés à votre situation.

### Modèle contact médical

> Votre réponse mérite un avis médical rapide. Contactez votre médecin, un
> service de garde ou un professionnel de santé selon votre situation.

### Modèle relecture praticien

> Votre réponse a été ajoutée aux éléments à relire par votre praticien. Cette
> indication ne garantit pas un délai de réponse et ne remplace pas un recours
> médical si votre état s’aggrave.

## 6. Numéros utiles

La configuration est juridictionnelle.

Défaut France à vérifier périodiquement :

- 15 ;
- 112 ;
- 114 ;
- 3114.

Le contenu doit être géré comme une donnée versionnée avec :

- territoire ;
- langue ;
- source ;
- date de vérification ;
- date de prochaine revue.

## 7. Effets indésirables suspectés

### Entrée patient

Bouton permanent :

```text
Un produit vous semble mal toléré ?
```

### Données minimales

- nom du produit ;
- date de début ;
- quantité telle que rapportée ;
- symptôme ;
- date d’apparition ;
- autres produits ou traitements ;
- arrêt/réduction éventuelle ;
- gravité ressentie ;
- commentaire.

### Réponse immédiate

Le portail affiche une consigne selon les réponses de sécurité, sans conclure à
un lien de causalité.

### Revue praticien

Le praticien voit :

- signalement ;
- produit ;
- chronologie ;
- co-expositions ;
- action du patient ;
- statut de revue ;
- nécessité éventuelle d’un signalement externe.

### Nutrivigilance

Le workflow doit permettre de documenter l’évaluation et le signalement via les
canaux officiels applicables, sans automatiser un envoi réglementaire sans
validation.

## 8. Textes libres

V1 :

- aucun triage autonome à partir d’un LLM ;
- texte libre borné ;
- avertissement visible ;
- option structurée « demande de contact » ;
- règles critiques basées sur des champs explicites.

Une analyse IA de texte libre serait un chantier distinct avec évaluation,
supervision humaine, performances, faux négatifs/faux positifs et procédure de
repli.

## 9. Cockpit praticien

File « Sécurité et demandes » :

```text
Priorité | Patient | Type | Reçu | Consigne déjà affichée | Action
```

Cartes :

- signal immédiat ;
- effet indésirable ;
- incident de confidentialité ;
- demande d’exercice des droits ;
- délégation inhabituelle ;
- échec de notification important.

## 10. Accusé de prise en charge

L’accusé praticien signifie :

- l’élément a été ouvert ;
- un acteur est responsable ;
- une action ou une décision est tracée.

Il ne doit pas être présenté au patient comme « traité » tant qu’aucune réponse
n’a été publiée.

## 11. Notifications

### Praticien

Canal adapté au niveau, sans donnée clinique détaillée dans une notification
externe.

Exemple :

> Un élément prioritaire nécessite une revue dans Wellneuro.

### Patient

Les notifications restent génériques :

> Une nouvelle information est disponible dans votre espace sécurisé.

Ne pas inclure :

- symptôme ;
- score ;
- nom d’un produit ;
- conclusion ;
- santé mentale ;
- résultat biologique.

## 12. Disponibilité technique

Prévoir les pannes :

- si la création d’alerte échoue, le patient doit quand même voir la consigne ;
- le message d’urgence ne dépend pas d’un appel serveur ;
- les numéros essentiels sont livrés avec la page et mis en cache ;
- l’échec de notification praticien est visible ;
- les retries sont idempotents ;
- le journal conserve l’erreur.

## 13. Tests

### Tests fonctionnels

- chaque niveau affiche le bon message ;
- aucun message ne promet un contact ;
- le signal reste créé en double clic ;
- retry sans doublon ;
- notification externe générique ;
- statut praticien correct ;
- historique immuable.

### Tests de sécurité

- patient A ne voit pas le signal de B ;
- praticien A ne voit pas le signal de B ;
- token révoqué ;
- session expirée ;
- identifiant indirect ;
- contenu HTML neutralisé ;
- limites de taille ;
- rate limiting.

### Tests humains

- compréhension du message ;
- niveau d’anxiété induit ;
- action choisie ;
- accessibilité ;
- mobile ;
- situation de stress ;
- personne vulnérable.

## 14. Gouvernance

Revue minimale trimestrielle ou à chaque changement de source :

- règles ;
- messages ;
- numéros ;
- délais ;
- responsables ;
- taux d’échec ;
- faux positifs ;
- incidents ;
- retours patients.

## 15. Definition of Done

- [ ] Aucun seuil non validé n’est activé.
- [ ] Les messages critiques sont déterministes.
- [ ] La consigne patient ne dépend pas de la disponibilité du serveur.
- [ ] L’absence de surveillance continue est explicite.
- [ ] Aucun délai irréaliste n’est promis.
- [ ] Les notifications externes sont génériques.
- [ ] Les événements sont idempotents.
- [ ] Le praticien dispose d’une file dédiée.
- [ ] Le signalement d’effet indésirable est structuré.
- [ ] Le circuit de nutrivigilance est documenté.
- [ ] Les tests avec utilisateurs incluent des situations de stress.
