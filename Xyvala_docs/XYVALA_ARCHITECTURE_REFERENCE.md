# XYVALA — Architecture Reference

## 1. Identification et autorité

| Champ | Valeur |
| --- | --- |
| Fichier | `XYVALA_ARCHITECTURE_REFERENCE.md` |
| Version documentaire | `0.3.1` |
| Date de constitution | 2026-09-14 |
| Statut | Référentiel documentaire initial ; couverture partielle explicitée |
| Portée visée | Ensemble de Xyvala : domaines, infrastructure, exposition et progression |
| Portée effectivement inspectée | Documents fournis, archive utilisateur `search.zip` (90 fichiers TypeScript et un SQL), archives `app.zip` et `scripts.zip`, inspection ciblée du chemin temporel, de la route HTTP Search et preuves visuelles communiquées |
| Révision Git du dépôt utilisateur | NON ÉTABLIE |
| Intégration de ce fichier dans Git | NON ÉTABLIE ; livrable préparé pour versionnement |
| Emplacement proposé dans le dépôt | `docs/xyvala/XYVALA_ARCHITECTURE_REFERENCE.md` |
| Autorité sur les règles | Documents officiels applicables et modifications explicites de l’utilisateur |
| Responsable de la présente rédaction | Assistant ; aucun ownership analytique attribué par ce rôle |
| Validation globale de Xyvala | NON ÉTABLIE par ce document |

Ce référentiel relie les règles officielles, les éléments de code inspectés, les preuves et les dépendances restantes. Il ne remplace aucun protocole, contrat, policy, VLR, ADR ou registre. Ses identifiants documentaires ne sont ni des variables runtime ni des identifiants analytiques.

La version `0.3.1` décrit ce document ; elle ne représente ni la version du produit ni un niveau de maturité de Xyvala. Sa création n’autorise aucune activation, migration ou modification de contrat.

Les informations non établies restent non établies. L’absence d’un élément dans une copie partielle ne prouve pas son absence du dépôt complet. Une information signalée comme historique ne décrit pas automatiquement l’état actuel.

## 2. Lecture immédiate de l’avancement

| Objet | Fait disponible | Limite / prochaine dépendance |
| --- | --- | --- |
| Stockage temporel Search | 15 contrôles fonctionnels réussis sur une branche PostgreSQL de test isolée, selon E-01 | Ne démontre pas le branchement applicatif ni l’activation production |
| Contrat de référence temporelle | Fichier présent ; validation locale communiquée, E-02 | Ne prouve pas le producteur concret de la référence |
| Lecteur temporel Financial News | Implémentation inspectée ; 21 contrôles offline réussis communiqués, E-03 | Source concrète et branchement réel non établis |
| Identité de série Search | Entrée VLR `search.temporal.document_series_id` trouvée, E-04 | N’établit pas à elle seule le lineage des identités d’observation |
| Source réelle d’observation / référence courante | Propriétaire amont décrit abstraitement dans le contrat | Producteur concret, provenance et VLR à établir sur le dépôt actuel |
| Market | Périmètre architectural identifié ; état technique actuel non audité ici | Récupérer les preuves existantes avant toute conclusion ou réouverture |
| API / interface | Route `app/api/search/route.ts` inspectée : POST consomme une projection externe ; GET retourne 405, E-06 | Aucun lancement de recherche par cette route ; activation et parcours interface complets non établis |

**Prochaine action justifiée dans le périmètre Search :** établir la spécification de provenance de l’observation temporelle à partir des sources officielles : réalité observée, identité, propriétaire, producteur et correspondance des mesures. La recherche textuelle extérieure aux trois dossiers n’a trouvé aucune correspondance (E-07) ; ne pas répéter cette recherche sans nouvel élément. Les capacités Acquisition existantes sont identifiées en annexe D, mais ne constituent pas à elles seules un producteur temporel autorisé. Les définitions normatives manquantes doivent être retrouvées avant de coder cette capacité.

