'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { normaliserTexte } from '@/lib/physio-traitements/liste';
import type { DecisionsParcoursGetResponse } from '@/app/api/praticien/decisions-parcours/route';
import {
  familleDuFil,
  filsDeLaVersion,
  revisionEnVigueur,
  sequenceIncomplete,
  type DecisionLue,
  type VersionLue,
} from '@/lib/decisions-parcours/fils';
import {
  famille,
  ISSUES,
  LIBELLES_ISSUE,
  LIBELLES_MOTIF,
  LIBELLES_NATURE,
  LIBELLES_SOURCE,
  motifsPermis,
  NATURES_CHOIX,
  NATURES_MISE_EN_OEUVRE,
  NOTE_MAX,
  noteRequise,
  SOURCES,
  TEXTES,
  type Issue,
  type Nature,
  type Source,
} from '@/lib/decisions-parcours/liste';

// LES DÉCISIONS DE PARCOURS, AU COCKPIT ([[D-343]], BP-15). Par version du
// protocole : la révision en vigueur, les choix du patient et les événements
// de mise en œuvre, chacun avec sa source, son motif, sa note et sa date (ou
// « date inconnue ») ; l'historique reste lisible. Le praticien pose, corrige
// (remplacement de la tête, même famille et même action) ou retire.
//
// Mise en œuvre et révision : une version DIFFUSÉE seule (§7). Une séquence
// lacunaire se DIT, rien n'en est déduit (DC-30). Aucune efficacité, aucun
// score, aucun calcul.
//
// Monté seulement sous `WN_DECISIONS_PARCOURS` (la fiche lit le drapeau au
// serveur) ; la route le garde de son côté.

type Donnees = Extract<DecisionsParcoursGetResponse, { ok: true }>;

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' });

const instant = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const jourCivil = (aaaammjj: string) => aaaammjj.split('-').reverse().join('/');

/** Les refus nés d'une lecture périmée : le panneau relit le dossier. */
const REFUS_PERIMES = new Set(['tete_changee', 'ligne_inconnue', 'conflit_concurrent', 'refus_base', 'version_non_diffusee']);

const classeBouton = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50';
const classePrincipal = 'min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50';
const classeChamp = 'mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground';

const libelleVersion = (v: VersionLue | undefined) => (v ? `Version du ${instant(v.creeLe)}` : 'Version inconnue');

function titreAction(version: VersionLue, idAction: string | null): string {
  if (idAction === null) return 'protocole entier';
  return version.actions?.find(a => a.actionId === idAction)?.titre ?? idAction;
}

function decrire(l: DecisionLue, version: VersionLue): string {
  if (l.acte === 'retrait') return 'retrait de la ligne en vigueur';
  if (l.nature === 'revision') return `révision : ${l.issue ? LIBELLES_ISSUE[l.issue] : ''}`;
  return `${l.nature ? LIBELLES_NATURE[l.nature] : ''} — ${titreAction(version, l.idAction)}`;
}

function Details({ l, versions }: { l: DecisionLue; versions: VersionLue[] }) {
  const estMiseEnOeuvre = l.nature !== null && NATURES_MISE_EN_OEUVRE.includes(l.nature);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs text-muted-foreground">
      {l.source && (<><dt>Source</dt><dd>{LIBELLES_SOURCE[l.source]}</dd></>)}
      {estMiseEnOeuvre && (
        <>
          <dt>Date de l’événement</dt>
          <dd>{l.evenementLe ? jourCivil(l.evenementLe) : TEXTES.dateInconnue}</dd>
        </>
      )}
      {l.motif && (<><dt>Motif</dt><dd>{LIBELLES_MOTIF[l.motif] ?? l.motif}</dd></>)}
      {l.note && (<><dt>Note</dt><dd className="whitespace-pre-wrap">{l.note}</dd></>)}
      {l.idVersionSuivante && (
        <><dt>Version suivante</dt><dd>{libelleVersion(versions.find(v => v.id === l.idVersionSuivante))}</dd></>
      )}
      <dt>Posée</dt>
      <dd>le {jour(l.acteLe)}</dd>
    </dl>
  );
}

