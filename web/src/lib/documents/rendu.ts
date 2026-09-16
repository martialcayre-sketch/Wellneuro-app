import { escapeHtml } from '@/lib/html';
import { blocsPourDestinataire, contenuPourDestinataire } from './bloc';
import { assertRenduMedecinNonPrescriptif } from './vocabulaire';
import type { Destinataire, DocumentComposite } from './types';

// Rendu HTML paramétré par destinataire (C3 LOT-03). PUR (string → string), sur le
// même patron que `buildBookletHTML` (CSS inline, `escapeHtml` sur toute valeur
// dynamique, document autonome imprimable). Applique la frontière de données par
// le domaine (`blocsPourDestinataire` = garde de régime + field-filter) : le champ
// interne praticien n'atteint jamais un rendu patient/médecin. PDF natif différé.

const DESTINATAIRE_TITRE: Record<Destinataire, string> = {
  patient: 'Votre document de suivi',
  medecin: 'Correspondance — éléments à discuter',
  praticien: 'Document de travail (praticien)',
};

/**
 * LE CADRE ET LE TITRE SUIVENT LE MODÈLE, PLUS LE SEUL DESTINATAIRE.
 *
 * Ils étaient en dur, et tous les rendus médecin annonçaient donc
 * « éléments à discuter » / « explorations à discuter ». C'est juste d'une
 * proposition d'explorations biologiques ; c'est FAUX de la lettre
 * d'adressage ([[D-217]]), qui ne transmet aucune exploration et demande un
 * avis médical AVANT toute proposition. Le papier aurait porté un en-tête
 * qui contredit son propre corps, chez un médecin, sans qu'aucune garde ne
 * le voie : la garde juge le corps, pas ces trois phrases fixes.
 *
 * Un modèle absent de cette table garde le libellé historique : ajouter un
 * modèle ne change rien aux rendus existants.
 */
const CADRE_MEDECIN_PAR_MODELE: Readonly<Record<string, { titre: string; cadre: string }>> = {
  courrier_adressage: {
    titre: 'Correspondance — adressage sur signal d’alerte',
    cadre:
      'Éléments déclarés par le patient, transmis pour votre appréciation '
      + '(échange interprofessionnel).',
  },
};

const STYLE = `
  body { font-family: Georgia, 'Times New Roman', serif; color: #1f2937; margin: 0; padding: 2rem; }
  .page { max-width: 42rem; margin: 0 auto; }
  .header { border-bottom: 2px solid #2d6a4f; padding-bottom: 0.75rem; margin-bottom: 1.25rem; }
  .brand { color: #2d6a4f; font-weight: bold; letter-spacing: 0.05em; }
  .title { font-size: 1.4rem; margin: 0.25rem 0; }
  .meta { color: #6b7280; font-size: 0.85rem; }
  .badge { display: inline-block; background: #eaf4ee; color: #2d6a4f; border: 1px solid #2d6a4f;
           border-radius: 999px; padding: 0.2rem 0.75rem; font-size: 0.85rem; margin-bottom: 1rem; }
  .cadre { background: #f8fafc; border-left: 3px solid #94a3b8; padding: 0.5rem 0.75rem;
           color: #475569; font-size: 0.9rem; margin-bottom: 1rem; }
  .bloc { margin-bottom: 1rem; white-space: pre-line; }
  .footer { border-top: 1px solid #e5e7eb; margin-top: 1.5rem; padding-top: 0.75rem;
            color: #9ca3af; font-size: 0.8rem; }
`;

export type RenderDocumentOptions = {
  patientNom?: string;
  dateDocument?: string;
};

/**
 * Rend un `DocumentComposite` en HTML autonome pour un destinataire donné.
 * - patient : badge « Validé par votre praticien », aucun champ interne ;
 * - médecin : cadre « explorations à discuter », registre non prescriptif ;
 * - praticien : rendu complet.
 * Ne rend que les blocs diffusables à ce destinataire (garde de régime + field-filter).
 */
export function renderDocumentHtml(
  document: DocumentComposite,
  destinataire: Destinataire,
  options: RenderDocumentOptions = {},
): string {
  const blocs = blocsPourDestinataire(document.blocs, destinataire);
  const specifique = CADRE_MEDECIN_PAR_MODELE[document.modeleId];
  const titre = destinataire === 'medecin' && specifique
    ? specifique.titre
    : DESTINATAIRE_TITRE[destinataire];
  const patientNomHtml = escapeHtml(options.patientNom ?? '');
  const dateHtml = escapeHtml(options.dateDocument ?? '');

  const badge =
    destinataire === 'patient'
      ? '<div class="badge">Validé par votre praticien</div>'
      : '';
  // « INTERPROFESSIONNEL », PAS « CONFRATERNEL ». Ce cadre devient du papier
  // imprimé au LOT-03, signé « Docteur en Pharmacie » : entre deux ordres
  // distincts, le mot « confraternel » laissait lire une qualité que
  // l'auteur n'a pas, pour un gain de courtoisie nul — la phrase dit déjà
  // que ce sont des explorations à discuter. Arbitrage du responsable, et
  // la signature du corps porte désormais la qualité en toutes lettres.
  const cadreMedecin =
    destinataire === 'medecin'
      ? `<p class="cadre">${escapeHtml(
          specifique?.cadre
            ?? 'Éléments transmis à titre d’explorations à discuter (échange interprofessionnel).',
        )}</p>`
      : '';

  const corps =
    blocs.length > 0
      ? blocs
          .map((bloc) => {
            const contenu = contenuPourDestinataire(bloc, destinataire) ?? '';
            return `<div class="bloc">${escapeHtml(contenu)}</div>`;
          })
          .join('\n')
      : '<div class="bloc"><em>Aucun contenu diffusé à ce destinataire.</em></div>';

  // Garde en code (E15) : la docstring de la garde promettait un appel avant
  // diffusion, resté sans appelant en production. Posée ici, au chokepoint que
  // traverse tout rendu médecin, sur le contenu réellement diffusé.
  if (destinataire === 'medecin') {
    assertRenduMedecinNonPrescriptif(corps);
  }

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(titre)}</title>
<style>${STYLE}</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">WELLNEURO</div>
    <h1 class="title">${escapeHtml(titre)}</h1>
    <div class="meta">${patientNomHtml}${patientNomHtml && dateHtml ? ' · ' : ''}${dateHtml}</div>
  </div>
  ${badge}
  ${cadreMedecin}
  ${corps}
  <div class="footer">Document composé à partir de blocs validés par votre praticien. Wellneuro.</div>
</div>
</body>
</html>`;
}
