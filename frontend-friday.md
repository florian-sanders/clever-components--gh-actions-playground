# Visual changes

## Objectifs

- Détecter les changements visuels liés à une PR :
  - En tant que contributrice / contributeur : ne pas avoir à lister tous les composants impactés pour les reviewers,
  - En tant que reviewer : ne pas avoir à vérifier toutes les stories de tous les composants à la main,
  - Dans tous les cas : donner plus de confiance en tant que contrib => assurance qu'il n'y a pas de régressions visuelles.

## Quelques faits

- Changements !== régressions
  - Certains changements sont volontaires (nouveaux composants, nouveaux designs, correctifs),
  - D'autres sont des régressions :
    - peu concerner un composant directement en lien avec la PR,
    - ou tout autre composant qui en dépend.
- Tests automatiques sur chaque story === LENT,

## Principes directeurs

- Réduire les frictions :
  - les tests doivent être stables,
  - si changements détectés, on ne doit pas forcément bloquer la PR,
  - les tests doivent pouvoir être désactivés quand c'est pertinent,
  - optimiser le plus possible le temps de traitement.
- Faciliter la revue :
  - comparer facilement le avant / après,
  - détecter facilement ce qui a changé,
  - en tant que reviewer : le process doit être simple.
- Doit couvrir le plus de stories possibles,
- Éviter d'impacter le code des stories et composants,
- Éviter les adhérences à des outils (même si inévitable),
- Limiter les dépendances tierces (hors GitHub) au sein des GitHub Actions :
  - Sécu : Même si peu de risques (permissions : lecture / écriture PR & commentaires),
  - Maintenance : Moins on a de GH Actions à mettre à jour régulièrement, mieux c'est.

## Fonctionnement de base

1. Capture de l'attendu = baseline,
2. Capture de l'actuel = actual / current / changes,
3. Comparaison des pixels (via lib JS Pixelmatch).

## Principaux outils & options

