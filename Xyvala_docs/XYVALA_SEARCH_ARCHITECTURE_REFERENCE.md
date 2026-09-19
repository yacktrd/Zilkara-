# XYVALA SEARCH — Architecture Reference

## 1. Identification et autorité

| Champ | Valeur |
| --- | --- |
| Fichier | XYVALA_SEARCH_ARCHITECTURE_REFERENCE.md |
| Version documentaire | 0.1.4 |
| Date de constitution | 2026-09-15 ; mise à jour 2026-09-18 |
| Origine | Transfert du référentiel global 0.3.1 du 2026-09-14 |
| Portée | Search : chaîne documentaire, temporalité, stockage, runtime, API, preuves et blocages |
| Inspection technique nouvelle | Annexe H du 2026-09-18 ; Recency Policy Governance intégrée au policy set Financial News, gates statiques réussis, 10 contrôles de gouvernance + 39 contrôles Recency réussis et non-régression runtime offline réussie |
| Révision Git et intégration Git | Révision de base observée `447656deaffd8cc5de1c96132ed68a42f26ee526` ; branche `search-governance-baseline` créée et périmètre Search préparé au staging ; commit d’intégration Search non établi dans cette édition |
| Emplacement proposé | docs/xyvala/XYVALA_SEARCH_ARCHITECTURE_REFERENCE.md |
| Autorité | Documents normatifs applicables ; aucun remplacement de protocole, contrat, VLR ou policy |

Les numéros des sections techniques 5 à 10 et des annexes A à D sont conservés pour préserver les renvois hérités. Les mentions « cette édition », « audit courant » et « prochaine action » dans les textes transférés désignent leur périmètre historique, sans nouvelle autorisation technique. L’annexe E distingue les règles 24H/7D établies, les constats techniques et une proposition de producteur spécialisé. L’annexe F formalise le contrat proposé et la préparation du rattachement VLR. L’annexe G documente son implémentation candidate et sa validation hors ligne. L’annexe H documente l’intégration de la gouvernance de policy Recency dans le policy set Financial News, ses nouvelles empreintes, ses validations et la clôture strictement bornée du sous-périmètre `Recency Policy Governance`. Cette clôture n’active ni le producteur Recency dans le runtime, ni le VLR canonique, ni la production, ni Search → MCI.

## 2. Lecture immédiate de l’avancement

| Objet | Fait disponible | Limite / prochaine dépendance |
| --- | --- | --- |
| Stockage temporel Search | 15 contrôles fonctionnels réussis sur une branche PostgreSQL de test isolée, selon E-01 | Ne démontre pas le branchement applicatif ni l’activation production |
| Contrat de référence temporelle | Fichier présent ; validation locale communiquée, E-02 | Ne prouve pas le producteur concret de la référence |
| Lecteur temporel Financial News | Implémentation inspectée ; 21 contrôles offline réussis communiqués, E-03 | Source concrète et branchement réel non établis |
| Identité de série Search | Entrée VLR `search.temporal.document_series_id` trouvée, E-04 | N’établit pas à elle seule le lineage des identités d’observation |
| Source réelle d’observation / référence courante | Propriétaire amont décrit abstraitement dans le contrat | Producteur concret, provenance et VLR à établir sur le dépôt actuel |
| Classification Financial News 24H/7D | Contrat et producteur candidat `0.1.0-draft.1` présents ; 39 contrôles fonctionnels offline réussis, E-11/E-12 | Calcul vérifié ; le producteur reste non bindé au runtime, VLR canonique non activé et production non activée |
| Recency Policy Governance | Policy Recency intégrée au policy set Financial News ; policy-set schema `2.0.0`, policy-set values `2.0.0`, 11 policies non-calibration, 20 policies Financial News ; 10 contrôles de gouvernance réussis et non-régression runtime offline réussie, E-12 | **CLOSED uniquement pour `Recency Policy Governance`** ; 19 policies restent bindées au runtime générique et `recency_policy` demeure gouvernée mais non bindée |
| Market | Périmètre architectural identifié ; état technique actuel non audité ici | Récupérer les preuves existantes avant toute conclusion ou réouverture |
| API / interface | Route `app/api/search/route.ts` inspectée : POST consomme une projection externe ; GET retourne 405, E-06 | Aucun lancement de recherche par cette route ; activation et parcours interface complets non établis |

**Prochaine action justifiée pour le binding du lecteur temporel :** établir la spécification de provenance de l’observation temporelle à partir des sources officielles : réalité observée, identité, propriétaire, producteur et correspondance des mesures. La recherche textuelle extérieure aux trois dossiers n’a trouvé aucune correspondance (E-07) ; ne pas répéter cette recherche sans nouvel élément. Les capacités Acquisition existantes sont identifiées en annexe D, mais ne constituent pas à elles seules un producteur temporel autorisé. Les définitions normatives manquantes doivent être retrouvées avant de coder cette capacité.

