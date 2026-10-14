### Cockpit : « Relire » ouvre le bon dossier, « Composer le document » depuis la minute d'après (S-4, 2026-10-14)

Premier lot de code du plan unique (`docs/claude/PLAN_WELLNEURO.md`, fiche
H02, rang 0, file A, frontière commune du Fil). Aucune décision, aucune
migration, aucun drapeau, aucune règle clinique.

- **Le Fil** : la carte « N relectures en attente » porte désormais
  l'identifiant du dossier dans son lien (`/dashboard/synthese?idPatient=`),
  comme les deux autres cartes qui mènent à la synthèse. Avant, « Relire »
  ouvrait la page de synthèse sur le dernier dossier sélectionné et le
  praticien devait choisir le patient une seconde fois ; la page présélectionne
  déjà le dossier de l'URL. Banc `lib/fil/cartes.test.ts` réécrit : il
  épinglait le lien sans identifiant.
- **La minute d'après** (consultation copilote) : un lien « Composer le
  document » vers la page Documents du dossier, visible seulement quand une
  synthèse validée praticien existe (étape « Document validé praticien »
  faite) ; sans elle il n'y a rien à composer et le lien n'apparaît pas. La
  phrase de fin dit d'où part l'envoi : la page Synthèse ou la page
  Documents, les deux seuls écrans qui envoient (la fiche n'envoie pas, elle
  renvoie ; le texte précédent la nommait à tort). L'écran reste en lecture seule : le lien ouvre une page, aucun
  bouton ni formulaire n'y envoie quoi que ce soit (banc inchangé sur ce
  point, trois cas ajoutés).

Écarté : « Planifier le bilan » avec patient présélectionné (L6, option du
plan) ; le rail et le retrait du groupe « Héritage 4.0 » (J1-base, H43).
