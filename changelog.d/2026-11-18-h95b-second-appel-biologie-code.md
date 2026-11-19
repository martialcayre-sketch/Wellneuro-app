### Synthèse IA : la biologie restituée au praticien par un second appel, qui ne reçoit qu'elle ; consigne `synthese-v37`, textes v24, v9, conditions v7 et dossier RGPD publiés, drapeau éteint (D-539, H95 part B, 2026-11-18)

Code de D-539, sous `release-db` (chemin clinique), sans migration. Rien ne
s'ouvre : `WN_SYNTHESE_BIOLOGIE_ENABLED` reste éteint.

- **Second appel** (`lib/synthese/appelBiologie.ts`, consigne
  `synthese-biologie-v1` recopiée de D-539 §4) : il part après la réussite de
  l'appel principal, avec le bloc de biologie seul ; sortie lue par un schéma
  fermé à deux clés (résumé non vide, liste vide admise), une relance ; délai
  borné, jamais bloquant pour la synthèse.
- **Appel principal** : `synthese-v37`. La section « Résultats de biologie »
  dit au modèle qu'il ne reçoit aucun résultat ; la phrase sur le contexte de
  prélèvement est retirée ; la puce du narratif est réécrite ; le contrat de
  sortie perd les deux clés biologiques, que le contrôle de sortie rejette
  désormais.
- **Assemblage par le code** : les deux champs de la synthèse enregistrée
  (schéma `synthese-json-v4` inchangé) sont ceux du second appel, vides sans
  lui. La phrase « Votre praticien a reçu votre bilan biologique du {date}. »
  est ajoutée en fin de narratif dès que le bloc a été construit (date de
  prélèvement la plus récente écrite dans le bloc, calendrier de Paris, mois
  en lettres).
- **Trace** : `donneesEntree.blocBiologie` (inchangé) et
  `donneesEntree.appelBiologie` (version, modèle, issue `reussi`,
  `echec_appel` ou `sortie_rejetee`). Échec avant l'envoi ou après l'envoi,
  chacun journalisé sans le bloc, sans la sortie, sans le message du
  fournisseur.
- **Textes** recopiés de D-539 §7 et relus par les bancs dans la décision :
  « Vos données personnelles » v24, « L'intelligence artificielle dans
  Wellneuro » v9, conditions d'utilisation v7, e-mail
  `conditions_utilisation@7` (envoi : geste du responsable) ; dossier RGPD
  (rubrique 2 et 2 quater, rubriques 5, 6, 7 et 13).
- **Bancs** : message réellement envoyé à chaque appel, ordre, assemblage,
  rejet des clés biologiques de l'appel principal, les deux échecs, la
  relance, la phrase (changement d'heure, tête corrigée, résultat annulé,
  aucun faux positif), empreintes des deux consignes.

Reste avant la pose du drapeau : l'évaluation rejouée (D-539 §8, 24 dossiers
fictifs × 3 passages, zéro violation), au lot suivant.
