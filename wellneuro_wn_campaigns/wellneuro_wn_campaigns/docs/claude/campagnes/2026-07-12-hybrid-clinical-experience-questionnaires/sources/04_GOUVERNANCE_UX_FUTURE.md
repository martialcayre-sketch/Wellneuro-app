# Gouvernance UX — Innovations et implantations futures

## 1. Objectif

Éviter que chaque nouveau module réintroduise :

- des composants locaux incohérents ;
- des couleurs codées en dur ;
- des alignements approximatifs ;
- des tableaux non responsive ;
- des icônes hétérogènes ;
- des workflows déconnectés du patient ;
- des interactions modifiant silencieusement une mesure clinique ;
- des surfaces décoratives sans fonction ;
- des propositions IA non explicables ;
- des vues patient divergentes de la prévisualisation praticien.

Hybrid Clinical devient une contrainte d'architecture produit, pas une simple référence esthétique.

## 2. Règle directrice

Chaque écran doit aider à :

- comprendre ;
- décider ;
- agir.

Un élément qui ne remplit aucune de ces fonctions doit être retiré, regroupé ou relégué.

## 3. Fiche UX obligatoire avant tout nouveau module

Chaque innovation doit fournir :

```md
## Contrat UX
- Rôle : praticien | patient | partagé
- Problème utilisateur résolu :
- Action principale :
- Information prioritaire :
- Décision clinique concernée :
- Mode de couleur : Jour | Nuit | les deux | patient clair fixe
- Densité : faible | moyenne | experte
- Niveau de lecture : immédiat | expert | les deux
- Mobile : cartes | plein écran | bottom sheet | autre
- États : vide | chargement | succès | warning | erreur | indisponible
- Sauvegarde : locale | serveur | hybride | sans objet
- Données partagées avec le patient :
- Données réservées au praticien :
- Accessibilité : clavier, lecteur d'écran, zoom, reduced motion
- Données de démo : Sophie Nicola | Jennifer Martin | Michel Dogné
- Dépendance psychométrique : aucune | layout_only | stricte
- Source de décision : donnée | règle | IA | praticien | mixte
- Niveau de maturité : prototype | spécifié | livrable | différé
- Tests attendus :
```

Aucune page ne doit être implémentée sans ce contrat.

## 4. Primitives obligatoires

Les modules futurs doivent réutiliser les primitives communes :

- shell et navigation ;
- en-têtes de page ;
- cartes d'action ;
- cartes de décision ;
- états et alertes ;
- boutons ;
- champs et groupes de champs ;
- dialogs/drawers ;
- onglets ;
- tableaux responsive ;
- renderer questionnaire ;
- composants de score ;
- comparateur avant/maintenant ;
- timeline clinique ;
- prévisualisation patient ;
- statut de sauvegarde ;
- skeletons et empty states.

Une nouvelle primitive doit être justifiée par un besoin non couvert et documentée dans le design system.

## 5. Tokens

Interdit dans un nouveau composant :

- couleurs arbitraires `gray-*`, `blue-*`, `indigo-*` lorsque le token sémantique existe ;
- valeur hexadécimale locale pour un usage récurrent ;
- rayon, ombre ou espacement non conforme sans justification ;
- utilisation de `--primary` historique dans un nouveau composant.

Préférer :

- `background` ;
- `surface` ;
- `surface-elevated` ;
- `foreground` ;
- `muted-foreground` ;
- `border` ;
- `primary` ;
- `accent` ;
- `status-success/warning/danger/info` ;
- `focus-ring`.

## 6. Densité par rôle et contexte

### Praticien

- dashboard : synthétique ;
- annuaire : moyenne ou experte ;
- fiche patient : progressive ;
- mode consultation : calme ;
- configuration : experte ;
- détails techniques accessibles mais non dominants ;
- actions contextuelles ;
- tables autorisées sur desktop lorsqu'elles améliorent réellement la comparaison.

### Patient

- faible densité ;
- une action principale ;
- textes explicites ;
- cartes ou listes simples ;
- aucune exposition inutile de détails techniques ;
- aucune interaction cachée.

Éviter un réglage global compact/confortable générant des variantes difficiles à maintenir.

## 7. Double niveau de lecture

Les surfaces cliniques denses doivent prévoir :

### Lecture immédiate

- information prioritaire ;
- changement ;
- décision attendue ;
- vigilance ou donnée manquante.

### Lecture experte

- détail des scores ;
- réponses sources ;
- calculs ;
- qualité et limites ;
- historique ;
- références.

La lecture experte reste accessible sans dominer la première vue.

## 8. Intégration des futurs modules

### Biologie

- résumé actionnable avant tableau de résultats ;
- valeurs, unités, intervalles et dates toujours visibles ;
- couleur jamais seule ;
- distinction résultat, interprétation, hypothèse et action ;
- historique longitudinal lisible sans hover obligatoire ;
- comparaison avant/après uniquement si unités et conditions sont compatibles.

### Protocoles 21 jours

- phase courante dominante ;
- objectifs, actions, vigilance et suivi ;
- distinction proposition IA / validation praticien ;
- version patient simplifiée ;
- timeline progressive ;
- constructeur visuel avec alternative au drag-and-drop ;
- statuts proposé, validé et envoyé distincts.

