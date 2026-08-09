### Ajouté

- **Trois gardes de cohérence de l'état machine**, joués par T1 et par le CI
  (`scripts/wn-coherence-etat.test.mjs`, 24 cas dont 3 sur le dépôt réel ; étape
  dédiée dans `.github/workflows/ci.yml`, qui embarque au passage le banc
  `wn-etat-reel.test.mjs`, présent dans `npm run check` mais absent du workflow
  depuis sa création) : `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` est confronté
  à `.wn/state.json` dont il dérive ; une validation ne peut plus se déclarer
  postérieure à la dernière écriture de l'état qui la porte ; le lot courant de
  l'état est confronté à `CAMPAGNE.md` (campagne **primaire** seulement — les
  entrées parallèles ne sont pas confrontées, et c'est écrit dans le code). Les
  deux premiers sont exactement les défauts que la PR de clôture 5.0 avait
  laissé passer — vue régénérée avant sa source, date de validation invérifiée.
  Les trois sont mutation-testés, y compris leur **branchement** dans le
  rapporteur et pas seulement leur logique.
- `scripts/lib/vue-campagnes-actives.mjs` : le rendu de `ACTIVE_CAMPAIGN.md`,
  extrait de `scripts/wn-campaign.mjs` en fonction pure, pour qu'un banc puisse
  régénérer la vue attendue sans exécuter le CLI.
- `scripts/lib/campagnes-sur-disque.mjs` : la lecture des `CAMPAGNE.md`, extraite
  du même script. Le garde et l'écrivain de la vue lisent désormais par le même
  chemin — deux lecteurs distincts auraient fait rougir le garde sur un fichier
  correctement généré, en conseillant une resynchronisation sans effet.

### Modifié

- `scripts/wn-etat-reel.mjs` confronte **trois** dimensions au lieu d'une, et
  son résumé annonce désormais « 6 dimensions observées, 3 confrontées » — le
  raccourci « 6 observées, 0 écart » se lisait comme un état sain alors qu'une
  seule dimension était comparée. Le CLI reste un observateur : il sort 0 même
  avec des écarts, le verdict qui bloque est celui du banc.

### Documentation

- Campagne `2026-08-08-dettes-ouvertes-5-0` cadrée : les trois dettes laissées
  ouvertes par la déclaration 5.0 (état réel, deux parcours patients, double
  source des packs), plus le badge « Certifié » de l'UI praticien qui n'emporte
  pas la définition posée par D-034. L'échéance du 2026-10-21 y est portée comme
  jalon pour le gate HDS **et** pour le dossier RGPD, dont la plupart des trous
  portent la même date — pas tous (tableau §14 ; amendé le 2026-08-09, D-037 en
  a ajouté un à échéance « réponse Scalingo »).
