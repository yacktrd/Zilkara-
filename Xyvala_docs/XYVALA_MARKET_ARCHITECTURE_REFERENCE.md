# XYVALA MARKET — Architecture Reference

## 1. Identification et autorité

| Champ | Valeur |
| --- | --- |
| Fichier | XYVALA_MARKET_ARCHITECTURE_REFERENCE.md |
| Version documentaire | 0.2.0 |
| Date | 2026-09-19 |
| Statut | Read-model documentaire Market avec preuve technique ciblée F7F.5 ; couverture globale Market non établie |
| Portée | Acquisition, historique, RFS, Structural Transition, Triple Layer, Impulse, Neutralization, Rupture Evolution, Crash, Aggregation, MCI côté Market, Calibration et exposition |
| Sources utilisées | Textes officiels ; VLR Market ; référentiel global ; inspection ciblée du code Market ; diagnostic privé F7F.5 ; validateur end-to-end F7F.5 |
| Inspection nouvelle du code Market | Ciblée : validation RFS partagée, AAS v3, MCI input adapter, PrivateScanAsset factory et frontières F7F.5 |
| Révision Git / intégration Git | NON ÉTABLIES |
| Preuve runtime ciblée courante | F7F.5 développement : SUCCESS ; First Divergence = null |
| Emplacement proposé | docs/xyvala/XYVALA_MARKET_ARCHITECTURE_REFERENCE.md |
| Point d’entrée | [Référentiel global](XYVALA_ARCHITECTURE_REFERENCE.md) |

Ce document organise les références et les limites connues. Il ne remplace pas les protocoles, définitions, contrats, VLR, policies ou ADR. Il ne crée aucune vérité, identité analytique, couche ou autorisation d’activation.