**Action dépendante suspendue :** brancher réellement le lecteur tant que ces prérequis indispensables ne sont pas démontrés. Cette suspension ne rouvre pas les contrôles de stockage et offline déjà réussis.

**Distance jusqu’à l’interface :** aucun nombre fiable d’étapes ou pourcentage global ne peut être déduit de la copie disponible. Les dépendances sont décrites en section 10 ; elles ne constituent pas une nouvelle liste de développements obligatoires.

## 3. Sources officielles et périmètre documentaire

Les noms ci-dessous sont ceux des pièces fournies. Ils permettent leur identification sans inventer des chemins normatifs dans le dépôt utilisateur. Les empreintes de l’annexe fixent les copies consultées, pas leur actualité dans un dépôt non inspecté.

| ID | Source | Utilisation / limite |
| --- | --- | --- |
| N-01 | `Fichier markdown(8).md collé` — Protocole maître obligatoire de conformité et d’exécution | Gouvernance de toute intervention ; notamment §§ 3–8, 14–19, 22–32, 36–49 |
| N-02 | `Fichier markdown (3).md collé` — Protocole Xyvala, règles strictes officielles | Architecture transversale ; producteurs, contrats, frontières, effets et non-régression |
| N-03 | `Fichier markdown (2)(1).md collé` — Protocole Search, version de référence 3.0 | Développement, exécution, gouvernance et industrialisation Search |
| N-04 | `Fichier markdown(4).md collé` — Variable Lineage Registry, Xyvala Search | Règles normatives de filiation, ownership, catégories et exposition |
| N-05 | `Fichier markdown(5).md collé` — Définition officielle Xyvala Search | Architecture fonctionnelle ; copie disponible interrompue au début de la section 59 |
| N-06 | Protocole officiel Market et références spécialisées RFS / MCI / Calibration | Applicables aux travaux concernés ; textes complets actuels et correspondance au dépôt à rattacher |
| N-07 | Policies, ADR, registres de versions et contrats spécialisés du chemin traité | Inventaire exhaustif non établi ; consultation ciblée indispensable avant une action qui en dépend |

Les documents spécialisés continuent de s’appliquer même lorsqu’une règle n’est pas reproduite ici. Un conflit est identifié et traité conformément à N-01 §4 ; le référentiel ne crée pas de hiérarchie de remplacement.

Une instruction de poursuivre le travail ne modifie pas une règle. Toute modification explicite de l’utilisateur doit être liée à son texte, sa date, son périmètre et ses impacts ; elle ne s’étend pas implicitement aux domaines voisins.

## 4. Carte des responsabilités

Cette carte situe les responsabilités documentées. Elle n’atteste pas que tous les composants sont implémentés, conformes ou actifs.

| Domaine / frontière | Responsabilité à préserver | Limite structurante | État de connaissance dans cette édition |
| --- | --- | --- | --- |
| Acquisition et historique | Fournir les données et identités selon leurs contrats et leur provenance | Aucun historique supposé reconstruit en aval | Audit global non réalisé |
| Market / RFS et Structural Transition | Production canonique des vérités relevant de leurs contrats ; lifecycle de Structural Transition distinct selon les règles officielles | Ne pas confondre RFS Growth et Triple Layer Growth | Responsabilités rappelées par N-01 ; code actuel non audité |
| Market / Triple Layer, Impulse, Neutralization, Rupture Evolution, Crash | Responsabilités analytiques séparées | Aucun transfert silencieux de calcul ou de disponibilité | Code actuel non audité |
| Analytical Aggregation | Synthèse autorisée des vérités fournies | Ne reconstruit pas les producteurs amont | Branchement actuel non établi ici |
| MCI | Décision dans le périmètre de ses contrats officiels | Ne relit pas les données brutes ; ne reconstruit pas Market ou Search | Évolutions inter-domaines différées |
| Search | Recherche et analyse documentaire déterministes, comparaison et projection contrôlée | Scoring, ranking, décision privée et exposition restent séparés | Copie partielle inspectée |
| Temporal Search | Analyse temporelle à partir d’observations et d’un historique fournis | Ne devient pas collecteur ou stockage implicitement | Contrats et chemin partiel disponibles |
| Stockage | Résultats de persistance et sémantique de lecture contractualisée | Ne génère pas la vérité analytique, l’identité ou les timestamps amont | Contrat inspecté ; E-01 concerne la branche de test |
| Runtime | Organisation des appels et transport contractuel | Factory déclarée ne signifie pas factory appelée | Chaîne partiellement inspectée |
| Calibration | Évolution selon son lifecycle, hors cycle courant | Aucun effet rétroactif sur les vérités ou décisions courantes | Activation actuelle non auditée |
| API et interface | Exposition autorisée et présentation | Aucun recalcul analytique ni publication d’internals privés | Audit d’exposition à rattacher |
| Gouvernance, sécurité, observabilité et release | Contrôle transversal selon les documents applicables | Ne deviennent pas propriétaires des vérités observées | Couverture globale non établie |

