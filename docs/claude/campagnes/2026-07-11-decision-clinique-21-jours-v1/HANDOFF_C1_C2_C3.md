# Handoff C1 vers C2 et C3

## État livré par C1

C1 livre des contrats purs et versionnés jusqu’à `PatientProtocolView`. La
fiche de production conserve volontairement des entrées runtime nulles : elle
ne construit, ne persiste, n’active et ne transmet aucun protocole.

La chaîne de responsabilités est stricte :

```text
practitioner_reviewed
  → approved_for_diffusion (local C1, lié aux hashes)
  → transmitted (fait externe persistant, absent de C1)
```

Une revue ne vaut pas validation de diffusion. Une validation de diffusion ne
vaut pas transmission. Toute modification du protocole invalide la revue et
l’approbation antérieure.

## Contrat transmis à C2

C2 possède exclusivement :

- la construction serveur des objets C1 depuis un épisode confirmé ;
- la persistance versionnée et l’audit des transitions ;
- l’activation explicite d’un protocole ;
- le suivi J7/J14/J21 et les changements de statut ;
- la preuve de transmission, distincte de l’approbation.

C2 ne doit recalculer ni priorité ni charge. Il conserve les identifiants,
versions et hashes C1 et refuse une transition fondée sur une version périmée.
Aucune migration ou API C2 n’est ouverte par C1.

## Contrat transmis à C3

C3 consomme `PatientProtocolView` pour les documents patient. Il ne reçoit pas
les objets praticien bruts et ne doit pas reconstruire une vue patient par
suppression partielle de champs.

La composition documentaire peut adapter la présentation, jamais ajouter une
conclusion, une priorité, une action ou une charge. Les sorties médecin et
praticien exigent leurs propres projections d’audience versionnées.

## Gates avant activation ou diffusion

- branchement runtime serveur documenté et testé ;
- persistance et audit approuvés dans C2 ;
- preuve qu’une approbation correspond aux hashes courants ;
- projection d’audience testée ;
- aucun bloqueur de sécurité ou abstention non évaluée ;
- validation praticien explicite et transmission enregistrée séparément.

Jusqu’à satisfaction de ces gates, le verdict reste **NO-GO activation et
diffusion**, même si les contrats C1 obtiennent un GO technique.
