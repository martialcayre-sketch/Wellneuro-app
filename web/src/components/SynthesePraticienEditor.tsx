'use client';

import { useRef, useState } from 'react';
import { Plus, Save, Search, Trash2, X } from 'lucide-react';
import type { SyntheseSchema } from '@/lib/anthropic';

type Props = {
  value: SyntheseSchema;
  onChange: (value: SyntheseSchema) => void;
  onSave: () => void;
  onCancel?: () => void;
  saving?: boolean;
  saveLabel?: string;
};

const champ =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground';

function lignes(value: string): string[] {
  // Conserve la ligne vide terminale pendant la frappe ; le serveur nettoie
  // les éléments vides à l'enregistrement.
  return value.split('\n');
}

type ChampRecherche = 'resume_praticien' | 'narratif_patient';

type Occurrence = { start: number; end: number; index: number; total: number };

function toutesOccurrences(texte: string, requete: string): number[] {
  if (!requete) return [];
  const lower = texte.toLowerCase();
  const req = requete.toLowerCase();
  const positions: number[] = [];
  let idx = 0;
  while ((idx = lower.indexOf(req, idx)) !== -1) {
    positions.push(idx);
    idx += req.length;
  }
  return positions;
}

// Recherche insensible à la casse, sans regex : un mot cherché dans une
// synthèse clinique ne doit jamais être interprété comme un motif.
function trouverOccurrenceSuivante(texte: string, requete: string, depart: number): Occurrence | null {
  const positions = toutesOccurrences(texte, requete);
  if (positions.length === 0) return null;
  const start = positions.find(p => p >= depart) ?? positions[0];
  return { start, end: start + requete.length, index: positions.indexOf(start), total: positions.length };
}

function remplacerToutesOccurrences(texte: string, requete: string, remplacement: string): { texte: string; nombre: number } {
  if (!requete) return { texte, nombre: 0 };
  const lower = texte.toLowerCase();
  const req = requete.toLowerCase();
  let nombre = 0;
  let sortie = '';
  let i = 0;
  while (i < texte.length) {
    const idx = lower.indexOf(req, i);
    if (idx === -1) {
      sortie += texte.slice(i);
      break;
    }
    sortie += texte.slice(i, idx) + remplacement;
    i = idx + requete.length;
    nombre++;
  }
  return { texte: sortie, nombre };
}

