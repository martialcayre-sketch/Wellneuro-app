### PA-2 : l'e-mail de diffusion du protocole, sous drapeau éteint, et le plafond de 24 heures (D-317, 2026-10-17)

- **E-mail du protocole** : au clic « Valider pour diffusion » d'une version
  jamais diffusée sur la décision et que le portail servira, un e-mail neutre
  « Votre protocole vous attend » (gabarit `protocole_diffuse`, type de
  correspondance du même nom), réservé dans la transaction du clic et envoyé
  après le commit, réponse au praticien. Il remplace l'e-mail `document_remis`
  du même clic. Derrière `WN_ANNONCE_PROTOCOLE`, éteint, effectif seulement
  gabarit validé et `WN_FICHES_ASSIETTE` ouvert.
- **Gabarit** : texte proposé au registre, **non validé** (`valideLe` nul) —
  il se relit mot pour mot avant sa validation ; tant qu'il ne l'est pas, le
  drapeau n'ouvre rien.
- **Plafond** (actif dès le déploiement) : au plus un e-mail d'annonce de
  diffusion par dossier et par 24 heures, `document_remis` et
  `protocole_diffuse` confondus, sous verrou par dossier ; un envoi retenu est
  tracé `Non_envoye` sous son motif et dit à l'écran.
- **Écran** : la sous-vue Diffusion annonce l'e-mail du protocole avant le
  clic, tait alors l'annonce des fiches et du courrier, et dit le sort après.
- `docs/FEATURE_FLAGS.md` (`WN_ANNONCE_PROTOCOLE`), `docs/DOSSIER_RGPD.md`
  (annonce de diffusion déclarée avant activation).
- Aucune migration, aucune règle clinique, aucun seuil.
