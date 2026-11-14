'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { formaterDatePeriode, valeurDatePeriode } from '@/lib/physio-traitements/dates';
import {
  BLOCS_PATIENT,
  CHAMPS_PATIENT,
  DATE_INCONNUE_PATIENT,
  LIBELLES_PRESCRIT_PATIENT,
  LIBELLES_REPONSE_PATIENT,
  MENTION_SOURCE_PATIENT,
  NATURES,
  QUESTION_CYCLES,
  QUESTION_SEXE,
  REPONSES_PAR_CRITERE,
  SEXES_OUVRANT_LE_STATUT,
  type Nature,
  type PrescritParTiers,
} from '@/lib/physio-traitements/liste';
import type { PortailPhysioTraitementsResponse } from '@/app/api/portail/physio-traitements/route';
import type { DonneesDuPatient, TraitementPatient } from '@/lib/physio-traitements/lecture';
import { ChampDatePeriode } from './ChampDatePeriode';
import { corpsTraitement, FormulaireTraitement } from './FormulaireTraitement';

// CE QUE LE PATIENT DÉCLARE LUI-MÊME, LIGNE PAR LIGNE ([[D-335]] §2-§6) : son
// sexe, ses cycles s'il y a lieu, ses médicaments et compléments en cours.
// Chaque geste s'enregistre seul, à l'envoi ; rien n'est réécrit — un arrêt
// est une ligne de plus, et une ligne qu'il a ajoutée par erreur se supprime.
// Libellés validés le 2026-10-21 (« Vos données personnelles » v20).
//
// `parties` : la fiche de renseignements les répartit entre ses sections
// (« Repères corporels » pour le sexe et les cycles, « Traitements et
// compléments » pour les traitements) ; la page de la fiche les montre toutes.
//
// FAIL-CLOSED : tant que la route n'a pas répondu « ouvert », rien ne s'affiche.
//
// Prototype PAT-6 ([[D-481]], complément DOC-11) : les mentions datées en
// lettres (Q7 a) ; l'erreur d'un enregistrement à l'endroit du geste, sans
// doublon (Q5 a) ; l'état confirmé par le serveur et relu, annoncé aux
// lecteurs d'écran sans texte neuf (Q6 a) ; sur la page de la fiche seule, une
// lecture refusée en 401 renvoie à l'entrée (Q4 a). La fiche de l'entrée (U07)
// ne passe pas `onSessionExpiree` et garde son comportement de lecture.

type Ouverte = Extract<PortailPhysioTraitementsResponse, { saisieOuverte: boolean }>;

// Un horodatage d'acte : le jour se lit à l'heure de Paris, comme avant ;
// seule la forme passe des chiffres aux lettres (Q7 a).
const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' });

const texteMention = (ligne: { source: 'patient' | 'praticien'; acteLe: string }) =>
  `${MENTION_SOURCE_PATIENT[ligne.source]} ${jour(ligne.acteLe)}`;

const titreLigne = (t: TraitementPatient) =>
  `${t.nom}${t.dose ? ` — ${t.dose}` : ''}${t.moment ? ` — ${t.moment}` : ''}`;

const classeBouton = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50';
const classePrincipal = 'min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50';

function Mention({ ligne }: { ligne: { source: 'patient' | 'praticien'; acteLe: string } }) {
  return <p className="text-xs text-muted-foreground">{texteMention(ligne)}</p>;
}