export function SynthesePraticienEditor({
  value,
  onChange,
  onSave,
  onCancel,
  saving = false,
  saveLabel = 'Enregistrer le brouillon',
}: Props) {
  const modifier = <K extends keyof SyntheseSchema>(cle: K, valeur: SyntheseSchema[K]) => {
    onChange({ ...value, [cle]: valeur });
  };

  const modifierAxe = (index: number, patch: Partial<SyntheseSchema['axes_prioritaires'][number]>) => {
    const axes = value.axes_prioritaires.map((axe, i) => i === index ? { ...axe, ...patch } : axe);
    modifier('axes_prioritaires', axes);
  };

  const ajouterAxe = () => {
    if (value.axes_prioritaires.length >= 3) return;
    modifier('axes_prioritaires', [
      ...value.axes_prioritaires,
      { axe: '', niveau_priorite: 'modere', arguments: [], points_a_confirmer: [] },
    ]);
  };

  const resumeRef = useRef<HTMLTextAreaElement>(null);
  const narratifRef = useRef<HTMLTextAreaElement>(null);
  const [champActif, setChampActif] = useState<ChampRecherche>('narratif_patient');
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [requete, setRequete] = useState('');
  const [remplacement, setRemplacement] = useState('');
  const [occurrenceCourante, setOccurrenceCourante] = useState<Occurrence | null>(null);
  const [messageRecherche, setMessageRecherche] = useState<string | null>(null);

  const champsRecherche = {
    resume_praticien: { ref: resumeRef, label: 'Résumé interne praticien', maxLength: 4000 },
    narratif_patient: { ref: narratifRef, label: 'Texte destiné au patient', maxLength: 12000 },
  };
  const cibleActive = champsRecherche[champActif];
  const valeurActive = value[champActif];

  const onFocusChamp = (nom: ChampRecherche) => {
    if (nom === champActif) return;
    setChampActif(nom);
    setOccurrenceCourante(null);
    setMessageRecherche(null);
  };

  // Une frappe manuelle entre deux clics peut décaler ou invalider l'occurrence
  // mémorisée : on revérifie qu'elle désigne toujours le mot cherché dans le
  // texte actuel avant de s'en servir, plutôt que de faire confiance à des
  // indices qui pourraient pointer sur un tout autre passage.
  const occurrenceValide = (o: Occurrence | null): o is Occurrence =>
    !!o && o.end <= valeurActive.length && valeurActive.slice(o.start, o.end).toLowerCase() === requete.toLowerCase();

  const chercherSuivant = () => {
    if (!requete) {
      setOccurrenceCourante(null);
      setMessageRecherche(null);
      return;
    }
    const depart = occurrenceValide(occurrenceCourante) ? occurrenceCourante.end : 0;
    const trouve = trouverOccurrenceSuivante(valeurActive, requete, depart);
    if (!trouve) {
      setOccurrenceCourante(null);
      setMessageRecherche('Aucune occurrence trouvée.');
      return;
    }
    setOccurrenceCourante(trouve);
    const el = cibleActive.ref.current;
    if (el) {
      el.focus();
      el.setSelectionRange(trouve.start, trouve.end);
    }
    setMessageRecherche(`Occurrence ${trouve.index + 1} sur ${trouve.total}.`);
  };

  const remplacerCourant = () => {
    if (!requete) return;
    const cible = occurrenceValide(occurrenceCourante) ? occurrenceCourante : trouverOccurrenceSuivante(valeurActive, requete, 0);
    if (!cible) {
      setMessageRecherche('Aucune occurrence trouvée.');
      return;
    }
    const nouveauTexte = (valeurActive.slice(0, cible.start) + remplacement + valeurActive.slice(cible.end))
      .slice(0, cibleActive.maxLength);
    modifier(champActif, nouveauTexte);
    setOccurrenceCourante(null);
    setMessageRecherche('Occurrence remplacée. Cliquez sur « Occurrence suivante » pour continuer.');
  };

  const remplacerTout = () => {
    if (!requete) return;
    const { texte, nombre } = remplacerToutesOccurrences(valeurActive, requete, remplacement);
    if (nombre === 0) {
      setMessageRecherche('Aucune occurrence trouvée.');
      return;
    }
    modifier(champActif, texte.slice(0, cibleActive.maxLength));
    setOccurrenceCourante(null);
    setMessageRecherche(`${nombre} occurrence(s) remplacée(s).`);
  };

  const basculerRecherche = () => {
    setRechercheOuverte(o => !o);
    setRequete('');
    setRemplacement('');
    setOccurrenceCourante(null);
    setMessageRecherche(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <button
          type="button"
          onClick={basculerRecherche}
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-accent"
        >
          <Search size={16} aria-hidden="true" />
          {rechercheOuverte ? 'Fermer la recherche' : 'Rechercher / remplacer'}
        </button>

        {rechercheOuverte && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Champ actif : <span className="font-medium text-foreground">{cibleActive.label}</span> — cliquez dans un champ pour le cibler.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={requete}
                onChange={event => {
                  setRequete(event.target.value);
                  setOccurrenceCourante(null);
                  setMessageRecherche(null);
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    chercherSuivant();
                  }
                }}
                placeholder="Mot ou expression à rechercher"
                aria-label="Rechercher un mot"
                className={`${champ} sm:w-64`}
              />
              <button
                type="button"
                onClick={chercherSuivant}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Occurrence suivante
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={remplacement}
                onChange={event => setRemplacement(event.target.value)}
                placeholder="Remplacer par"
                aria-label="Remplacer par"
                className={`${champ} sm:w-64`}
              />
              <button
                type="button"
                onClick={remplacerCourant}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Remplacer
              </button>
              <button
                type="button"
                onClick={remplacerTout}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Remplacer tout
              </button>
            </div>
            {messageRecherche && <p className="text-xs text-muted-foreground">{messageRecherche}</p>}
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <label htmlFor="synthese-resume" className="text-sm font-medium text-foreground">
          Résumé interne praticien
        </label>
        <textarea
          id="synthese-resume"
          ref={resumeRef}
          value={value.resume_praticien}
          onChange={event => modifier('resume_praticien', event.target.value)}
          onFocus={() => onFocusChamp('resume_praticien')}
          rows={5}
          maxLength={4000}
          required
          className={`${champ} resize-y`}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="synthese-patient" className="text-sm font-medium text-foreground">
          Texte destiné au patient
        </label>
        <textarea
          id="synthese-patient"
          ref={narratifRef}
          value={value.narratif_patient}
          onChange={event => modifier('narratif_patient', event.target.value)}
          onFocus={() => onFocusChamp('narratif_patient')}
          rows={8}
          maxLength={12000}
          required
          className={`${champ} resize-y`}
        />
      </div>

      <section className="border-y border-border py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-foreground">Axes prioritaires</h4>
          <button
            type="button"
            onClick={ajouterAxe}
            disabled={value.axes_prioritaires.length >= 3}
            title="Ajouter un axe prioritaire"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40"
          >
            <Plus size={17} aria-hidden="true" />
            <span className="sr-only">Ajouter un axe prioritaire</span>
          </button>
        </div>

        <div className="divide-y divide-border">
          {value.axes_prioritaires.map((axe, index) => (
            <div key={index} className="grid gap-3 py-4 first:pt-0 last:pb-0">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_40px]">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Libellé de l’axe
                  <input
                    value={axe.axe}
                    onChange={event => modifierAxe(index, { axe: event.target.value })}
                    maxLength={160}
                    className={champ}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Priorité
                  <select
                    value={axe.niveau_priorite}
                    onChange={event => modifierAxe(index, {
                      niveau_priorite: event.target.value as 'eleve' | 'modere' | 'faible',
                    })}
                    className={champ}
                  >
                    <option value="eleve">Élevée</option>
                    <option value="modere">Modérée</option>
                    <option value="faible">Faible</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => modifier('axes_prioritaires', value.axes_prioritaires.filter((_, i) => i !== index))}
                  title="Supprimer cet axe"
                  className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-lg text-status-danger hover:bg-status-danger/10"
                >
                  <Trash2 size={17} aria-hidden="true" />
                  <span className="sr-only">Supprimer cet axe</span>
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Arguments, un par ligne
                  <textarea
                    value={axe.arguments.join('\n')}
                    onChange={event => modifierAxe(index, { arguments: lignes(event.target.value) })}
                    rows={3}
                    className={`${champ} resize-y`}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Points à confirmer, un par ligne
                  <textarea
                    value={axe.points_a_confirmer.join('\n')}
                    onChange={event => modifierAxe(index, { points_a_confirmer: lignes(event.target.value) })}
                    rows={3}
                    className={`${champ} resize-y`}
                  />
                </label>
              </div>
            </div>
          ))}
          {value.axes_prioritaires.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">Aucun axe ajouté.</p>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Points de vigilance
          <textarea
            value={value.points_de_vigilance.join('\n')}
            onChange={event => modifier('points_de_vigilance', lignes(event.target.value))}
            rows={4}
            className={`${champ} resize-y`}
          />
          <span className="text-xs font-normal text-muted-foreground">Un point par ligne.</span>
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Questions pour la consultation
          <textarea
            value={value.questions_entretien.join('\n')}
            onChange={event => modifier('questions_entretien', lignes(event.target.value))}
            rows={4}
            className={`${champ} resize-y`}
          />
          <span className="text-xs font-normal text-muted-foreground">Une question par ligne.</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          <Save size={16} aria-hidden="true" />
          {saving ? 'Enregistrement...' : saveLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            <X size={16} aria-hidden="true" />
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}
