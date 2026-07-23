'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BanniereDiffere } from '@/components/ui/BanniereDiffere';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QuestionField } from '@/components/patient/QuestionField';
import type { BibliothequeEntree } from '@/lib/bibliotheque';
import type { ApercuApiResponse } from '@/app/api/praticien/bibliotheque/apercu/route';
import type {
  FileEnvoiApiResponse,
  FileEnvoiBrouillon,
  MutateFileEnvoiResponse,
} from '@/app/api/praticien/file-envoi/route';
import type { EnvoyerFileResponse } from '@/app/api/praticien/file-envoi/envoyer/route';

type Rayon = 'questionnaires' | 'analyses' | 'conseils';

type PatientOption = { email: string; prenom: string; nom: string };

// Rayon Questionnaires de la Bibliothèque (arbitrages 2026-07-23) :
// chercher → prévisualiser tel que le patient le verra → ajouter à la file →
// envoyer, un seul mail et un seul lien portail par patient.
export function BibliothequePanel({ entrees }: { entrees: BibliothequeEntree[] }) {
  const [rayon, setRayon] = useState<Rayon>('questionnaires');
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState<string | null>(null);
  const [selectionId, setSelectionId] = useState<string>(entrees[0]?.id ?? '');
  const [apercu, setApercu] = useState<ApercuApiResponse['apercu']>(null);
  const [apercuEnCours, setApercuEnCours] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [brouillons, setBrouillons] = useState<FileEnvoiBrouillon[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const selection = useMemo(
    () => entrees.find(e => e.id === selectionId) ?? null,
    [entrees, selectionId],
  );

  const categories = useMemo(
    () => [...new Set(entrees.map(e => e.categorie))].sort((a, b) => a.localeCompare(b, 'fr')),
    [entrees],
  );

  const filtres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return entrees.filter(e => {
      if (categorie && e.categorie !== categorie) return false;
      if (!terme) return true;
      return (
        e.titre.toLowerCase().includes(terme) ||
        e.id.toLowerCase().includes(terme) ||
        e.categorie.toLowerCase().includes(terme)
      );
    });
  }, [entrees, recherche, categorie]);

  const chargerFile = useCallback(async () => {
    try {
      const res = await fetch('/api/praticien/file-envoi');
      const json = (await res.json()) as FileEnvoiApiResponse;
      setBrouillons(json.brouillons ?? []);
    } catch {
      setBrouillons([]);
    }
  }, []);

  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const res = await fetch('/api/praticien/patients');
        const json = (await res.json()) as {
          patients?: { email: string; prenom: string; nom: string; actif: string; suiviClotureLe: string | null }[];
        };
        if (!actif) return;
        setPatients(
          (json.patients ?? [])
            .filter(p => p.actif === 'OUI' && !p.suiviClotureLe)
            .map(p => ({ email: p.email, prenom: p.prenom, nom: p.nom })),
        );
      } catch {
        if (actif) setPatients([]);
      }
    })();
    void chargerFile();
    return () => {
      actif = false;
    };
  }, [chargerFile]);

  useEffect(() => {
    if (!selectionId) return;
    let actif = true;
    setApercuEnCours(true);
    (async () => {
      try {
        const res = await fetch(`/api/praticien/bibliotheque/apercu?id=${encodeURIComponent(selectionId)}`);
        const json = (await res.json()) as ApercuApiResponse;
        if (actif) setApercu(json.apercu);
      } catch {
        if (actif) setApercu(null);
      } finally {
        if (actif) setApercuEnCours(false);
      }
    })();
    return () => {
      actif = false;
    };
  }, [selectionId]);

  function basculerPick(email: string) {
    setPicks(prev => {
      const suivant = new Set(prev);
      if (suivant.has(email)) suivant.delete(email);
      else suivant.add(email);
      return suivant;
    });
  }

  async function ajouterALaFile() {
    if (!selection?.assignable || picks.size === 0) return;
    setOccupe(true);
    setMessage(null);
    setErreur(null);
    const echecs: string[] = [];
    for (const email of picks) {
      try {
        const res = await fetch('/api/praticien/file-envoi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailPatient: email, qids: [selection.id] }),
        });
        const json = (await res.json()) as MutateFileEnvoiResponse;
        if (!json.success) echecs.push(json.error ?? email);
      } catch {
        echecs.push(email);
      }
    }
    await chargerFile();
    setOccupe(false);
    if (echecs.length === 0) {
      setMessage(`« ${selection.titre} » ajouté à la file — rien ne part sans votre validation.`);
    } else {
      setErreur(`Ajout impossible pour : ${echecs.join(' · ')}`);
    }
  }

  async function retirer(idBrouillon: string, qid: string) {
    setErreur(null);
    await fetch(
      `/api/praticien/file-envoi?idBrouillon=${encodeURIComponent(idBrouillon)}&qid=${encodeURIComponent(qid)}`,
      { method: 'DELETE' },
    );
    await chargerFile();
  }

  async function envoyer(brouillon: FileEnvoiBrouillon) {
    setOccupe(true);
    setMessage(null);
    setErreur(null);
    try {
      const res = await fetch('/api/praticien/file-envoi/envoyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idBrouillon: brouillon.idBrouillon }),
      });
      const json = (await res.json()) as EnvoyerFileResponse;
      if (json.success) {
        setMessage(
          `${json.count} questionnaire(s) envoyé(s) à ${brouillon.prenom} ${brouillon.nom} — un seul mail, un seul lien portail.`,
        );
      } else {
        setErreur(json.error ?? "L'envoi a échoué.");
      }
    } catch {
      setErreur("L'envoi a échoué.");
    }
    await chargerFile();
    setOccupe(false);
  }

  const totalFile = brouillons.reduce((n, b) => n + b.items.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Rayons de la bibliothèque">
        <BoutonRayon actif={rayon === 'questionnaires'} onClick={() => setRayon('questionnaires')}>
          Questionnaires
        </BoutonRayon>
        <BoutonRayon actif={rayon === 'analyses'} onClick={() => setRayon('analyses')} aVenir>
          Analyses biologiques
        </BoutonRayon>
        <BoutonRayon actif={rayon === 'conseils'} onClick={() => setRayon('conseils')} aVenir>
          Fiches conseils
        </BoutonRayon>
      </div>

      {rayon === 'analyses' && (
        <BanniereDiffere>
          Le rayon Analyses biologiques ouvrira avec le catalogue et les packs de marqueurs par
          axe (série R5) ; la phase « résultats patients » attend l&apos;hébergement de données de
          santé.
        </BanniereDiffere>
      )}
      {rayon === 'conseils' && (
        <BanniereDiffere>
          Le rayon Fiches conseils reprendra la bibliothèque d&apos;interventions — compléments,
          boussole alimentaire et fiches conseils — avec le branchement du corpus. Provenance,
          statut et compatibilité avec le protocole actif resteront explicites.
        </BanniereDiffere>
      )}

      {rayon === 'questionnaires' && (
        <>
          {(message || erreur) && (
            <p
              role="status"
              className={`rounded-lg border px-4 py-2.5 text-sm ${
                erreur
                  ? 'border-status-danger/40 bg-status-danger/10 text-status-danger'
                  : 'border-status-success/40 bg-status-success/10 text-status-success'
              }`}
            >
              {erreur ?? message}
            </p>
          )}
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.05fr),minmax(0,1fr),minmax(280px,0.7fr)]">
            {/* Catalogue */}
            <section className="rounded-xl border border-border bg-surface shadow-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h3 className="font-display text-lg font-semibold text-foreground">Catalogue</h3>
                <span className="font-mono text-2xs text-muted-foreground">
                  {filtres.length}/{entrees.length} instruments
                </span>
              </div>
              <div className="border-b border-border px-5 py-3">
                <input
                  type="search"
                  value={recherche}
                  onChange={e => setRecherche(e.target.value)}
                  placeholder="Rechercher un titre, un code, un domaine…"
                  aria-label="Rechercher dans le catalogue"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto border-b border-border px-5 py-2.5">
                <ChipFiltre actif={categorie === null} onClick={() => setCategorie(null)}>
                  Tous
                </ChipFiltre>
                {categories.map(c => (
                  <ChipFiltre key={c} actif={categorie === c} onClick={() => setCategorie(c)}>
                    {c}
                  </ChipFiltre>
                ))}
              </div>
              <ul className="max-h-[520px] overflow-y-auto p-2">
                {filtres.map(e => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setSelectionId(e.id)}
                      aria-pressed={selectionId === e.id}
                      className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                        selectionId === e.id
                          ? 'bg-indigo-600/10 ring-1 ring-inset ring-indigo-600/40'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span className="block font-display text-sm font-semibold text-foreground">
                        {e.titre}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-2xs text-muted-foreground">
                          {e.id}
                          {e.nbQuestions != null ? ` · ${e.nbQuestions} questions` : ''}
                          {e.scoreMax != null ? ` · /${e.scoreMax}` : ''}
                        </span>
                        <Badge variant="neutral">{e.categorie}</Badge>
                        {e.certifie && <Badge variant="success">Certifié</Badge>}
                        {e.passationPraticien && <Badge variant="warning">Passation praticien</Badge>}
                        {e.aliasVers && <Badge variant="neutral">Alias historique</Badge>}
                      </span>
                    </button>
                  </li>
                ))}
                {filtres.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Aucun instrument ne correspond à cette recherche.
                  </li>
                )}
              </ul>
            </section>

            {/* Aperçu vierge */}
            <section className="rounded-xl border border-border bg-surface shadow-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h3 className="font-display text-lg font-semibold text-foreground">Aperçu vierge</h3>
                <span className="text-2xs text-muted-foreground">Tel que le patient le verra</span>
              </div>
              <div className="max-h-[430px] overflow-y-auto px-5 py-4">
                {apercuEnCours && <p className="text-sm text-muted-foreground">Chargement…</p>}
                {!apercuEnCours && !apercu && (
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez un instrument du catalogue pour l&apos;ouvrir ici.
                  </p>
                )}
                {!apercuEnCours && apercu && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="font-display text-base font-semibold text-foreground">
                        {apercu.titre}
                      </p>
                      <p className="mt-1 font-mono text-2xs text-muted-foreground">
                        {apercu.id}
                        {apercu.nbQuestions != null ? ` · ${apercu.nbQuestions} questions` : ''}
                        {apercu.scoreMax != null ? ` · score /${apercu.scoreMax}` : ''}
                      </p>
                      {apercu.aliasDe && (
                        <p className="mt-1 text-2xs text-muted-foreground">
                          Grille portée par {apercu.id} — l&apos;entrée {apercu.aliasDe} est un
                          alias historique.
                        </p>
                      )}
                      {apercu.administrationMode === 'clinicien' && (
                        <p className="mt-1 text-2xs text-status-warning">
                          Instrument à faire passer en consultation — jamais envoyé au portail.
                        </p>
                      )}
                    </div>
                    {apercu.instructions && (
                      <p className="text-sm italic leading-relaxed text-muted-foreground">
                        « {apercu.instructions} »
                      </p>
                    )}
                    <div className="pointer-events-none flex flex-col gap-4" aria-hidden="true">
                      {apercu.sections.map(section => (
                        <div key={section.id} className="flex flex-col gap-3">
                          {section.titre && (
                            <p className="text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
                              {section.titre}
                            </p>
                          )}
                          {section.questions.map(question => (
                            <QuestionField
                              key={question.id}
                              question={question}
                              value=""
                              onChange={() => undefined}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
                <p className="text-2xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
                  Ajouter pour
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {patients.map(p => (
                    <label
                      key={p.email}
                      className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        picks.has(p.email)
                          ? 'border-mint-600 bg-mint-600/10 text-mint-ink'
                          : 'border-border bg-surface text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={picks.has(p.email)}
                        onChange={() => basculerPick(p.email)}
                        className="sr-only"
                      />
                      {p.prenom} {p.nom}
                    </label>
                  ))}
                  {patients.length === 0 && (
                    <span className="text-2xs text-muted-foreground">Aucun patient éligible.</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={ajouterALaFile}
                    disabled={occupe || !selection?.assignable || picks.size === 0}
                  >
                    Ajouter à la file
                  </Button>
                  <span className="text-2xs text-muted-foreground">
                    {selection && !selection.assignable
                      ? selection.passationPraticien
                        ? 'Passation en consultation — jamais envoyé au portail.'
                        : 'Alias historique — non assignable tel quel.'
                      : "L'ajout ne déclenche aucun envoi."}
                  </span>
                </div>
              </div>
            </section>

            {/* File d'envoi */}
            <section className="rounded-xl border border-border bg-surface shadow-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h3 className="font-display text-lg font-semibold text-foreground">File d&apos;envoi</h3>
                <Badge variant="info">1 mail par patient</Badge>
              </div>
              <div className="max-h-[430px] overflow-y-auto px-5 py-4">
                {brouillons.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    La file est vide — ajoutez des questionnaires depuis l&apos;aperçu.
                  </p>
                )}
                <ul className="flex flex-col gap-4">
                  {brouillons.map(b => (
                    <li key={b.idBrouillon} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-sm font-semibold text-foreground">
                          {b.prenom} {b.nom}
                        </p>
                        <span className="font-mono text-2xs text-muted-foreground">
                          {b.items.length} élément{b.items.length > 1 ? 's' : ''} · 1 mail
                        </span>
                      </div>
                      <ul className="mt-2 flex flex-col">
                        {b.items.map(item => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-2 border-b border-dashed border-border py-1.5 text-xs text-foreground last:border-b-0"
                          >
                            <span className="min-w-0">
                              {item.titre}
                              <span className="ml-1 font-mono text-2xs text-muted-foreground">
                                {item.id}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => retirer(b.idBrouillon, item.id)}
                              aria-label={`Retirer ${item.titre} de la file`}
                              className="rounded p-1 text-muted-foreground hover:bg-status-danger/10 hover:text-status-danger"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 w-full"
                        disabled={occupe}
                        onClick={() => envoyer(b)}
                      >
                        Envoyer ({b.items.length}) — un seul mail
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border px-5 py-3">
                <p className="font-mono text-2xs text-muted-foreground">
                  {brouillons.length} patient{brouillons.length > 1 ? 's' : ''} · {totalFile}{' '}
                  élément{totalFile > 1 ? 's' : ''}
                </p>
                <p className="mt-1 text-2xs text-muted-foreground">
                  Un seul lien portail par patient. Rien ne part sans votre validation.
                </p>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function BoutonRayon({
  actif,
  aVenir = false,
  onClick,
  children,
}: {
  actif: boolean;
  aVenir?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`inline-flex min-h-[34px] items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors ${
        actif
          ? 'border-indigo-600 bg-indigo-600/10 text-primary'
          : 'border-border bg-surface text-muted-foreground hover:border-primary/40'
      }`}
    >
      {children}
      {aVenir && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-muted-foreground">
          à venir
        </span>
      )}
    </button>
  );
}

function ChipFiltre({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`inline-flex flex-none items-center rounded-full border px-3 py-1 text-2xs font-semibold transition-colors ${
        actif
          ? 'border-indigo-600 bg-indigo-600/10 text-primary'
          : 'border-border bg-surface text-muted-foreground hover:border-primary/40'
      }`}
    >
      {children}
    </button>
  );
}
