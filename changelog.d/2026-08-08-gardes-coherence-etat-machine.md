### Ajouté

- **Trois gardes de cohérence de l'état machine**, joués par T1 et par le CI
  (`scripts/wn-coherence-etat.test.mjs`, 14 cas dont 3 sur le dépôt réel) :
  `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` est confronté à `.wn/state.json`
  dont il dérive ; une validation ne peut plus se déclarer postérieure à la
  dernière écriture de l'état qui la porte ; le lot courant de l'état est
  confronté à `CAMPAGNE.md`. Les deux premiers sont exactement les défauts que
  la PR de clôture 5.0 avait laissé passer — vue régénérée avant sa source,
  date de validation invérifiée. Les trois ont été mutation-testés.
- `scripts/lib/vue-campagnes-actives.mjs` : le rendu de `ACTIVE_CAMPAIGN.md`,
  extrait de `scripts/wn-campaign.mjs` en fonction pure, pour qu'un banc puisse
  régénérer la vue attendue sans exécuter le CLI.

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
  jalon pour le gate HDS **et** pour le dossier RGPD, dont les quinze trous
  portent la même date.
