# Check-list information patient — à rejouer à chaque évolution TRUST

> Utilisable par le praticien ou en revue de PR. Si une case ne tient plus,
> la modification n'est pas conforme au cadre TRUST.

## Contenus

- [ ] Toute modification de texte normatif = **nouvelle version** au registre
      (le test de hash casse sinon) avec `changeLevel` et résumé du changement.
- [ ] Un changement substantiel (`information_substantielle`,
      `nouvelle_finalite_facultative`, `evenement_securite`) redemande un
      accusé (`requiresAcknowledgement`) ; un changement éditorial non.
- [ ] Aucune formulation ne promet ce que l'architecture ne fait pas
      (surveillance, réponse rapide, effacement absolu, HDS).
- [ ] Lexique : jamais « ordonnance », « prescription », « diagnostic » (hors
      négations), « NeuroScore ».
- [ ] Les inconnues sont dites honnêtement, jamais masquées par une phrase
      générique.

## Parcours

- [ ] « J'ai pris connaissance » reste distinct de « J'autorise ».
- [ ] Aucun choix précoché ; refuser ne bloque jamais l'accompagnement.
- [ ] Le retrait reste aussi simple que l'accord.
- [ ] La séquence « Avant de commencer » ne bloque jamais la consultation
      des réponses existantes (dégradation gracieuse).
- [ ] Le centre reste accessible de toutes les pages (pied de page).

## Données

- [ ] Événements append-only : jamais d'UPDATE/DELETE sur accusés et choix.
- [ ] Version + hash du document présentés résolus **côté serveur**.
- [ ] Notifications externes génériques (zéro donnée sensible).
- [ ] DTO patient explicites, jamais de sérialisation implicite.

## IA

- [ ] Aucun contenu IA diffusé sans validation praticien bloquante.
- [ ] L'information patient reflète exactement l'architecture réelle
      (fournisseur, usage, traces modèle/version).
- [ ] Badge/mention jamais faux : « validé » exige une trace.
