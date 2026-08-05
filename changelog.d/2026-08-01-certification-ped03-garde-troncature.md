### Certification — la lecture croisée du banc savait échouer, pas le dire

- **`Q_PED_03` (Conners 3, parent) rejoué au banc, et le croisement a eu lieu** :
  108 items lus par les deux lectures indépendantes, **0 divergence critique**.
  L'instrument était fermé depuis le 2026-07-30 sur un motif purement technique
  — « lecture croisée échouée, sortie tronquée aux positions 8503 puis 11715 ».
- **La cause n'était pas la taille du questionnaire**, contrairement à ce que le
  registre supposait. Deux défauts du banc se composaient : la lecture GPT
  plafonnait à `max_output_tokens: 8192` quand la lecture Claude disposait de
  32000 — et sur l'API Responses, les jetons de raisonnement sont décomptés de ce
  même plafond ; surtout, elle ne portait **aucune garde de troncature** là où la
  lecture Claude contrôlait `stop_reason` depuis toujours. Une réponse coupée
  partait donc au `JSON.parse`, qui échouait à l'offset où le texte s'arrêtait :
  « position 8503 » était un décalage de caractère, pas un diagnostic. Le banc
  rapportait « aucun objet JSON » là où la vérité était « réponse coupée ».
- **Garde symétrique posée** (`tools/corpus/certify/lib/troncature.mjs`) : les
  deux lecteurs contrôlent désormais leur propre signal de troncature — `stop_reason`
  côté Messages, `status: 'incomplete'` et `incomplete_details.reason` côté
  Responses, qui n'expose pas de `finish_reason`. Le message d'erreur nomme le
  lecteur et la cause, jamais le symptôme.
- **Le garde est testé dans les deux sens, pour les deux lecteurs** — y compris
  le cas où `incomplete_details` est absent, où il doit mordre sans planter. La
  forme réelle de la réponse tronquée a été vérifiée contre l'API avant d'être
  écrite, et non déduite. Le contrôle côté Responses est une liste blanche :
  `failed` et `cancelled` sont refusés comme `incomplete`, faute de quoi leur
  `output_text` vide ressortirait lui aussi en « aucun objet JSON ».
- **Le câblage du garde est sous test, et pas seulement le garde** — retirer
  l'appel dans `certify.mjs` laissait les cas du garde verts pendant que le banc
  rejouait le faux diagnostic. Un banc dédié vérifie que le contrôle précède le
  parse, dans les deux lectures, et que les deux plafonds restent égaux.
- **Les bancs de `tools/corpus/certify/lib/` sont désormais exécutés en entier**,
  en CI comme dans `npm run check` — le pas de CI nommait un seul fichier, si
  bien qu'un banc ajouté à côté n'aurait jamais tourné. Ils passent par
  `scripts/run-certify-bancs.sh`, qui **échoue si aucun banc n'est trouvé** :
  sous `bash` et `sh`, un motif sans correspondance rend `# tests 0` avec un code
  de retour 0 — on aurait troqué « oublier de brancher un banc » contre « n'en
  exécuter aucun, en silence ».

`Q_PED_03` **reste `suspendu`** : le motif technique est levé, le motif clinique
s'ouvre. Les deux lectures confirment qu'aucun seuil de la source n'est
représenté dans le servi — 19 seuils lus d'un côté, 34 de l'autre, zéro servi,
et aucune bande d'interprétation — et l'une des deux relève quatre dimensions à
la source contre zéro au servi. Le servi est une somme brute des 108 items que
la source ne demande nulle part, et deux de ces quatre dimensions sont des
échelles de validité, qui qualifient la passation avant tout score. La
réactivation reste une décision praticien.
