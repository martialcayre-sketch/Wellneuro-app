### Fiche d'assiette : la lecture et la décision du responsable, côté serveur (2026-09-27)

- **Lot 6a de `D-251`.** Trois routes praticien, sans drapeau : le drapeau
  garde l'émission vers le patient, pas la relecture (§7).
  - `GET /api/praticien/fiches-assiette` : les douze assiettes d'indication et
    l'état de leur fiche.
    - « Absente » et « statut illisible » sont deux états distincts.
    - Aucun des deux ne se lit « non validée » (`DC-24`).
  - `GET /api/praticien/fiches-assiette/version?id=` : une version pour la
    relecture côte à côte.
    - Elle rend le texte source, le contenu adapté, le texte de chaque claim
      cité et de chaque réserve attendue.
    - Les contrôles sont **rejoués à la lecture**.
  - `POST /api/praticien/fiches-assiette/actes` : valider ou retirer une
    version.
- **L'acte porte sur ce que l'écran a montré.** Il transmet l'empreinte du
  contenu vu et le jeton du dernier acte vu. Sous un verrou par fiche, rien
  n'est écrit si l'un ou l'autre a bougé.
  - Valider exige la déclaration de relecture intégrale (strictement `true`),
    et rejoue le contrat, l'empreinte, l'appariement, les claims VALIDE et les
    contrôles avec les réserves de sécurité du moment.
  - Valider une version plus ancienne qu'une version validée est refusé.
  - Retirer exige un motif et ne contrôle rien : c'est le coupe-circuit, il
    reste un geste rapide.
- **L'état d'une version est son dernier acte au sens d'`ordre`.** Un acte
  inconnu ou une empreinte divergente rend l'état **illisible**, jamais « à
  valider ».
- **Seule la décision crée un acte.** La garde `catalogue.guard.test.ts` s'ouvre
  à `decision.ts` seul, et exige que dépôt et décision ne s'importent pas l'un
  l'autre (`DC-16`). Les contrôles partagés vivent dans des modules neutres
  (`controle.ts`, `claimsCites.ts`).
- Aucun texte de fiche dans les journaux ni dans une réponse d'erreur.