### 4.1 Architecture Search documentée

N-05 décrit une organisation d’exécution `Producer → Adapter si nécessaire → Bindings → Composition → Bootstrap → Orchestrator`. Cette notation décrit l’organisation officielle ; elle n’autorise pas un adapter supplémentaire et ne remplace pas l’inspection du graphe d’appels réel.

Le plan public documenté est `Private Decision → Private Snapshot → Transformation → Public Ranking → API → Interface`. Les analyses privées ne deviennent publiques que par leur exposition contractuellement autorisée.

Les capacités Documentary Intelligence marquées `PLANNED` restent une cible. Leur présence dans une définition ne vaut pas activation du runtime.

### 4.2 Évolutions réservées à leurs chantiers

Les décisions utilisateur communiquées réservent notamment Global RFS à une phase ultérieure à la stabilisation de Market, la consommation des vérités Search par MCI au chantier MCI, et Google Trends à une évolution Search ultérieure. Leur texte de décision et leurs références durables restent à rattacher au dépôt.

Ces évolutions ne sont pas ajoutées aux prérequis de l’interface actuelle par ce document. Le périmètre professionnel de l’interface — société, méthodologie publique, offres, développeurs/API, compte, abonnement, facturation, usage, support et pages légales — reste à reprendre lors de son chantier dédié, selon les décisions utilisateur et contrats applicables.

## 5. Catalogue des éléments inspectés

Les chemins sont relatifs à la racine du dépôt Xyvala. L’édition initiale utilisait `xyvala-integration`. L’édition 0.2.0 confronte ces constats à l’archive utilisateur `search.zip`, extraite séparément dans `search-audit-20260914/search`. Aucun de ces ensembles ne constitue un checkout Git complet certifié. Voir l’annexe B pour le périmètre de cette nouvelle inspection.

| ID | Fichier | Responsabilité observée | Dépendance / limite |
| --- | --- | --- | --- |
| C-01 | `lib/xyvala/search/domains/financial-news/search-financial-news-temporal-reference-contract.ts` | Contrat privé de référence vers une observation courante ; version déclarée 1.0.0 | Décrit une source amont autorisée ; son producteur concret n’est pas identifié par ce seul fichier |
| C-02 | `lib/xyvala/search/domains/financial-news/search-financial-news-recorded-temporal-reader.ts` | Résout une référence injectée, demande une lecture exacte, vérifie les identités et transporte les observations ; version déclarée 1.0.0 | Dépend de `resolve_current_observation_reference` et `read_observations` |
| C-03 | `lib/xyvala/search/contracts/search-temporal-observation-store-contract.ts` | Contrat de lecture/écriture ; couverture, immutabilité et résultats de stockage ; version 1.0.0 | Requiert des observations déjà produites et une provenance fournie |
| C-04 | `lib/xyvala/search/governance/search-variable-lineage-registry.ts` | Registre de filiation ; entrée de série temporelle inspectée | Recherche ciblée insuffisante pour certifier l’ensemble du VLR |
| C-05 | `lib/xyvala/search/domains/financial-news/search-financial-news-recorded-temporal-source.ts` | Frontière de source enregistrée liée au contrat du lecteur | Appelant de production à établir |
| C-06 | `lib/xyvala/search/domains/financial-news/search-financial-news-temporal-observation-provider.ts` | Capacité d’observation temporelle fournie explicitement | Une dépendance injectée ne démontre pas l’origine autorisée de la donnée |
| C-07 | `lib/xyvala/search/domains/financial-news/search-financial-news-runtime-configuration.ts` | Déclare et transmet la source temporelle autorisée | Origine concrète à tracer au point d’assemblage |
| C-08 | `lib/xyvala/search/domains/financial-news/search-financial-news-application-composition.ts` | Composition applicative et propagation de dépendances | Présence du code distincte de son activation |

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

