'use client';

import { useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientField, patientInputClassName } from '@/components/patient/ui/PatientField';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';

/**
 * « Signaler un problème » (TRUST LOT-03/04) — trois parcours structurés,
 * jamais de chat clinique libre. L'effet indésirable reçoit une réponse
 * d'orientation immédiate produite par la règle déterministe versionnée
 * (aucune promesse de délai, aucune causalité déduite).
 */
type Parcours = 'effet_indesirable' | 'incident_confidentialite' | 'demande_droit';

const PARCOURS: { valeur: Parcours; libelle: string }[] = [
  { valeur: 'effet_indesirable', libelle: 'Un produit me semble mal toléré' },
  { valeur: 'incident_confidentialite', libelle: 'Un problème de confidentialité' },
  { valeur: 'demande_droit', libelle: 'Je souhaite exercer un droit sur mes données' },
];

const CATEGORIES_INCIDENT = [
  { valeur: 'connexion_non_reconnue', libelle: 'Je ne reconnais pas une connexion' },
  { valeur: 'document_dun_autre_patient', libelle: 'Un document ne semble pas me concerner' },
  { valeur: 'information_incorrecte', libelle: 'Une information est incorrecte' },
  { valeur: 'appareil_perdu', libelle: 'J’ai perdu un appareil connecté à cet espace' },
  { valeur: 'partage_incorrect', libelle: 'Un partage me semble incorrect' },
  { valeur: 'autre', libelle: 'Autre problème de confidentialité' },
];

const TYPES_DROIT = [
  { valeur: 'acces', libelle: 'Accéder à mes données' },
  { valeur: 'rectification', libelle: 'Faire corriger une information' },
  { valeur: 'effacement', libelle: 'Demander un effacement' },
  { valeur: 'limitation', libelle: 'Limiter une utilisation' },
  { valeur: 'opposition', libelle: 'M’opposer à une utilisation' },
  { valeur: 'portabilite', libelle: 'Récupérer mes données (portabilité)' },
  { valeur: 'retrait_choix', libelle: 'Retirer une autorisation' },
  { valeur: 'information', libelle: 'Obtenir une information' },
];

const SEVERITES = [
  { valeur: 'legere', libelle: 'Légère' },
  { valeur: 'moderee', libelle: 'Modérée' },
  { valeur: 'severe', libelle: 'Sévère' },
  { valeur: 'incertaine', libelle: 'Je ne sais pas' },
];

const ACTIONS_PRISES = [
  { valeur: 'aucune', libelle: 'Je n’ai rien changé' },
  { valeur: 'reduit', libelle: 'J’ai réduit la prise' },
  { valeur: 'arrete', libelle: 'J’ai arrêté la prise' },
  { valeur: 'ne_sait_pas', libelle: 'Je ne sais pas' },
];

