# Principes et décisions — TRUST V1

## 1. Constitution relationnelle Wellneuro

Cinq engagements doivent être visibles dans les deux front-ends :

1. **Aucune décision importante n’est diffusée sans validation humaine.**
2. **Un score ou un profil ne constitue pas une certitude médicale.**
3. **Seules les données utiles à l’accompagnement sont demandées.**
4. **Les utilisations secondaires, commerciales ou de recherche ne sont jamais
   dissimulées.**
5. **Le patient peut comprendre, commenter et contester ce qui lui est présenté.**

## 2. Information en plusieurs niveaux

La version courte ne remplace pas la version complète. Elle hiérarchise
l’information.

### Premier niveau

Toujours présenter :

- identité ou qualité du responsable ;
- finalités principales ;
- limites du service ;
- rôle du praticien ;
- droits et point de contact ;
- rôle de l’IA s’il est matériel ;
- absence de surveillance continue ;
- accès vers le détail.

### Deuxième niveau

Présenter le détail dans des cartes ou accordéons :

- catégories de données ;
- caractère obligatoire ou facultatif ;
- destinataires et sous-traitants ;
- conservation ;
- transferts éventuels ;
- sécurité générale ;
- droits ;
- réclamation ;
- partage ;
- IA ;
- incidents ;
- mineurs et représentants.

### Information contextuelle

Elle doit précéder l’action concernée et non apparaître après.

## 3. Lecture, consentement et autorisation

### Accusé de lecture

Prouve qu’une version a été présentée et qu’une action a été réalisée.

Il ne doit pas être nommé « consentement » si aucun consentement n’est requis.

### Consentement

Utilisé uniquement lorsqu’il est réellement la base ou la condition pertinente,
après validation juridique.

Propriétés :

- libre ;
- spécifique ;
- éclairé ;
- univoque ;
- démontrable ;
- retirable ;
- non précoché ;
- indépendant des autres finalités.

### Autorisation métier

Exemples :

- transmettre une synthèse au médecin ;
- autoriser un aidant ;
- partager un document ponctuel ;
- recevoir des communications non essentielles.

Elle doit être spécifique, limitée et révocable.

## 4. Politique de changement

```ts
type ChangeLevel =
  | 'editorial'
  | 'clarification'
  | 'material_information'
  | 'new_optional_purpose'
  | 'security_event';
```

| Niveau | Effet patient |
|---|---|
| `editorial` | version archivée, aucune interruption |
| `clarification` | bannière informative non bloquante |
| `material_information` | nouvelle prise de connaissance |
| `new_optional_purpose` | choix spécifique distinct |
| `security_event` | information adaptée au niveau de risque |

## 5. Politique de publication

Un document normatif suit :

```text
draft → reviewed → approved → published → superseded → archived
```

Règles :

- seule une version publiée est présentée comme applicable ;
- une version publiée est immuable ;
- une correction crée une nouvelle version ;
- le hash du contenu est conservé ;
- la date d’entrée en vigueur est distincte de la date de publication ;
- l’ancienne version reste consultable lorsque cela est pertinent.

## 6. Politique de provenance

Chaque contenu patient porte un statut intelligible.

| Badge patient | Sens |
|---|---|
| Déclaré par vous | saisi ou transmis par le patient |
| Calcul automatique | résultat déterministe d’une règle versionnée |
| Indicateur d’orientation | aide à la compréhension, pas une conclusion |
| Hypothèse à discuter | piste non confirmée |
| Préparé avec une assistance IA | contenu aidé par un système d’IA |
| Validé par votre praticien | contenu relu et approuvé |
| Résultat de laboratoire transmis | valeur provenant d’un document reçu |
| Information médicale communiquée | donnée rapportée depuis un professionnel de santé |

Les badges patient ne remplacent pas les preuves A/B/C/D du cockpit praticien.

## 7. Politique de sécurité relationnelle

- Wellneuro n’est pas un service d’urgence.
- Les réponses ne sont pas lues en continu.
- Une alerte technique ne garantit pas une prise de contact.
- Une consigne immédiate doit rester utilisable même si le praticien est absent.
- Les seuils et règles d’escalade sont versionnés et validés cliniquement.
- Le texte libre n’est pas analysé automatiquement pour décider seul d’une
  urgence en V1.
- Les notifications externes ne contiennent pas d’information sensible.

## 8. Politique IA

- rôle assistif seulement ;
- aucune diffusion autonome ;
- validation humaine explicite ;
- trace du modèle, fournisseur, version du prompt et date ;
- données minimisées ;
- exclusion des données non nécessaires ;
- information honnête sur le fournisseur et les transferts ;
- possibilité de corriger un contenu ;
- pas de formulation « l’IA a diagnostiqué » ;
- pas de score opaque de confiance présenté au patient.

## 9. Politique économique

Avant une dépense non évidente, le patient doit connaître :

- ce qui est inclus ;
- ce qui est optionnel ;
- le coût estimatif lorsque disponible ;
- le remboursement éventuel ou son absence ;
- l’existence d’alternatives ;
- la liberté de fournisseur ;
- les liens économiques ou conflits d’intérêts pertinents.

## 10. Politique aidants et représentants

Une délégation précise :

- l’identité du délégataire ;
- le rôle ;
- le périmètre ;
- la durée ;
- les documents accessibles ;
- le droit de répondre ou non ;
- la révocation ;
- l’auteur réel de chaque action.

Le partage d’un lien ou d’un mot de passe n’est jamais considéré comme une
délégation valide.

## 11. Politique de cycle de vie

États cibles :

```text
invited → identity_verified → active → suspended → closed → archived
```

Chaque état précise :

- accès autorisé ;
- documents consultables ;
- possibilité de répondre ;
- possibilité d’export ;
- conservation ;
- notifications ;
- réouverture éventuelle.

## 12. Interdits

- case unique « j’accepte tout » ;
- texte précoché ;
- lien vers un PDF comme seule information ;
- information cachée dans des CGU ;
- consentement conditionnant une fonction essentielle sans justification ;
- changement silencieux de finalité ;
- suppression de l’historique ;
- email contenant un score ou une conclusion sensible ;
- promesse de réponse non tenue ;
- badges ne reflétant pas l’état réel ;
- formulation absolue sur la confidentialité si des sous-traitants accèdent aux
  données ;
- qualification réglementaire affirmée sans analyse dédiée.
