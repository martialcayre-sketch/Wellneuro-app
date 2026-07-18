import type {
  Bloc,
  ContenuBloc,
  Destinataire,
  ProvenanceBloc,
  RegimeBloc,
  TypeBloc,
} from './types';
import { STATUTS_SYNTHESE_VALIDES } from './types';

/** Entrée de fabrique d'un bloc (le contenu praticien est toujours requis). */
export type ConstruireBlocInput = {
  id: string;
  type: TypeBloc;
  regime: RegimeBloc;
  provenance: ProvenanceBloc;
  contenu: ContenuBloc;
};

/**
 * Fabrique pure d'un bloc. Valide l'ancrage de provenance (aucune vérité C3) et
 * l'intégrité minimale du contenu. Ne produit aucun contenu clinique (frontière A2).
 */
export function construireBloc(input: ConstruireBlocInput): Bloc {
  const { id, type, regime, provenance, contenu } = input;

  if (!id) throw new Error('Un bloc doit porter un identifiant.');
  if (!provenance.ancrageHash) {
    throw new Error(`Bloc ${id} : provenance sans ancrage (aucune vérité C3, frontière A2).`);
  }
  if (!provenance.version) {
    throw new Error(`Bloc ${id} : provenance sans version de contrat source.`);
  }
  if (!contenu.praticien) {
    throw new Error(`Bloc ${id} : contenu praticien requis (rendu complet sourcé).`);
  }
  if (regime === 'genere_ia' && !provenance.statutSource) {
    throw new Error(`Bloc ${id} : un bloc généré IA doit porter le statut de sa synthèse source.`);
  }

  return { id, type, regime, provenance, contenu };
}

/**
 * Garde de régime : un bloc `genere_ia` n'est diffusable QUE si sa synthèse source
 * est validée praticien (`Validee_Praticien` | `Corrigee_Praticien`). Un bloc
 * `statique_valide` est toujours diffusable. La base ne contraint pas `statut` :
 * cette garde vit donc en code.
 */
export function estBlocDiffusable(bloc: Bloc): boolean {
  if (bloc.regime === 'statique_valide') return true;
  return (
    bloc.provenance.statutSource !== undefined &&
    STATUTS_SYNTHESE_VALIDES.includes(bloc.provenance.statutSource)
  );
}

/**
 * Contenu d'un bloc pour un destinataire donné (field-filter). Retourne `null`
 * quand le bloc n'est pas destiné à ce destinataire. Le rendu patient/médecin ne
 * puise JAMAIS dans le champ `praticien` : il lit le champ dédié ou rien.
 */
export function contenuPourDestinataire(bloc: Bloc, destinataire: Destinataire): string | null {
  switch (destinataire) {
    case 'praticien':
      return bloc.contenu.praticien;
    case 'patient':
      return bloc.contenu.patient ?? null;
    case 'medecin':
      return bloc.contenu.medecin ?? null;
    default:
      return null;
  }
}

/**
 * Blocs diffusables vers un destinataire : filtrés par la garde de régime PUIS par
 * la présence d'un contenu dédié à ce destinataire. Un bloc IA non validé n'apparaît
 * jamais, quel que soit le destinataire.
 */
export function blocsPourDestinataire(blocs: Bloc[], destinataire: Destinataire): Bloc[] {
  return blocs.filter(
    (bloc) => estBlocDiffusable(bloc) && contenuPourDestinataire(bloc, destinataire) !== null,
  );
}
