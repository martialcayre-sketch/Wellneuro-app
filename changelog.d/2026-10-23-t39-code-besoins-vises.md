### t39, code : les besoins visés d'une priorité libre, lus par la re-passation ciblée seule (D-338 §3, amende D-279 §1, H84, 2026-10-23)

- Cockpit, « Priorité retenue », priorité posée : douze cases « Besoins
  visés (facultatif) », sous les libellés praticien des besoins ; pour un
  besoin sans questionnaire à re-passer, la case le dit (« Aucun
  questionnaire à re-passer pour ce besoin. »), d'après le calcul même de la
  re-passation (arbitrage du responsable du 2026-10-22). La priorité retenue
  relit ses besoins visés, avec la même mention ; la changer les reprend
  cochés. L'écran prévient avant le geste : les modifier après la diffusion,
  comme modifier le motif, oblige à diffuser de nouveau le protocole.
- `POST /api/praticien/cockpit/priorite` : `prioriteLibre.besoinsVises`
  facultatif, rangé, refusé en 422 (`besoins_invalides`) hors des douze,
  doublé ou non entier ; écrit dans `besoins_vises` (`{}` sans besoin visé,
  rien sur un candidat du moteur). L'identifiant `libre:` est inchangé.
- Carte de décision : `selectedMainPriority.libre.besoinsVises`, clé absente
  sans besoin visé — l'empreinte d'aucune carte déjà ancrée ne bouge ;
  `buildDecisionCard` refuse une liste vide, non rangée, doublée ou hors des
  douze. Corriger les seuls besoins visés chaîne sur la même priorité, sans
  pivot, mais écrit une nouvelle sélection : la carte diffusée dérive et le
  portail rend le protocole indisponible jusqu'à une nouvelle diffusion,
  comme pour un motif corrigé — effet accepté par le responsable le
  2026-10-23, inhérent au fil en ajout seul.
- Re-passation ciblée : une priorité posée cible les questionnaires des
  besoins visés, par un canal distinct des `needIds` signés, et le bloc dit
  « Instruments des besoins que vous avez visés en posant la priorité. ». Ni
  la hiérarchie des assiettes, ni les règles, ni le score, ni le contenu du
  protocole ne les lisent ; ils n'agissent sur le portail que par l'empreinte
  de la carte (ci-dessus).
- Aucune migration (colonne livrée par #1652, constatée en production le
  2026-10-23) ; aucune table signée, aucun seuil, aucune version de score ni
  de carte touchés.