## 7. Registre des preuves

N-01 §29 distingue A : statique ; B : offline/fixtures ; C : intégration réelle ; D : binding réel ; E : activation production. Ces niveaux qualifient une affirmation précise, pas le projet entier.

| ID | Pièce / date | Résultat documenté | Portée et limites |
| --- | --- | --- | --- |
| E-01 | Capture `2026-09-14 à 19.08.25` fournie | `FUNCTIONAL_SUITE_PASSED`, 15 contrôles, `MUTATE_TEST`, TLS client vérifié, run `search-storage-001`, validateur 1.0.1 | Preuve C du périmètre de test PostgreSQL isolé ; `runtime_binding_validated:false` ; fixtures conservées ; pas de nouvelle exécution ici |
| E-02 | Capture `2026-09-14 à 19.46.03` fournie | ESLint et typecheck suivis de `CONTRAT_REFERENCE_TEMPORELLE_VALIDATIONS_LOCALES_OK` | Preuve A ; ne prouve ni source concrète ni activation |
| E-03 | Vidéo `2026-09-14 à 20.34.09` fournie | 21 contrôles réussis, `OFFLINE_READER_BINDING` ; validations statiques communiquées | Preuves A/B ; `live_postgres_binding_validated:false`, `production_source_activated:false` |
| E-05 | Archive utilisateur `search.zip`, reçue le 2026-09-14 | 91 fichiers sources inventoriés ; lecteur, source, repository, résolution injectée et VLR examinés sur le chemin concerné | Preuve A ciblée ; aucun test réexécuté ; appelants hors dossier Search non inclus ; détails en annexe B |
| E-07 | Capture utilisateur du 2026-09-14 à 22.46.48 | `AUCUNE_CORRESPONDANCE_HORS_DOSSIERS_EXAMINES` | Recherche textuelle des sept symboles indiqués dans les extensions TS/JS, hors Search/app/scripts ; respecte les exclusions et règles ignore de rg ; aucun constat d’absence universelle |
| E-08 | Inspection statique ciblée du 2026-09-14, annexe D | Acquisition EODHD, identité/hash Acquisition et champs de l’observation temporelle confrontés | Aucune attribution de nouvel ownership, aucun calcul temporel ni appel fournisseur exécuté |
| E-06 | Archives utilisateur `app.zip` et `scripts.zip`, reçues le 2026-09-14 | Route HTTP Search et appelants temporels trouvés dans les validateurs inspectés ; sources externes simulées dans le validateur DataForSEO | Preuve A uniquement ; aucun script exécuté, aucune nouvelle preuve B/C/D/E ; détails et empreintes en annexe C |
| E-04 | Inspection du 2026-09-14 de C-01 à C-04 et recherche ciblée des dépendances | Contrats, lecteur et entrée VLR de série constatés ; prérequis amont non établis | Preuve A limitée à la copie disponible ; aucune exécution réelle |

