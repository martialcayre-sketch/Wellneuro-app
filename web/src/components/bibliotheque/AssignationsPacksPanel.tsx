'use client';

import { useEffect, useRef, useState } from 'react';
import type { PatientsApiResponse } from '@/app/api/praticien/patients/route';
import type { CreateAssignationResponse } from '@/app/api/praticien/assignations/route';
import type { AnnulationAssignationResponse } from '@/app/api/praticien/assignations/annulation/route';
import type { QuestionnairesApiResponse } from '@/app/api/praticien/questionnaires/route';
import type { QuestionnairesRegistryApiResponse } from '@/app/api/praticien/questionnaires/registry/route';
import { estAnnulable } from '@/lib/praticien/annulabilite';
import { erreurLisible } from '@/lib/praticien/messagesDossier';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { AnnulationAssignationDialog } from '@/components/ui/AnnulationAssignationDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PanneauSuperpose } from '@/components/ui/PanneauSuperpose';
import { PacksPanel } from '@/components/PacksPanel';

// LE RAYON ASSIGNATIONS ET PACKS — né le 2026-09-16 de la scission de la page
// d'héritage 4.0 « Questionnaires & packs ». Cette page réunissait deux métiers
// sans rapport : la gestion des dossiers, devenue le rayon « Patients », et
// l'assignation de questionnaires avec les packs, qui vit ici, dans la
// Bibliothèque — le lieu où les instruments sont déjà catalogués, prévisualisés
// et composés en file d'envoi.
//
// LE COMPORTEMENT NE CHANGE PAS. Ce panneau est l'ancien code, déplacé : même
// route, même filtre de statut serveur, même prédicat d'annulabilité, mêmes
// libellés. Une scission qui corrigerait « au passage » ne serait pas relisible.
//
// IL RELIT LA LISTE DES DOSSIERS, et c'est normal : le sélecteur de patient du
// tiroir d'assignation en a besoin. `GET /api/praticien/patients` sert les deux
// formes depuis toujours — `page` absent rend la liste complète, `page` présent
// le tableau paginé qu'utilise le rayon Patients. Aucune route n'a bougé.

type StatutFilter = '' | 'Complété' | 'En attente' | 'Annulée';

const STATUT_LABELS: Record<StatutFilter, string> = {
  '': 'Tous les statuts',
  'Complété': 'Complété',
  'En attente': 'En attente',
  'Annulée': 'Annulée',
};

function StatusBadge({ value }: { value: string }) {
  const status = value || '—';
  const variant: BadgeVariant =
    status === 'Complété' ? 'success' : status === 'Annulée' ? 'warning' : 'neutral';
  return <Badge variant={variant}>{status}</Badge>;
}

// Suture morte, conservée telle quelle (LOT-03, D-030) : plus rien ne
// l'alimente depuis le retrait du bloc « Packs suggérés », et plus rien ne
// l'observe. La retirer voudrait dire toucher `PacksPanel` et sa prop —
// un refactor que cette scission n'a pas à emporter.
type SuggestedPackSelection = {
  registryPackId: string;
  titre: string;
  nonce: number;
};

