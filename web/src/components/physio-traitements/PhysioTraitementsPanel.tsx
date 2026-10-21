'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formaterDatePeriode, formaterJour, valeurDatePeriode } from '@/lib/physio-traitements/dates';
import {
  BLOCS_PATIENT,
  LIBELLES_CRITERE,
  LIBELLES_NATURE,
  LIBELLES_REPONSE,
  LIBELLES_SOURCE_PRATICIEN,
  NATURES,
  NON_RENSEIGNE,
  REPONSES_PAR_CRITERE,
  SEXES_OUVRANT_LE_STATUT,
  UNITES,
  type Critere,
  type CritereFerme,
  type Nature,
  type PrescritParTiers,
} from '@/lib/physio-traitements/liste';
import type { CritereAuCockpit, PhysioTraitementsGetResponse } from '@/app/api/praticien/physio-traitements/route';
import type { LignePhysioLue, LigneTraitementLue } from '@/lib/physio-traitements/lecture';
import { ChampDatePeriode } from './ChampDatePeriode';
import { corpsTraitement, FormulaireTraitement, type ValeursTraitement } from './FormulaireTraitement';

// LES DONNÉES PHYSIOLOGIQUES ET LES TRAITEMENTS EN COURS, AU COCKPIT
// ([[D-335]], BP-13). Chaque ligne dit sa source (« déclaré par le patient »,
// « confirmé par le praticien ») et sa date ; « inconnu » est une réponse
// écrite, distincte de « non renseigné » ; l'historique reste lisible. Le
// praticien confirme (la même ligne, en remplacement), corrige, arrête un
// traitement ou retire une ligne posée par erreur.
//
// À CÔTÉ de grossesse, allaitement, taille et poids : ce que l'anamnèse
// déclare, et la DISCORDANCE s'il y en a une — montrée, jamais résolue
// (DC-30). Aucun calcul : ni IMC, ni variation de poids ([[D-335]] §2).
//
// Monté seulement sous `WN_PHYSIO_TRAITEMENTS` (la fiche lit le drapeau au
// serveur) ; la route le garde de son côté.

type Donnees = Extract<PhysioTraitementsGetResponse, { ok: true }>;

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' });

const DATE_INCONNUE = 'date inconnue';

/** Les refus nés d'une lecture périmée : le panneau relit la fiche. */
const REFUS_PERIMES = new Set(['tete_changee', 'ligne_inconnue', 'conflit_concurrent', 'refus_base', 'statut_sans_sexe']);

function decrirePhysio(ligne: LignePhysioLue): string {
  if (ligne.acte === 'retrait') return 'retrait de la ligne en vigueur';
  if (ligne.mesure !== null) {
    const unite = ligne.critere === 'poids' || ligne.critere === 'taille' ? UNITES[ligne.critere] : '';
    return `${ligne.mesure.replace('.', ',')} ${unite}${ligne.mesureLe ? `, mesuré le ${formaterJour(ligne.mesureLe)}` : ''}`;
  }
  return LIBELLES_REPONSE[ligne.reponse ?? ''] ?? ligne.reponse ?? '';
}

function decrireTraitement(t: LigneTraitementLue): string {
  if (t.acte === 'retrait') return 'retrait de la ligne en vigueur';
  const nature = t.nature === 'medicament' || t.nature === 'complement' ? LIBELLES_NATURE[t.nature] : 'Traitement';
  return `${nature} : ${t.nom ?? ''}${t.dose ? ` (${t.dose})` : ''}`;
}

function Source({ ligne }: { ligne: { source: 'patient' | 'praticien'; acteLe: string } }) {
  return (
    <span className="text-xs text-muted-foreground">
      {LIBELLES_SOURCE_PRATICIEN[ligne.source]} le {jour(ligne.acteLe)}
    </span>
  );
}

function Historique<L extends { id: string; source: 'patient' | 'praticien'; acteLe: string }>({
  lignes,
  decrire,
}: {
  lignes: L[];
  decrire: (l: L) => string;
}) {
  if (lignes.length < 2) return null;
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="min-h-11 cursor-pointer py-2">Historique ({lignes.length} lignes)</summary>
      <ol className="space-y-1 pl-4">
        {[...lignes].reverse().map(l => (
          <li key={l.id}>
            {decrire(l)} — {LIBELLES_SOURCE_PRATICIEN[l.source]} le {jour(l.acteLe)}
          </li>
        ))}
      </ol>
    </details>
  );
}

const classeBouton = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50';
const classePrincipal = 'min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50';