function Historique({ lignes, version }: { lignes: DecisionLue[]; version: VersionLue }) {
  if (lignes.length < 2) return null;
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="min-h-11 cursor-pointer py-2">Historique ({lignes.length} lignes)</summary>
      <ol className="space-y-1 pl-4">
        {[...lignes].reverse().map(l => (
          <li key={l.id}>
            {decrire(l, version)}
            {l.motif ? ` (${LIBELLES_MOTIF[l.motif] ?? l.motif})` : ''} — le {jour(l.acteLe)}
          </li>
        ))}
      </ol>
    </details>
  );
}

type Mode =
  | { type: 'ajout' }
  | { type: 'corriger'; ligne: DecisionLue }
  | { type: 'revision'; remplace: string | null; initiale: DecisionLue | null };

function FormulaireDecision({
  version,
  versions,
  mode,
  aujourdhui,
  envoi,
  onEnvoyer,
  onAnnuler,
}: {
  version: VersionLue;
  versions: VersionLue[];
  mode: Mode;
  aujourdhui: string;
  envoi: boolean;
  onEnvoyer: (corps: Record<string, unknown>) => void;
  onAnnuler: () => void;
}) {
  const initiale = mode.type === 'corriger' ? mode.ligne : mode.type === 'revision' ? mode.initiale : null;
  const naturesOffertes: readonly Nature[] =
    mode.type === 'revision'
      ? ['revision']
      : mode.type === 'corriger' && mode.ligne.nature !== null
        ? [...NATURES_CHOIX, ...NATURES_MISE_EN_OEUVRE].filter(n => famille(n) === famille(mode.ligne.nature!))
        : [...NATURES_CHOIX, ...(version.diffuseeLe !== null ? NATURES_MISE_EN_OEUVRE : [])];
  const id = `decision-${version.id}-${mode.type}`.replace(/[^A-Za-z0-9_-]/g, '_');

  const [nature, setNature] = useState<Nature>(initiale?.nature ?? naturesOffertes[0]);
  const [idAction, setIdAction] = useState(initiale?.idAction ?? '');
  const [issue, setIssue] = useState<Issue | ''>(initiale?.issue ?? '');
  const [source, setSource] = useState<Source | ''>(initiale?.source ?? '');
  const [motif, setMotif] = useState(initiale?.motif ?? '');
  const [note, setNote] = useState(initiale?.note ?? '');
  const [dateInconnue, setDateInconnue] = useState(initiale?.evenementInconnu === true);
  const [evenementLe, setEvenementLe] = useState(initiale?.evenementLe ?? aujourdhui);
  const [suivante, setSuivante] = useState(initiale?.idVersionSuivante ?? '');

  const estRevision = nature === 'revision';
  const estMiseEnOeuvre = NATURES_MISE_EN_OEUVRE.includes(nature);
  const motifs = motifsPermis(nature, issue === '' ? null : issue);
  const motifRetenu = motifs.includes(motif) ? motif : '';
  const noteObligatoire = noteRequise(nature, motifRetenu || null);
  const autresVersions = versions.filter(v => v.id !== version.id);
  // Un champ obligatoire vide grise « Enregistrer » : la route le refuserait.
  const incomplet =
    (estRevision ? issue === '' : source === '')
    || (motifs.length > 0 && motifRetenu === '')
    || (noteObligatoire && normaliserTexte(note) === null);

  return (
    <form
      className="space-y-3 rounded-lg border border-border p-3"
      onSubmit={e => {
        e.preventDefault();
        onEnvoyer({
          acte: 'pose',
          idVersion: version.id,
          remplace: mode.type === 'corriger' ? mode.ligne.id : mode.type === 'revision' ? mode.remplace : null,
          nature,
          idAction: estRevision || idAction === '' ? null : idAction,
          issue: estRevision && issue !== '' ? issue : null,
          source: estRevision || source === '' ? null : source,
          motif: motifRetenu || null,
          note,
          evenementLe: estMiseEnOeuvre && !dateInconnue ? evenementLe : null,
          evenementInconnu: estMiseEnOeuvre ? dateInconnue : null,
          idVersionSuivante: estRevision && issue === 'ajuster' && suivante !== '' ? suivante : null,
        });
      }}
    >
      {naturesOffertes.length > 1 && (
        <fieldset className="flex flex-wrap gap-3 text-sm text-foreground" disabled={envoi}>
          <legend className="text-xs text-muted-foreground">Nature</legend>
          {naturesOffertes.map(n => (
            <label key={n} className="flex min-h-11 items-center gap-2">
              <input type="radio" name={`${id}-nature`} value={n} checked={nature === n} onChange={() => setNature(n)} />
              {LIBELLES_NATURE[n]}
            </label>
          ))}
        </fieldset>
      )}

      {!estRevision && (
        <label className="block text-xs text-muted-foreground">
          Action visée
          <select
            value={idAction}
            disabled={envoi || mode.type === 'corriger'}
            onChange={e => setIdAction(e.target.value)}
            className={classeChamp}
          >
            <option value="">protocole entier</option>
            {(version.actions ?? []).map(a => (
              <option key={a.actionId} value={a.actionId}>{a.titre}</option>
            ))}
          </select>
        </label>
      )}

      {estRevision && (
        <fieldset className="flex flex-wrap gap-3 text-sm text-foreground" disabled={envoi}>
          <legend className="text-xs text-muted-foreground">Issue</legend>
          {ISSUES.map(i => (
            <label key={i} className="flex min-h-11 items-center gap-2">
              <input type="radio" name={`${id}-issue`} value={i} checked={issue === i} onChange={() => setIssue(i)} />
              {LIBELLES_ISSUE[i]}
            </label>
          ))}
        </fieldset>
      )}

      {!estRevision && (
        <fieldset className="flex flex-wrap gap-3 text-sm text-foreground" disabled={envoi}>
          <legend className="text-xs text-muted-foreground">Source</legend>
          {SOURCES.map(s => (
            <label key={s} className="flex min-h-11 items-center gap-2">
              <input type="radio" name={`${id}-source`} value={s} checked={source === s} onChange={() => setSource(s)} />
              {LIBELLES_SOURCE[s]}
            </label>
          ))}
        </fieldset>
      )}

      {motifs.length > 0 && (
        <label className="block text-xs text-muted-foreground">
          Motif
          <select value={motifRetenu} disabled={envoi} onChange={e => setMotif(e.target.value)} className={classeChamp}>
            <option value="">— choisir —</option>
            {motifs.map(m => (
              <option key={m} value={m}>{LIBELLES_MOTIF[m] ?? m}</option>
            ))}
          </select>
        </label>
      )}

      {estMiseEnOeuvre && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted-foreground">
            Date de l’événement
            <input
              type="date"
              value={evenementLe}
              max={aujourdhui}
              disabled={envoi || dateInconnue}
              onChange={e => setEvenementLe(e.target.value)}
              className="mt-1 block min-h-11 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={dateInconnue} disabled={envoi} onChange={e => setDateInconnue(e.target.checked)} />
            {TEXTES.dateInconnue}
          </label>
        </div>
      )}

      {estRevision && issue === 'ajuster' && autresVersions.length > 0 && (
        <label className="block text-xs text-muted-foreground">
          Version suivante (facultatif)
          <select value={suivante} disabled={envoi} onChange={e => setSuivante(e.target.value)} className={classeChamp}>
            <option value="">aucune</option>
            {autresVersions.map(v => (
              <option key={v.id} value={v.id}>{libelleVersion(v)}</option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-xs text-muted-foreground">
        Note{noteObligatoire ? ' (obligatoire)' : ' (facultative)'}
        <textarea
          value={note}
          maxLength={NOTE_MAX}
          rows={3}
          disabled={envoi}
          onChange={e => setNote(e.target.value)}
          className={classeChamp}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={envoi || incomplet} className={classePrincipal}>Enregistrer</button>
        <button type="button" disabled={envoi} onClick={onAnnuler} className={classeBouton}>Annuler</button>
      </div>
    </form>
  );
}

export function DecisionsParcoursPanel({ idPatient }: { idPatient: string }) {
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreurLecture, setErreurLecture] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  /** Le formulaire ouvert : `<version>:ajout`, `<version>:revision`, `<version>:corriger:<ligne>`. */
  const [edition, setEdition] = useState<string | null>(null);
  const lecture = useRef(0);

  const charger = useCallback(async () => {
    const numero = ++lecture.current;
    try {
      const res = await fetch(`/api/praticien/decisions-parcours?idPatient=${encodeURIComponent(idPatient)}`);
      const data = (await res.json()) as DecisionsParcoursGetResponse;
      if (numero !== lecture.current) return;
      if (data.ok) {
        setDonnees(data);
        setErreurLecture(false);
      } else {
        setErreurLecture(true);
      }
    } catch {
      if (numero === lecture.current) setErreurLecture(true);
    }
  }, [idPatient]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const envoyer = async (corps: Record<string, unknown>) => {
    setEnvoi(true);
    setMessage(null);
    try {
      const res = await fetch('/api/praticien/decisions-parcours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, ...corps }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string; error?: string };
      if (data.ok) {
        setEdition(null);
        await charger();
      } else {
        setMessage(data.error ?? 'Le geste n’a pas pu être enregistré.');
        if (data.reason && REFUS_PERIMES.has(data.reason)) {
          setEdition(null);
          await charger();
        }
      }
    } catch {
      setMessage('Le geste n’a pas pu être enregistré. Réessayez.');
    } finally {
      setEnvoi(false);
    }
  };

  if (erreurLecture && !donnees) {
    return (
      <p role="alert" className="text-sm text-foreground">
        Les décisions de parcours n’ont pas pu être lues.{' '}
        <button type="button" onClick={() => void charger()} className="min-h-11 underline">Réessayer</button>
      </p>
    );
  }
  if (!donnees) return <p className="text-sm text-muted-foreground" role="status">Chargement…</p>;

  const actif = !donnees.mineur && !envoi;
  const retirer = (version: VersionLue, ligne: DecisionLue) =>
    void envoyer({ acte: 'retrait', idVersion: version.id, remplace: ligne.id });

  const blocVersion = (version: VersionLue) => {
    const fils = filsDeLaVersion(donnees.decisions, version.id);
    const revision = revisionEnVigueur(fils);
    const filRevision = fils.find(f => f.tete !== null && f.tete.id === revision?.id);
    const filsVivants = fils.filter(f => familleDuFil(f) !== 'revision' && f.tete !== null);
    const filsRetires = fils.filter(f => f.tete === null);
    const portees = [...new Set(filsVivants.filter(f => familleDuFil(f) === 'mise_en_oeuvre').map(f => f.tete!.idAction))];
    const lacunaires = portees.filter(p => sequenceIncomplete(fils, p));
    const formulaire = (mode: Mode) => (
      <FormulaireDecision
        version={version}
        versions={donnees.versions}
        mode={mode}
        aujourdhui={donnees.aujourdhui}
        envoi={envoi}
        onEnvoyer={corps => void envoyer(corps)}
        onAnnuler={() => setEdition(null)}
      />
    );

    return (
      <li key={version.id} className="space-y-3 rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{libelleVersion(version)}</span>
          <span className="text-xs text-muted-foreground">{version.diffuseeLe ? `première diffusion le ${jour(version.diffuseeLe)}` : 'non diffusée'}</span>
        </div>
        {version.actions === null && (
          <p className="text-xs text-muted-foreground">Le contenu de cette version ne se relit pas : aucune action n’y est désignable.</p>
        )}

        <section aria-label="Révision" className="space-y-1">
          <h4 className="text-xs font-semibold text-foreground">Révision</h4>
          {revision ? (
            <>
              <p className="text-sm text-foreground">{decrire(revision, version)}</p>
              <Details l={revision} versions={donnees.versions} />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune révision posée.</p>
          )}
          {version.diffuseeLe === null && <p className="text-xs text-muted-foreground">Révision et mise en œuvre se posent sur une version diffusée.</p>}
          {!donnees.mineur && version.diffuseeLe !== null && edition === null && (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!actif} className={classeBouton} onClick={() => setEdition(`${version.id}:revision`)}>
                {revision ? 'Corriger la révision' : 'Poser une révision'}
              </button>
              {revision && (
                <button type="button" disabled={!actif} className={classeBouton} onClick={() => retirer(version, revision)}>
                  Retirer (posée par erreur)
                </button>
              )}
            </div>
          )}
          {edition === `${version.id}:revision` && formulaire({ type: 'revision', remplace: revision?.id ?? null, initiale: revision })}
          {filRevision && <Historique lignes={filRevision.historique} version={version} />}
        </section>

        <section aria-label="Choix et mise en œuvre" className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Choix du patient et mise en œuvre</h4>
          {lacunaires.map(p => (
            <p key={p ?? ''} className="flex items-center gap-1 text-xs font-medium text-foreground">
              <AlertTriangle aria-hidden="true" size={14} className="text-accent" />
              {titreAction(version, p)} — {TEXTES.sequenceIncomplete}
            </p>
          ))}
          {filsVivants.length === 0 && <p className="text-xs text-muted-foreground">Aucune décision posée.</p>}
          <ul className="space-y-2">
            {filsVivants.map(f => {
              const t = f.tete!;
              const cle = `${version.id}:corriger:${t.id}`;
              return (
                <li key={t.id} className="space-y-1 border-b border-border pb-2 last:border-b-0">
                  <p className="text-sm text-foreground">{decrire(t, version)}</p>
                  <Details l={t} versions={donnees.versions} />
                  {!donnees.mineur && edition === null && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={!actif} className={classeBouton} onClick={() => setEdition(cle)}>
                        Corriger
                      </button>
                      <button type="button" disabled={!actif} className={classeBouton} onClick={() => retirer(version, t)}>
                        Retirer (posée par erreur)
                      </button>
                    </div>
                  )}
                  {edition === cle && formulaire({ type: 'corriger', ligne: t })}
                  <Historique lignes={f.historique} version={version} />
                </li>
              );
            })}
          </ul>
          {!donnees.mineur && edition === null && (
            <button type="button" disabled={!actif} className={classeBouton} onClick={() => setEdition(`${version.id}:ajout`)}>
              Ajouter une décision
            </button>
          )}
          {edition === `${version.id}:ajout` && formulaire({ type: 'ajout' })}
        </section>

        {/* Un fil retiré reste lisible, avec son retrait (§5 : un refus
            levé se retire, et l'historique le garde). */}
        {filsRetires.length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="min-h-11 cursor-pointer py-2">Décisions retirées ({filsRetires.length})</summary>
            <ul className="space-y-2 pl-4">
              {filsRetires.map(f => {
                const derniere = f.historique.filter(l => l.acte === 'pose').at(-1) ?? f.racine;
                return (
                  <li key={f.racine.id}>
                    <p>{decrire(derniere, version)} — retirée</p>
                    <ol className="space-y-1 pl-4">
                      {[...f.historique].reverse().map(l => (
                        <li key={l.id}>
                          {decrire(l, version)}
                          {l.motif ? ` (${LIBELLES_MOTIF[l.motif] ?? l.motif})` : ''} — le {jour(l.acteLe)}
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {donnees.mineur && (
        <p role="status" className="text-sm text-foreground">
          Ce dossier est celui d’un mineur : aucune décision ne s’y pose.
        </p>
      )}
      {/* Une relecture en échec se dit, même quand des données restent
          affichées : elles peuvent être périmées. */}
      {erreurLecture && (
        <p role="alert" className="text-sm text-foreground">
          La relecture a échoué : ce qui suit peut ne plus être à jour.{' '}
          <button type="button" onClick={() => void charger()} className="min-h-11 underline">Réessayer</button>
        </p>
      )}
      {message && <p role="alert" className="text-sm text-foreground">{message}</p>}
      <p className="text-xs text-muted-foreground">{TEXTES.rappelEffetIndesirable}</p>
      {donnees.versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune version du protocole dans ce dossier.</p>
      ) : (
        <ul className="space-y-3">{donnees.versions.map(blocVersion)}</ul>
      )}
    </div>
  );
}