function QuestionFermee({
  critere,
  question,
  tete,
  envoi,
  actif,
  poseOuverte = true,
  erreur,
  onEnvoyer,
}: {
  critere: 'sexe_declare' | 'statut_menstruel';
  question: string;
  tete: DonneesDuPatient['criteres'][number]['tete'];
  envoi: boolean;
  actif: boolean;
  /** Le statut menstruel ne se pose plus quand le sexe déclaré ne l'ouvre pas ; il se supprime encore. */
  poseOuverte?: boolean;
  /** Le message d'un enregistrement de cette question qui a échoué (Q5 a). */
  erreur?: ReactNode;
  onEnvoyer: (corps: Record<string, unknown>) => void;
}) {
  const [choix, setChoix] = useState(tete?.reponse ?? '');
  const inchange = choix === (tete?.reponse ?? '');
  return (
    <div role="group" className="space-y-2">
      <fieldset className="space-y-1 text-sm text-foreground" disabled={!actif || envoi || !poseOuverte}>
        <legend className="text-sm font-medium text-foreground">{question}</legend>
        {REPONSES_PAR_CRITERE[critere].map(r => (
          <label key={r} className="flex min-h-11 items-center gap-2">
            <input type="radio" name={`patient-${critere}`} value={r} checked={choix === r} onChange={() => setChoix(r)} />
            {LIBELLES_REPONSE_PATIENT[critere][r]}
          </label>
        ))}
      </fieldset>
      {tete && <Mention ligne={tete} />}
      {erreur}
      {actif && (
        <div className="flex flex-wrap gap-2">
          {poseOuverte && (
          <button
            type="button"
            disabled={envoi || !choix || inchange}
            className={classePrincipal}
            onClick={() => onEnvoyer({ objet: 'physio', acte: 'pose', critere, remplace: tete?.id ?? null, reponse: choix })}
          >
            Enregistrer
          </button>
          )}
          {tete?.source === 'patient' && (
            <button
              type="button"
              disabled={envoi}
              className={classeBouton}
              onClick={() => onEnvoyer({ objet: 'physio', acte: 'retrait', critere, remplace: tete.id })}
            >
              {CHAMPS_PATIENT.supprimer}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function valeursDe(t: TraitementPatient, fin: string | null) {
  return {
    nom: t.nom ?? '',
    dose: t.dose ?? '',
    moment: t.moment ?? '',
    motif: t.motif ?? '',
    debut: valeurDatePeriode(t.debut, t.debutPrecision) ?? 'inconnu',
    fin,
    prescritParTiers: (t.prescritParTiers ?? '') as PrescritParTiers | '',
  };
}

export function DeclarationsPatient({
  parties,
  onEditionChange,
  onLectureEchouee,
  onSessionExpiree,
}: {
  parties: 'sexe' | 'traitements' | 'tout';
  /** Une ligne est en cours de saisie, non enregistrée : la fiche englobante ne se valide pas. */
  onEditionChange?: (ouverte: boolean) => void;
  /**
   * La partie n'a pas pu être lue : la fiche englobante ne se valide pas, car
   * ces lignes REMPLACENT des groupes de texte libre — sans elles, le patient
   * n'aurait aucun moyen de déclarer ses traitements (revue CodeRabbit, P1).
   */
  onLectureEchouee?: (echouee: boolean) => void;
  /**
   * Page de la fiche (U35) seule (Q4 a) : une LECTURE refusée en 401 y renvoie
   * à l'entrée. Une erreur réseau ou une lecture indisponible garde sa phrase
   * et « Réessayer ». Doit être stable (`useCallback`) : il entre dans la
   * lecture.
   */
  onSessionExpiree?: () => void;
}) {
  const [donnees, setDonnees] = useState<Ouverte | null>(null);
  const [illisible, setIllisible] = useState(false);
  // L'ancre dit où le message s'affiche : la question, la ligne ou le
  // formulaire dont l'enregistrement a échoué (Q5 a).
  const [message, setMessage] = useState<{ texte: string; ancre: string } | null>(null);
  // L'état confirmé par le serveur et relu, annoncé par une région `status`
  // (Q6 a) : jamais avant la confirmation, jamais sur une relecture en échec.
  const [annonce, setAnnonce] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [edition, setEdition] = useState<string | null>(null);
  const [finArret, setFinArret] = useState('');
  const lecture = useRef(0);

  useEffect(() => {
    onEditionChange?.(edition !== null);
  }, [edition, onEditionChange]);
  // Démonté (changement de section), plus rien n'est en cours de saisie ici.
  useEffect(() => () => onEditionChange?.(false), [onEditionChange]);
  useEffect(() => {
    onLectureEchouee?.(illisible);
  }, [illisible, onLectureEchouee]);
  useEffect(() => () => onLectureEchouee?.(false), [onLectureEchouee]);

  // Rend les données relues, ou `null` quand la lecture n'a pas abouti (ou a
  // été dépassée par une plus récente).
  const charger = useCallback(async (): Promise<Ouverte | null> => {
    const numero = ++lecture.current;
    try {
      const res = await fetch('/api/portail/physio-traitements');
      if (res.status === 401 && onSessionExpiree) {
        if (numero === lecture.current) onSessionExpiree();
        return null;
      }
      const data = (await res.json()) as PortailPhysioTraitementsResponse;
      if (numero !== lecture.current) return null;
      if (res.ok && data.ok && 'saisieOuverte' in data) {
        setDonnees(data);
        setIllisible(false);
        return data;
      }
      setIllisible(true);
    } catch {
      if (numero === lecture.current) setIllisible(true);
    }
    return null;
  }, [onSessionExpiree]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const envoyer = async (
    corps: Record<string, unknown>,
    ancre: string,
    /** Le texte déjà affiché qui dit l'état confirmé, lu dans les données relues (Q6 a). */
    annoncer?: (relu: Ouverte) => string,
  ) => {
    setEnvoi(true);
    setMessage(null);
    setAnnonce('');
    try {
      const res = await fetch('/api/portail/physio-traitements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) setEdition(null);
      else setMessage({ texte: data.error ?? 'Votre demande n’a pas pu être enregistrée.', ancre });
      // Sur la page de la fiche, un enregistrement refusé en 401 ne se relit
      // pas : la relecture échouerait aussi et renverrait à l'entrée (Q4 a),
      // emportant la saisie que l'échec doit garder.
      if (res.status === 401 && onSessionExpiree) return;
      const relu = await charger();
      if (data.ok && relu && annoncer) setAnnonce(annoncer(relu));
    } catch {
      setMessage({ texte: 'Votre demande n’a pas pu être enregistrée. Réessayez.', ancre });
    } finally {
      setEnvoi(false);
    }
  };

  // Une lecture en échec se dit, qu'il y ait déjà des données ou non : après
  // une écriture, les données conservées sont celles d'avant (revue
  // CodeRabbit).
  const alerteLecture = illisible ? (
    <p role="alert" className="text-sm text-foreground">
      Cette partie de votre fiche n’a pas pu être chargée.{' '}
      <button type="button" onClick={() => void charger()} className="min-h-11 underline">Réessayer</button>
    </p>
  ) : null;
  if (!donnees) return alerteLecture;
  const actif = donnees.saisieOuverte;
  const sexe = donnees.donnees.criteres.find(c => c.critere === 'sexe_declare')?.tete ?? null;
  const cycles = donnees.donnees.criteres.find(c => c.critere === 'statut_menstruel')?.tete ?? null;
  const cyclesOuverts = sexe !== null && SEXES_OUVRANT_LE_STATUT.includes(sexe.reponse ?? '');
  const cyclesAffiches = cyclesOuverts || cycles !== null;

  // Q5 a : le message paraît là où le patient a agi. Si ce lieu n'est plus à
  // l'écran (la ligne a disparu à la relecture), il paraît en tête, une fois.
  const ancrePresente = (ancre: string) => {
    if (ancre === 'critere:sexe_declare') return parties !== 'traitements';
    if (ancre === 'critere:statut_menstruel') return parties !== 'traitements' && cyclesAffiches;
    if (parties === 'sexe') return false;
    if (ancre.startsWith('ajout:')) return edition === ancre;
    const present = donnees.donnees.traitements.some(t => ancre === `ligne:${t.id}` || ancre === `arret:${t.id}`);
    return present && (ancre.startsWith('ligne:') || edition === ancre);
  };
  const erreurA = (ancre: string) =>
    message?.ancre === ancre ? <p role="alert" className="text-sm text-foreground">{message.texte}</p> : null;

  // Q6 a : la réponse retenue et sa mention, telles qu'affichées.
  const annonceCritere = (critere: 'sexe_declare' | 'statut_menstruel', avant: typeof sexe) => (relu: Ouverte) => {
    const tete = relu.donnees.criteres.find(c => c.critere === critere)?.tete ?? null;
    if (!tete || tete.id === avant?.id) return '';
    return `${LIBELLES_REPONSE_PATIENT[critere][tete.reponse ?? ''] ?? ''} — ${texteMention(tete)}`;
  };
  // Q6 a : la ligne neuve (un ajout, ou l'arrêt, qui est une ligne de plus) et sa mention.
  const connues = new Set(donnees.donnees.traitements.map(t => t.id));
  const annonceLigneNeuve = (relu: Ouverte) => {
    const neuve = relu.donnees.traitements.find(t => !connues.has(t.id));
    return neuve ? `${titreLigne(neuve)} — ${texteMention(neuve)}` : '';
  };

  const blocTraitements = (nature: Nature) => {
    const lignes = donnees.donnees.traitements.filter(t => t.nature === nature);
    const bloc = BLOCS_PATIENT[nature];
    return (
      <div key={nature} className="space-y-2">
        <p className="text-sm font-medium text-foreground">{bloc.titre}</p>
        {lignes.map(t => {
          const enCours = t.finPrecision === null;
          return (
            <div key={t.id} className="space-y-1 rounded-lg border border-border p-3">
              <p className="text-sm text-foreground">{titreLigne(t)}</p>
              <p className="text-xs text-muted-foreground">
                {CHAMPS_PATIENT.depuis} : {formaterDatePeriode(t.debut, t.debutPrecision, DATE_INCONNUE_PATIENT)}
                {!enCours && ` · ${CHAMPS_PATIENT.arret} (${formaterDatePeriode(t.fin, t.finPrecision, DATE_INCONNUE_PATIENT)})`}
              </p>
              {t.motif && <p className="text-xs text-muted-foreground">{bloc.motif} : {t.motif}</p>}
              <p className="text-xs text-muted-foreground">
                {CHAMPS_PATIENT.prescrit} {LIBELLES_PRESCRIT_PATIENT[(t.prescritParTiers ?? 'inconnu') as PrescritParTiers]}
              </p>
              <Mention ligne={t} />
              {erreurA(`ligne:${t.id}`)}
              {actif && edition === null && (
                <div className="flex flex-wrap gap-2">
                  {enCours && (
                    <button
                      type="button"
                      disabled={envoi}
                      className={classeBouton}
                      onClick={() => {
                        setFinArret('');
                        setEdition(`arret:${t.id}`);
                      }}
                    >
                      {CHAMPS_PATIENT.arret}
                    </button>
                  )}
                  {t.source === 'patient' && (
                    <button
                      type="button"
                      disabled={envoi}
                      className={classeBouton}
                      onClick={() => void envoyer({ objet: 'traitement', acte: 'retrait', remplace: t.id }, `ligne:${t.id}`)}
                    >
                      {CHAMPS_PATIENT.supprimer}
                    </button>
                  )}
                </div>
              )}
              {edition === `arret:${t.id}` && (
                <div role="group" className="space-y-2">
                  <ChampDatePeriode
                    legende={CHAMPS_PATIENT.arretDepuis}
                    valeur=""
                    onChange={setFinArret}
                    libelleInconnue={DATE_INCONNUE_PATIENT}
                    desactive={envoi}
                    idBase={`portail-arret-${t.id}`}
                  />
                  {erreurA(`arret:${t.id}`)}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={envoi}
                      className={classePrincipal}
                      onClick={() => void envoyer(
                        { objet: 'traitement', acte: 'pose', remplace: t.id, ...corpsTraitement(nature, valeursDe(t, finArret)) },
                        `arret:${t.id}`,
                        annonceLigneNeuve,
                      )}
                    >
                      Enregistrer
                    </button>
                    <button type="button" disabled={envoi} onClick={() => setEdition(null)} className={classeBouton}>Annuler</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {actif && edition === null && (
          <button type="button" disabled={envoi} className={classeBouton} onClick={() => setEdition(`ajout:${nature}`)}>
            + {bloc.ajout}
          </button>
        )}
        {edition === `ajout:${nature}` && (
          <FormulaireTraitement
            nature={nature}
            avecFin={false}
            libelleEnvoi="Enregistrer"
            envoi={envoi}
            idBase={`portail-ajout-${nature}`}
            erreur={erreurA(`ajout:${nature}`)}
            onEnvoyer={v => void envoyer(
              { objet: 'traitement', acte: 'pose', remplace: null, ...corpsTraitement(nature, v) },
              `ajout:${nature}`,
              annonceLigneNeuve,
            )}
            onAnnuler={() => setEdition(null)}
          />
        )}
      </div>
    );
  };

  return (
    // Entrée dans un champ ne soumet pas la fiche englobante (revue
    // `wn-reviewer`, P1) : la ligne s'enregistre par son bouton, rien d'autre.
    <div
      className="space-y-4"
      onKeyDown={e => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault();
      }}
    >
      {alerteLecture}
      <p role="status" className="sr-only">{annonce}</p>
      {message && !ancrePresente(message.ancre) && <p role="alert" className="text-sm text-foreground">{message.texte}</p>}
      {!actif && (
        <p className="text-sm text-muted-foreground">Cette partie de votre fiche ne peut pas être modifiée pour le moment.</p>
      )}
      {parties !== 'traitements' && (
        <>
          <QuestionFermee
            key={`sexe-${sexe?.id ?? 'aucune'}`}
            critere="sexe_declare"
            question={QUESTION_SEXE}
            tete={sexe}
            envoi={envoi}
            actif={actif}
            erreur={erreurA('critere:sexe_declare')}
            onEnvoyer={corps => void envoyer(
              corps,
              'critere:sexe_declare',
              corps.acte === 'pose' ? annonceCritere('sexe_declare', sexe) : undefined,
            )}
          />
          {cyclesAffiches && (
            <QuestionFermee
              key={`cycles-${cycles?.id ?? 'aucune'}`}
              critere="statut_menstruel"
              question={QUESTION_CYCLES}
              tete={cycles}
              envoi={envoi}
              actif={actif}
              poseOuverte={cyclesOuverts}
              erreur={erreurA('critere:statut_menstruel')}
              onEnvoyer={corps => void envoyer(
                corps,
                'critere:statut_menstruel',
                corps.acte === 'pose' ? annonceCritere('statut_menstruel', cycles) : undefined,
              )}
            />
          )}
        </>
      )}
      {parties !== 'sexe' && NATURES.map(blocTraitements)}
    </div>
  );
}
