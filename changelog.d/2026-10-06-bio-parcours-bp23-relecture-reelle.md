### Protocole : la relecture cesse d'être un tampon — BIO-PARCOURS BP-23, exécution de `D-213` §1 (2026-10-06)

- **Pourquoi.** La route des versions posait `review: content_reviewed` à
  chaque enregistrement, coche ou non : « relu par le praticien » ne prouvait
  rien. Arbitrages du responsable du 2026-10-06, précision datée de `D-213` §1.
- **Route** (`protocoles/versions`). `review` n'est posé que si la soumission
  porte `reviewed === true` (booléen strict) ; sinon la version naît
  brouillon (`draft`) et la validation pour diffusion la refuse
  (`not_reviewed`). Contenu identique ⇒ aucune écriture, sauf brouillon actif
  + coche vraie : une version relue naît, chaînée au brouillon. Décocher sur
  un contenu déjà relu ne le rétrograde pas.
- **Refus explicites.** Un enregistrement sans action est refusé
  (400 `draft_invalid`) ; une référence Boussole V1/V2 sans coche est refusée
  avec un message, au lieu d'une erreur interne.
- **Écran.** Coche « J'ai relu ce contenu » à côté d'« Enregistrer la
  version », décochée par défaut et remise à faux à chaque frappe. La révision
  après arbitrages biologiques porte sa propre coche « J'ai relu le protocole
  révisé » ; son bouton reste inactif tant qu'elle n'est pas posée.
- **Diffusion.** Une validation devenue caduque sur une version active
  brouillon ne propose plus « Re-valider » (le clic ne faisait rien) : le
  panneau dit le geste dû, relire puis enregistrer. Le panneau d'arbitrage se
  remonte à chaque nouvelle version active, sa coche avec lui (revue
  wn-reviewer). Une coche tombe aussi quand ce qui sera soumis change sans
  frappe : nouvel arbitrage consigné (panneau), orientation de la carte qui
  bascule (constructeur) — revue Copilot.
- **Bascule.** Les versions enregistrées avant ce lot gardent leur tampon
  (append-only) : une version datée d'avant le déploiement de ce lot ne
  prouve pas une relecture.
- Bancs : `route.test.ts` (huit cas `relecture réelle (BP-23)`, mutations
  vues rouges : tampon inconditionnel ⇒ 4, exception du no-op retirée ⇒ 1) ;
  refus V2 sans coche ; `ProtocolMiniBuilder.test.tsx` ;
  `ArbitrageBiologiquePanel.test.tsx` ; `ProtocolDiffusionPanel.test.tsx` ;
  `protocole-constructeur.spec.ts` (coche décochée par défaut, puis posée).
