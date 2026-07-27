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
  Les cinq motifs admettent maintenant les guillemets de part et d'autre du
  séparateur. Une variante plus permissive attrapait autant, mais a été écartée
  par la mesure : **11 faux positifs** sur le dépôt, tous dans de la prose
  documentaire citant des noms de variables. Celle retenue en produit **zéro**.
- **Un banc CI verrouille le contrôle** (`scripts/check_no_secrets.test.mjs`,
  6 cas). Il monte un dépôt jetable, y dépose un faux compte de service, et
  vérifie le refus dans les deux modes — plus un contrôle négatif, sans lequel
  un script qui refuserait *tout* passerait au vert. Falsifié : contre les
  motifs d'avant, le banc échoue sur les trois formes JSON et reste vert sur la
  forme historique `CLE=valeur`. La correction ne peut plus se reperdre en
  silence.
  Les fragments sensibles du banc sont assemblés par concaténation plutôt que
  d'exclure le fichier du scan : une exclusion créerait l'angle mort qu'on vient
  de fermer.
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