La limite historique [B-04](XYVALA_SEARCH_ARCHITECTURE_REFERENCE.md#B-04) conserve son emplacement de référence dans Search. La présente création ne réinterprète pas les phases Market antérieures et ne les rouvre pas.

## 2. Sources applicables et limites de preuve

| Source fournie | Repères documentaires | Utilisation |
| --- | --- | --- |
| Protocole maître obligatoire | Sections 1–8, 17, 19–31, 37–48 | Application des documents, périmètre minimal, distinction violation/non établi et contrôles de preuve |
| Protocole Market | Règles 1–252 et sections finales | Gouvernance du domaine, contrats, producteurs et exposition |
| Définition officielle RFS | Sections 1–27 | Lecture structurelle et responsabilités RFS |
| Définition officielle MCI | Sections 1–30 | Validation contextuelle privée ; Price Position au §23 |
| VLR Market | VLR-MARKET-1.0 ; sections I–XLV | Identités, catégories, filiation, exposition et constats d’audit rapportés |
| Référentiel global source | Version 0.3.1 du 2026-09-14 | Limites de couverture Market et conservation des acquis |
| Diagnostic privé F7F.5 | `scripts/xyvala/market/diagnose-f7f5-private-boundary.cjs`, diagnostic 1.0.1 | Observation de la première vraie frontière Stage 6 et des exceptions `scan-asset-factory` sans devenir producteur analytique |
| Validateur end-to-end F7F.5 | `scripts/xyvala/market/validate-canonical-historical-runtime-end-to-end.ts`, contrat 1.0.1 | Preuve développement de la chaîne `loadRawAssets()` jusqu'aux sorties privées/publiques canoniques |
| Validation RFS partagée | `lib/xyvala/rfs/validation/rfs-score-contract-validator.ts` | Autorité technique partagée de validation pour `RfsStructuralTransitionReading` et `RfsRuptureEvolutionState`, sous le contrat RFS |
| Inspection ciblée 2026-09-18 → 2026-09-19 | AAS, MCI input adapter, factory, contrat privé, diagnostic et validateur F7F.5 | Établissement des versions, des consommateurs et de la non-régression ciblée |
| Décision utilisateur | Séparation en trois référentiels | Autorisation de réorganisation documentaire |

Les repères documentaires historiques restent soumis à leurs limites d'origine. La version 0.2.0 ajoute uniquement les faits techniques effectivement inspectés et la preuve F7F.5 exécutée en environnement de développement. Aucun commit Git, hash Git, déploiement production, canary, rollback ou activation produit n’est inventé.

Le diagnostic F7F.5 émet des `source_sha256` pour les fichiers observés. Les valeurs exactes restent attachées au log d’exécution et ne sont pas recopiées ici lorsqu’elles ne sont pas présentes dans le dossier documentaire courant. L’absence de reproduction d’un hash ne diminue pas la portée de la preuve observée, mais interdit de prétendre à une identité Git ou release qui n’a pas été établie.

Les termes ACTIVE, « runtime observé » ou « audit confirme » hérités du VLR restent des constats rapportés de ce registre. La preuve ciblée F7F.5 ci-dessous est, elle, une observation indépendante du runtime de développement sur le périmètre explicitement décrit.

## 3. Carte documentaire des composants

L’ordre ci-dessous est un index de navigation, pas une redéfinition de l’ordre canonique de gouvernance. Celui-ci reste fixé par les règles Market 13–16 et sa source canonique. Aucune chaîne runtime nouvelle n’est déduite de ce tableau.

Sauf pour les frontières explicitement prouvées en section 5.1, l’implémentation actuelle, la conformité actuelle, le raccordement et l’activation restent NON ÉTABLIS par cette édition. La preuve F7F.5 n’autorise aucune extrapolation aux composants ou environnements non observés.

| Composant ou frontière | Responsabilité documentée | Références à consulter |
| --- | --- | --- |
| Acquisition et univers | Observations source, identités fournisseur, provenance et quote explicite | Market 17–20 ; VLR X |
| Historique | Historique fourni, ordonné, timestamps réels et disponibilité distincte | Market 21–24 ; RFS 3–8 |
| RFS | Segmentation, comparaison, axes structurels, patterns, stabilité, cohérence, régime, rupture et continuité ; validation partagée de vérités RFS observée sur le périmètre F7F.5 | Market 25–30 ; définition RFS ; VLR XI ; section 5.1 |
| Structural Transition | Vérité spécialisée RFS ; transport `RfsStructuralTransitionReading` complet et validation partagée démontrés sur la chaîne ciblée | Market 31–37 ; RFS 18–19 ; VLR XII ; section 5.1 |
| Lifecycle Structural Transition | Observation opérationnelle latérale, événements et persistance append-only | Market 109–113 ; RFS 20 |
| Triple Layer | Growth, Core, Decay et état propres ; références qualifiées aux frontières | Market 38–41 ; MCI 5 ; VLR XIII |
| Impulse Layer | Vérités impulsionnelles propres, dont compression ; entrée et policy gouvernées | Market 42–48 ; MCI 6 ; VLR XIV |
| Neutralization | Qualification d’utilisation des preuves sans altérer leurs valeurs sources | Market 58–60 ; MCI 9 ; VLR XVI |
| Rupture Evolution | Vérité analytique RFS consommée sans transfert d’ownership ; validation partagée de `RfsRuptureEvolutionState` démontrée pour AAS/MCI/factory | Market 49–51 ; MCI 7 ; VLR IX, XI-I et XX ; sections 5.1 et 6 |
| Crash System | Condition Crash indépendante ; indisponibilité du modèle inactif préservée | Market 52–57, 71–72 ; MCI 8 ; VLR XV |
| Temporal Producer | Contextualisation 7D/24H sans reconstruction structurelle | VLR XVII ; MCI 14 ; Market 66 |
| Historical Comparison | Comparables et similarité historique, références conservées dans MCI | VLR XVIII–XIX et XXIV ; MCI 15 |
| Analytical Aggregation | Synthèses autorisées sans seconde production des vérités sources ; producer contract `3.0.0`, analytical model `analytical-aggregation-market-v2` observés et validés F7F.5 | Market 61–72 ; MCI 10–14 ; VLR XXII ; section 5.1 |
| MCI côté Market | Validation contextuelle et décision privée ; détails au seul emplacement ci-dessous | [Section MCI](#mci) |
| Calibration | Policies versionnées pour les cycles futurs ; aucune rétroaction sur le cycle courant | Market 46, 82–85 ; MCI 24 ; VLR XXIX |
| Cores, boundaries et adapters | Calcul canonique distinct de l’exécution et de la projection | Market 86–91 ; VLR XXI |
| MarketEvaluation | Contrat de transport partagé par orchestration et consommateurs | Market 92–95 |
| Lineage et traceability | Identités, versions, provenance et transport traçables | Market 96–108, 114–119 ; VLR IV, XXXV–XL |
| PrivateScanAsset et Snapshot | Validation, gel et transport sans production analytique ; frontière privée et snapshot public canonique franchis dans F7F.5 développement | Market 120–129 ; VLR XXX ; section 5.1 |
| Transformeur | Projection publique autorisée par contrat et allowlist | Market 130–136 ; VLR XXXI |
| Ranking, API et interface | Ordre, distribution et affichage des seules sorties autorisées | Market 137–139, 212, 220 ; VLR XXXII–XXXIV |

Les branches nommées dans le VLR ne sont pas ajoutées au runtime par ce catalogue. Les éventuels chevauchements sémantiques doivent être résolus par les contrats, producteurs et sources normatives applicables, jamais par un alias documentaire.

<a id="mci"></a>

## 4. MCI côté Market — emplacement documentaire détaillé unique

Cette fiche sert de navigation vers la définition officielle MCI ; elle ne la remplace pas. Le global décrit uniquement les [frontières inter-domaines](XYVALA_ARCHITECTURE_REFERENCE.md#mci-frontieres). Le référentiel Search renvoie à cette fiche pour le MCI et conserve ses propres décisions documentaires Search.

| Dimension | Référence officielle | Responsabilité et limite à préserver |
| --- | --- | --- |
| Mission | MCI 1–4 ; Market 73–79 | Consommer les vérités autorisées ; toute voie transitoire reste déclarée |
| Entrées spécialisées | MCI 5–15 ; VLR XX–XXII | Transport des résultats canoniques ; absence de reconstruction amont |
| Probabilités et déterminisme | MCI 16–17 ; VLR XXV | Conclusions probabilistes et calcul reproductible selon entrées et versions autorisées |
| Décision et disponibilité | MCI 18–21, 25 ; Market 8–10, 80–81 | ALLOW/WATCH/BLOCK réellement produits ; WATCH ne remplace pas une preuve manquante |
| Confiance | MCI 22 ; VLR XXIII | Solidité de la conclusion MCI, sans alias de stabilité ou de similarité |
| Opportunity | MCI 23.1–23.2 ; VLR XXIII | Proximité de la zone d’achat selon le scoring ; ne devient pas un score global d’exploitabilité |
| Écart et vente | MCI 23.3–23.5 | Distance orientée, références de vente propres et producteur unique pour chaque réalité |
| Arbitrage | MCI 23.6 | À opportunité comparable, stabilité prioritaire ; décision liée à l’opération évaluée |
| Temps et disponibilité du prix | MCI 23.7–23.8 | Zones identifiées et versionnées, timestamps et absence préservés |
| Nouvelles mesures | MCI 23.9 | PLANNED jusqu’aux contrats, ownership, lineage, propagation, tests et activation explicite |
| Références historiques | VLR XIX et XXIV | Similarité et comptes transportés depuis Historical Comparison, sans recalcul |
| Audit et exposition | MCI 27–29 ; VLR XXVI–XXVIII et XXXIII | Raisons, contraintes et provenance privées ; exposition uniquement autorisée |
| Calibration | MCI 24 ; Market 46 et 82–85 | Résultat courant immuable ; policies futures selon leur lifecycle |

Cette fiche ne spécifie ni formule, seuil, enum nouveau, méthode de zone, relation mathématique ou producteur technique absent des sources. La déclaration d’ownership Opportunity dans le VLR ne démontre pas l’activation des nouvelles mesures Price Position.

Le raccordement des vérités Search au MCI demeure différé. Aucun nouvel input MCI ni SearchMciDocumentaryContext n’est créé ou branché par cette édition.

## 5. Preuves et états Market

La version 0.2.0 conserve les constats historiques ci-dessous et ajoute une preuve technique ciblée F7F.5. Aucun identifiant C-xx, E-xx ou B-xx existant n’est réattribué.

### 5.1 Preuve runtime ciblée F7F.5 — 2026-09-19

**Périmètre prouvé :** environnement `development`, provider harness local déterministe, mutation de fixtures explicitement autorisée par le garde F7F.5, exécution non-production.

**Chaîne de preuve ciblée :**

```text
Canonical Historical Runtime
        ↓
MarketEvaluation
        ↓
RFS contract
        ↓
shared RFS validation
        ↓
Analytical Aggregation v3
        ↓
MCI / private adaptation
        ↓
scan-asset-factory
        ↓
PrivateScanAsset
        ↓
PublicProjectionSnapshot
```

**Résultat final observé :**

| Élément | Preuve observée | État |
| --- | --- | --- |
| Diagnostic privé | `diagnostic = xyvala_f7f5_private_boundary`, version `1.0.1` | OBSERVED |
| Frontière privée | `private_adapter.ok = true` | PASS |
| Univers privé | `count = 3`, `rejected_count = 0` | PASS |
| Factory | `factory_errors = []` | PASS |
| Validateur F7F.5 | contrat `1.0.1`, `status = SUCCESS`, `ok = true` | PASS |
| First Divergence | `first_divergence = null` | AUCUNE sur ce run |
| Erreur finale | `error = null` | AUCUNE |
| Cycle 1 | canonical public snapshot produit | PASS |
| Cycle 2 | canonical public snapshot produit | PASS |
| Cleanup fixture | `residual_count = 0` à la fin du run observé | PASS |

**Versions techniques observées sur ce chantier :**

| Composant | Version / identité observée | Interprétation |
| --- | --- | --- |
| Analytical Aggregation producer | `3.0.0` | Contrat / transport producteur |
| Analytical Aggregation analytical model | `analytical-aggregation-market-v2` | Modèle analytique inchangé |
| `scan-asset-factory.ts` | `4.0.0` | Factory acceptant le transport AAS v3 |
| MCI Market input adapter | `5.0.0` | Version conservée pendant la centralisation de validation |
| Diagnostic privé F7F.5 | `1.0.1` | Harness de diagnostic, non-producteur |
| Validateur end-to-end F7F.5 | `1.0.1` | Validation développement |
| Shared RFS validator | pas de version analytique indépendante | Validation subordonnée au contrat RFS |

**Clôture de divergence ciblée :**

La divergence auparavant observée `scan_asset_factory_analytical_aggregation_invalid` ne se reproduit plus dans le run F7F.5 final. La clôture est limitée à la chaîne et à l’environnement de développement démontrés ci-dessus.

La correction a inclus :
- alignement de `structural_transition_source_anchor_timestamp` sur le contrat RFS (`number | null`, fini, non négatif) ;
- validation de `structural_transition_availability_reason` sur le vocabulaire contractuel RFS plutôt que sur une chaîne libre ;
- centralisation de `RfsStructuralTransitionReading` et `RfsRuptureEvolutionState` dans `rfs-score-contract-validator.ts` ;
- suppression des validateurs RFS parallèles dans AAS et MCI ;
- consommation de la même autorité de validation par AAS, MCI et `scan-asset-factory`.

Le Gate statique final a également été observé :
- ESLint sans erreur sur les fichiers ciblés ;
- `tsc --noEmit` sans erreur ;
- recherche des implémentations locales ne retournant plus que les exports du shared RFS validator.

**Limites de cette preuve :**
- elle ne démontre pas une activation production ;
- elle ne démontre pas que l’ensemble de Market est CLOSED ;
- elle ne démontre pas un release manifest, un canary, un rollback ou des SLO ;
- elle ne prouve pas une révision Git particulière ;
- le debugger/harness F7F.5 reste une preuve de développement, pas une preuve de timing normal-run ;
- les warnings de disponibilité analytique (`partial`, `DEGRADED_CONTEXT`, contextes optionnels indisponibles) restent des états légitimes lorsqu’ils sont produits conformément aux contrats.

### 5.2 Constats historiques conservés

| Source | Constat rapporté à conserver | Limite de la présente édition |
| --- | --- | --- |
| VLR XIII, XIV, XXIII et XLII | Gouvernance et production observées rapportées pour références Triple Layer, compression Impulse et scores du funnel MCI | Preuves originales et révision d’audit non rattachées ici |
| VLR XIX et XLII | Chemin opportunity-core.ts → computeHistoricalSimilarity(...) sous audit conditionnel | Aucun appelant ni état d’activité réinspecté ; aucune violation runtime déclarée |
| VLR XXIX et XXXI | calibration_sample_count, ui_stability_label et ui_regime_badge marqués SPECIFIED_NOT_OBSERVED | Statuts rapportés conservés ; aucune implémentation ou suppression décidée |
| VLR XIII, XXXVII et XLII | growth_layer, core_pattern_layer et decay_layer classés LEGACY_RETIRED | Aucune réactivation autorisée ou déduite de la migration |
| VLR XXXI et XLII | public_impulse_context et public_transition_label déclarés ACTIVE_PROJECTION | Présence rapportée, sans nouvelle validation du chemin public |
| Global source 0.3.1 | Couverture Market non établie ; phases antérieures à rattacher | Voir [B-04](XYVALA_SEARCH_ARCHITECTURE_REFERENCE.md#B-04) et [jalons historiques](XYVALA_SEARCH_ARCHITECTURE_REFERENCE.md#section-9) |

Toute preuve Market supplémentaire doit être rattachée à son périmètre, environnement, versions et niveau de validation. Aucun identifiant C/E/B existant n’est réattribué. La preuve F7F.5 ci-dessus reste une preuve ciblée et ne constitue pas une certification globale du domaine Market.

## 6. Réserves documentaires déjà signalées dans cet échange

Cette section conserve les points soulevés lors de la lecture du VLR ; elle n’ajoute pas un nouvel audit ni un changement de règle.

| Point | Textes concernés | Traitement conservatoire |
| --- | --- | --- |
| Ownership Rupture Evolution | Définition MCI §7 ; VLR IX, XI-I, XX ; règles Market 49–51 ; inspection AAS/MCI 2026-09-19 | Pour la validation et la propagation observées : ownership analytique RFS confirmé ; AAS/MCI consomment sans transfert. Le sous-système spécialisé ne constitue pas un second owner. |
| Type de Crash indisponible | VLR XV « null ou UNKNOWN selon contrat » ; Market 54 ; MCI 8 | Conserver l’exigence explicite du modèle inactif : score null, état UNKNOWN, statut unavailable |
| Observation d’une Truth | VLR III-2 autorise les consommateurs ; VLR V réserve « observée ou calculée » au propriétaire | Ne pas assimiler lecture autorisée et production ; ne pas trancher silencieusement un contrat dépendant ambigu |

Ces réserves ne constituent pas des violations prouvées du dépôt. Le protocole maître gouverne l’arrêt de l’action dépendante et la poursuite des investigations non destructrices lorsque nécessaire.

## 7. Conservation des phases et maintenance

La mise à jour 0.2.0 ne rouvre aucune phase CLOSED. Elle enregistre une nouvelle preuve F7F.5 ciblée et la clôture de la divergence `scan_asset_factory_analytical_aggregation_invalid` dans ce périmètre précis ; elle ne transforme pas cette clôture locale en statut CLOSED global de Market.

Avant une future mise à jour technique, appliquer les documents en vigueur et l’ordre d’investigation Market, inspecter les fichiers concernés, puis documenter uniquement les faits nouveaux prouvés. L’état documentaire, l’implémentation, la validation, la conformité et l’activation restent des dimensions distinctes.

Les détails Market sont maintenus ici ; le global n’en conserve qu’une synthèse liée. Les détails Search et leurs fiches héritées restent dans Search. Les définitions, protocoles et registres demeurent les autorités applicables.

## 8. Historique et limites de livraison

| Version | Date | Changement | Effet |
| --- | --- | --- | --- |
| 0.2.0 | 2026-09-19 | Ajout de la preuve runtime F7F.5, versions observées, centralisation de la validation RFS et clôture ciblée de la divergence AAS v3 → factory | Read-model de preuve ciblée ; aucune activation production |
| 0.1.0 | 2026-09-15 | Création du référentiel spécialisé ; index des textes fournis, fiche MCI et réserves documentaires | Documentation uniquement |

Les contrôles de migration restent décrits dans le [journal global](XYVALA_ARCHITECTURE_REFERENCE.md#migration). Cette édition apporte une preuve de fonctionnement et de raccordement **ciblée** au run F7F.5 de développement décrit en section 5.1. Elle n’établit ni activation production, ni conformité globale de Market, ni intégration Git/release. Les dimensions documentation, implémentation, validation, conformité, release et activation restent séparées.