export function SignalerProbleme({ token, onEnvoye }: { token: string; onEnvoye: () => void }) {
  const [parcours, setParcours] = useState<Parcours | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // Champs effet indésirable.
  const [produit, setProduit] = useState('');
  const [symptomes, setSymptomes] = useState('');
  const [severite, setSeverite] = useState('');
  const [actionPrise, setActionPrise] = useState('ne_sait_pas');
  // Champs incident / droit.
  const [categorieIncident, setCategorieIncident] = useState('');
  const [typeDroit, setTypeDroit] = useState('');
  const [description, setDescription] = useState('');

  const reinitialiser = () => {
    setParcours(null);
    setProduit('');
    setSymptomes('');
    setSeverite('');
    setActionPrise('ne_sait_pas');
    setCategorieIncident('');
    setTypeDroit('');
    setDescription('');
    setErreur('');
  };

  const envoyer = async (corps: Record<string, unknown>) => {
    setErreur('');
    setEnvoi(true);
    try {
      const res = await fetch('/api/portail/trust/signalement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...corps }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; messagePatient?: string };
      if (!data.ok) {
        setErreur(data.error ?? 'Erreur. Réessayez.');
        return;
      }
      setConfirmation(
        data.messagePatient ??
          'Votre demande a bien été enregistrée. Elle sera examinée par votre praticien, sans garantie de délai.',
      );
      reinitialiser();
      onEnvoye();
    } catch {
      setErreur('Erreur réseau. Réessayez.');
    } finally {
      setEnvoi(false);
    }
  };

  if (confirmation) {
    return (
      <div className="space-y-3">
        <PatientInlineMessage tone="info">{confirmation}</PatientInlineMessage>
        <PatientButton variant="neutral" onClick={() => setConfirmation(null)}>
          Faire un autre signalement
        </PatientButton>
      </div>
    );
  }

  if (!parcours) {
    return (
      <div className="space-y-2">
        {PARCOURS.map(p => (
          <button
            key={p.valeur}
            type="button"
            onClick={() => setParcours(p.valeur)}
            className="w-full text-left px-4 py-3 text-sm text-foreground rounded-lg border border-border bg-surface hover:border-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {p.libelle} →
          </button>
        ))}
        <p className="text-xs text-muted-foreground">
          Ces signalements ne sont pas surveillés en continu. En cas de symptôme grave ou
          inquiétant, contactez le 15 ou le 112 sans attendre.
        </p>
      </div>
    );
  }

  if (parcours === 'effet_indesirable') {
    return (
      <form
        className="space-y-3"
        onSubmit={e => {
          e.preventDefault();
          void envoyer({
            categorie: 'effet_indesirable',
            produitLibelle: produit,
            symptomes,
            severiteDeclaree: severite,
            actionPrise,
          });
        }}
      >
        <PatientField label="Produit concerné *">
          <input value={produit} onChange={e => setProduit(e.target.value)} required className={patientInputClassName} />
        </PatientField>
        <PatientField label="Ce que vous ressentez *">
          <textarea
            value={symptomes}
            onChange={e => setSymptomes(e.target.value)}
            required
            rows={3}
            className={patientInputClassName}
          />
        </PatientField>
        <PatientField label="Intensité ressentie *">
          <select value={severite} onChange={e => setSeverite(e.target.value)} required className={patientInputClassName}>
            <option value="">Choisir…</option>
            {SEVERITES.map(s => (
              <option key={s.valeur} value={s.valeur}>{s.libelle}</option>
            ))}
          </select>
        </PatientField>
        <PatientField label="Ce que vous avez fait">
          <select value={actionPrise} onChange={e => setActionPrise(e.target.value)} className={patientInputClassName}>
            {ACTIONS_PRISES.map(a => (
              <option key={a.valeur} value={a.valeur}>{a.libelle}</option>
            ))}
          </select>
        </PatientField>
        {erreur && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}
        <div className="flex flex-wrap gap-2">
          <PatientButton type="submit" variant="primary" loading={envoi} loadingLabel="Envoi…">
            Envoyer le signalement
          </PatientButton>
          <PatientButton variant="ghost" onClick={reinitialiser}>Annuler</PatientButton>
        </div>
      </form>
    );
  }

  if (parcours === 'incident_confidentialite') {
    return (
      <form
        className="space-y-3"
        onSubmit={e => {
          e.preventDefault();
          void envoyer({ categorie: 'incident_confidentialite', categorieIncident, description });
        }}
      >
        <PatientField label="Type de problème *">
          <select
            value={categorieIncident}
            onChange={e => setCategorieIncident(e.target.value)}
            required
            className={patientInputClassName}
          >
            <option value="">Choisir…</option>
            {CATEGORIES_INCIDENT.map(c => (
              <option key={c.valeur} value={c.valeur}>{c.libelle}</option>
            ))}
          </select>
        </PatientField>
        <PatientField label="Décrivez ce que vous avez constaté *">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            rows={3}
            className={patientInputClassName}
          />
        </PatientField>
        {erreur && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}
        <div className="flex flex-wrap gap-2">
          <PatientButton type="submit" variant="primary" loading={envoi} loadingLabel="Envoi…">
            Signaler
          </PatientButton>
          <PatientButton variant="ghost" onClick={reinitialiser}>Annuler</PatientButton>
        </div>
      </form>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={e => {
        e.preventDefault();
        void envoyer({ categorie: 'demande_droit', typeDemande: typeDroit, description });
      }}
    >
      <PatientField label="Votre demande *">
        <select value={typeDroit} onChange={e => setTypeDroit(e.target.value)} required className={patientInputClassName}>
          <option value="">Choisir…</option>
          {TYPES_DROIT.map(t => (
            <option key={t.valeur} value={t.valeur}>{t.libelle}</option>
          ))}
        </select>
      </PatientField>
      <PatientField label="Précisions (facultatif)">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className={patientInputClassName}
        />
      </PatientField>
      <p className="text-xs text-muted-foreground">
        Certains droits dépendent du cadre applicable : votre demande recevra une réponse
        expliquant ce qui est possible et pourquoi.
      </p>
      {erreur && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}
      <div className="flex flex-wrap gap-2">
        <PatientButton type="submit" variant="primary" loading={envoi} loadingLabel="Envoi…">
          Envoyer la demande
        </PatientButton>
        <PatientButton variant="ghost" onClick={reinitialiser}>Annuler</PatientButton>
      </div>
    </form>
  );
}