### Compléments alimentaires

- filtres et contre-indications explicites ;
- clean label et compatibilités lisibles ;
- preuve et source séparées de la recommandation ;
- pas d'apparence e-commerce agressive ;
- validation praticien visible ;
- cartes répétables uniquement si elles améliorent la saisie ou la comparaison.

### Documents et booklets

- statut clair : brouillon, relu, validé, envoyé ;
- prévisualisation confortable ;
- action d'envoi protégée ;
- cohérence de la charte patient claire ;
- traçabilité des versions ;
- prévisualisation patient issue des mêmes contrats de rendu.

### Assistant IA

- intégré au contexte patient, pas comme gadget flottant omniprésent ;
- sources et limites visibles ;
- action proposée mais jamais exécutée sans validation ;
- différence claire entre donnée, synthèse, hypothèse et recommandation ;
- niveau de confiance et données manquantes affichés lorsque pertinents.

## 9. Capacités UX avancées

### Mode consultation

- composition focalisée des données existantes ;
- aucune duplication du dossier ;
- entrée et sortie explicites ;
- tablette prioritaire ;
- aucune captation implicite.

### Timeline clinique

- uniquement à partir d'événements réels ;
- type événement/décision/résultat ;
- date ou période ;
- filtres accessibles ;
- regroupement des événements secondaires.

### Carte de décision

- proposition ;
- justification ;
- données contributives ;
- confiance ;
- limites ;
- données manquantes ;
- origine ;
- validation humaine.

### Comparateur avant / maintenant

- dates et contexte ;
- unité ou échelle ;
- comparabilité ;
- évolution textuelle et visuelle ;
- cas non comparable explicitement géré.

### Prévisualisation patient

- frontière de données explicite ;
- même contrat de rendu que le portail ;
- mobile testé ;
- aucune note interne.

### Palette de commandes

- complément à la navigation ;
- droits réels ;
- aucune action destructive directe ;
- aucune donnée sensible dans un historique local.

## 10. Nouvelles interactions

Avant d'introduire : drag-and-drop, slider, canvas, carte corporelle, assistant conversationnel ou visualisation complexe, vérifier :

- alternative clavier ;
- alternative textuelle ;
- usage mobile ;
- impact sur la donnée ;
- maintien de la valeur clinique ;
- compréhension sans tutoriel ;
- absence de manipulation ou de biais visuel.

## 11. États, erreurs et réversibilité

- distinguer `Enregistrer`, `Valider`, `Envoyer` ;
- afficher le statut brouillon ;
- protéger les actions irréversibles ;
- permettre l'annulation lorsqu'elle est sûre ;
- expliquer les états vides ;
- préciser ce qui est conservé en cas d'erreur ;
- ne jamais afficher une réussite avant confirmation réelle.

## 12. Langage et lexique

Maintenir un lexique UX séparant :

- vocabulaire praticien ;
- vocabulaire patient ;
- statuts ;
- messages d'erreur ;
- confirmations ;
- termes à éviter.

Côté patient, préférer des formulations compréhensibles : `réponses transmises`, `reprendre`, `préparation de votre bilan`, `conservé sur cet appareil`.

## 13. Motion

Autoriser uniquement :

- ouverture/fermeture ;
- déplacement explicite ;
- confirmation de sauvegarde ;
- changement de statut ;
- progression.

Interdire les animations décoratives permanentes. Respecter `prefers-reduced-motion`.

## 14. Revue UX obligatoire

Chaque lot UI doit produire :

- captures 375, 768, 1024 et 1440 px ;
- mode Jour et Nuit si praticien ;
- thème patient clair si concerné ;
- mesure des alignements clés ;
- parcours clavier ;
- états loading/empty/error ;
- audit de texte français ;
- vérification patients fictifs ;
- absence de débordement horizontal ;
- liste des dépendances ajoutées ;
- vérification des frontières praticien/patient ;
- vérification des dates et comparabilité pour les vues longitudinales.

## 15. Dette et exceptions

Toute exception doit être inscrite dans le lot avec :

- raison ;
- impact ;
- périmètre ;
- date ou condition de réexamen ;
- propriétaire ou campagne de reprise.

Une exception non documentée est une régression.

## 16. Validation de conception

Avant code, privilégier :

- artefact HTML autonome ;
- wireframe ;
- prototype de composant isolé ;
- capture comparative Jour/Nuit/mobile ;
- test avec données fictives autorisées.

Après validation, transposer dans les composants React existants avec changements minimaux.

## 17. Checklist de merge

- [ ] Contrat UX présent.
- [ ] Niveau de maturité déclaré.
- [ ] Primitive existante réutilisée ou nouvelle primitive justifiée.
- [ ] Tokens sémantiques utilisés.
- [ ] Modes et rôles testés.
- [ ] Mobile utilisable sans hover.
- [ ] Focus visible.
- [ ] Aucun patient réel.
- [ ] Aucun secret.
- [ ] Aucun changement clinique non documenté.
- [ ] Frontière praticien/patient vérifiée.
- [ ] Sauvegarde et transmission correctement libellées.
- [ ] Comparabilité vérifiée si vue avant/après.
- [ ] Validation humaine préservée.
- [ ] Tests et captures joints au handoff.
- [ ] Documentation canonique mise à jour.
