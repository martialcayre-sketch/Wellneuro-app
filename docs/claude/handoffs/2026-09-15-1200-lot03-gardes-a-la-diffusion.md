# Handoff — 2026-09-15 — LOT-03 (2/2) : les gardes de la carte à la diffusion

Seconde et dernière PR du LOT-03. Elle applique le deuxième des trois arbitrages du
matin : **porter à la diffusion les gardes que la carte portait**.

## Le constat

`buildPatientProtocolView` refuse depuis toujours une décision **sous abstention
requise** et une décision **portant un constat de sécurité**. Ces deux refus n'ont
mordu **nulle part** : le contrat n'avait aucun appelant de production avant `D-191`,
et la route d'approbation pour diffusion **n'a jamais construit de carte** — elle
recopie `version.decisionCardInputHash` depuis la ligne du brouillon et signe.

Le producteur de constats de sécurité est pourtant **alimenté** depuis `D-099` :
signaux d'alerte de l'anamnèse et signalements d'effet indésirable du patient. Le
chemin n'était pas théorique ; c'est sa porte qui manquait.

## Branche et état Git

- Branche `lot03-gardes-diffusion`, partie d'`origin/main` à `66c82f85` (la PR 1 du
  LOT-03, mergée ce matin).

## Ce qui est livré

- **Le rejeu de la carte à l'approbation**, par `rejouerCarteDecision` — la MÊME
  fonction que le chemin patient, sur l'épisode et l'empreinte de **la version
  approuvée**. Un protocole approuvé est donc un protocole que le portail saura
  servir.
- **Trois refus en `409`** : `abstention_requise`, `constat_securite`,
  `carte_non_rejouable`, chacun avec son message français.
- **Le message part à l'écran sans code neuf** : `approveForDiffusion` rend déjà
  `payload.error` tel quel. Un banc l'assertionne plutôt que de s'y fier.
- **Le nombre de constats, jamais les constats** : l'écran de décision les porte
  déjà, et les recopier ferait de cette route une seconde restitution clinique,
  absente de la carte des chemins sortants.

## Vérifications

- T1 vert. T2 rapide : **198 verts**, aucun rouge — pas même la signature `D-049`.
- Quatre bancs neufs sur la route. **Deux mutations vues ROUGES** avant de déclarer
  vert (garde d'abstention neutralisée, garde de constat neutralisée), restaurées
  depuis une copie.
- Aucune migration, aucun drapeau, aucune identité patient.

## Ce qui reste à la campagne

- **LOT-04 (2/2)** — la citation, en **constat à la lecture** (arbitrage du
  2026-09-15). Aucune colonne, aucun contrat V5 : le serveur relit les sources et
  compare, et la marque tombe au premier caractère réécrit par construction.
- **LOT-06** — le barème de charge. Le mécanisme est prêt ; il **attend la première
  ligne signée du praticien** et ne partira pas sans elle.
- **LOT-07** — le bilan. Sa mesure au conteneur sur dossiers réels reste à faire :
  la lecture de production a été refusée par le classifieur de sécurité de la
  session, et n'a pas été contournée.

Voir [[D-192]].
