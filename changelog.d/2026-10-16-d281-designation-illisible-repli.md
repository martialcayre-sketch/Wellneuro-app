### Sécurité : une désignation illisible au dépôt se replie sur le programme diffusé (D-281 §5, sans migration, 2026-10-16)

- **Le trou** : au dépôt d'un signalement d'effet indésirable, quand la
  lecture de la désignation échouait (âge du patient ou programme diffusé
  illisible), ou que le programme diffusé ne passait pas le contrôle
  d'intégrité, le signalement était enregistré sans programme ni
  rattachement. Il ne recevait alors aucun avis et ne bloquait aucune
  diffusion, même si le patient avait désigné un élément. Il sortait aussi
  des compteurs (panneau, Fil du jour, prévol) dès qu'on le passait à
  « traité ».
- **Le repli** (arbitrage du responsable du 2026-10-16) : le programme
  diffusé est relu seul, et le signalement le vise sans rattachement, comme
  le formulaire d'avant. Il attend l'avis du praticien, qui désigne
  l'élément en cause ou aucun. Si le programme lui-même ne passe pas le
  contrôle d'intégrité, le praticien ne peut répondre que « aucun » : la
  question est routée au plan (§8). Il bloque la diffusion, mais cette garde reste
  inerte jusqu'à la signature. Il est compté au panneau, au Fil et au prévol
  jusqu'à l'avis, dès le déploiement. Le choix du patient (élément, « Je ne
  sais pas », « un autre produit ») n'est pas conservé. Si cette seconde
  lecture échoue aussi, le signalement est capturé sans programme, comme
  avant : il n'est jamais perdu.
- **Écarté** : refuser le dépôt (le patient peut abandonner, et le praticien
  n'est pas averti) ; un indicateur « désignation non résolue » en base
  (migration).
- Route `POST /api/portail/trust/signalement` seule ; aucune migration, et
  `schema.prisma` inchangé. La règle `SAF-EI-01` reste non armée.