**Limite commune aux résultats visuels :** la révision Git et les empreintes de tous les fichiers exécutés ne sont pas présentes dans ces sorties. Les empreintes locales de l’annexe ne leur sont pas attribuées rétroactivement. Ces résultats sont conservés sans prétendre certifier une révision différente.

Une future preuve conserve : affirmation vérifiée, critère normatif, fichiers/révision, environnement, commande ou procédure réellement exécutée, résultat, effet et éventuelles mutations, artefact brut, limites et composants concernés. Les secrets et URL contenant des credentials n’y figurent pas.

## 8. Blocages et divergences

| ID | Qualification | Constat et règle | Impact / résolution admissible |
| --- | --- | --- | --- |
| B-01 | CONFORMITÉ NON ÉTABLIE | Producteur concret des observations et de la référence non établi dans les trois archives ; les appelants trouvés dans les scripts sont des fixtures (E-06) ; N-01 §§6–8 | Suspendre le binding dépendant ; inspecter le dépôt actuel et ses appelants avant toute correction |
| B-02 | CONFORMITÉ NON ÉTABLIE | Traçabilité des identités d’observation à établir ; N-01 §14, N-04 | Rechercher les entrées officielles et leur propagation ; ne pas créer de noms VLR par hypothèse |
| B-03 | LIMITE DE PROVENANCE | Copie partielle et absence de révision Git des exécutions visuelles | Rattacher les preuves au code actuel ; ne pas certifier l’ensemble du dépôt |
| B-04 | COUVERTURE NON ÉTABLIE | Market et parcours interface complets non audités ; route HTTP Search seule inspectée en E-06 | Récupérer les références existantes ; aucune réouverture automatique de phase CLOSED |

Cette édition ne transforme aucun de ces manques de preuve en violation démontrée du dépôt complet. Elle ne certifie pas non plus l’absence de violation.

Une fiche de divergence complète conserve : dernière frontière démontrée correcte, première divergence observable, référence normative, état attendu/observé, contrat et ownership concernés, impacts aval, action suspendue, investigation autorisée, résolution et preuve de clôture.

## 9. Jalons et conservation des acquis

Les identifiants E-xx et B-xx servent uniquement au présent document. Les identifiants historiques des chantiers sont conservés lorsqu’ils sont établis ; aucun renommage ou découpage rétroactif n’est effectué ici.

| Objet suivi | État conservé | Condition pour avancer |
| --- | --- | --- |
| Suite PostgreSQL isolée | Résultat réussi E-01 | Ne pas la confondre avec le binding ; réexécution uniquement pour impact ou critère applicable démontré |
| Contrat temporel | Validation locale E-02 | Établir ses prérequis amont et sa filiation |
| Lecteur offline | Résultat réussi E-03 | Établir B-01/B-02 avant le branchement réel |
| Branchement applicatif temporel | Non établi | Preuves de source, contrat, VLR, assemblage et exécution réelle du chemin attendu |
| Phases Market antérieures | Clôtures non reconstituées par cette édition | Importer les preuves existantes sans les invalider par défaut |
| Interface | État complet non inspecté | Rattacher le périmètre accepté aux contrats et parcours effectivement disponibles |

Une clôture exige les critères applicables et leurs preuves selon N-01 §§28–30 et 45. Une réouverture documente l’hypothèse invalidée, le changement impactant ou l’invariant réellement violé. Un travail voisin ne suffit pas.

Toute évolution du nombre d’étapes restantes indique la cause : périmètre explicitement changé, dépendance découverte, preuve retrouvée ou divergence démontrée. Aucun pourcentage artificiel n’est calculé à partir du nombre de fichiers ou de tests.

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

## 11. Utilisation et maintenance

### Avant une intervention

Consulter N-01 et les sources applicables, vérifier la révision réelle, relier l’action au composant et au jalon concernés, identifier ownership, contrats, VLR, effets, impacts et critères. Le présent fichier accélère cette recherche ; il ne la remplace pas.