function FormulairePhysio({
  critere,
  remplace,
  initiale,
  aujourdhui,
  envoi,
  onEnvoyer,
  onAnnuler,
}: {
  critere: Critere;
  remplace: string | null;
  initiale: LignePhysioLue | null;
  aujourdhui: string;
  envoi: boolean;
  onEnvoyer: (corps: Record<string, unknown>) => void;
  onAnnuler: () => void;
}) {
  const mesuree = critere === 'poids' || critere === 'taille';
  const [reponse, setReponse] = useState(initiale?.reponse ?? '');
  const [mesure, setMesure] = useState(initiale?.mesure?.replace('.', ',') ?? '');
  const [mesureLe, setMesureLe] = useState(initiale?.mesureLe ?? aujourdhui);
  return (
    <form
      className="space-y-2 rounded-lg border border-border p-3"
      onSubmit={e => {
        e.preventDefault();
        onEnvoyer(mesuree
          ? { objet: 'physio', acte: 'pose', critere, remplace, mesure, mesureLe }
          : { objet: 'physio', acte: 'pose', critere, remplace, reponse });
      }}
    >
      {mesuree ? (
        <div className="flex flex-wrap gap-3">
          <label className="text-xs text-muted-foreground">
            {LIBELLES_CRITERE[critere]} ({UNITES[critere]})
            <input
              inputMode="decimal"
              value={mesure}
              disabled={envoi}
              onChange={e => setMesure(e.target.value)}
              className="mt-1 block min-h-11 w-28 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Mesuré le
            <input
              type="date"
              value={mesureLe}
              max={aujourdhui}
              disabled={envoi}
              onChange={e => setMesureLe(e.target.value)}
              className="mt-1 block min-h-11 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
        </div>
      ) : (
        <fieldset className="flex flex-wrap gap-3 text-sm text-foreground" disabled={envoi}>
          <legend className="sr-only">{LIBELLES_CRITERE[critere]}</legend>
          {REPONSES_PAR_CRITERE[critere as CritereFerme].map(r => (
            <label key={r} className="flex min-h-11 items-center gap-2">
              <input type="radio" name={`physio-${critere}`} value={r} checked={reponse === r} onChange={() => setReponse(r)} />
              {LIBELLES_REPONSE[r]}
            </label>
          ))}
        </fieldset>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={envoi} className={classePrincipal}>Enregistrer</button>
        <button type="button" disabled={envoi} onClick={onAnnuler} className={classeBouton}>Annuler</button>
      </div>
    </form>
  );
}

function valeursDe(t: LigneTraitementLue): ValeursTraitement {
  return {
    nom: t.nom ?? '',
    dose: t.dose ?? '',
    moment: t.moment ?? '',
    motif: t.motif ?? '',
    debut: valeurDatePeriode(t.debut, t.debutPrecision) ?? '',
    fin: valeurDatePeriode(t.fin, t.finPrecision),
    prescritParTiers: (t.prescritParTiers ?? '') as PrescritParTiers | '',
  };
}

export function PhysioTraitementsPanel({ idPatient }: { idPatient: string }) {
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreurLecture, setErreurLecture] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  /** Le formulaire ouvert : `physio:<critère>`, `traitement:<id>:<geste>`, `ajout:<nature>`. */
  const [edition, setEdition] = useState<string | null>(null);
  const [finArret, setFinArret] = useState('');
  const lecture = useRef(0);

  const charger = useCallback(async () => {
    const numero = ++lecture.current;
    try {
      const res = await fetch(`/api/praticien/physio-traitements?idPatient=${encodeURIComponent(idPatient)}`);
      const data = (await res.json()) as PhysioTraitementsGetResponse;
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
      const res = await fetch('/api/praticien/physio-traitements', {
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
        Les données physiologiques et les traitements n’ont pas pu être lus.{' '}
        <button type="button" onClick={() => void charger()} className="underline">Réessayer</button>
      </p>
    );
  }
  if (!donnees) return <p className="text-sm text-muted-foreground" role="status">Chargement…</p>;

  const sexe = donnees.criteres.find(c => c.critere === 'sexe_declare')?.tete?.reponse ?? null;
  const statutOuvert = sexe !== null && SEXES_OUVRANT_LE_STATUT.includes(sexe);
  const actif = !donnees.mineur && !envoi;
  const anamneseDu = donnees.anamneseDu ? jour(donnees.anamneseDu) : null;

  const ligneCritere = (c: CritereAuCockpit) => {
    const ouvert = edition === `physio:${c.critere}`;
    const poseOuverte = c.critere !== 'statut_menstruel' || statutOuvert;
    return (
      <li key={c.critere} className="space-y-1 border-b border-border py-2 last:border-b-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{LIBELLES_CRITERE[c.critere]}</span>
          <span className="text-sm text-foreground">{c.tete ? decrirePhysio(c.tete) : NON_RENSEIGNE}</span>
        </div>
        {c.tete && <Source ligne={c.tete} />}
        {c.anamnese && (
          <p className="text-xs text-muted-foreground">
            {anamneseDu
              ? `Déclaré à l’anamnèse du ${anamneseDu} : ${c.anamnese.valeur ?? 'sans réponse'}`
              : 'Aucune anamnèse validée.'}
          </p>
        )}
        {c.discordant && (
          <p className="flex items-center gap-1 text-xs font-medium text-foreground">
            <AlertTriangle aria-hidden="true" size={14} className="text-accent" />
            Discordance avec l’anamnèse — à reprendre avec le patient.
          </p>
        )}
        {!poseOuverte && (
          <p className="text-xs text-muted-foreground">Se pose quand le sexe déclaré en vigueur est féminin ou autre.</p>
        )}
        {/* Le retrait reste offert quand la pose ne l'est plus : un statut
            menstruel resté en vigueur après un changement de sexe déclaré se
            retire (revue `wn-reviewer`, P2). */}
        {!donnees.mineur && (poseOuverte || c.tete) && !ouvert && (
          <div className="flex flex-wrap gap-2">
            {poseOuverte && c.tete && (
              <button
                type="button"
                disabled={!actif}
                className={classeBouton}
                onClick={() => void envoyer(c.tete!.mesure !== null
                  ? { objet: 'physio', acte: 'pose', critere: c.critere, remplace: c.tete!.id, mesure: c.tete!.mesure, mesureLe: c.tete!.mesureLe }
                  : { objet: 'physio', acte: 'pose', critere: c.critere, remplace: c.tete!.id, reponse: c.tete!.reponse })}
              >
                Confirmer
              </button>
            )}
            {poseOuverte && (
              <button type="button" disabled={!actif} className={classeBouton} onClick={() => setEdition(`physio:${c.critere}`)}>
                {c.tete ? 'Corriger' : 'Renseigner'}
              </button>
            )}
            {c.tete && (
              <button
                type="button"
                disabled={!actif}
                className={classeBouton}
                onClick={() => void envoyer({ objet: 'physio', acte: 'retrait', critere: c.critere, remplace: c.tete!.id })}
              >
                Retirer (posée par erreur)
              </button>
            )}
          </div>
        )}
        {ouvert && (
          <FormulairePhysio
            critere={c.critere}
            remplace={c.tete?.id ?? null}
            initiale={c.tete}
            aujourdhui={donnees.aujourdhui}
            envoi={envoi}
            onEnvoyer={corps => void envoyer(corps)}
            onAnnuler={() => setEdition(null)}
          />
        )}
        <Historique lignes={c.historique} decrire={decrirePhysio} />
      </li>
    );
  };

  const filsVivants = donnees.traitements.filter(f => f.tete !== null);

  return (
    <div className="space-y-4">
      {donnees.mineur && (
        <p role="status" className="text-sm text-foreground">
          Ce dossier est celui d’un mineur : aucune donnée ne s’y pose.
        </p>
      )}
      {/* Une relecture en échec se dit, même quand des données restent
          affichées : elles peuvent être périmées (revue CodeRabbit). */}
      {erreurLecture && (
        <p role="alert" className="text-sm text-foreground">
          La relecture a échoué : ce qui suit peut ne plus être à jour.{' '}
          <button type="button" onClick={() => void charger()} className="underline">Réessayer</button>
        </p>
      )}
      {message && <p role="alert" className="text-sm text-foreground">{message}</p>}

      <section aria-labelledby="physio-titre" className="space-y-2">
        <h3 id="physio-titre" className="text-sm font-semibold text-foreground">Données physiologiques</h3>
        <p className="text-xs text-muted-foreground">
          Déclarées, jamais déduites. « inconnu » est une réponse ; « non renseigné » dit qu’aucune ligne n’est posée.
        </p>
        <ul>{donnees.criteres.map(ligneCritere)}</ul>
      </section>

      <section aria-labelledby="traitements-titre" className="space-y-2">
        <h3 id="traitements-titre" className="text-sm font-semibold text-foreground">Traitements et compléments en cours</h3>
        {filsVivants.length === 0 && <p className="text-sm text-muted-foreground">Aucun traitement renseigné.</p>}
        <ul className="space-y-2">
          {filsVivants.map(f => {
            const t = f.tete!;
            const nature: Nature = t.nature === 'complement' ? 'complement' : 'medicament';
            const enCours = t.finPrecision === null;
            const cle = `traitement:${t.id}`;
            return (
              <li key={t.id} className="space-y-1 rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">{decrireTraitement(t)}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs text-muted-foreground">
                  {t.moment && (<><dt>Moment de prise</dt><dd>{t.moment}</dd></>)}
                  {t.motif && (<><dt>{BLOCS_PATIENT[nature].motif}</dt><dd>{t.motif}</dd></>)}
                  <dt>Depuis</dt>
                  <dd>{formaterDatePeriode(t.debut, t.debutPrecision, DATE_INCONNUE)}</dd>
                  <dt>Statut</dt>
                  <dd>{enCours ? 'en cours' : `arrêté (${formaterDatePeriode(t.fin, t.finPrecision, DATE_INCONNUE)})`}</dd>
                  <dt>Prescrit par un autre soignant</dt>
                  <dd>{LIBELLES_REPONSE[t.prescritParTiers ?? ''] ?? NON_RENSEIGNE}</dd>
                </dl>
                <Source ligne={t} />
                {!donnees.mineur && edition === null && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!actif}
                      className={classeBouton}
                      onClick={() => void envoyer({
                        objet: 'traitement', acte: 'pose', remplace: t.id, ...corpsTraitement(nature, valeursDe(t)),
                      })}
                    >
                      Confirmer
                    </button>
                    <button type="button" disabled={!actif} className={classeBouton} onClick={() => setEdition(`${cle}:corriger`)}>
                      Corriger
                    </button>
                    {enCours && (
                      <button
                        type="button"
                        disabled={!actif}
                        className={classeBouton}
                        onClick={() => {
                          setFinArret('');
                          setEdition(`${cle}:arreter`);
                        }}
                      >
                        Noter l’arrêt
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!actif}
                      className={classeBouton}
                      onClick={() => void envoyer({ objet: 'traitement', acte: 'retrait', remplace: t.id })}
                    >
                      Retirer (posée par erreur)
                    </button>
                  </div>
                )}
                {edition === `${cle}:corriger` && (
                  <FormulaireTraitement
                    nature={nature}
                    initiales={valeursDe(t)}
                    avecFin={!enCours}
                    libelleEnvoi="Enregistrer la correction"
                    envoi={envoi}
                    idBase={`cockpit-${t.id}`}
                    onEnvoyer={v => void envoyer({ objet: 'traitement', acte: 'pose', remplace: t.id, ...corpsTraitement(nature, v) })}
                    onAnnuler={() => setEdition(null)}
                  />
                )}
                {edition === `${cle}:arreter` && (
                  <form
                    className="space-y-2 rounded-lg border border-border p-3"
                    onSubmit={e => {
                      e.preventDefault();
                      void envoyer({
                        objet: 'traitement', acte: 'pose', remplace: t.id, ...corpsTraitement(nature, { ...valeursDe(t), fin: finArret }),
                      });
                    }}
                  >
                    <ChampDatePeriode
                      legende="Arrêté depuis"
                      valeur=""
                      onChange={setFinArret}
                      libelleInconnue="Date inconnue"
                      desactive={envoi}
                      idBase={`cockpit-${t.id}-arret`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" disabled={envoi} className={classePrincipal}>Enregistrer l’arrêt</button>
                      <button type="button" disabled={envoi} onClick={() => setEdition(null)} className={classeBouton}>Annuler</button>
                    </div>
                  </form>
                )}
                <Historique lignes={f.historique} decrire={decrireTraitement} />
              </li>
            );
          })}
        </ul>
        {!donnees.mineur && (
          <div className="space-y-2">
            {edition === null && (
              <div className="flex flex-wrap gap-2">
                {NATURES.map(n => (
                  <button key={n} type="button" disabled={!actif} className={classeBouton} onClick={() => setEdition(`ajout:${n}`)}>
                    {BLOCS_PATIENT[n].ajout}
                  </button>
                ))}
              </div>
            )}
            {NATURES.map(n => edition === `ajout:${n}` && (
              <FormulaireTraitement
                key={n}
                nature={n}
                avecFin={false}
                libelleEnvoi="Enregistrer"
                envoi={envoi}
                idBase={`cockpit-ajout-${n}`}
                onEnvoyer={v => void envoyer({ objet: 'traitement', acte: 'pose', remplace: null, ...corpsTraitement(n, v) })}
                onAnnuler={() => setEdition(null)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
