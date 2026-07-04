import { Badge } from './Badge';

export type PatientRowData = {
  idPatient: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  actif: 'OUI' | 'NON';
};

export function PatientRow({
  patient,
  onEdit,
  onToggleResultats,
  resultatsOuverts,
  onDelete,
  confirmationSuppression,
  onDemanderSuppression,
  onAnnulerSuppression,
  suppressionEnCours,
}: {
  patient: PatientRowData;
  onEdit: (patient: PatientRowData) => void;
  onToggleResultats: (email: string) => void;
  resultatsOuverts: boolean;
  onDelete: (idPatient: string) => void;
  confirmationSuppression: boolean;
  onDemanderSuppression: (idPatient: string) => void;
  onAnnulerSuppression: () => void;
  suppressionEnCours: boolean;
}) {
  return (
    <tr className="border-t border-border hover:bg-muted/50">
      <td className="px-4 py-2">{`${patient.prenom} ${patient.nom}`.trim() || '—'}</td>
      <td className="px-4 py-2">{patient.email || '—'}</td>
      <td className="px-4 py-2">{patient.telephone || '—'}</td>
      <td className="px-4 py-2">
        <Badge variant={patient.actif === 'OUI' ? 'success' : 'neutral'}>
          {patient.actif === 'OUI' ? 'Actif' : 'Inactif'}
        </Badge>
      </td>
      <td className="px-4 py-2">
        <button onClick={() => onEdit(patient)} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          Modifier
        </button>
      </td>
      <td className="px-4 py-2">
        <button
          onClick={() => onToggleResultats(patient.email)}
          className={`text-xs hover:underline ${resultatsOuverts ? 'text-accent font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {resultatsOuverts ? 'Masquer' : 'Résultats'}
        </button>
      </td>
      <td className="px-4 py-2">
        {confirmationSuppression ? (
          <span className="flex items-center gap-1">
            <button
              onClick={() => onDelete(patient.idPatient)}
              disabled={suppressionEnCours}
              className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded disabled:opacity-60"
            >
              {suppressionEnCours ? '...' : 'Confirmer'}
            </button>
            <button onClick={onAnnulerSuppression} className="text-xs text-muted-foreground hover:underline">
              Annuler
            </button>
          </span>
        ) : (
          <button
            onClick={() => onDemanderSuppression(patient.idPatient)}
            className="text-xs text-red-400 hover:underline"
          >
            Supprimer
          </button>
        )}
      </td>
    </tr>
  );
}
