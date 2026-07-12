# Gouvernance UX — Innovations et implantations futures

## 1. Objectif

Éviter que chaque nouveau module réintroduise :

- des composants locaux incohérents ;
- des couleurs codées en dur ;
- des alignements approximatifs ;
- des tableaux non responsive ;
- des icônes hétérogènes ;
- des workflows déconnectés du patient ;
- des interactions modifiant silencieusement une mesure clinique.

Hybrid Clinical devient une contrainte d'architecture produit, pas une simple référence esthétique.

## 2. Fiche UX obligatoire avant tout nouveau module

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
- Mobile : cartes | plein écran | bottom sheet | autre
- États : vide | chargement | succès | warning | erreur | indisponible
- Accessibilité : clavier, lecteur d'écran, zoom, reduced motion
- Données de démo : Sophie Nicola | Jennifer Martin | Michel Dogné
- Dépendance psychométrique : aucune | layout_only | stricte
- Tests attendus :
```

Aucune page ne doit être implémentée sans ce contrat.

## 3. Primitives obligatoires

Les modules futurs doivent réutiliser les primitives communes :

- shell et navigation ;
- en-têtes de page ;
- cartes d'action ;
- états et alertes ;
- boutons ;
- champs et groupes de champs ;
- dialogs/drawers ;
- onglets ;
- tableaux responsive ;
- renderer questionnaire ;
- composants de score ;
- skeletons et empty states.

Une nouvelle primitive doit être justifiée par un besoin non couvert et documentée dans le design system.

## 4. Tokens

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

## 5. Densité par rôle

### Praticien

- densité moyenne ou experte ;
- progressive disclosure ;
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

## 6. Intégration des futurs modules

### Biologie

- résumé actionnable avant tableau de résultats ;
- valeurs, unités, intervalles et dates toujours visibles ;
- couleur jamais seule ;
- distinction résultat, interprétation, hypothèse et action ;
- historique longitudinal lisible sans hover obligatoire.

### Protocoles 21 jours

- phase courante dominante ;
- objectifs, actions, vigilance et suivi ;
- distinction proposition IA / validation praticien ;
- version patient simplifiée ;
- timeline progressive.

### Compléments alimentaires

- filtres et contre-indications explicites ;
- clean label et compatibilités lisibles ;
- preuve et source séparées de la recommandation ;
- pas d'apparence e-commerce agressive ;
- validation praticien visible.

### Documents et booklets

- statut clair : brouillon, relu, validé, envoyé ;
- prévisualisation confortable ;
- action d'envoi protégée ;
- cohérence de la charte patient claire ;
- traçabilité des versions.

### Assistant IA

- intégré au contexte patient, pas comme gadget flottant omniprésent ;
- sources et limites visibles ;
- action proposée mais jamais exécutée sans validation ;
- différence claire entre donnée, synthèse, hypothèse et recommandation.

## 7. Nouvelles interactions

Avant d'introduire : drag-and-drop, slider, canvas, carte corporelle, assistant conversationnel ou visualisation complexe, vérifier :

- alternative clavier ;
- alternative textuelle ;
- usage mobile ;
- impact sur la donnée ;
- maintien de la valeur clinique ;
- compréhension sans tutoriel ;
- absence de manipulation ou de biais visuel.

## 8. Revue UX obligatoire

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
- liste des dépendances ajoutées.

## 9. Dette et exceptions

Toute exception doit être inscrite dans le lot avec :

- raison ;
- impact ;
- périmètre ;
- date ou condition de réexamen ;
- propriétaire ou campagne de reprise.

Une exception non documentée est une régression.

## 10. Validation de conception

Avant code, privilégier :

- artefact HTML autonome ;
- wireframe ;
- prototype de composant isolé ;
- capture comparative Jour/Nuit/mobile ;
- test avec données fictives autorisées.

Après validation, transposer dans les composants React existants avec changements minimaux.

## 11. Checklist de merge

- [ ] Contrat UX présent.
- [ ] Primitive existante réutilisée ou nouvelle primitive justifiée.
- [ ] Tokens sémantiques utilisés.
- [ ] Modes et rôles testés.
- [ ] Mobile utilisable sans hover.
- [ ] Focus visible.
- [ ] Aucun patient réel.
- [ ] Aucun secret.
- [ ] Aucun changement clinique non documenté.
- [ ] Tests et captures joints au handoff.
- [ ] Documentation canonique mise à jour.
