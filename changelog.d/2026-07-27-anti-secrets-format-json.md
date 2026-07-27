### Sécurité

- **Le contrôle anti-secrets voit désormais une clé privée au format JSON, et le
  dossier `secrets/` est ignoré.** Deux défauts indépendants qui se
  recouvraient : pris ensemble, ils rendaient possible l'entrée d'une clé privée
  de compte de service Google dans l'historique du dépôt, sans qu'aucun garde
  ne s'y oppose.
  1. `secrets/wn-drive-sa.json` (clé de service Drive) et `secrets/ca.pem`
     n'étaient couverts par **aucune règle** de `.gitignore` — `client_secret*.json`
     ne correspond ni à l'un ni à l'autre. Les fichiers n'ont jamais été
     committés (historique vérifié sur toutes les branches), mais un seul
     `git add -A` suffisait.
  2. `scripts/check_no_secrets.sh` ne les aurait pas rattrapés **dans aucun de
     ses deux modes**. Ses motifs exigeaient que le séparateur suive
     l'identifiant directement (`private_key[[:space:]]*[:=]`), alors qu'un JSON
     écrit `"private_key":` — le guillemet fermant s'intercale. Sur un fichier
     de compte de service, `npm run check` répondait « OK: aucun secret évident
     dans les lignes indexées ».
  Les motifs admettent maintenant les guillemets de part et d'autre du
  séparateur. Une variante plus permissive attrapait autant, mais a été écartée
  par la mesure : **11 faux positifs** sur le dépôt, tous dans de la prose
  documentaire citant des noms de variables. Celle retenue en produit **zéro**.
  `OPENAI_API_KEY` et `RAG_INTERNAL_SECRET` — les deux clés que manipule la
  chaîne corpus — rejoignent la liste, sans faux positif elles non plus.
- **Le contrôle ne rend plus le secret qu'il détecte, seulement son
  emplacement.** C'est le défaut le plus grave des trois, et l'élargissement des
  motifs ci-dessus le rendait atteignable pour la première fois : un `grep -n`
  nu imprimait la ligne trouvée, c'est-à-dire, sur un compte de service, la clé
  privée entière — dans le terminal, donc dans un journal de session, donc à un
  copier-coller de l'historique. Le dépôt écrivait déjà la règle contraire dans
  `docs/gouvernance-questionnaires-scoring.md` : signaler le fichier « sans
  exposer le secret dans les journaux ou commits ». Le contrôle la violait dès
  qu'il fonctionnait. Il rend désormais `fichier:ligne` en mode complet, le nom
  du fichier en mode indexé, et rien d'autre.
- **Un banc verrouille le contrôle** (`scripts/check_no_secrets.test.mjs`,
  9 cas plus 5 `todo`), en CI **et dans le palier T1** — `npm run check` le
  lance, par cohérence avec `registry-check` et `certify-check` : un palier qui
  ne couvre pas ce que le CI vérifie ne protège de rien.
  Il monte un dépôt jetable, y dépose un faux compte de service, vérifie le
  refus dans les deux modes, **et qu'aucune sortie ne contient le corps de la
  clé**. Deux contrôles négatifs le gardent honnête : un dépôt sain doit être
  accepté, et une ligne de prose documentaire citant plusieurs noms de variables
  aussi — sans ce second cas, le banc ne verrouillerait que la sensibilité du
  contrôle, jamais sa spécificité, et un motif redevenu trop large passerait au
  vert.
  Falsifié par quatre mutations, chacune attrapée par la garde qui la vise :
  motifs d'origine (5 échecs), séparateur permissif (le cas de prose seul),
  détection réimprimant la ligne (les deux cas de non-fuite), mode indexé
  aveugle (les deux cas indexés). Le cas de prose tient sur **une seule ligne
  longue**, comme dans le fichier réel : `grep` travaillant ligne par ligne,
  répartir la phrase détruisait la propriété même qu'il éprouve.
  Les fragments sensibles du banc sont assemblés par concaténation plutôt que
  d'exclure le fichier du scan : une exclusion créerait l'angle mort qu'on vient
  de fermer.
- **Ce que le contrôle ne couvre toujours pas**, écrit dans le script pour que
  son titre ne se lise pas comme une promesse : une clé privée sans identifiant
  devant (`.pem`, `.p12`, clé SSH nue), un JSON échappé dans du JSON ou un
  compte de service encodé en base64, une URL de connexion portant un mot de
  passe, un jeton porteur, une valeur séparée de son identifiant autrement que
  par `:` ou `=`. Et `GOOGLE_CLIENT_SECRET` en majuscules : le motif est
  sensible à la casse, et lui ajouter `-i` remonterait **8 correspondances,
  toutes des valeurs factices** (`ci-placeholder`, `secret-de-test-non-production`)
  — 28 pour `NEXTAUTH_SECRET`, mêmes placeholders. Un contrôle qui échoue
  toujours finit désactivé ; distinguer une valeur factice d'une vraie n'est pas
  à la portée d'un motif. Suivi à part. Ce contrôle attrape les formes courantes
  d'un secret **nommé** ; il n'est pas un scanner de secrets.
- **Asymétrie relevée au passage, non corrigée ici.** Les deux modes n'inspectent
  pas le même ensemble : le mode complet s'exclut lui-même par nom de fichier,
  le mode `--staged` n'exclut que `package-lock.json` et les `*.lock`. Le mode
  indexé est donc plus strict — il a d'ailleurs attrapé un commentaire de ce
  correctif qui citait la forme JSON en toutes lettres. Aligner les deux
  listes reviendrait à *élargir* un angle mort ; laissé tel quel, à dessein.
- **Constat de méthode, à connaître.** `grep` n'est pas `grep` : le shell
  interactif du Mac résout une fonction vers **ugrep**, le script lancé utilise
  **BSD grep**, et le CI **GNU grep**. Une mesure prise au clavier ne dit donc
  pas ce que fait le garde. C'est une raison de plus d'avoir un banc : il
  exécute le script réel, dans l'environnement réel.