Un état antérieur « autorisé » ne vaut pas permission permanente. Les douze Gates de N-01 §31 sont réévalués au périmètre de l’action : périmètre, documents, ownership, producteur, contrats, lineage, déterminisme, reconstruction, disponibilité, frontières, propagation et validation.

### Après une intervention

Mettre à jour les seules fiches impactées avec les preuves nouvelles, leurs limites, les divergences et la prochaine action justifiée. Conserver les résultats antérieurs et leur portée. Relire le document final avant de poursuivre.

Versionner le référentiel avec le changement auquel il se rapporte lorsque le travail est réalisé dans le dépôt. Toute référence Git doit être réelle. Pour une preuve nécessitant le commit final, enregistrer celui-ci après sa création sans inventer de hash ni dépendance circulaire d’auto-certification.

### Relation avec un éventuel document d’exécution

Un futur plan de travail peut référencer les composants, blocages, critères et preuves de ce référentiel. Il ne doit pas dupliquer les règles ni devenir une seconde autorité sur les clôtures. Aucun fichier d’exécution ni automatisme n’est créé par cette édition.

### Décisions et recommandations retenues

| Choix documentaire | Utilité | Limite |
| --- | --- | --- |
| Point d’entrée unique, catalogue relié aux sources | Retrouver responsabilités et dépendances | Aucun registre analytique concurrent |
| Séparation cible / constat / validation / activation | Empêcher les déclarations de progression excessives | Les champs inconnus restent visibles |
| Preuves liées à une révision et un environnement | Réduire les validations non reproductibles | Pas d’attribution rétroactive aux captures |
| Historique de décision conservé | Expliquer les changements de périmètre | Ne modifie pas les règles réservées à l’utilisateur |
| Contrôles automatisés ciblés, lorsqu’un chantier les prévoit | Vérifier liens, présence de preuves et critères mécaniques | Aucun contrôle automatisé configuré ici ; ne remplace pas la revue architecturale |

Les idées de catalogue de composants, de décisions documentées et de provenance reproductible discutées précédemment sont retenues comme méthodes d’organisation. Elles ne sont pas des normes Xyvala supplémentaires et n’attribuent aucune architecture interne supposée à un concurrent.

## 12. Historique et contrôle de cette édition

| Version | Date | Changement | Impact |
| --- | --- | --- | --- |
| 0.3.1 | 2026-09-14 | Recherche extérieure documentée ; provenance Acquisition / observation temporelle distinguée | E-07/E-08 et annexe D ; prérequis précisés, aucun code modifié |
| 0.3.0 | 2026-09-14 | Inspection ciblée de `app.zip` et `scripts.zip` ; ajout de E-06 et de l’annexe C | Frontière HTTP et rôle des fixtures précisés ; documentation seule, validations antérieures conservées |
| 0.2.0 | 2026-09-14 | Inspection de l’archive Search fournie ; ajout de E-05 et de l’annexe B | Constat affiné ; aucun code modifié, aucune phase rouverte, aucun test relancé |
| 0.1.0 | 2026-09-14 | Création du référentiel à partir des sources disponibles, preuves et limites explicites | Documentation uniquement ; aucun changement de code runtime, contrat, VLR, policy, base ou déploiement |

**Critères de livraison de cette édition :** rattachement aux sources officielles ; séparation entre prévu, constaté et prouvé ; maintien des acquis ; limites du dépôt explicites ; aucune nouvelle responsabilité analytique ; aucune clôture ou activation inventée ; fichier complet relu.

**Effets du chantier documentaire :** inspection `OBSERVE` des sources et création persistante `MUTATE` du seul livrable documentaire. Aucun effet analytique, appel provider, test de base ou migration.

**Limite de livraison :** le document est constitué et relu ; son exhaustivité sur tout Xyvala et sa synchronisation avec le dépôt utilisateur restent non établies. Il n’accorde aucun statut global de conformité au produit.

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