- [Storybook](https://storybook.js.org/docs/writing-tests/visual-testing),
- [Playwright](https://playwright.dev/docs/test-snapshots),
- [Webdriver.IO](https://webdriver.io/docs/visual-testing/),
- [Web Test Runner](https://github.com/modernweb-dev/web/tree/master/packages/test-runner-visual-regression),
- [Vitest (pas vraiment en fait)](https://github.com/vitest-dev/vitest/discussions/690),
- plein d'autres !

## Comparaison

| Outil | Avantages | Inconvénients | Cas d'usage |
|-------|-----------|---------------|-------------|
| **Storybook** | - Intégration native avec les stories<br>- Interface visuelle pour review<br>- Écosystème riche d'addons<br>- Facilite l'adoption (déjà utilisé) | - Dépendance à Storybook<br>- Moins de contrôle sur les navigateurs<br>- Performance variable selon config | Idéal si déjà utilisation intensive de Storybook |
| **Playwright** | - Multi-navigateurs natif<br>- Très performant<br>- Écosystème mature<br>- Contrôle fin des interactions | - Courbe d'apprentissage<br>- Setup plus complexe<br>- Peut être overkill pour cas simples | Projets nécessitant tests cross-browser robustes |
| **WebDriver.IO** | - Très flexible<br>- Support étendu navigateurs<br>- Communauté active<br>- Intégration CI/CD mature | - Configuration complexe<br>- Performance moindre que Playwright<br>- Maintenance plus lourde | Équipes avec expertise WebDriver existante |
| **Web Test Runner** | - Léger et rapide<br>- Bon pour composants isolés<br>- Intégration moderne (ES modules)<br>- Moins de dépendances | - Écosystème plus limité<br>- Moins de fonctionnalités avancées<br>- Documentation parfois sparse | Projets privilégiant simplicité et performance |
| **Vitest** | - Intégration avec écosystème Vite <br>- Très rapide en mode watch <br>- API familière (Jest-like) | - Support visual testing limité<br>- Nécessite solutions tierces<br>- Moins mature pour ce cas d'usage | Plutôt pour tests unitaires, visual testing en bonus |

## Tests locaux vs tests CI

- Chaque OS, environnement de bureau, etc. (même cross-linux) = différente gestion de l'affichage
- Principalement le rendu des polices.

Par exemple entre les tests lancés en local sur mon PC et ceux en CI sous Ubuntu : toutes les captures sont (très légèrement) différentes.

=> Les tests doivent être faits uniquement en CI (même si on garde la possibilité d'en lancer en local)

## Stockage screenshots

- Sur le repo :
  - Simple en local,
  - Mais c'est lourd,
  - Pénible en CI : les captures devraient être "commit", mais quand ? (gérable mais pas dingue)
  - ça peut polluer les revues (plein de fichiers à "ignorer").
- Object storage :
  - plus complexe & plus lent,
  - pas d'impact sur le repo.

## Stratégie et choix de la baseline

### Baseline = App de prod (le plus commun)

cf https://jamesiv.es/blog/frontend/testing/2024/03/11/visual-testing-storybook-with-playwright

- Avantages :
  - simple : on navigue vers la prod, on capture, on navigue vers la preview (locale par exemple), on capture,
  - baseline toujours "à jour".
- Invonvénients :
  - lourd même en chargeant juste l'iframe de la story,
  - la baseline change à chaque fusion sur master => on perd de la maîtrise sur la stabilité des tests,
  - "racing conditions" (j'exagère, tiré par les cheveux) : si un changement en prod intervient pendant le check qui dure au moins 5 minutes, on peut avoir une baseline avec certains composants vieux et d'autres nouveaux.

### Baseline = Base commit

- Avantages :
  - En tant que dev, on maîtrise sa baseline, quand on rebase, la baseline change = logique,
  - Chacun a sa baseline, et on peut supprimer la baseline à la fin d'une PR,
  - La baseline peut ne pas être master (pas très utile cela dit mais possible),
  - Bien plus léger (on ne charge pas tout Storybook, juste les composants et leurs jeux de données),
  - Pas d'aléas réseaux (prod indispo etc.).
- Inconvénients :
  - un peu plus complexe (géré via GH Actions).

## Stabilisation des tests

Même en ayant le même environnement, les tests échouaient "aléatoirement"

### Random strings

- Certaines stories se reposent sur des faux textes générés aléatoirement. Exemple : [cc-domain-management](https://www.clever-cloud.com/doc/clever-components/?path=/story/%F0%9F%9B%A0-domains-cc-domain-management--default-story)

Solution : on "mock" la `random` et on retourne toujours le même chiffre.
MAIS il faut mocker avant d'importer les stories (cf config test runner).

### Dates

- Exactement le même sujet et la même solution,
- Il faudra patcher / mocker d'avantage si on souhaite utiliser d'autres API de `Date` mais pour l'instant ça couvre tous nos usages.

Note:

`Playwright` propose des helpers très pratiques pour gérer cet aspect mais incompatibles avec notre usage ou Web Test Runner :
  - `Clock.setFixedTime` ne mock que `Date.now()` & `new Date()` mais nous utilisons parfois `getTime()` (composants de logs & stories `cc-input-date`),
  - `Clock.pauseAt` qui permet de mock toute l'API semble bloquer Web Test Runner (les tests restent en attente & timeout).

### Animations

- Le moment où la capture intervient n'est pas le même entre les runs :
  - parfois le composant est chargé & connecté au DOM depuis 1 ms (chiffre au pif), mais parfois 2 et parfois 0.5.
- Les animations ne sont donc pas au même "stade" d'un run à l'autre pour une même story et un même environnement,

Solution : Désactiver les animations pendant les tests.

#### Timing et méthode de désactivation

- Piste 1 : les composants respectent `prefers-reduced-motion` et désactivent leurs animations eux-mêmes,
  - Pas retenu cette piste parce que `prefers-reduced-motion` !== pas d'animations. Les animations de chargement sont utiles.
- Piste 2 : avant chaque test, juste après avoir mis le composant dans le DOM, on injecte des styles qui désactivent les animations avec `!important`.
  - Si on veut faire ça, il faut le faire avant de connecter le composant au DOM, sinon les animations auront déjà commencé et elles ne vont pas s'arrêter au même "stade".
  - Il faut tester de faire ça avant de connecter le composant au DOM.
- Piste 3 : même principe mais via JS. On utilise `getAnimations()` et `anim.pause()` + `anim.currentTime = 0`,
  - C'était censé bien fonctionner en théorie mais ça n'a pas toujours fonctionné et je ne sais pas pourquoi,
  - Quand même utile pour retirer les animations ChartJS de mémoire.
- Piste 4 : les quelques composants directement concernés (`cc-loader`, `cc-button`) s'appuient sur `:host-context(.no-animations)` pour désactiver leurs animations quand l'un des parents (cross shadow root) a cette classe.
  - C'est la seule solution qui a vraiment fonctionné.
  - Mais ça impacte le code des composants donc je voudrais tester à nouveau les pistes 2 et 3.

Note :

`Playwright` propose une option [`animations: disabled`](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1-option-animations) dans son API pour prendre les captures.

- Pas vraiment dispo via `Web Test Runner` même si utilise Playwright par dessus,
- Se repose sur la piste 3 principalement (cf [GitHub](https://github.com/microsoft/playwright/blob/c921c38737cbd630b330d5e22adbab712b12afe1/packages/playwright-core/src/server/screenshotter.ts#L113)), en plus élaborée, mais ne suffit pas non plus pour nos cas (pourtant censé être cross shadow root).

### Images & chargements async

- Les composants & stories s'appuient sur des images distantes,
- Parfois l'image est chargée avant la capture, parfois après, parfois pas du tout.

Solutions :

- Piste 1 : Attendre le chargement des images (nécessite d'ajouter un listener pour chaque image, cross shadow root) + timeout,
- Piste 2 : Utiliser [`page.waitForLoadState('networkidle')`](https://playwright.dev/docs/api/class-page#page-wait-for-load-state-option-state) de Playwright,
  - Ne fonctionne pas toujours bien pour nos cas (je pense que c'est une histoire de timing là aussi),
  - La doc déconseille son utilisation : "Don't use this method for testing, rely on web assertions to assess readiness instead."
- Piste 3 : Remplacer toutes les images par des fonds de couleur,
  - Inspiré de Playwright : on peut définir des zones à ignorer que remplace par des fonds de couleur,
  - Nécessite que les images aient bien toujours des tailles définies à l'avance (doit être ok dans notre cas),
  - Pas testé car tout aussi gourmand que piste 1 (même si un peu plus optimisé),

## Optimisation

- Image docker playwright pour ne pas avoir à réinstaller le navigateur & ses deps à chaque job

### Mise en cache de la baseline

- Éviter de reprendre les captures si le base commit est toujours le même que les précédents runs.

### Parallélisation (sharding)

- Diviser les tests en fonction du nombre de fichiers pour faire des batchs
  - Pour améliorer, il faudrait plutôt diviser en fonction du nombre de stories

## Visualisation & rapport

### fusion des rapports JSON

### Génération du rapport HTML

### Upload du rapport

### Gestion des commentaires GH