**Travail courant :** la clarification « 7 derniers jours » reste formalisée en [annexe E](#annexe-e), le contrat et la préparation VLR en [annexe F](#annexe-f), et le producteur candidat avec ses 39 contrôles offline en [annexe G](#annexe-g). L’[annexe H](#annexe-h) établit désormais la gouvernance canonique de la policy Recency dans le policy set Financial News : 11 policies non-calibration, 20 policies Financial News, policy-set schema/values `2.0.0`, 10 contrôles de gouvernance réussis et non-régression runtime offline réussie. **Seul le sous-périmètre `Recency Policy Governance` est CLOSED.** Le binding du producteur Recency, l’activation VLR, la production et Search → MCI restent hors de cette clôture. B-01/B-02, relatifs aux observations comparatives, restent inchangés.

**Action dépendante suspendue :** brancher réellement le lecteur tant que ces prérequis indispensables ne sont pas démontrés. Cette suspension ne rouvre pas les contrôles de stockage et offline déjà réussis.

**Distance jusqu’à l’interface :** aucun nombre fiable d’étapes ou pourcentage global ne peut être déduit de la copie disponible. Les dépendances sont décrites en section 10 ; elles ne constituent pas une nouvelle liste de développements obligatoires.

## 3. Sources et navigation

Les sources N-01 à N-07 conservent leur identification dans le [registre global](XYVALA_ARCHITECTURE_REFERENCE.md#3-sources-officielles-et-périmètre-documentaire). Les copies des trois référentiels reçues pour cette mise à jour sont identifiées en E.8. La copie globale fournie est la version 0.3.1, antérieure à leur séparation ; aucun journal de migration supplémentaire n’y est supposé présent.

Ce fichier est l’emplacement de référence des fiches C-01 à C-08, E-01 à E-08 et B-01 à B-04 héritées de la version 0.3.1. Les lignes Market/interface héritées, notamment B-04, gardent leur portée historique mixte ; elles sont référencées depuis les autres fichiers, sans duplication ni découpage rétroactif.

Les détails MCI ont un emplacement unique dans le [référentiel Market](XYVALA_MARKET_ARCHITECTURE_REFERENCE.md#mci). Les frontières inter-domaines restent dans le [global](XYVALA_ARCHITECTURE_REFERENCE.md#4-carte-des-responsabilités). Search → MCI demeure différé.

## 4. Architecture Search documentée


N-05 décrit une organisation d’exécution `Producer → Adapter si nécessaire → Bindings → Composition → Bootstrap → Orchestrator`. Cette notation décrit l’organisation officielle ; elle n’autorise pas un adapter supplémentaire et ne remplace pas l’inspection du graphe d’appels réel.

Le plan public documenté est `Private Decision → Private Snapshot → Transformation → Public Ranking → API → Interface`. Les analyses privées ne deviennent publiques que par leur exposition contractuellement autorisée.

Les capacités Documentary Intelligence marquées `PLANNED` restent une cible. Leur présence dans une définition ne vaut pas activation du runtime.

<a id="section-5"></a>

## 5. Catalogue des éléments inspectés

Les chemins sont relatifs à la racine du dépôt Xyvala. L’édition initiale utilisait `xyvala-integration`. L’édition 0.2.0 confronte ces constats à l’archive utilisateur `search.zip`, extraite séparément dans `search-audit-20260914/search`. Aucun de ces ensembles ne constitue un checkout Git complet certifié. Voir l’annexe B pour le périmètre de cette nouvelle inspection.

| ID | Fichier | Responsabilité observée | Dépendance / limite |
| --- | --- | --- | --- |
| <a id="C-01"></a>C-01 | `lib/xyvala/search/domains/financial-news/search-financial-news-temporal-reference-contract.ts` | Contrat privé de référence vers une observation courante ; version déclarée 1.0.0 | Décrit une source amont autorisée ; son producteur concret n’est pas identifié par ce seul fichier |
| <a id="C-02"></a>C-02 | `lib/xyvala/search/domains/financial-news/search-financial-news-recorded-temporal-reader.ts` | Résout une référence injectée, demande une lecture exacte, vérifie les identités et transporte les observations ; version déclarée 1.0.0 | Dépend de `resolve_current_observation_reference` et `read_observations` |
| <a id="C-03"></a>C-03 | `lib/xyvala/search/contracts/search-temporal-observation-store-contract.ts` | Contrat de lecture/écriture ; couverture, immutabilité et résultats de stockage ; version 1.0.0 | Requiert des observations déjà produites et une provenance fournie |
| <a id="C-04"></a>C-04 | `lib/xyvala/search/governance/search-variable-lineage-registry.ts` | Registre de filiation ; entrée de série temporelle inspectée | Recherche ciblée insuffisante pour certifier l’ensemble du VLR |
| <a id="C-05"></a>C-05 | `lib/xyvala/search/domains/financial-news/search-financial-news-recorded-temporal-source.ts` | Frontière de source enregistrée liée au contrat du lecteur | Appelant de production à établir |
| <a id="C-06"></a>C-06 | `lib/xyvala/search/domains/financial-news/search-financial-news-temporal-observation-provider.ts` | Capacité d’observation temporelle fournie explicitement | Une dépendance injectée ne démontre pas l’origine autorisée de la donnée |
| <a id="C-07"></a>C-07 | `lib/xyvala/search/domains/financial-news/search-financial-news-runtime-configuration.ts` | Déclare et transmet la source temporelle autorisée | Origine concrète à tracer au point d’assemblage |
| <a id="C-08"></a>C-08 | `lib/xyvala/search/domains/financial-news/search-financial-news-application-composition.ts` | Composition applicative et propagation de dépendances | Présence du code distincte de son activation |
| <a id="C-09"></a>C-09 | `lib/xyvala/search/domains/financial-news/search-financial-news-recency-contract.ts` | Contrat Recency présent dans l’arborescence Search actuelle ; version `0.1.0-draft.1` ; entrée canonique, policy explicite, union des fenêtres et indisponibilités | Contrat inchangé pendant E-12 ; VLR canonique Recency non activé |
| <a id="C-10"></a>C-10 | `lib/xyvala/search/domains/financial-news/search-financial-news-recency-core.ts` | Classificateur candidat `0.1.0-draft.1` ; consommation de l’âge canonique, policy explicite, références conservées | 39 contrôles offline E-11/E-12 ; aucun binding runtime ajouté |
| <a id="C-11"></a>C-11 | `scripts/xyvala/search/validate-financial-news-recency.ts` | 39 contrôles sur fixtures ; appelle Temporal existant puis le candidat | Aucune requête fournisseur, aucun PostgreSQL, aucun binding applicatif |
| <a id="C-12"></a>C-12 | `search-financial-news-runtime-configuration.ts`, `search-financial-news-runtime-policy-profile.ts`, `search-financial-news-runtime-policy-artifacts.ts`, `search-financial-news-runtime-policy-artifact-values.ts`, `search-financial-news-runtime-policy-assembly.ts`, `search-financial-news-runtime-policy-composition.ts` | Gouvernance Recency intégrée au policy set Financial News : 11 non-calibration, 12 externally governed, 20 policies Financial News ; policy-set schema/values `2.0.0` ; 19 generic-bound + 1 governed-unbound (`recency_policy`) | Gouvernance intégrée et validée ; ne constitue pas un binding Recency ni une activation production |
| <a id="C-13"></a>C-13 | `scripts/xyvala/search/validate-financial-news-recency-policy-governance.ts` | Validateur offline de la gouvernance Recency ; 10 contrôles ; vérifie versions, couverture, référence de policy et absence de binding générique | Preuve B ciblée ; aucune validation C/D/E |

### 5.1 Fiche à conserver pour chaque composant

Toute extension de ce catalogue renseigne : identifiant documentaire, domaine, responsabilité, fichier et révision examinés, propriétaire canonique, producteur, contrats d’entrée/sortie, policies applicables, VLR, consommateurs, effets, exposition, preuves et limites. Un champ non établi n’est pas complété par hypothèse.

Le responsable humain de maintenance est un champ distinct du propriétaire canonique d’une vérité. Le référentiel pointe vers les contrats et registres ; il ne recopie pas leurs schémas comme seconde source normative.

### 5.2 Dimensions d’état indépendantes

| Dimension | Valeurs descriptives possibles | Interprétation |
| --- | --- | --- |
| Implémentation | Inspectée / repérée / non inspectée / absence démontrée | Constat sur un périmètre et une révision explicites |
| Conformité | Établie sur le périmètre / non établie / violation démontrée | Conclusion liée aux règles et preuves concernées |
| Validation | Preuves A, B, C, D ou E référencées | Aucun niveau global déduit du seul nombre de tests |
| Activation | Démontrée dans un environnement / non établie / désactivation démontrée | Une absence de preuve ne devient pas « désactivé » |
| Autorisation | Action et périmètre précis / action dépendante suspendue / différée | État réévalué avant l’action ; aucun feu vert permanent |

Ces libellés sont documentaires. Ils ne modifient aucun enum, contrat de disponibilité ou statut de lifecycle Xyvala.

<a id="section-6"></a>

## 6. Identités, lineage et parcours temporel Search

| Élément | Source disponible | Constat |
| --- | --- | --- |
| `document_series_id` | C-04 : `search.temporal.document_series_id` | Owner déclaré `TEMPORAL_DOCUMENT_SERIES_IDENTITY`, module `lib/xyvala/search/temporal/search-temporal-document-series-identity.ts`, exposition interne |
| `observation_id` | C-01 / C-03 | Identité fournie par l’amont ; producteur concret non établi dans le périmètre inspecté |
| `current_observation_id` | C-01 / C-03 | Référence exacte à l’observation ; ne doit pas créer ou sélectionner implicitement une autre identité |
| Provenance stockée | C-03 | `producer_module`, `producer_version`, `source_reference` fournis par le producteur |
| Couverture historique | C-03 | `ALL_RECORDED_BEFORE_CURRENT` ; ne prouve pas une observation continue du monde réel |
| Lineage des identités d’observation | Recherche ciblée dans C-04 | Aucune occurrence de `observation_id` ou `current_observation_id` trouvée ; complétude du dépôt non établie |

Le statut `VALID` inscrit dans une entrée VLR est une donnée du registre ; il ne remplace pas une preuve indépendante du chemin actif.

| Frontière du parcours | Effet attendu selon le contrat | État |
| --- | --- | --- |
| Production de l’observation | À qualifier à partir du producteur réel | Non établi |
| Persistance d’une observation fournie | `MUTATE` | Contrat disponible ; contrôles réels sur branche isolée E-01 |
| Résolution de la référence courante | Dépend de la source concrète ; aucune production implicite autorisée | Injection présente ; origine non établie |
| Lecture du couple série / observation | `OBSERVE` | C-03 définit le snapshot et la couverture |
| Vérification et transport par le lecteur | Frontière de lecture et de validation ; aucune mutation de stockage | C-02 inspecté ; E-03 offline |
| Analyse temporelle canonique | `COMPUTE` à partir des entrées autorisées | Activation de ce parcours réel non démontrée par E-03 |
| Exposition | Selon la frontière publique ou privée autorisée | À vérifier sur le parcours complet |

Un résultat `NOT_FOUND`, `UNAVAILABLE`, `INVALID` ou `INSUFFICIENT_HISTORY` conserve la sémantique de son contrat. Le mapping explicite prévu par C-01 pour `NOT_FOUND` n’autorise pas une conversion générale des erreurs en succès. Un historique enregistré vide n’établit pas l’absence d’événements antérieurs.

<a id="section-7"></a>

## 7. Registre des preuves

N-01 §29 distingue A : statique ; B : offline/fixtures ; C : intégration réelle ; D : binding réel ; E : activation production. Ces niveaux qualifient une affirmation précise, pas le projet entier.

| ID | Pièce / date | Résultat documenté | Portée et limites |
| --- | --- | --- | --- |
| <a id="E-01"></a>E-01 | Capture `2026-09-14 à 19.08.25` fournie | `FUNCTIONAL_SUITE_PASSED`, 15 contrôles, `MUTATE_TEST`, TLS client vérifié, run `search-storage-001`, validateur 1.0.1 | Preuve C du périmètre de test PostgreSQL isolé ; `runtime_binding_validated:false` ; fixtures conservées ; pas de nouvelle exécution ici |
| <a id="E-02"></a>E-02 | Capture `2026-09-14 à 19.46.03` fournie | ESLint et typecheck suivis de `CONTRAT_REFERENCE_TEMPORELLE_VALIDATIONS_LOCALES_OK` | Preuve A ; ne prouve ni source concrète ni activation |
| <a id="E-03"></a>E-03 | Vidéo `2026-09-14 à 20.34.09` fournie | 21 contrôles réussis, `OFFLINE_READER_BINDING` ; validations statiques communiquées | Preuves A/B ; `live_postgres_binding_validated:false`, `production_source_activated:false` |
| <a id="E-05"></a>E-05 | Archive utilisateur `search.zip`, reçue le 2026-09-14 | 91 fichiers sources inventoriés ; lecteur, source, repository, résolution injectée et VLR examinés sur le chemin concerné | Preuve A ciblée ; aucun test réexécuté ; appelants hors dossier Search non inclus ; détails en annexe B |
| <a id="E-07"></a>E-07 | Capture utilisateur du 2026-09-14 à 22.46.48 | `AUCUNE_CORRESPONDANCE_HORS_DOSSIERS_EXAMINES` | Recherche textuelle des sept symboles indiqués dans les extensions TS/JS, hors Search/app/scripts ; respecte les exclusions et règles ignore de rg ; aucun constat d’absence universelle |
| <a id="E-08"></a>E-08 | Inspection statique ciblée du 2026-09-14, annexe D | Acquisition EODHD, identité/hash Acquisition et champs de l’observation temporelle confrontés | Aucune attribution de nouvel ownership, aucun calcul temporel ni appel fournisseur exécuté |
| <a id="E-06"></a>E-06 | Archives utilisateur `app.zip` et `scripts.zip`, reçues le 2026-09-14 | Route HTTP Search et appelants temporels trouvés dans les validateurs inspectés ; sources externes simulées dans le validateur DataForSEO | Preuve A uniquement ; aucun script exécuté, aucune nouvelle preuve B/C/D/E ; détails et empreintes en annexe C |
| <a id="E-04"></a>E-04 | Inspection du 2026-09-14 de C-01 à C-04 et recherche ciblée des dépendances | Contrats, lecteur et entrée VLR de série constatés ; prérequis amont non établis | Preuve A limitée à la copie disponible ; aucune exécution réelle |
| <a id="E-09"></a>E-09 | Relecture ciblée du 2026-09-15 et captures/vidéo des 20:22:17, 20:25:12 et 20:29:46 communiquées | Distinction publication/âge/classification/historique ; détails et empreintes en annexe E | Inspection A ciblée ; aucune validation fonctionnelle nouvelle ; aucun appelant globalement exclu par ces recherches |
| <a id="E-10"></a>E-10 | Compilation ciblée du 2026-09-15 ; TypeScript 5.4.5 ; détails F.5 | Contrat proposé et assertions de types compilent sans erreur sur les dépendances archivées | Preuve A uniquement ; pas d’ESLint projet, pas de typecheck du dépôt complet, pas de test du calcul, de provenance ou de binding |
| <a id="E-11"></a>E-11 | Compilation ciblée et exécution locale du 2026-09-15 ; TypeScript 5.4.5, Node.js 24.19.0 ; détails G.3 | 39 contrôles réussis du candidat sur fixtures, incluant des sorties calculées par le Temporal archivé | Preuves A/B ciblées ; aucune validation C/D/E, aucune policy réelle liée, aucune activation VLR ou production |
| <a id="E-12"></a>E-12 | Exécutions utilisateur du 2026-09-18 sur le dépôt courant ; détails annexe H | Gate statique réussi (ESLint périmètre modifié + `npm run typecheck`) ; validateur Recency Policy Governance `FUNCTIONAL_SUITE_PASSED`, 10 contrôles ; suite Recency `FUNCTIONAL_SUITE_PASSED`, 39 contrôles ; runtime Financial News `OFFLINE_SIMULATED_RUNTIME`, `status: SUCCESS`, `stage: COMPLETE` ; audit final : identités post-mutation vérifiées, autorités non modifiées vérifiées, aucun `.rej`, Recency non bindée | Preuves A/B ciblées. **49 contrôles spécifiques** = 10 gouvernance + 39 Recency. Non-régression runtime offline démontrée ; aucune preuve C/D/E ; `canonical_vlr_activation=NOT_PERFORMED`, `production_activation=NOT_PERFORMED`, `search_to_mci_activation=NOT_PERFORMED` |

**Limite commune aux résultats visuels :** la révision Git et les empreintes de tous les fichiers exécutés ne sont pas présentes dans ces sorties. Les empreintes locales de l’annexe ne leur sont pas attribuées rétroactivement. Ces résultats sont conservés sans prétendre certifier une révision différente.

Une future preuve conserve : affirmation vérifiée, critère normatif, fichiers/révision, environnement, commande ou procédure réellement exécutée, résultat, effet et éventuelles mutations, artefact brut, limites et composants concernés. Les secrets et URL contenant des credentials n’y figurent pas.

<a id="section-8"></a>

## 8. Blocages et divergences

| ID | Qualification | Constat et règle | Impact / résolution admissible |
| --- | --- | --- | --- |
| <a id="B-01"></a>B-01 | CONFORMITÉ NON ÉTABLIE | Producteur concret des observations et de la référence non établi dans les trois archives ; les appelants trouvés dans les scripts sont des fixtures (E-06) ; N-01 §§6–8 | Suspendre le binding dépendant ; inspecter le dépôt actuel et ses appelants avant toute correction |
| <a id="B-02"></a>B-02 | CONFORMITÉ NON ÉTABLIE | Traçabilité des identités d’observation à établir ; N-01 §14, N-04 | Rechercher les entrées officielles et leur propagation ; ne pas créer de noms VLR par hypothèse |
| <a id="B-03"></a>B-03 | LIMITE DE PROVENANCE | Copie partielle et absence de révision Git des exécutions visuelles | Rattacher les preuves au code actuel ; ne pas certifier l’ensemble du dépôt |
| <a id="B-04"></a>B-04 | COUVERTURE NON ÉTABLIE | Market et parcours interface complets non audités ; route HTTP Search seule inspectée en E-06 | Récupérer les références existantes ; aucune réouverture automatique de phase CLOSED |

Cette édition ne transforme aucun de ces manques de preuve en violation démontrée du dépôt complet. Elle ne certifie pas non plus l’absence de violation.

Une fiche de divergence complète conserve : dernière frontière démontrée correcte, première divergence observable, référence normative, état attendu/observé, contrat et ownership concernés, impacts aval, action suspendue, investigation autorisée, résolution et preuve de clôture.


### 8.1 Clôture ciblée — Recency Policy Governance

**Statut : CLOSED — périmètre strictement borné à `Recency Policy Governance`, preuve E-12.**

La clôture couvre uniquement :

- intégration de `recency_policy` dans la gouvernance Financial News ;
- policy-set schema version `2.0.0` ;
- policy-set values version `2.0.0` ;
- 11 policies non-calibration ;
- 12 policies externally governed ;
- 20 policies Financial News configurées ;
- 19 policies bindées au runtime générique ;
- 1 policy de domaine gouvernée mais non bindée : `recency_policy` ;
- 10 contrôles offline de gouvernance ;
- maintien des 39 contrôles fonctionnels Recency ;
- non-régression du runtime Financial News offline simulé ;
- absence de binding Recency démontrée.

La clôture **ne couvre pas** :

- le binding `buildSearchFinancialNewsRecency` dans le runtime ;
- le binding Temporal → Recency ;
- l’enregistrement/activation canonique VLR des quatre variables Recency ;
- une preuve d’intégration réelle C ;
- un binding réel D ;
- une activation production E ;
- Search → MCI.

Aucun de ces éléments ne devient CLOSED par dépendance ou proximité de chantier.


<a id="section-9"></a>

## 9. Jalons et conservation des acquis

Les identifiants E-xx et B-xx servent uniquement au présent document. Les identifiants historiques des chantiers sont conservés lorsqu’ils sont établis ; aucun renommage ou découpage rétroactif n’est effectué ici.

| Objet suivi | État conservé | Condition pour avancer |
| --- | --- | --- |
| Suite PostgreSQL isolée | Résultat réussi E-01 | Ne pas la confondre avec le binding ; réexécution uniquement pour impact ou critère applicable démontré |
| Contrat temporel | Validation locale E-02 | Établir ses prérequis amont et sa filiation |
| Lecteur offline | Résultat réussi E-03 | Établir B-01/B-02 avant le branchement réel |
| Branchement applicatif temporel | Non établi | Preuves de source, contrat, VLR, assemblage et exécution réelle du chemin attendu |
| Recency Policy Governance | **CLOSED**, E-12 ; policy set `2.0.0`, 11 non-calibration / 20 Financial News, 49 contrôles spécifiques réussis, non-régression runtime offline réussie | Ne pas confondre avec le binding Recency ; VLR ACTIVE, intégration réelle et production restent non établis |
| Phases Market antérieures | Clôtures non reconstituées par cette édition | Importer les preuves existantes sans les invalider par défaut |
| Interface | État complet non inspecté | Rattacher le périmètre accepté aux contrats et parcours effectivement disponibles |

Une clôture exige les critères applicables et leurs preuves selon N-01 §§28–30 et 45. Une réouverture documente l’hypothèse invalidée, le changement impactant ou l’invariant réellement violé. Un travail voisin ne suffit pas.

Toute évolution du nombre d’étapes restantes indique la cause : périmètre explicitement changé, dépendance découverte, preuve retrouvée ou divergence démontrée. Aucun pourcentage artificiel n’est calculé à partir du nombre de fichiers ou de tests.

<a id="section-10"></a>

## 10. Dépendances jusqu’à l’interface

Ce tableau est une carte de vérification. Il n’affirme pas que les capacités mentionnées sont toutes absentes et n’ouvre pas de nouveau chantier.

| Résultat utilisateur visé | Dépendances à démontrer | État dans cette édition |
| --- | --- | --- |
| Résultats Search exposés | Source autorisée, vérités canoniques, contrats/VLR, exécution, projection publique et API | Chemin temporel réel non établi ; POST HTTP attend une projection externe, GET 405 (E-06) |
| Données Market exposées | Producteurs et cycle cohérents, snapshot/lecture autorisés, projection et API contractuelles | Preuves actuelles à rattacher |
| Affichage de disponibilité et d’historique | États contractuels, couverture et provenance préservés jusqu’à l’affichage | Principes établis ; propagation complète à vérifier |
| Interface analytique | Consommation des seules sorties autorisées ; aucune reconstruction des scores ou décisions | Audit de l’interface existante et scope de livraison à rattacher |
| Espace professionnel et compte | Périmètre prévu, contrats d’accès et services nécessaires aux fonctions retenues | Chantier dédié ; aucune implémentation par ce document |
| Livraison dans l’environnement visé | Gates applicables de sécurité, configuration, release, provenance et exploitation | Exigences à tirer des documents concernés ; production non certifiée ici |

Le prochain travail documentaire est de rattacher le dépôt et les preuves actuels. Une fois les prérequis établis, seules les dépendances réellement manquantes pourront constituer des tâches d’implémentation.

## 11. Maintenance et historique

La [maintenance commune](XYVALA_ARCHITECTURE_REFERENCE.md#11-utilisation-et-maintenance) s’applique. L’[historique 0.1.0–0.3.1](XYVALA_ARCHITECTURE_REFERENCE.md#12-historique-et-contrôle-de-cette-édition) est conservé dans le global. Les annexes A à D conservent intégralement leurs constats et empreintes historiques.

| Version | Date | Changement | Limite |
| --- | --- | --- | --- |
| 0.1.4 | 2026-09-18 | C-12/C-13, E-12 et annexe H : Recency Policy Governance intégrée ; policy-set schema/values `2.0.0`, 11 non-calibration, 20 Financial News ; 10 + 39 contrôles spécifiques et non-régression runtime offline réussis ; clôture ciblée `Recency Policy Governance` | Binding Recency non effectué ; VLR canonique non activé ; aucune preuve C/D/E ; Search → MCI non activé ; commit Git Search non établi dans cette édition |
| 0.1.3 | 2026-09-15 | C-10/C-11, E-11 et annexe G : producteur candidat et 39 contrôles offline réussis | Calcul sur fixtures ; artefact de policy réel, enregistrement VLR et binding non établis |
| 0.1.2 | 2026-09-15 | C-09, E-10 et annexe F : contrat spécialisé proposé, critères d’échec et préparation des champs VLR | Contrat seul ; aucune policy active, aucun producteur exécuté, aucun enregistrement dans le VLR canonique |
| 0.1.1 | 2026-09-15 | Clarification 24H/7D, E-09 et annexe E ; proposition de producteur de domaine ; renvois adaptés au global 0.3.1 fourni | Documentation seulement ; contrats, VLR, policies et code inchangés ; B-01/B-02 non clôturés |
| 0.1.0 | 2026-09-15 | Transfert documentaire depuis le global 0.3.1 et ajout de liens | Aucun test relancé, aucun statut technique modifié, aucune phase rouverte |

<a id="annexe-a"></a>

## Annexe A — Empreintes des copies examinées

Ces SHA-256 identifient les fichiers disponibles lors de la rédaction. Ils ne prouvent pas que ces fichiers sont ceux exécutés sur le Mac et ne remplacent pas une révision du dépôt. Les chemins `upload/` et `xyvala-integration/` décrivent uniquement les copies de travail de cette rédaction.

| Copie | SHA-256 |
| --- | --- |
| `upload/Fichier markdown(8).md collé` | `95c0e7eb63febb66e974de20b9aeb59d3d2d4685906bc934221d46e6147d6ef3` |
| `upload/Fichier markdown (3).md collé` | `8ac6279653657252e9144e059d494040a35c0cb1524f2c4aedd1a1edcb755f8e` |
| `upload/Fichier markdown (2)(1).md collé` | `605bfac5f928d9f04dd9fa2c1796a22f138b278d6ac50c7d0b73a41c1055a38a` |
| `upload/Fichier markdown(4).md collé` | `5744bd826c707ce93b8167867f926bc7c2012f56f95fc2022b2fac9d88951d9c` |
| `upload/Fichier markdown(5).md collé` | `36ba60b0aed84c8618489ad1f598e2b34d10863a7d780b6be04e4209ecbbd1de` |
| `xyvala-integration/lib/xyvala/search/domains/financial-news/search-financial-news-temporal-reference-contract.ts` | `e81b993ae1ed6b8ec559e4633199b60ebef83533080e50b18d4635eb3046dae1` |
| `xyvala-integration/lib/xyvala/search/domains/financial-news/search-financial-news-recorded-temporal-reader.ts` | `d43be7488fd26e56591a0b2b7bd50d9ea984367dd8883deaa6aa6641a5ac873b` |
| `xyvala-integration/lib/xyvala/search/contracts/search-temporal-observation-store-contract.ts` | `86d798db68cefabd37ed89c9e23cfff48e5aa79bbd9437b20204cc62b78f3aae` |
| `xyvala-integration/lib/xyvala/search/governance/search-variable-lineage-registry.ts` | `fc0e12eb6562902d1bb55144854e7c672e73947bd3b368d947cc3249f85f58de` |
| `xyvala-integration/lib/xyvala/search/domains/financial-news/search-financial-news-recorded-temporal-source.ts` | `eccd2603306b91684257f1bce35ace2d0e13255032ed04d90bf2cacaae810d60` |
| `xyvala-integration/lib/xyvala/search/domains/financial-news/search-financial-news-temporal-observation-provider.ts` | `555c01cd51b702cf67213542d1ca1baeb34e7ef5f2c94a4752ef1bf00bad87ef` |
| `xyvala-integration/lib/xyvala/search/domains/financial-news/search-financial-news-runtime-configuration.ts` | `5e261cfb8df17c198dc6f063eca024c40a64d559a4025724a51cdde240f72b84` |
| `xyvala-integration/lib/xyvala/search/domains/financial-news/search-financial-news-application-composition.ts` | `68c497005cfba33101acef20bd38e73b55b8f60843f41ca3645426cbe3b4a049` |
| `xyvala-integration/lib/xyvala/search/temporal/search-temporal-document-series-identity.ts` | `7df0c088f809c6be8f4593d0908e79a53757826c39ab52a15f8cbe4bdd5af8be` |


<a id="annexe-b"></a>

## Annexe B — Mise à jour issue de l’archive Search (0.2.0)

### B.1 Provenance et méthode

Archive fournie par l’utilisateur : `search.zip`.

SHA-256 : `80826d6aa98d366b0a6d8fd14715bb4a0cb28be8aa9f262320b52ac3f3c4ffc3`.

Inventaire : 90 fichiers `.ts`, un fichier `.sql`, 3 405 259 octets de contenu source. L’inventaire porte sur toute l’archive ; la revue sémantique porte sur le chemin temporel décrit ci-dessous, pas sur une certification de chaque ligne des 91 fichiers.

Aucun document Markdown, configuration de projet ou historique Git n’est inclus. Les dossiers `app`, `scripts` et les autres domaines de `lib/xyvala` sont hors archive. L’import du repository vers `lib/xyvala/runtime/postgres/postgres-adapter` désigne notamment une dépendance externe à cet ensemble.

Les documents N-01 à N-05 restent ceux de l’édition initiale. Cette archive ne fournit pas de nouvelles versions de ces documents. Les copies de code antérieures ont été conservées séparément.

### B.2 Constats précis

| Point | Résultat dans l’archive | Conclusion autorisée |
| --- | --- | --- |
| Lecteur C-02 | Factory présente ; contenu identique à la copie de l’édition 0.1.0 | Implémentation disponible ; aucune nouvelle preuve de runtime |
| Source enregistrée C-05 | Factory présente ; elle appelle la capacité `read_recorded_observations` injectée | Transporte les observations ; ne produit pas l’observation courante |
| Repository PostgreSQL | Version déclarée `2.0.0` ; capacités `read` et `write` ; transaction injectée | Persistance présente ; source des observations et appel applicatif non démontrés |
| Appels des trois factories | Les recherches des symboles et des chemins de modules ne trouvent aucun appel aux factories du lecteur, de la source enregistrée ou du repository dans ce dossier | Aucun assemblage direct de ces factories identifié dans l’archive ; rechercher les appelants extérieurs |
| Résolution de référence | `resolve_current_observation_reference` apparaît dans le contrat et dans le lecteur qui la consomme | Aucune implémentation concrète de cette dépendance identifiée dans l’archive |
| Source temporelle autorisée | Transmise depuis la préparation du run, la composition et la configuration ; le provider restitue la fonction reçue | L’origine concrète reste à tracer à l’entrée de la préparation/composition |
| Identité d’observation dans Temporal | Les usages inspectés valident ou transportent une identité reçue ; la factory de rupture recopie celle de son observation d’entrée | La factory de rupture n’établit pas un producteur d’identité d’observation |
| VLR C-04 | Identique à la copie antérieure ; entrée de série présente ; aucune occurrence de `observation_id` ou `current_observation_id` | Filiation des identités d’observation toujours non établie ; cette recherche ne remplace pas l’audit de tous les registres extérieurs |

Les identités d’observation d’exécution présentes dans les modules de gouvernance ne sont pas assimilées aux identités des observations temporelles documentaires. La similarité des noms ne prouve pas une identité de contrat ou d’ownership.

La comparaison binaire des 91 sources avec la copie précédente trouve 88 fichiers identiques et trois différents : repository PostgreSQL, frontière de validation des enregistrements temporels et builder de snapshot privé. Cette comparaison n’est pas une preuve de régression. Aucun de ces fichiers n’a été remplacé ou corrigé pendant l’audit. Le repository de l’archive est la version à considérer pour la suite de cette investigation, sans lui attribuer rétroactivement les résultats E-01.

### B.3 État des blocages et suite

B-01 et B-02 restent **CONFORMITÉ NON ÉTABLIE**, désormais sur une archive utilisateur identifiée plutôt que sur la seule copie antérieure. E-01, E-02 et E-03 restent conservées avec leur portée initiale.

À l’édition 0.2.0, la prochaine investigation portait sur les appelants extérieurs à `lib/xyvala/search`, notamment les points d’entrée applicatifs et scripts qui fournissent `authorized_temporal_observation_source`, appellent `createSearchFinancialNewsApplicationComposition` ou `executeSearchFinancialNewsPreparedRun`, ou assemblent les factories du stockage et du lecteur.

Avant toute création de producteur ou de binding, établir ce que ces appelants fournissent réellement et les contrats/VLR applicables. Si la source canonique existe ailleurs, la documenter et réutiliser son chemin autorisé. Si son absence est démontrée sur le périmètre pertinent, définir le chantier conforme avant toute implémentation. Aucun de ces scénarios n’est supposé acquis ici.

**Résultat du présent travail :** audit statique ciblé et mise à jour documentaire. Aucun accès PostgreSQL, aucun test, aucune migration, aucune activation, aucune modification de source et aucune déclaration de conformité globale.

### B.4 Empreintes des fichiers déterminants de l’archive

| Chemin sous `search/` | SHA-256 |
| --- | --- |
| `domains/financial-news/search-financial-news-temporal-reference-contract.ts` | `e81b993ae1ed6b8ec559e4633199b60ebef83533080e50b18d4635eb3046dae1` |
| `domains/financial-news/search-financial-news-recorded-temporal-reader.ts` | `d43be7488fd26e56591a0b2b7bd50d9ea984367dd8883deaa6aa6641a5ac873b` |
| `domains/financial-news/search-financial-news-recorded-temporal-source.ts` | `eccd2603306b91684257f1bce35ace2d0e13255032ed04d90bf2cacaae810d60` |
| `storage/search-temporal-observation-postgres-repository.ts` | `764c4562a790d9a1b3c719750b89b80076c63a9365b584797a607edb11d3f6c6` |
| `governance/search-variable-lineage-registry.ts` | `fc0e12eb6562902d1bb55144854e7c672e73947bd3b368d947cc3249f85f58de` |


<a id="annexe-c"></a>

## Annexe C — Points d’entrée et scripts fournis (0.3.0)

### C.1 Provenance et méthode

Archives fournies par l’utilisateur le 2026-09-14, extraites dans un dossier distinct. Inspection statique ciblée, sans exécution des scripts ni modification du code. Les nombres ci-dessous comptent les fichiers utiles extraits hors métadonnées `__MACOSX`, y compris les sauvegardes ; ils ne mesurent pas l’avancement.

| Archive | Inventaire | SHA-256 |
| --- | --- | --- |
| `app.zip` | 50 fichiers, dont 34 `.ts` et 10 `.tsx` | `c6c650462339bf0497b2cc0a7a42152310c3510e7e109ce80def64dcb54fc196` |
| `scripts.zip` | 18 fichiers, dont 13 `.ts` et 2 `.cjs` | `da4812d6d0171b0bec966c7117fef16d53402fb59851ef36d60821e6933f4e8b` |

Les recherches portent notamment sur `authorized_temporal_observation_source`, `resolve_current_observation_reference`, les factories du lecteur, de la source enregistrée et du repository, `createSearchFinancialNewsApplicationComposition` et `executeSearchFinancialNewsPreparedRun`. Les recherches textuelles ne garantissent pas la détection d’appels indirects ou dynamiques. La révision Git commune aux trois archives n’est pas établie.

### C.2 Frontières réellement constatées

| Élément | Comportement inspecté | Conclusion limitée |
| --- | --- | --- |
| `app/api/search/route.ts` | POST lit `body.projection`, vérifie l’enveloppe HTTP, appelle `exposeSearchPublicRankingProjection`, puis `buildSearchPublicResponse` et sérialise la réponse | Adaptateur d’exposition présent ; ne lance pas une requête Search et ne fournit pas de source temporelle |
| Même route, GET | Retourne HTTP 405 `METHOD_NOT_ALLOWED` | Ce chemin ne permet pas actuellement une recherche GET |
| `scripts/xyvala/search/validate-financial-news-dataforseo-runtime-integration.ts` | Utilise la composition et l’exécution canoniques avec acquisition, transport et observations simulés ; temporal construit un identifiant `private-current:` et un historique vide de fixture | Intégration offline définie dans le code ; aucun producteur temporel de production démontré par ce script |
| `scripts/xyvala/search/validate-financial-news-recorded-temporal-reader.ts` | Assemble lecteur et source enregistrée avec des ports de référence et de lecture en fixtures | Exercices de binding offline ; ne constitue pas le branchement PostgreSQL de l’application |
| `scripts/xyvala/search/validate-search-temporal-postgres.cjs` | Assemble le repository pour une suite de test ; exige une cible isolée et distingue `--run` ; rapporte `runtime_binding_validated:false` | Validateur de stockage réel isolé, distinct de l’assemblage applicatif ; aucune exécution effectuée pour E-06 |

La route qualifie elle-même sa frontière d’entrée de temporaire. Ce commentaire concorde avec le corps du POST inspecté. Il ne suffit pas à autoriser cette frontière comme architecture finale : la provenance canonique du producteur de la projection et son raccordement restent à établir. La validation de forme d’une projection ne démontre pas à elle seule sa provenance analytique.

L’identifiant `private-current:` est observé dans un scénario privé simulé. Il n’est ni adopté comme règle d’identité officielle ni proposé comme solution de production. De même, la présence d’un adaptateur DataForSEO dans une suite utilisant un `fetch` simulé ne prouve aucun appel réel au fournisseur.

### C.3 Incidence sur les acquis et la suite

- E-01 (15 contrôles PostgreSQL isolés), E-02 et E-03 (21 contrôles offline) sont conservés dans leur périmètre historique. Aucun résultat de test nouveau n’est revendiqué.
- B-01 reste une conformité non établie. L’investigation des points d’entrée fournis est accomplie ; les fixtures trouvées ne résolvent pas le prérequis de source réelle.
- B-02 reste inchangé : aucun lineage d’observation n’est inventé à partir du nom des fixtures.
- L’exposition HTTP Search existe, mais son raccordement à une exécution réelle n’est pas établi. Cette limite doit figurer dans toute estimation jusqu’à l’interface.
- Aucun nouveau module, contrat, propriétaire, fallback, migration, activation ou chantier d’interface n’est autorisé par ces constats.

La suite est une recherche ciblée des assemblages restants dans le dépôt actuel, avec sa révision, avant toute conclusion d’absence globale ou proposition d’implémentation. Elle doit respecter l’ordre officiel : réalité, identité, owner, producteur, contrat, VLR, frontière, intégration, consommateurs, exposition, validation.

### C.4 Empreintes des fichiers déterminants

| Fichier | SHA-256 |
| --- | --- |
| `app/api/search/route.ts` | `2b9e2b4cefeff197aec4951ae16bbf21f36b9af411f1b2e27b09c41955fad25a` |
| `scripts/xyvala/search/validate-financial-news-dataforseo-runtime-integration.ts` | `b7749a866412d24a42fcd47d79f70a3e54635f5550aa3f8b81dad9bf315fc51f` |
| `scripts/xyvala/search/validate-financial-news-recorded-temporal-reader.ts` | `559155273130b2640fbea1a45b4da8ff77b032a7f80666712d0da190e87545df` |
| `scripts/xyvala/search/validate-search-temporal-postgres.cjs` | `a22da836566a4cb8a8a22f977e29464615c5362a8d9c5e1a9a741ba7593a27c1` |

Ces empreintes identifient les fichiers inspectés statiquement. Elles ne sont pas attribuées rétroactivement aux validations visuelles antérieures et ne certifient pas le dépôt déployé.


<a id="annexe-d"></a>

## Annexe D — Provenance de l’observation temporelle (0.3.1)

### D.1 Investigation accomplie

La capture du 14 septembre à 22.46.48 montre la recherche complémentaire et son résultat sans correspondance. Elle clôt cette recherche précise ; elle ne couvre pas les fichiers ignorés, les autres extensions ou les références indirectes. La révision Git reste inconnue. Les résultats antérieurs demeurent conservés.

Inspection ciblée des sources déjà fournies :

| Réalité / champ | Producteur ou contrat constaté | Limite pour le branchement temporel |
| --- | --- | --- |
| Article fournisseur | `domains/financial-news/search-financial-news-eodhd-acquisition-source.ts` : mappe URI, contenu, publication et métadonnées vers `SearchFinancialNewsAcquisitionInput` | Produit une entrée Acquisition ; aucune observation temporelle complète dans cette sortie |
| `document_id` | `acquisition/search-acquisition-core.ts` : `computeSearchDocumentId`, consommé par `buildSearchRawDocument` | Identité documentaire déterministe fondée sur URI, type, MIME et hash ; ne définit pas `observation_id` |
| `content_hash` brut | Même module : `computeSearchRawContentHash` | Empreinte du contenu brut uniquement ; éventuel transport vers une observation à rattacher à son contrat et son lineage |
| `document_series_id` | Producteur canonique de série déjà identifié en annexe B et dans C-04 | Réutiliser son contrat ; aucune nouvelle identité de série |
| `observation_id` | Contrat C-01 : appartient à la source temporelle amont autorisée | Source réelle, règle d’identité et lifecycle non établis ; le résolveur ne doit pas le dériver du document, du hash, d’un compteur ou de l’horloge |
| `observed_at` | Champ obligatoire de `SearchTemporalSearchObservation` dans `temporal/search-temporal-signals-search-core.ts` | Ne pas assimiler implicitement date de publication, date d’acquisition et instant de l’observation temporelle |
| Mesures structurelles | Même type : `frequency_structure_value`, `anchor_structure_value`, `convergence_value`, `link_profile_value`, sous `SearchOptionalEvidence<SearchNormalizedScore>` | Les noms ne prouvent aucune équivalence avec un score Frequency, Anchor, Context ou Link existant ; producteurs et mappings autorisés à établir |
| Provenance persistée | C-03 : `producer_module`, `producer_version`, `source_reference` fournis en amont | Ne pas inventer une référence fournisseur ou attribuer au repository l’origine des mesures |

Le source EODHD reçoit une horloge injectée et distingue `fetched_at` de `created_at`. Il préserve la publication comme preuve distincte. Cette implémentation n’autorise pas à définir `observed_at` par simple renommage d’un de ces champs.

Le cœur Acquisition exclut les timestamps de son `document_id` : un contenu identique provenant de la même source peut conserver son identité documentaire lors de réexécutions. Ce comportement explique pourquoi identité documentaire et identité d’observation doivent être explicitement distinguées ; il ne prescrit aucun nouvel algorithme d’observation.

### D.2 Fiche de décision à compléter avant implémentation

Cette fiche décrit les questions normatives restantes, pas un contrat nouveau ni une décision approuvée.

| Point à établir | Preuve attendue avant binding |
| --- | --- |
| Réalité observée | Définition exacte d’une observation temporelle et de son événement de capture ; périmètre des mesures réellement disponibles |
| Identité et lifecycle | Règle officielle d’identité, distinction nouvelle observation / replay / retry, portée d’unicité et provenance du timestamp |
| Ownership et producteur | Module/version canonique autorisés pour chaque vérité ; assemblage éventuel limité au transport explicitement prévu |
| Contrats et VLR | Correspondances exactes des champs, unités, disponibilité, catégories Truth/Reference/Transport et entrées de lineage applicables |
| Frontières et effets | Production qualifiée, persistance explicite séparée, résolution sans production ni sélection du dernier enregistrement, lecture exacte |
| Validation | Critères de réussite fixés sur ces contrats, puis preuves adaptées au périmètre ; maintien de E-01 à E-03 |

Aucun nom de module supplémentaire, algorithme d’identité, formule structurelle ou conversion de disponibilité n’est défini dans cette édition. `UNAVAILABLE` ne doit pas servir à fabriquer une observation qui n’a jamais eu lieu. Un historique vide ne remplace pas une référence courante manquante.

**Première limite non résolue :** la sémantique et la provenance de l’observation temporelle complète ne sont pas établies par les contrats de lecture/stockage ou par la source d’articles inspectée. Selon N-01 §§6–8 et 24, l’implémentation et le branchement dépendants restent suspendus. La recherche des définitions officielles de cette réalité et de ses mesures reste autorisée ; aucun assouplissement du protocole n’est demandé.


<a id="annexe-e"></a>

## Annexe E — Financial News : classification 24H/7D et provenance (0.1.1)

### E.1 Définition et statut

**Définition fondée sur N-03 §§XXV–XXVI et N-04 §XL :** la classification 24H/7D d’une actualité financière exprime son appartenance aux fenêtres de publication de 24 heures et de 7 jours, à partir de son âge canonique fourni par Temporal pour une référence analytique explicite. Les bornes sont inclusives. Une publication inconnue ou invalide demeure une preuve temporelle indisponible ou invalide ; elle ne devient ni récente ni un âge mesuré égal à zéro.

Cette définition porte sur l’âge de publication. Elle n’exige pas sept jours de collecte préalable et n’établit ni une continuité d’observation, ni une stabilité, ni une corroboration éditoriale. Ces propriétés demandent leurs propres vérités et preuves.

Les règles de fenêtres et les quatre noms VLR existent dans les sources officielles. Le nom du producteur technique proposé ci-dessous, son contrat concret, sa policy et les valeurs exactes de son éventuel enum de classification ne sont pas établis comme implémentation officielle par les pièces inspectées. La présente annexe organise leur conception ; elle ne remplace pas ces autorités.

### E.2 Réalités, identités et propriétaires

| Réalité | Origine / ownership à préserver | Conséquence |
| --- | --- | --- |
| Publication du document | Preuve source reçue par Acquisition ; `published_at` conservé par Temporal selon son lineage | Une date d’acquisition ou de construction d’objet ne remplace pas la publication |
| Âge de publication | `TEMPORAL_SIGNAL_DETECTION` ; `publication_age_ms` dans `SearchTemporalSignals` | Le module de domaine consomme cet âge ; il ne soustrait pas deux dates à nouveau |
| Appartenance 24H/7D | Vérité temporelle sous la responsabilité canonique de Temporal, représentée par les variables Financial News de N-04 §XL | Un producteur spécialisé dans le domaine peut appliquer la convention ; cela ne crée pas un deuxième owner du temps |
| Document concerné | `document_id` canonique reçu et transporté | Aucune nouvelle identité documentaire ou d’observation n’est nécessaire pour comparer un âge aux bornes |
| Référence analytique de l’âge | `publication_reference_at` explicitement fourni au producteur temporel | Le lineage du résultat doit permettre de rattacher l’âge à cette référence ; `created_at` n’en est pas un alias implicite |
| Observation comparative | Observation et historique décrits en annexe D | Identité, mesures et producteur restent soumis à B-01/B-02 ; les flags 24H/7D ne les produisent pas |

N-03 §XXV fixe l’ownership temporel ; N-04 §XL impose un module de domaine identifié pour les variables Financial News. Le dossier de code du producteur et le propriétaire canonique sont deux notions distinctes. La proposition retient un producteur spécialisé rattaché à Temporal, sans ajouter une couche `FINANCIAL_NEWS` à l’enum générique ni déplacer l’ownership vers Acquisition, le scoring, le stockage ou le runtime.

### E.3 Producteur et contrat proposés

**Proposition technique, non déclarée existante :** `buildSearchFinancialNewsRecency`, dans `lib/xyvala/search/domains/financial-news/search-financial-news-recency-core.ts`. Sa seule responsabilité serait de classifier l’âge canonique reçu selon la convention Financial News autorisée. Le contrat spécialisé proposé serait documenté dans `search-financial-news-recency-contract.ts`, au même emplacement. Ces noms sont des choix de conception proposés, pas des chemins observés ni une autorisation de créer un moteur parallèle.

| Dimension | Proposition concrète | État |
| --- | --- | --- |
| Frontière | `COMPUTE`, déterministe, sans I/O ni lecture d’horloge | Périmètre proposé |
| Entrée temporelle | Résultat canonique Temporal validé pour le document et la même référence analytique ; classification fondée exclusivement sur `publication_age_ms` | Type amont inspecté ; contrat spécialisé à formaliser |
| Identité | Transport exact du `document_id` et rattachement à l’exécution temporelle d’origine | Mécanisme précis de référence/trace à rattacher aux contrats existants ; aucun identifiant fabriqué |
| Policy | Policy explicite, identifiée et versionnée, conforme aux bornes normatives | Source technique et version autorisée non établies ; aucune version par défaut inventée |
| Sorties | Les quatre variables Financial News déjà nommées au VLR, décrites ci-dessous | Noms normatifs établis ; types spécialisés, version de schéma et enum exact à formaliser |
| Déterminisme | Même entrée canonique et même policy : même classification ; un replay ne vieillit pas l’article par lecture de l’horloge | Critère à vérifier lors de l’implémentation |
| Effets | Aucun accès fournisseur, aucune écriture, aucun tri, aucune sélection ou exclusion de document | Limite du producteur proposé |

| Variable VLR existante | Sémantique visée | Filiation à inscrire dans le VLR officiel |
| --- | --- | --- |
| `search.financial_news.within_24h` | Appartenance à la fenêtre 24H lorsque l’âge est disponible et valide | Âge canonique Temporal + convention/policy autorisée ; résultat spécialisé, sans recalcul d’âge |
| `search.financial_news.within_7d` | Appartenance à la fenêtre 7D lorsque l’âge est disponible et valide | Même âge, même référence et même policy que `within_24h` |
| `search.financial_news.recency_state` | Qualification cohérente des fenêtres, distincte de la disponibilité de la preuve et de la calibration historique | Dérivation unique dans le producteur spécialisé ; aucune copie de `temporal_state` |
| `search.financial_news.recency_policy_version` | Version exacte de la policy effectivement appliquée | Référence/transport depuis la policy autorisée ; jamais une nouvelle version analytique créée par le producteur |

Pour les booléens, réutiliser la sémantique existante de `SearchOptionalEvidence<boolean>` est la proposition retenue : `AVAILABLE(false)` signifie une exclusion de fenêtre réellement calculée ; un état non disponible ne porte pas de booléen. Le même principe s’applique à la qualification de récence. Les libellés exacts de cette qualification doivent être fixés dans le contrat spécialisé ; les descriptions du tableau E.4 ne sont pas des enums ajoutés au logiciel.

Les catégories, niveaux d’exposition, versions et champs obligatoires de N-04 §II devront être inscrits dans le VLR officiel avec le producteur réellement retenu. Cette annexe n’est pas une entrée VLR de remplacement et ne confère aucun statut `ACTIVE` ou `VALID` à la proposition.

### E.4 Convention exacte et disponibilité

Soit `a` la valeur **déjà produite** de `publication_age_ms`, disponible, finie et non négative. La conversion des durées officielles donne 24H = 86 400 000 ms et 7D = 604 800 000 ms. Il s’agit de durées écoulées, sans arrondi par jour civil ni dépendance au fuseau de l’interface.

| Âge canonique valide | `within_24h` | `within_7d` | Qualification descriptive |
| --- | --- | --- | --- |
| 0 ≤ a ≤ 86 400 000 ms | `AVAILABLE(true)` | `AVAILABLE(true)` | Dans les deux fenêtres |
| 86 400 000 < a ≤ 604 800 000 ms | `AVAILABLE(false)` | `AVAILABLE(true)` | Dans 7D seulement |
| a > 604 800 000 ms | `AVAILABLE(false)` | `AVAILABLE(false)` | Au-delà de 7D |
| Âge non disponible | État de disponibilité et raison préservés | Même état et raison | Aucune classe de récence disponible |
| Valeur prétendue disponible mais invalide | Échec de validation explicite | Aucun résultat analytique valide | Aucun rattrapage vers zéro ou vers une classe |

Les états `UNAVAILABLE`, `INSUFFICIENT_DATA`, `INSUFFICIENT_HISTORY`, `UNSUPPORTED` et `INVALID` de la preuve d’âge conservent leur distinction. Une policy absente, invalide ou incompatible ne déclenche pas de policy de secours ; le contrat doit prévoir un échec explicite avant classification et ne prétend pas qu’une version a été appliquée.

La disponibilité de `publication_age_ms` est évaluée sur ce champ et sur la validation de l’entrée. Le seul `temporal_state: INSUFFICIENT_HISTORY` n’autorise pas à effacer un âge par ailleurs canonique et disponible. Réciproquement, la présence d’un historique ne rend pas une date inconnue disponible. Cette distinction n’autorise pas à contourner les préconditions du producteur Temporal ou de son runtime actuel.

Pour un âge négatif, la copie du producteur Temporal inspectée émet déjà une preuve `INVALID` : une publication future n’est pas assimilée à une publication de maintenant. Si un transport corrompu présentait malgré tout un âge négatif comme disponible, la frontière de validation le rejetterait sans réparer la vérité amont.

### E.5 Intégration et consommateurs

L’intégration devra consommer une sortie autorisée de Temporal, puis propager la classification spécialisée par les contrats du domaine vers les seuls consommateurs autorisés. Le point d’appel concret dans les bindings/composition n’est pas établi ici. Ni l’ajout automatique des quatre champs à `SearchTemporalSignals`, ni un appel direct de l’interface au cœur proposé ne sont déduits de cette annexe.

L’âge canonique reste produit une seule fois par Temporal. Les scorers, l’agrégation, les adapters, le runtime et l’interface ne reconstruisent pas les flags à partir de dates ou d’une horloge. Les enrichissements de domaine respectent Analytical Aggregation et les frontières d’exposition existantes.

Le classement au-delà de 7D n’entraîne pas à lui seul une suppression, une exclusion d’Eligibility, un score zéro ou un changement de décision privée. N-03 §XXVI soumet l’exclusion de la participation analytique active à une policy autorisée ; l’index peut conserver le document pour la recherche historique. Aucune telle policy ni son consommateur ne sont créés ici.

Les paramètres EODHD `from_date`/`to_date` définissent une requête fournisseur. Ils ne certifient ni l’âge canonique de chaque résultat ni l’exhaustivité des actualités des sept derniers jours. Une page fournisseur, une durée de rétention de snapshot et une fenêtre de classification répondent à des besoins distincts.

Les détails et l’avancement Market restent dans leur référentiel. La consommation Search → MCI demeure différée au chantier MCI ; la classification proposée ne déclenche pas cette intégration.

### E.6 Constats supplémentaires et portée de E-09

| Pièce ou code | Fait constaté | Conclusion permise |
| --- | --- | --- |
| `contracts/search-pipeline-contract.ts`, interface `SearchTemporalSignals` ; même déclaration visible dans la vidéo du 15 septembre à 20:29:46 | `published_at` et `publication_age_ms` présents ; quatre champs Financial News absents de cette interface | Contrat générique inspecté ; cette absence ne démontre pas à elle seule une violation ni une absence dans tout le dépôt |
| `temporal/search-temporal-signals-search-core.ts`, `buildSearchTemporalSignals` et calcul interne d’âge | Âge produit depuis publication et référence explicite ; états non disponibles conservés ; âge négatif invalide | Producteur d’âge identifié dans la copie ; activation réelle non démontrée |
| Source EODHD, rubrique `TEMPORAL PROVENANCE` | Interdit explicitement calcul d’âge, classification 24H/7D et correction d’une date future | Acquisition ne doit pas devenir ce producteur de classification |
| `scoring/search-document-scoring-core.ts`, occurrence `within_7d` | Nom présent dans `prohibited_reconstructions` | Déclaration d’interdiction ; aucune production du flag démontrée par cette occurrence |
| Capture du 15 septembre à 20:22:17 | Recherche de noms/durées et des paramètres de dates ; correspondances dans contrat fournisseur, scoring et services de snapshots | N’établit pas une classification 7D active ni une collecte complète ; pas de répétition de cette recherche ici |
| Capture du 15 septembre à 20:25:12 | Recherche de la factory EODHD et du chemin de son module dans `lib app` : seul le fichier de définition est affiché | Aucun appelant identifié par cette recherche précise ; appels indirects et code hors périmètre non exclus |
| Vidéo du 15 septembre à 20:29:46, autre diagnostic visible | `postgres_database_url_missing`, configuration absente pour ce processus | Ne contredit pas E-01, réalisé dans un autre environnement de test ; aucun diagnostic supplémentaire de base requis par cette clarification |

Ces constats réparent deux confusions dans l’échange : les « sept derniers jours » ne signifient pas sept jours d’observations déjà enregistrées ; les variables de domaine nommées par le VLR n’imposent pas de modifier sans étude le contrat temporel générique. La proposition du producteur spécialisé exprime une manière de respecter simultanément l’ownership Temporal et la production de domaine Financial News.

### E.7 Suite concrète et critères de validation

**Mise à jour 0.1.2 :** cette section conserve le point de départ documentaire de 0.1.1. La formalisation du contrat qui y était annoncée est désormais livrée en annexe F ; les limites de provenance et d’intégration y sont précisées.

**Livré dans cette édition :** définition documentée, responsabilités, producteur proposé, matrice des fenêtres et règles de disponibilité. **Implémentation, conformité de l’intégration et activation : non établies.** B-01/B-02 restent ouverts dans leur périmètre propre ; E-01 à E-03 sont conservées et ne sont pas relancées.

La prochaine intervention sur ce sujet consiste à formaliser le contrat spécialisé et sa filiation VLR en s’appuyant sur cette proposition : confirmer la source/version de policy applicable, la représentation de `recency_state`, le rattachement au résultat temporel d’origine et les consommateurs autorisés. Ces points sont des dépendances concrètes du contrat, pas une demande de modifier le protocole. Les recherches déjà réalisées ne sont pas à répéter sans nouvel élément.

Le choix de nom/path proposé ne devient un composant canonique enregistré qu’avec ce rattachement. Le code actuel concerné doit être confronté à la proposition avant intégration ; une implementation équivalente découverte doit être réutilisée, et non doublée. Aucun champ absent du dossier partiel n’est déclaré manquant dans tout le dépôt.

Les critères ci-dessous seront à vérifier lors de l’implémentation ; ils ne sont pas présentés comme des tests exécutés :

| Critère | Résultat attendu |
| --- | --- |
| Bornes 0, 24H, 24H + 1 ms, 7D, 7D + 1 ms | Respect exact de E.4 et des bornes inclusives |
| Âge absent et chaque état non disponible | État/raison préservés ; aucun booléen inventé |
| Date future traitée en amont ; âge disponible corrompu en entrée | Invalidité/rejet explicite ; aucune réparation |
| Policy manquante, incompatible ou invalide | Aucune classification présentée comme valide, aucune version appliquée inventée |
| Âge disponible avec historique comparatif insuffisant | Aucun mélange des deux disponibilités ; préconditions amont toujours respectées |
| Document ou provenance incohérents | Rejet à la frontière concernée, sans substitution d’identité |
| Replay à entrées et policy identiques | Même résultat ; aucune lecture de l’heure courante |
| Propagation vers un consommateur autorisé | Valeurs, disponibilité et filiation transportées ; aucun recalcul aval |

Une validation A/B du producteur ne prouvera ni le binding D, ni la production E, ni l’existence d’un corpus réel complet sur sept jours. La validation réelle requise sera définie au périmètre de l’intégration effectivement retenue.

### E.8 Provenance documentaire et contrôle de livraison

Les référentiels fournis et les copies techniques relues sont identifiés ci-dessous. Les empreintes ne sont pas attribuées rétroactivement aux commandes exécutées sur le Mac.

| Copie source | Version / SHA-256 |
| --- | --- |
| `XYVALA_ARCHITECTURE_REFERENCE 2.md` | 0.3.1 ; `8935058c42c394bff13def704f37c0e41727ebd437ee58d3f79a3063c9041d4b` |
| `XYVALA_MARKET_ARCHITECTURE_REFERENCE(1).md` | 0.1.0 ; `ed0dcdea44fc4363684b134c2015f6307c7009d49adb8bb29a0376d931368bbd` |
| `XYVALA_SEARCH_ARCHITECTURE_REFERENCE(1).md`, avant cette mise à jour | 0.1.0 ; `8caef417bf85e778a5a8a6d315043756fcc0b912e7834c54c4a43e3f06089d78` |
| `search/contracts/search-pipeline-contract.ts` | `9f1e987d1f186e5fa5aa1915d314c12e09d3371b3f0a8b854793e773eafcb2dc` |
| `search/temporal/search-temporal-signals-search-core.ts` | `95f5ab28717c2c90fd52d54150317941063e3b3353c34be374ed602d20b0f386` |
| `search/domains/financial-news/search-financial-news-eodhd-acquisition-source.ts` | `97f84ecd861a17c81e90e667f06bb57952f5688f5d4c625747826aeef5d9ce6a` |
| `search/scoring/search-document-scoring-core.ts` | `db25368026d7aad31296188d913cc84d270df129861a36ec3339e267690c2357` |

N-03 §§XXV–XXVII et N-04 §§II, XL–XLI fondent cette clarification ; leurs copies sont identifiées en annexe A. Les renvois du présent fichier ont été adaptés aux sections effectivement présentes dans le global 0.3.1 fourni. Ce global contient encore des tableaux Search antérieurs à la séparation ; cette mise à jour ciblée ne les remigre pas et ne certifie pas la synchronisation des trois fichiers dans le dépôt.

Contrôle documentaire : conservation des identifiants historiques et des annexes A à D, maintien des résultats antérieurs et des blocages, distinction explicite entre règle officielle et proposition, cohérence des bornes et des renvois ajoutés. Aucune simulation ou suite logicielle n’est exécutée pour cette livraison. Effet : mise à jour du seul référentiel Search ; intégration Git non établie.


<a id="annexe-f"></a>

## Annexe F — Contrat de récence et préparation VLR (0.1.2)

Les constats F.1 à F.5 décrivent la livraison 0.1.2. L’implémentation candidate ultérieure et ses résultats de validation sont consignés en annexe G ; les limites de provenance restent applicables.

### F.1 Livrable et état réel

Le fichier complet `search-financial-news-recency-contract.ts`, version `0.1.0-draft.1`, est rédigé. Ses types sont vérifiés sur les dépendances de l’archive Search. Ses commentaires sont en anglais. C’est une proposition de contrat, sans implémentation de `buildSearchFinancialNewsRecency`, sans policy instanciée et sans modification du registre canonique.

Le profil `search-financial-news-runtime-policy-profile.ts` inspecté sélectionne huit presets canoniques et reçoit onze policies externes. Ses types et champs ne comportent pas de policy de récence Financial News. `SearchTemporalSignalsSearchPolicy` traite notamment les seuils d’historique, la persistance, les ruptures et la confiance ; sa version n’est pas adoptée comme version de récence. Le rattachement d’une nouvelle policy doit donc être explicite, sans ajout silencieux à la configuration actuelle.

### F.2 Choix de contrat désormais proposés concrètement

| Élément | Définition dans C-09 | Limite de garantie |
| --- | --- | --- |
| Entrée | `SearchTemporalSignals`, origine extraite du type d’entrée Temporal et policy spécialisée | Le binding doit fournir l’entrée et la sortie de la même exécution canonique ; leurs types seuls ne prouvent pas leur provenance |
| Origine | `document_id` et `publication_reference_at`, types dérivés de `SearchTemporalSignalsSearchInput` par `Pick` | Transport, sans production d’identité ou de timestamp ; aucun alias de `created_at` |
| Policy | Version explicitement fournie ; bornes littérales 86 400 000 et 604 800 000 ms ; inclusion obligatoire | Aucun objet de policy actif n’est créé ; son autorité et sa source restent à rattacher |
| `recency_state` | Proposition d’enum : `WITHIN_24H`, `WITHIN_7D_ONLY`, `OLDER_THAN_7D` | Ces noms sont des choix de contrat proposés, pas des valeurs officielles antérieurement retrouvées |
| Fenêtres disponibles | Union des trois seules combinaisons permises ; booléens et état cohérents | Les types ne vérifient pas à eux seuls que les booléens correspondent à la valeur numérique de l’âge |
| Indisponibilité | Union des cinq états existants ; même état exigé pour les deux fenêtres et `recency_state` | Préservation exacte de la raison à vérifier lors de l’implémentation |
| Sortie | `RESOLVED` avec enveloppe privée et preuves, ou `REJECTED` avec raisons non vides et aucune donnée analytique | `RESOLVED` inclut le cas où les preuves sont indisponibles ; ce n’est ni une disponibilité globale ni une activation |
| Références | Objets `temporal_signals`, `temporal_origin` et `policy` transportés exactement ; version de policy recopiée | L’égalité des références et la provenance doivent être vérifiées dans le producteur/binding |
| Erreurs | Rejet d’entrée mal formée, incohérente, non validée, incompatible, de policy invalide ou d’âge prétendu disponible mais invalide | Un âge amont déjà qualifié `INVALID` conserve sa preuve ; les exceptions inattendues ne deviennent pas une donnée indisponible de secours |

Le contrat spécialisé ne modifie pas `SearchTemporalSignals`. Les données de provenance incluses dans son enveloppe privée sont des références/transport ; elles ne deviennent pas de nouvelles vérités produites par le classificateur. Leur inscription éventuelle dans les mécanismes de transport/snapshot doit réutiliser les identités canoniques existantes.

### F.3 Préparation des entrées VLR

Les tableaux suivants sont un **dossier de préparation documentaire**, pas un second registre consommable par le runtime. Ils utilisent les quatre noms de N-04 §XL. Aucune entrée `ACTIVE`, aucun producteur fictivement résolu et aucun statut de validation analytique ne sont ajoutés au registre.

| Champ obligatoire N-04 §II | `within_24h`, `within_7d`, `recency_state` | `recency_policy_version` |
| --- | --- | --- |
| `variable_name` | Noms complets `search.financial_news.within_24h`, `search.financial_news.within_7d`, `search.financial_news.recency_state` | `search.financial_news.recency_policy_version` |
| `ownership_layer` | `TEMPORAL_SIGNAL_DETECTION`, selon E.2 | Ownership de la version de policy source à établir ; le transport par Financial News ne le transfère pas |
| `source_truth` | Âge `search.temporal.publication_age_ms` et convention/policy autorisée ; chaque classification possède sa propre identité normative ci-contre | `SearchFinancialNewsRecencyPolicy.policy_version`, reçu de son artefact autorisé ; identité canonique de cette source à rattacher |
| `contract_source` | C-09 : `SearchFinancialNewsRecency` et ses trois champs homonymes | C-09 : `SearchFinancialNewsRecencyContext.recency_policy_version` |
| `category` | `TRUTH` pour les résultats spécialisés, sans recréer la vérité d’âge | `REFERENCE` proposée vers la version source ; cible à enregistrer explicitement |
| `criticality_level` | `STRUCTURAL_SUPPORT` proposé, cohérent avec la dépendance d’âge inspectée | À confirmer sur la policy canonique |
| `exposure_level` | `PRIVATE` dans le contrat proposé | `PRIVATE` |
| `propagation_path` | Production spécialisée sous Temporal ; transport aval à définir avec les consommateurs autorisés | Artefact de policy autorisé → entrée du producteur → référence dans la sortie privée |
| `upstream_dependencies` | `search.temporal.publication_age_ms`, identité du document et policy explicitement liée | Version de l’artefact réellement fourni ; aucun remplacement par la version du module ou du contrat |
| `downstream_consumers` | Aucun nouveau consommateur autorisé par cette livraison ; chemin final à inscrire avant binding | Diagnostics/filiation privés du résultat seulement dans la proposition ; consumer concret à établir |
| `reconstruction_allowed` | `false` | `false` |
| `public_exposure_allowed` | `false` | `false` |
| `validation_required` | `true` | `true` |
| `lineage_status` | `PLANNED` proposé ; non enregistré | `PLANNED` proposé ; non enregistré |
| `protocol_reference` | Protocole Search §§XXV–XXVII ; VLR §§II et XL | VLR §§II, XL–XLI ; règles de version et de provenance |
| `producer_module` | Chemin proposé `lib/xyvala/search/domains/financial-news/search-financial-news-recency-core.ts` | Même chemin pour le transport ; producteur de la version source à identifier séparément |
| `producer_module_version` | NON ÉTABLIE : aucun core livré ou version de core déclarée | NON ÉTABLIE ; aucune valeur de version inventée |
| `validation_state` | `UNVALIDATED` pour la production analytique ; E-10 qualifie seulement les types | `UNVALIDATED` pour la provenance de l’artefact |
| `data_type` | Unions spécialisées de `SearchAvailableValue` et `SearchUnavailableValue`, C-09 | `SearchPolicyVersion`, dérivé du contrat de policy proposé |
| `nullable` | `false` ; l’absence utilise la preuve explicite | `false` dans un résultat résolu ; policy invalide → rejet sans résultat |
| `availability_semantics` | État de l’âge préservé ; aucune conversion vers faux ou zéro ; combinaison corrélée des trois champs | Présente uniquement avec une policy effectivement acceptée ; `RESOLVED` ne prouve pas à lui seul cette acceptation en runtime |
| `schema_version` | Reprendre la constante du VLR officiel lors de l’inscription ; copie inspectée `2.1.0` | Même règle ; aucune nouvelle version de schéma VLR dans cette livraison |
| `introduced_in_version` | Contrat proposé `0.1.0-draft.1` ; version d’introduction active non établie | Même distinction |

Compléments : les valeurs disponibles des fenêtres sont les booléens de C-09 ; celles de `recency_state` sont les trois labels proposés en F.2. La version de policy exige une `reference_target` pointant vers sa version source canonique, encore non établie. L’absence de cette cible empêche de présenter le rattachement comme achevé.

L’implémentation du registre inspecté matérialise les versions à travers `search-producer-module-version-registry.ts`. Ce registre résout les constantes de versions appartenant aux producteurs ; il ne les crée pas. Il faudra donc relier le véritable module et sa constante de version lors de l’enregistrement, sans ajouter un producteur `ACTIVE` fictif pour satisfaire TypeScript. La version de contrat `0.1.0-draft.1` n’est pas une version de ce futur module.

### F.4 Ce qui est accompli et ce qui conditionne la suite

La définition des entrées, des sorties, des états de récence, des indisponibilités, de la forme de policy et des règles d’échec est rédigée. La fiche VLR est préparée avec ses champs non établis visibles. Il ne faut plus recommencer cette définition ni les recherches E-07/E-09 sans nouvel élément.

Le rattachement canonique complet et l’exécution restent conditionnés par la source/version autorisée de policy, le producteur effectif et sa version, et le point de binding capable d’attester le couple origine/résultat Temporal. Les bornes et leur sémantique ne nécessitent aucune nouvelle décision : elles sont déjà fixées par le protocole. La question restante sur la policy concerne son artefact et sa provenance, pas une permission de choisir d’autres seuils.

Le protocole maître §§6–8 impose d’établir ces éléments avant consommation runtime. La poursuite du travail de conception est autorisée ; cette livraison ne contourne pas les points non résolus en produisant une fausse activation. B-01/B-02 restent les blocages distincts des observations comparatives, E-01 à E-03 restent conservées, et Search → MCI demeure différé.

### F.5 Validation effectuée et provenance

Compilation isolée exécutée avec TypeScript **5.4.5**, cible ES2022, module CommonJS, résolution Node, `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `skipLibCheck`, types Node et `noEmit`. Le contrat est placé dans une copie de l’arborescence Search fournie afin de résoudre ses imports de types exacts.

Résultat : code de sortie **0** pour le contrat, puis **0** pour les assertions de types couvrant les trois combinaisons disponibles, la combinaison impossible 24H=true/7D=false, un label incohérent, des disponibilités contradictoires, les cinq états non disponibles, une borne de policy incorrecte et un rejet sans raison. Le fichier de contrôle est un support local de vérification de types ; aucune fixture n’est injectée dans Search.

Cela constitue une preuve A limitée au contrat et aux dépendances copiées. Le calcul des âges et des fenêtres, la validation runtime des objets, l’identité des références, la provenance de policy et le binding ne sont pas testés par une compilation. ESLint du projet et le typecheck du dépôt complet n’ont pas été exécutés ici ; aucune réussite à ces gates n’est revendiquée.

| Pièce | SHA-256 |
| --- | --- |
| Contrat livré `search-financial-news-recency-contract.ts` | `82590d612e9e02f59423b2730f0d2495f1ea60fb80945c5d1e573dfc07eae8d6` |
| Profil Financial News inspecté | `a047a6bd916f30093a054d252d2964f0e542e7856d324f8f4b4054525b306a67` |
| VLR canonique inspecté, inchangé | `fc0e12eb6562902d1bb55144854e7c672e73947bd3b368d947cc3249f85f58de` |
| Registre des versions de producteurs inspecté, inchangé | `2d28ec3817847f647ff62e69212122dc53b26d05b348d5b636d7a4770f9e929f` |

Effets de cette livraison : création d’un contrat proposé et mise à jour du référentiel Search. Aucune modification des fichiers archivés, aucune connexion externe, aucune migration ou activation ; intégration dans le dépôt utilisateur non établie.

<a id="annexe-g"></a>

## Annexe G — Producteur candidat de récence et validation offline (0.1.3)

### G.1 Périmètre livré et ownership

Le contrat C-09 reste identique à la livraison 0.1.2. C-10 implémente désormais `buildSearchFinancialNewsRecency`, avec la constante propre `XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_CORE_MODULE_VERSION = "0.1.0-draft.1"`. Cette version identifie le code candidat livré ; elle ne remplace ni la version du contrat, ni celle de la policy, ni une inscription dans le registre canonique.

L’ownership proposé reste `TEMPORAL_SIGNAL_DETECTION`, conformément à E.2 et aux autorités N-03 §§XXV–XXVII/N-04 §XL. Temporal conserve la production exclusive de `publication_age_ms`. La fonction spécialisée effectue la classification Financial News définie par C-09. Elle n’est appelée par aucun binding applicatif ajouté ici. Le périmètre de cette livraison est une implémentation candidate et sa vérification hors ligne, avec des données et une policy de test explicitement synthétiques.

| Variable | Producteur/source dans cette livraison | État de rattachement |
| --- | --- | --- |
| `search.financial_news.within_24h` | C-10, `buildSearchFinancialNewsRecency`, version propre `0.1.0-draft.1` | Proposition vérifiée en offline ; VLR canonique non modifié |
| `search.financial_news.within_7d` | Même producteur ; âge canonique consommé sans recalcul | Même portée |
| `search.financial_news.recency_state` | Même producteur ; labels de C-09 | Même portée |
| `search.financial_news.recency_policy_version` | Transport exact de `input.policy.policy_version` | Artefact autorisé, ownership et `reference_target` réels toujours non établis |

Les autres champs de la préparation VLR F.3 conservent leur portée proposée. La réalisation du candidat précise le nom et la version de son module ; elle n’autorise pas à transformer les entrées proposées en `ACTIVE` ou les variables de production en `VALID`.

### G.2 Frontière de validation et provenance

C-10 contrôle les champs qu’il consomme : enveloppe d’entrée, version de contrat Temporal, état `VALID`/`DEGRADED`, identité du document, référence temporelle, forme de policy et preuve d’âge. Les données requises doivent être des propriétés propres de données ; une preuve d’âge contenant à la fois une indisponibilité et une valeur est rejetée. Les exceptions inattendues se propagent.

La compatibilité utilise directement `XYVALA_SEARCH_TEMPORAL_SIGNALS_CONTRACT_VERSION` exportée par le producteur existant, qui vaut `2.0.0` dans la copie inspectée. La vérification de référence exige une date interprétable selon la convention de validation du Temporal inspecté et une référence ne dépassant pas `created_at`. La date de publication n’est pas relue pour recalculer l’âge. `created_at` ne remplace jamais la référence analytique.

La validation analytique complète de `SearchTemporalSignals` reste celle du producteur amont. Le contrôle local des champs consommés ne constitue pas un validateur complet d’une sortie Temporal arbitraire. Le binding devra fournir une sortie réellement validée et l’origine de la même exécution. L’identité du document et la cohérence chronologique permettent de rejeter certaines incohérences ; elles ne prouvent pas cette provenance commune.

De même, valider la forme et les bornes d’un objet de policy ne prouve pas son autorité. Le candidat reçoit obligatoirement cet objet ; il n’a aucun preset de secours. La policy `OFFLINE_FIXTURE_RECENCY_1` existe exclusivement dans C-11 et n’a aucun statut canonique. Le preset du producteur Temporal est sélectionné explicitement dans les fixtures pour ce seul producteur ; sa version n’est pas utilisée comme version de récence Financial News.

Les trois références d’entrée sont conservées par identité. Seules les nouvelles enveloppes et preuves de sortie sont gelées ; les objets reçus ne sont ni modifiés ni gelés. Une sortie au-delà de sept jours ne supprime ni n’exclut le document. Aucun score, historique, snapshot, requête fournisseur, accès PostgreSQL ou exposition n’est produit par C-10.

### G.3 Preuve E-11 : 39 contrôles exécutés

| Groupe | Nombre | Vérification |
| --- | ---: | --- |
| Fenêtres inclusives | 7 | 0 ; 24H−1 ms ; 24H ; 24H+1 ms ; 7D−1 ms ; 7D ; 7D+1 ms |
| Indisponibilités | 5 | Conservation exacte des cinq états et de la raison, espaces et caractères inclus |
| Publication future | 1 | Temporal émet une preuve `INVALID`, conservée par le candidat |
| Historique insuffisant | 1 | Âge disponible, résultat `DEGRADED`, historique insuffisant et confiance zéro n’effacent pas l’âge |
| Âges corrompus prétendus disponibles | 4 | Rejet d’un âge négatif, `NaN`, infini ou fourni comme chaîne |
| États d’entrée refusés | 3 | `REJECTED`, `UNVALIDATED` et état inconnu |
| Autres frontières | 15 | Entrées absentes, contrat incompatible, identité/origine incohérente, policy invalide et preuves ambiguës |
| Références et absence de mutation | 1 | Identité des trois objets conservée ; version transportée ; objets reçus non gelés |
| Replay | 1 | Résultat identique ; absence d’appel à `Date.now()` ; modification de `created_at` sans modification de la classification |
| Exception inattendue | 1 | Exception de frontière propagée sans conversion en résultat disponible |

Les fixtures de fenêtres et d’indisponibilités passent par `buildSearchTemporalSignals` de la copie fournie. L’identité de série de test utilise son producteur canonique sur une URI `example.test`. Les identités de document/observation et les mesures synthétiques restent confinées au validateur ; elles n’établissent aucune provenance réelle. Le validateur amont `validateSearchTemporalSignalsOutput` contrôle ces sorties de test.

Compilation ciblée : TypeScript **5.4.5**, cible ES2022, CommonJS, résolution Node, `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `skipLibCheck`, types Node. La compilation inclut C-09/C-10/C-11 et leurs dépendances importées, dans une copie de l’archive. Exécution : **Node.js 24.19.0**. Codes de sortie finaux : **0** pour la compilation, **0** pour la suite ; `passed_checks: 39` et `state: FUNCTIONAL_SUITE_PASSED`.

Pendant la préparation, une identité de série de fixture non conforme au type canonique a été remplacée par l’appel à son producteur. Un scénario supposait à tort que des mesures toutes indisponibles produiraient `INSUFFICIENT_HISTORY` : Temporal produit `UNAVAILABLE` dans ce cas. La fixture du scénario d’historique insuffisant a donc reçu une mesure explicitement synthétique ; les règles de production et le résultat attendu pour ce scénario n’ont pas été assouplis. Les contrôles de bornes continuent à exercer le cas d’un âge disponible avec un état temporel global `UNAVAILABLE`.

ESLint du projet, le typecheck du dépôt complet et l’exécution sous la version Node.js du Mac ne sont pas revendiqués. Aucun résultat sur fixtures n’est présenté comme une preuve de source réelle, de corpus exhaustif des sept derniers jours, de binding PostgreSQL ou de production.

### G.4 Reproduction ciblée après placement des fichiers

Placer C-09 et C-10 dans `lib/xyvala/search/domains/financial-news/`, C-11 dans `scripts/xyvala/search/`. Leurs noms et imports doivent être conservés. La commande suivante, depuis la racine du dépôt, compile seulement le validateur et ses dépendances vers un répertoire temporaire puis l’exécute. Elle utilise les outils locaux du dépôt, sans installer de dépendance et sans lancer l’application.

```sh
(
  xyvala_recency_build="$(mktemp -d "${TMPDIR:-/tmp}/xyvala-recency.XXXXXX")" || exit 1
  ./node_modules/.bin/tsc \
    --target ES2022 --module CommonJS --moduleResolution Node \
    --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess \
    --noImplicitOverride --skipLibCheck --types node \
    --rootDir . --outDir "$xyvala_recency_build" \
    scripts/xyvala/search/validate-financial-news-recency.ts &&
  node "$xyvala_recency_build/scripts/xyvala/search/validate-financial-news-recency.js"
)
```

Cette reproduction ne modifie pas la base de données. Elle n’équivaut pas aux gates complets du dépôt. L’installation effective des fichiers sur le Mac reste non établie par la livraison présente.

### G.5 Provenance de la livraison et suite conditionnée

| Fichier livré | SHA-256 |
| --- | --- |
| C-09, contrat inchangé | `82590d612e9e02f59423b2730f0d2495f1ea60fb80945c5d1e573dfc07eae8d6` |
| C-10, producteur candidat | `284246fa766f048d96bf7ed992173b6afd804bf8d27be0d912b625b73c00f995` |
| C-11, validateur offline | `d0bcdcb17dfab13cf871c89ad05c3d03763d141a325f2e4345bdf36cc2c42efd` |

Les empreintes des dépendances archivées demeurent celles des annexes E/F. Aucun fichier de ces archives ni des référentiels global/Market n’est modifié. Les annexes A à D, les blocages B-01 à B-04 et les jalons hérités sont conservés.

Le calcul proposé et sa preuve offline sont désormais disponibles. La prochaine dépendance avant intégration est le rattachement de l’artefact autorisé de policy et des quatre variables dans les registres canoniques, avec la version réelle du module retenu et sa frontière d’exécution. Le binding devra ensuite établir la provenance du couple résultat/origine Temporal. La définition de l’observation comparative réelle et de son identité reste un sujet distinct, B-01/B-02 ; Search → MCI reste différé.

<a id="annexe-h"></a>

## Annexe H — Recency Policy Governance et clôture ciblée (0.1.4)

### H.1 Périmètre et autorité

Cette annexe documente exclusivement l’intégration de la **gouvernance de policy Financial News Recency** dans le policy set Financial News existant.

Elle applique :

- le Protocole maître Xyvala ;
- le protocole Search 3.1 adopté ;
- le Search VLR ;
- l’architecture de gouvernance transversale adoptée ;
- la distinction entre version de module, version de contrat, version de valeur de policy et versions du policy set.

Elle ne remplace aucune de ces autorités.

Le périmètre n’autorise aucun binding analytique supplémentaire.

### H.2 État structurel après intégration

L’état validé est :

| Dimension | État démontré |
| --- | --- |
| Policies producer-owned | 8 |
| Policies externally governed | 12 |
| Policies non-calibration dans l’artefact Financial News | 11 |
| Behavioral Calibration policy artifact | 1 |
| Policies Financial News configurées | 20 |
| Policies bindées au runtime Search générique | 19 |
| Policies de domaine gouvernées mais non bindées | 1 : `recency_policy` |
| `recency_policy_bound_to_generic_runtime` | `false` |
| Policy-set schema version | `2.0.0` |
| Policy-set values version | `2.0.0` |
| Valeur-version des 10 policies héritées inchangées | `1.0.0` |
| Valeur-version de la policy Recency | `1.0.0` |
| Version du producteur candidat Recency | `0.1.0-draft.1` |

La distinction des identités de version est volontaire : l’évolution structurelle du policy set vers onze policies obligatoires est versionnée en `2.0.0`, sans réétiqueter artificiellement les valeurs individuelles inchangées.

### H.3 Fichiers modifiés et empreintes post-mutation

| Fichier | SHA-256 post-mutation |
| --- | --- |
| `lib/xyvala/search/domains/financial-news/search-financial-news-runtime-configuration.ts` | `8505516e64f4826e19916aab443ff89b6e4f9f89dfb264e4d101797e5c7effdf` |
| `lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-profile.ts` | `f2320791ef34d182173c157b31c2ab2bf39c0b43f28fe628a40ef7964d941bc7` |
| `lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-artifacts.ts` | `0be2318a48bf612ecd90f32d0565e8c15bb64c7e4b883eef18b4c7eb48539f44` |
| `lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-artifact-values.ts` | `5edf4010612045d98ae534b800a51084f5bd73b806767d3a7d5c31e03a7ddeba` |
| `lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-assembly.ts` | `34980ef658466baccad9ea24cb42b4d31f6cc0a5d3ce083afd666feea3f7fed6` |
| `lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-composition.ts` | `bced78366ecf4b98ebbdbc7950b52dfccb99077e4285d13a6acf94f92ea38478` |
| `scripts/xyvala/search/validate-financial-news-recency-policy-governance.ts` | `b6d335dc248756f210eaf8af4c747de270ad9dbb5a1d661851f74cb1ce264aa0` |

### H.4 Autorités explicitement préservées

Les fichiers suivants ont été vérifiés inchangés pendant l’audit final :

| Autorité / composant | SHA-256 vérifié |
| --- | --- |
| `lib/xyvala/search/domains/financial-news/search-financial-news-recency-contract.ts` | `25db5a97b5d394d8c7807d80c629a844f5757854da4728e9a414707080e8d011` |
| `lib/xyvala/search/domains/financial-news/search-financial-news-recency-core.ts` | `5056cba3e65c398fdc30ba4ba0e7b6993d646974092de0bd59d3433858f80f1c` |
| `lib/xyvala/search/governance/search-variable-lineage-registry.ts` | `fc0e12eb6562902d1bb55144854e7c672e73947bd3b368d947cc3249f85f58de` |
| `lib/xyvala/search/governance/search-producer-module-version-registry.ts` | `2d28ec3817847f647ff62e69212122dc53b26d05b348d5b636d7a4770f9e929f` |

Cette préservation est intentionnelle : la gouvernance de policy a été intégrée sans déclarer Recency `ACTIVE` dans le VLR et sans fabriquer une version de producteur active.

### H.5 Validation E-12

#### H.5.1 Gate statique

Résultats communiqués le 2026-09-18 :

- ESLint réussi sur le périmètre modifié ;
- `npm run typecheck` réussi ;
- aucune détection d’un appel runtime supplémentaire à `buildSearchFinancialNewsRecency(...)` ;
- contrat Recency, core Recency, VLR et Producer Version Registry vérifiés inchangés.

Portée : preuve **A**.

#### H.5.2 Recency Policy Governance

Le validateur `validate-financial-news-recency-policy-governance.ts` a produit :

```text
mode = OFFLINE_POLICY_GOVERNANCE
state = FUNCTIONAL_SUITE_PASSED
passed_checks = 10
policy_set_schema_version = 2.0.0
policy_set_values_version = 2.0.0
non_calibration_policy_count = 11
final_financial_news_policy_count = 20
generic_bound_policy_count = 19
recency_policy_governed = true
recency_runtime_binding_validated = false
canonical_vlr_registered = false
production_source_activated = false
search_to_mci_activated = false
```

Portée : preuve **B** ciblée.

#### H.5.3 Suite fonctionnelle Recency

La suite `validate-financial-news-recency.ts` a produit :

```text
state = FUNCTIONAL_SUITE_PASSED
passed_checks = 39
producer_version = 0.1.0-draft.1
production_policy_bound = false
canonical_vlr_registered = false
runtime_binding_validated = false
production_source_activated = false
```

Les 39 contrôles de l’annexe G restent donc préservés sur l’état post-gouvernance.

Portée : preuve **B** ciblée.

#### H.5.4 Total des contrôles spécifiques

```text
Recency Policy Governance = 10
Recency Functional        = 39
Total spécifique          = 49
```

Le total `49` ne compte pas la non-régression runtime offline comme un nombre de checks additionnel : celle-ci constitue une preuve séparée.

#### H.5.5 Non-régression runtime Financial News offline

Le validateur Financial News DataForSEO runtime integration existant a été compilé et exécuté sur le chemin simulé.

Résultat communiqué :

```text
mode = OFFLINE_SIMULATED_RUNTIME
status = SUCCESS
stage = COMPLETE
```

La vérification complémentaire a conclu :

```text
OK: Recency remains unbound
```

Cette preuve démontre la non-régression du chemin runtime Financial News **offline simulé** dans le périmètre exercé.

Elle ne constitue ni une intégration réelle C, ni un binding réel D, ni une activation production E.

### H.6 Audit final

L’audit final communiqué le 2026-09-18 a établi :

```text
post_mutation_identities=VERIFIED
untouched_authorities=VERIFIED
reject_files=NONE
recency_runtime_binding=ABSENT
policy_governance_validation=10_PASSED
recency_functional_validation=39_PASSED
offline_runtime_non_regression=PASSED
canonical_vlr_activation=NOT_PERFORMED
production_activation=NOT_PERFORMED
search_to_mci_activation=NOT_PERFORMED
```

Le rapport de travail a été produit sous :

`/tmp/xyvala-recency-governance-final-audit-20260918-222119.txt`

Ce chemin est une provenance locale de session ; il n’est pas présenté comme artefact Git ou preuve durable tant qu’il n’est pas intégré à un mécanisme de conservation autorisé.

### H.7 Déclaration de clôture strictement bornée

**`Recency Policy Governance` : CLOSED.**

Critères de cette clôture :

- policy Recency gouvernée par le mécanisme Financial News non-calibration ;
- policy set structurellement versionné en `2.0.0` ;
- 11 policies non-calibration ;
- 20 policies Financial News configurées ;
- 19 policies génériques bindées ;
- Recency explicitement gouvernée mais non bindée ;
- 10 contrôles de gouvernance réussis ;
- 39 contrôles Recency réussis ;
- non-régression runtime offline simulée réussie ;
- aucune modification du contrat Recency, du core Recency, du Search VLR ou du Producer Version Registry ;
- aucune activation implicite constatée.

Cette déclaration **ne clôt pas** :

- `Recency Runtime Binding` ;
- `Temporal → Recency Binding` ;
- `Recency VLR Activation` ;
- `Recency Production Activation` ;
- `Search → MCI` ;
- B-01/B-02 ;
- le parcours interface.

### H.8 Provenance Git et limite actuelle

La révision de base observée pendant les investigations est :

`447656deaffd8cc5de1c96132ed68a42f26ee526`

Le périmètre Search était initialement non suivi dans cette révision. Une branche locale `search-governance-baseline` a ensuite été créée et le staging a été limité aux chemins :

- `app/api/search/`
- `lib/xyvala/search/`
- `scripts/xyvala/search/`

Au moment de cette mise à jour documentaire, le commit baseline Search n’est pas démontré comme finalisé. Cette limite n’annule pas les preuves locales E-12, mais interdit de présenter l’intégration Git comme achevée.

### H.9 Suite autorisée

La clôture de `Recency Policy Governance` n’autorise pas automatiquement le binding Recency.

La prochaine priorité produit peut porter sur les dépendances publiques nécessaires à l’interface — Public Transformation, API et interface — selon leur état réel et leurs propres gates.

Les enrichissements Search ultérieurs (Documentary Event, sémantique `EXPECTED/REALIZED`, phénomènes 7D, contexte géographie/devise/univers d’actifs, `SearchMciDocumentaryContext`) restent séparés et ne sont pas ouverts par cette annexe.