export function AssignationsPacksPanel() {
  const [data, setData] = useState<PatientsApiResponse | null>(null);
  const [questionnaires, setQuestionnaires] = useState<QuestionnairesApiResponse['questionnaires']>([]);
  const [registry, setRegistry] = useState<QuestionnairesRegistryApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAssignation, setSavingAssignation] = useState(false);
  const [assignationFeedback, setAssignationFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [statutFilter, setStatutFilter] = useState<StatutFilter>('');
  // Miroir du filtre courant, tenu à jour APRÈS commit — écrire un ref pendant
  // le rendu laisserait, sur un rendu concurrent abandonné, une valeur jamais
  // commitée qu'un gestionnaire d'événement lirait ensuite.
  // Il sert à deux choses : les rafraîchissements déclenchés ailleurs
  // (création, annulation…) conservent le filtre, et la garde de fraîcheur de
  // `loadData` sait à quel statut la réponse qui arrive devrait correspondre.
  const statutFilterRef = useRef<StatutFilter>('');
  useEffect(() => {
    statutFilterRef.current = statutFilter;
  }, [statutFilter]);
  // Échec du rechargement déclenché par le sélecteur de statut. Distinct de
  // `data.unavailable`, qui remplace le panneau entier : changer un filtre
  // d'affichage ne doit pas faire disparaître la surface praticien.
  const [erreurStatut, setErreurStatut] = useState<string | null>(null);
  // Annulation d'assignation (Fil A) : cible de la modale, état d'envoi, erreur.
  const [annulationCible, setAnnulationCible] = useState<{ idAssignation: string; titre: string; emailPatient: string; nbJourneesAgenda: number | null } | null>(null);
  const [annulationEnCours, setAnnulationEnCours] = useState(false);
  const [erreurAnnulation, setErreurAnnulation] = useState<string | null>(null);
  const [assignationForm, setAssignationForm] = useState({
    emailPatient: '',
    idQuestionnaire: '',
    dateLimite: '',
    notes: '',
  });
  // Filtre catégorie du sélecteur de questionnaire ('' = Toutes). Purement
  // côté client : restreint la liste sans appel réseau ni migration.
  const [categorieFilter, setCategorieFilter] = useState('');
  const [categorieView, setCategorieView] = useState<'fonctionnelle' | 'historique'>('fonctionnelle');
  const [suggestedPackSelection] = useState<SuggestedPackSelection | null>(null);
  // Tiroir d'action ouvert — un seul, ici : « Nouvelle assignation ».
  const [tiroirOuvert, setTiroirOuvert] = useState<'assignation' | null>(null);

  const loadData = async (
    statut: StatutFilter = statutFilterRef.current,
    options?: { echecRemonte?: boolean },
  ) => {
    const qs = statut ? `?statut=${encodeURIComponent(statut)}` : '';
    const r = await fetch(`/api/praticien/patients${qs}`);
    const json = (await r.json()) as PatientsApiResponse;

    // Le sélecteur n'a pas de debounce : deux changements dans un aller-retour
    // lancent deux requêtes concurrentes, et sans garde c'est la dernière
    // ARRIVÉE qui gagne — la table listerait des « Complété » sous un filtre
    // affichant « En attente ». Le filtre en mémoire d'avant en était
    // structurellement immunisé ; celui-ci doit s'en protéger explicitement.
    // Une réponse muette sur son statut (serveur antérieur, charge d'erreur)
    // n'est pas un désaccord : on ne jette que ce qui contredit.
    const statutRendu = json.assignationsMeta?.statut;
    if (statutRendu !== undefined && (statutRendu ?? '') !== statutFilterRef.current) return;

    // Une session expirée ou une exception serveur remplace tout le panneau
    // (voir `data.unavailable` plus bas). Acceptable au chargement initial,
    // pas sur un simple changement de filtre : l'appelant traite l'échec.
    if (options?.echecRemonte && json.unavailable) {
      throw new Error(json.reason ?? 'exception');
    }
    setData(json);
  };

  // Pagination côté serveur (skip/take) : source de vérité pour le tableau
  // affiché. `data.patients` (chargé sans pagination par loadData) reste la
  // liste complète utilisée par le sélecteur "Nouvelle assignation".
  const loadQuestionnaires = async () => {
    const r = await fetch('/api/praticien/questionnaires');
    const json = (await r.json()) as QuestionnairesApiResponse;
    setQuestionnaires(json.questionnaires ?? []);
  };

  const loadRegistry = async () => {
    const r = await fetch('/api/praticien/questionnaires/registry');
    const json = (await r.json()) as QuestionnairesRegistryApiResponse;
    setRegistry(json);
  };

  useEffect(() => {
    Promise.all([loadData(), loadQuestionnaires(), loadRegistry()])
      .catch(() => setData({ patients: [], assignations: [], unavailable: true, reason: 'exception' }))
      .finally(() => setLoading(false));
  }, []);

  const categoriesRegistry = registry?.categories ?? [];
  const categoryById = new Map<string, (typeof categoriesRegistry)[number]>(
    categoriesRegistry.map(c => [c.id as string, c]),
  );
  // `packsRegistry` / `packById` ne servaient qu'aux libellés du bloc « Packs
  // suggérés » (retiré, LOT-03). `registry` reste passé tel quel à `PacksPanel`.

  const getFunctionalCategoryLabel = (id: string): string => categoryById.get(id)?.titre ?? id;
  const getFunctionalCategoryPhase = (id: string): 'mvp' | 'phase_2' => categoryById.get(id)?.phase ?? 'phase_2';

  // Le filtre de statut se joue en base : changer de statut est un rechargement,
  // pas un tri en mémoire. Pas de debounce — c'est un <select>, pas une frappe
  // clavier. Ignoré au premier rendu, déjà couvert par le chargement initial.
  const isFirstStatutRender = useRef(true);
  useEffect(() => {
    if (isFirstStatutRender.current) {
      isFirstStatutRender.current = false;
      return;
    }
    setErreurStatut(null);
    // Seul chemin de chargement déclenché par un geste d'UI : sans ce `.catch`,
    // une coupure réseau ou un 502 rendant du HTML laisserait le sélecteur sur
    // « En attente » et la table sur l'ensemble précédent, sans un mot.
    loadData(statutFilter, { echecRemonte: true }).catch(() =>
      setErreurStatut('Impossible de recharger les assignations. Vérifiez votre connexion, puis réessayez.'),
    );
  }, [statutFilter]);

  const onCreateAssignation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingAssignation(true);
    setAssignationFeedback(null);
    try {
      const selectedQ = questionnaires.find(q => q.id === assignationForm.idQuestionnaire);
      const r = await fetch('/api/praticien/assignations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailPatient: assignationForm.emailPatient,
          idQuestionnaire: assignationForm.idQuestionnaire,
          titre: selectedQ?.titre ?? '',
          dateLimite: assignationForm.dateLimite,
          notes: assignationForm.notes,
        }),
      });
      const json = (await r.json()) as CreateAssignationResponse;
      if (!r.ok || !json.success) {
        setAssignationFeedback({ ok: false, msg: erreurLisible(json.reason, json.error) });
        return;
      }
      setAssignationFeedback({ ok: true, msg: 'Assignation créée.' });
      setAssignationForm({ emailPatient: '', idQuestionnaire: '', dateLimite: '', notes: '' });
      await loadData();
    } catch {
      setAssignationFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setSavingAssignation(false);
    }
  };

  const onConfirmerAnnulation = async () => {
    if (!annulationCible || annulationEnCours) return;
    setAnnulationEnCours(true);
    setErreurAnnulation(null);
    try {
      const r = await fetch('/api/praticien/assignations/annulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idAssignation: annulationCible.idAssignation }),
      });
      const json = (await r.json()) as AnnulationAssignationResponse;
      if (!json.ok) {
        setErreurAnnulation(erreurLisible(json.reason, json.error));
        return;
      }
      setAnnulationCible(null);
      await loadData();
    } catch {
      setErreurAnnulation('Erreur réseau. Réessayez.');
    } finally {
      setAnnulationEnCours(false);
    }
  };

  // Plus de filtre ici : le serveur a déjà rendu les assignations du statut
  // demandé. Le filtre qui vivait à cet endroit s'appliquait APRÈS la troncature
  // à 40 et masquait tout ce qui la dépassait.
  const filteredAssignations = data?.assignations ?? [];

  // Ce que la troncature a laissé de côté. `null` tant que le serveur n'a rien
  // dit : un compte manquant n'est pas un compte nul, et on préfère ne rien
  // afficher plutôt qu'affirmer une exhaustivité invérifiable.
  const meta = data?.assignationsMeta ?? null;
  const assignationsTronquees = meta !== null && meta.total > filteredAssignations.length;

  if (loading) {
    return <div className="text-base text-muted-foreground">Chargement des assignations et des packs...</div>;
  }

  if (data?.unavailable) {
    return (
      <div className="bg-muted border border-border rounded-xl p-4 text-base text-muted-foreground">
        {erreurLisible(data.reason)}
      </div>
    );
  }

  // Catégories distinctes (tri alphabétique FR) pour le filtre d'assignation.
  const categories = categorieView === 'fonctionnelle'
    ? Array.from(new Set(questionnaires.map(q => q.categorieFonctionnellePrincipale).filter(Boolean))).sort((a, b) =>
      getFunctionalCategoryLabel(a).localeCompare(getFunctionalCategoryLabel(b), 'fr'),
    )
    : Array.from(new Set(questionnaires.map(q => q.categorie).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'fr'),
    );

  const questionnairesFiltres = categorieFilter
    ? questionnaires.filter(q =>
      categorieView === 'fonctionnelle'
        ? q.categorieFonctionnellePrincipale === categorieFilter
        : q.categorie === categorieFilter,
    )
    : questionnaires;

  // `questionnaireSelectionne` et `packsSuggeres` n'alimentaient QUE le bloc
  // « Packs suggérés », retiré plus bas (LOT-03, D-030) : les garder ici
  // laisserait du calcul sans lecteur.

  return (
    <div className="flex flex-col gap-6">
      {/* Barre d'actions : le seul tiroir de ce rayon. */}
      <div className="flex flex-wrap items-center gap-3">
        <PanneauSuperpose
          largeur="standard"
          declencheur={<Button className="min-h-11">Nouvelle assignation</Button>}
          titre="Nouvelle assignation questionnaire"
          description="Nouvelle assignation questionnaire"
          descriptionMasquee
          open={tiroirOuvert === 'assignation'}
          onOpenChange={ouvert => setTiroirOuvert(ouvert ? 'assignation' : null)}
        >
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={onCreateAssignation}>
          <Select required value={assignationForm.emailPatient} onChange={e => setAssignationForm(p => ({ ...p, emailPatient: e.target.value }))}>
            <option value="">Patient *</option>
            {(data?.patients ?? []).map(p => (
              <option key={p.idPatient} value={p.email}>{`${p.prenom} ${p.nom} — ${p.email}`}</option>
            ))}
          </Select>
          <Select
            value={categorieView}
            onChange={e => {
              setCategorieView(e.target.value as 'fonctionnelle' | 'historique');
              setCategorieFilter('');
              setAssignationForm(p => ({ ...p, idQuestionnaire: '' }));
            }}
            aria-label="Type de catégories"
          >
            <option value="fonctionnelle">Catégories fonctionnelles (recommandé)</option>
            <option value="historique">Catégories historiques</option>
          </Select>
          <Select
            value={categorieFilter}
            onChange={e => {
              setCategorieFilter(e.target.value);
              // Réinitialise le questionnaire sélectionné s'il n'est plus visible.
              setAssignationForm(p => ({ ...p, idQuestionnaire: '' }));
            }}
            aria-label="Filtrer par catégorie"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {categorieView === 'fonctionnelle'
                  ? `${getFunctionalCategoryLabel(c)}${getFunctionalCategoryPhase(c) === 'mvp' ? ' (MVP)' : ''}`
                  : c}
              </option>
            ))}
          </Select>
          <Select required value={assignationForm.idQuestionnaire} onChange={e => setAssignationForm(p => ({ ...p, idQuestionnaire: e.target.value }))}>
            <option value="">Questionnaire *</option>
            {questionnairesFiltres.map(q => (
              <option key={q.id} value={q.id}>
                {`${q.titre} (${categorieView === 'fonctionnelle' ? getFunctionalCategoryLabel(q.categorieFonctionnellePrincipale) : q.categorie})${q.passationPraticien ? ' — passation en consultation' : ''}`}
              </option>
            ))}
          </Select>
          {/* LOT-03 (D-030) — LE BLOC « PACKS SUGGÉRÉS » EST RETIRÉ D'ICI.
              Ses boutons se raccordaient au panneau Packs par TITRE NORMALISÉ
              parmi les packs ACTIFS : après le retrait des packs, ils
              citeraient des packs désactivés et le clic produirait un message
              rouge « n'existe pas encore » — faux après un retrait délibéré, et
              affiché dans un autre panneau une fois ce tiroir refermé. Le geste
              qu'il proposait (assigner un pack) est précisément celui que D-030
              remplace par la file d'envoi.

              LA SUTURE `suggestedPackSelection` RESTE EN PLACE, MORTE (état
              déclaré, type, passage à `PacksPanel`) : plus rien ne l'alimente,
              donc plus rien ne l'observe. La retirer voudrait dire toucher
              `PacksPanel` et sa prop, c'est-à-dire un refactor hors de ce lot ;
              elle est laissée inerte, à retirer d'un seul geste le jour où le
              raccordement par titre sera tranché. */}
          <Input type="date" value={assignationForm.dateLimite} onChange={e => setAssignationForm(p => ({ ...p, dateLimite: e.target.value }))} />
          <Input value={assignationForm.notes} onChange={e => setAssignationForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes praticien (optionnel)" maxLength={500} />
          <div className="flex items-center gap-3 md:col-span-2">
            <Button type="submit" disabled={savingAssignation}>
              {savingAssignation ? 'Création...' : 'Créer l’assignation'}
            </Button>
            {assignationFeedback && (
              <span role="status" className={`text-sm ${assignationFeedback.ok ? 'text-status-success' : 'text-status-danger'}`}>
                {assignationFeedback.msg}
              </span>
            )}
          </div>
          </form>
        </PanneauSuperpose>
      </div>

      {/* Packs de questionnaires. Il venait après le tableau des patients, sur
          la page « Questionnaires & packs » ; ce tableau est parti au rayon
          Patients, et les packs suivent ici le tiroir d'assignation. La suture
          `suggestedPackSelection` est conservée telle quelle — morte depuis
          D-030, et la retirer demanderait de toucher `PacksPanel`. */}
      <PacksPanel
        questionnaires={questionnaires}
        registry={registry}
        suggestedPackSelection={suggestedPackSelection}
        patients={(data?.patients ?? []).map(p => ({ email: p.email, prenom: p.prenom, nom: p.nom }))}
      />

      {/* Tableau assignations */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Assignations récentes
            <span className="ml-2 font-mono text-13 font-normal text-muted-foreground" data-testid="assignations-compte">
              ({assignationsTronquees ? `${filteredAssignations.length} sur ${meta?.total}` : filteredAssignations.length})
            </span>
          </h3>
          <select value={statutFilter} onChange={e => setStatutFilter(e.target.value as StatutFilter)} className="text-xs border border-border rounded-lg px-2 py-1 bg-surface text-muted-foreground">
            {(Object.keys(STATUT_LABELS) as StatutFilter[]).map(s => (
              <option key={s} value={s}>{STATUT_LABELS[s]}</option>
            ))}
          </select>
        </div>
        {erreurStatut && (
          <div className="px-4 py-2 border-b border-border bg-muted text-13 text-foreground" role="status" data-testid="assignations-erreur">
            {erreurStatut}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-2xs uppercase tracking-[.07em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Patient</th>
                <th className="px-4 py-2 text-left">Questionnaire</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignations.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                  {/* Sous filtre, « Aucune assignation. » se lirait comme une
                      affirmation sur l'ensemble du dossier : on nomme le filtre. */}
                  {statutFilter ? `Aucune assignation « ${statutFilter} ».` : 'Aucune assignation.'}
                </td></tr>
              )}
              {filteredAssignations.map(a => {
                // Annulable : prédicat PARTAGÉ avec la route (`estAnnulable`,
                // lib/praticien/annulabilite.ts) — c'est justement leur
                // divergence qui produisait ce lot. `estAnnulable` ne connaît
                // pas `Annulée` (l'idempotence côté route accepte un renvoi
                // sur une assignation déjà annulée, elle ne le refuse pas) ;
                // l'exclusion d'écran reste donc ICI, explicite : une ligne
                // déjà annulée n'a rien à proposer, sans que la route ait
                // besoin de le refuser en 409.
                //
                // `aPassation ?? false` : le seul cas où le champ manque est
                // un client neuf servi par une API ancienne (transitoire d'un
                // déploiement). `?? true` masquerait le bouton sur toutes les
                // lignes en attendant le redeploy ; `?? false` le laisse
                // proposé, et le 409 de la route tranche si besoin.
                const annulable =
                  a.statut !== 'Annulée' &&
                  estAnnulable({ statut: a.statut, statutReponses: a.statutReponses, aPassation: a.aPassation ?? false });
                return (
                <tr key={a.idAssignation} className="border-t border-border">
                  <td className="px-4 py-2">{a.dateAssignation ? new Date(a.dateAssignation).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-4 py-2">{a.emailPatient || a.idPatient || '—'}</td>
                  <td className="px-4 py-2">{a.titre || a.idQuestionnaire || '—'}</td>
                  <td className="px-4 py-2"><StatusBadge value={a.statut} /></td>
                  <td className="px-4 py-2">
                    {annulable ? (
                      <button
                        type="button"
                        onClick={() => {
                          setErreurAnnulation(null);
                          setAnnulationCible({
                            idAssignation: a.idAssignation,
                            titre: a.titre || a.idQuestionnaire || 'ce questionnaire',
                            emailPatient: a.emailPatient || '',
                            // Fait d'affichage seul (LOT-08) : n'entre dans
                            // aucune décision d'autorisation, `annulable` reste
                            // décidé par `estAnnulable` seul, juste au-dessus.
                            nbJourneesAgenda: a.nbJourneesAgenda ?? null,
                          });
                        }}
                        className="text-xs font-medium text-status-danger hover:underline"
                      >
                        Annuler
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnnulationAssignationDialog
        titreQuestionnaire={annulationCible?.titre ?? ''}
        emailPatient={annulationCible?.emailPatient ?? ''}
        nbJourneesAgenda={annulationCible?.nbJourneesAgenda ?? null}
        open={annulationCible !== null}
        onOpenChange={ouvert => {
          if (!ouvert) {
            setAnnulationCible(null);
            setErreurAnnulation(null);
          }
        }}
        onConfirm={onConfirmerAnnulation}
        enCours={annulationEnCours}
        erreur={erreurAnnulation}
      />
    </div>
  );
}
