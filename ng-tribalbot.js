/**
 * @name Tribal Wars 2 bottom
 *
 * @author Peter Bartha
 * @version 0.1
 *
 * @license GNU General Public License Version 2
 */
/*
 TribalBot = (function(){
 */
// ENUMs for types
var buildings = {
        barracks: 'barracks',
        chapel: 'chapel',
        church: 'church',
        clay_pit: 'clay_pit',
        farm: 'farm',
        headquarter: 'headquarter',
        hospital: 'hospital',
        iron_mine: 'iron_mine',
        market: 'market',
        preceptory: 'preceptory',
        rally_point: 'rally_point',
        statue: 'statue',
        tavern: 'tavern',
        timber_camp: 'timber_camp',
        wall: 'wall',
        warehouse: 'warehouse'
    },
    buildingActions = {
        levelup: 'levelup',
        openScreen: 'open-screen'
    },
    resourceTypes = {
        clay: 'clay',
        wood: 'wood',
        iron: 'iron',
        food: 'food'
    },
    resourceWatchers = {
        clay: null,
        wood: null,
        iron: null,
        food: null
    },
    jobStates = {
        running: 0,
        completed: 1,
        ready: 2
    },
    internalEvents = {
        RESOURCE_DEPOSIT_JOB_COLLECTIBLE: 'Internal/ResourceDeposit/collectible'
    };

// Scope variables for manipulating view model
var $rootScope = angular.element(document).scope();
var $scope = {
    main: getAngularScope('#main-canvas'),
    resources: getAngularScope('#resources-wrapper'),
    buildingQueue: getAngularScope('#interface-building-queue ul'),
    bottomPanel: getAngularScope('#interface-bottom-center'),

    // initialize with delay
    building: null,
    buildingSubMenu: null,
    resourceDeposit: null,
    warehouse: null
};

// Useful service references for lower access
var $service = {
    windowDisplay: getAngularService('windowDisplayService'),
    modelData: getAngularService('modelDataService')
};

// Watching values
var $watcher = {
    resourceDepositJobs: null,
    buildQueue: null
};

// Global variables
var buildQueue = [buildings.headquarter, buildings.tavern, buildings.headquarter, buildings.warehouse, buildings.warehouse, buildings.wall],
    buildingQueue = $scope.buildingQueue.buildingQueueData.queue,
    inVillage = $scope.bottomPanel.inVillageView;


/**
 * Constructor for bot
 */
function initialize() {
    console.log('Initializing...');


    initBuildingPanels().then(function(buildingScope) {
        $scope.building = buildingScope;

        initBuildingSubPanels(buildingScope).then(function(buildingSubMenuScope) {
            $scope.buildingSubMenu = buildingSubMenuScope;
            console.info('\tBuild panels initialized.');

            initWarehouse(buildingScope, buildingSubMenuScope).then(function(warehouseScope) {
                $scope.warehouse = warehouseScope;
                closeWarehousePanel();
                console.info('\tWarehouse initialized.');
                console.log('Initialization complete.');
            });
        });
    });

    initResourceDeposit().then(function(resourceDepositScope) {
        $scope.resourceDeposit = resourceDepositScope;
        console.info('\tResource deposit initialized.')
    });

    $scope.bottomPanel.$watch('inVillageView', function(isVillageView) {
        if (inVillage !== isVillageView) {
            inVillage = isVillageView;
        }
    });
}

/**
 * Starting automated build
 */
function startAutoBuild() {
    console.info('Automatic building started.');
    $watcher.buildQueue = $scope.buildingQueue.$watch('buildingQueueData.queue.length', function(newLen) {

        if (newLen >= 2) {
            console.warn('\tBuilding queue is full!');
            return;
        }
        if (buildQueue.length === 0) {
            $watcher.buildQueue();
            $watcher.buildQueue = null;
            console.info('Automatic building stopped. Watchers removed.');
            return;
        }

        var nextBuilding = buildQueue[0];
        var costs = getBuildingCosts(nextBuilding);
        var resources = getResources();

        if (resourcesAreEnough(costs, resources)) {
            build();
        } else {
            console.log('\n');
            console.warn('\tNot enough resource for building ' + nextBuilding);
            var missing = getMissingResourcesList(costs, resources);
            console.warn('\tMissing resource(s): ' + missing.join(', '));

            if (missing.indexOf(resourceTypes.clay) >= 0 && !resourceWatchers.clay) {
                console.info('\tClay is not enough. Watching resource values.');
                addBuildResourceWatcher(resourceTypes.clay, costs);
            }
            if (missing.indexOf(resourceTypes.wood) >= 0 && !resourceWatchers.wood) {
                console.info('\tWood is not enough. Watching resource values.');
                addBuildResourceWatcher(resourceTypes.wood, costs);
            }
            if (missing.indexOf(resourceTypes.iron) >= 0 && !resourceWatchers.iron) {
                console.info('\tIron is not enough. Watching resource values.');
                addBuildResourceWatcher(resourceTypes.iron, costs);
            }
        }
    });
}

/**
 * Get next level resource costs for specific building
 * @param {string} building name
 * @returns {Object} costs
 */
function getBuildingCosts(building) {
    if ($scope.building.buildings[building] && $scope.building.buildings[building].nextLevelCosts) {
        return $scope.building.buildings[building].nextLevelCosts;
    } else {
        console.error('\tBuilding ' + building + ' is not in buildings list.');
        return null;
    }
}

/**
 * Upgrade selected building with one level
 * @param {string} building name
 */
function upgradeLevel(building) {
    $scope.building.openMenu(building);
    $scope.buildingSubMenu.openSubMenu(buildingActions.levelup);
    console.info('\tBuilding task added: ' + building);
}

/**
 * Build the next building in queue
 */
function build() {
    if (buildingQueue.length >= 0 && buildQueue.length >= 1) {
        upgradeLevel(buildQueue[0]);
        buildQueue.shift();
    } else {
        console.warn('\tSlots is full.');
    }
}

/**
 * Get resources amount from resources panel
 * @returns {Object} resources
 */
function getResources() {
    var resources = $scope.resources.resources;
    if (resources) {
        return {
            clay: resources.clay.currentProduction,
            food: resources.food.currentProduction,
            iron: resources.iron.currentProduction,
            wood: resources.wood.currentProduction
        }
    }
    return null;
}

/**
 * Create a resource watcher and delete them, if it reaches the cost
 * @param {string} resourceType
 * @param {Object} costs
 */
function addBuildResourceWatcher(resourceType, costs) {
    resourceWatchers[resourceType] = $scope.resources.$watch('resources.'+ resourceType +'.currentProduction', function(quanity) {
        if (quanity >= costs[resourceType]) {
            var resources = getResources();
            if (resourcesAreEnough(costs, resources)) {
                build();
            }
            resourceWatchers[resourceType]();
            resourceWatchers[resourceType] = null;
            console.info('\tWatcher removed from '+ resourceType +' resource.');
        }
    });
}

/**
 * Resources are already enough?
 * @param {Object} costs
 * @param {Object} resources
 * @returns {boolean} enough
 */
function resourcesAreEnough(costs, resources) {
    return costs.clay <= resources.clay &&
        costs.wood <= resources.wood &&
        costs.iron <= resources.iron &&
        costs.food <= resources.food;
}

/**
 * Get missing resources in list
 * @param {Object} costs
 * @param {Object} resources
 * @returns {Array} missing resources
 */
function getMissingResourcesList(costs, resources) {
    var missing = [];
    if (costs.clay >= resources.clay) missing.push(resourceTypes.clay);
    if (costs.wood >= resources.wood) missing.push(resourceTypes.wood);
    if (costs.iron >= resources.iron) missing.push(resourceTypes.iron);
    if (costs.food >= resources.food) missing.push(resourceTypes.food);
    return missing;
}

/**
 * Get minimum of resources can we mine
 * @returns {Object} resource type and its amount
 */
function getMinimumMineResource() {
    var resources = getResources();
    var minimum = {
        type: null,
        amount: Number.MAX_VALUE
    };
    for (var key in resources) {
        var amount = resources[key];
        if (amount < minimum.amount && key !== resourceTypes.food) {    // only mining
            minimum.amount = amount;
            minimum.type = key;
        }
    }
    return minimum;
}

function sortResourcesByAmount(resources) {
    return Object.keys(resources).sort(function(a, b) {
        return resources[a]-resources[b];
    });
}

function getWarehouseStorage() {
    if ($scope.warehouse) {
        return $scope.warehouse.maxStorage;
    } else {
        console.error('Warehouse\'s scope is not defined.');
        return null;
    }
}

function getResourceListAmount(resourceList) {
    var result = {};
    var resources = getResources(); // get global resources

    for (var i=0; i<resourceList.length; i++) {
        var key = resourceList[i];
        result[key] = resources[key];
    }
    return result;
}

/**
 * Get Angular JS specific controller's scope by element id (use # before id)
 * @param {string} id
 * @returns {Object} scope
 */
function getAngularScope(id) {
    var element = angular.element($(id)).scope();
    return element ? element : null;
}

/**
 * Get Angular JS service by service name
 * @param {string} serviceName
 * @returns {Object} service function
 */
function getAngularService(serviceName) {
    var service = angular.element(document.body).injector().get(serviceName);
    return service ? service : null;
}

function $timeout(fn, delay) {
    return window.setTimeout(fn, delay);
}

/**
 * Switch view between village and map
 */
function toggleView() {
    $scope.bottomPanel.toggleView();
}

/**
 * Opens resource deposit window for mining
 */
function openResourceDeposit() {
    initResourceDeposit();
}

function closeResourceDeposit() {
    $scope.resourceDeposit.closeWindow();
}

/**
 * Opens warehouse window and set its scope
 */
function openWarehousePanel() {
    $scope.building.openMenu(buildings.warehouse);
    $scope.buildingSubMenu.openSubMenu(buildingActions.openScreen);
}

function closeWarehousePanel() {
    $scope.warehouse.closeWindow();
}

function startAutoMiningDeposit() {
    console.info('Start automatic mining of resource deposit...');
    $scope.resourceDeposit = getAngularScope('.win-main.resource-deposit'); // refresh scope object
    startResourceDepositJob();

    $rootScope.$on(internalEvents.RESOURCE_DEPOSIT_JOB_COLLECTIBLE, function() {
        $scope.resourceDeposit = getAngularScope('.win-main.resource-deposit'); // refresh scope object
        if (!!($scope.resourceDeposit.collectibleAndRunningJobs.length > 0) && !$scope.resourceDeposit.resetExpired) {
            var job = $scope.resourceDeposit.collectibleAndRunningJobs[0];
            collectResourceDepositJob(job).then(function() {
                console.info('\tJob ('+ job.id + ') collected.');
                $timeout(function() {
                    if ($scope.resourceDeposit.jobs && $scope.resourceDeposit.jobs.length > 0) {
                        startResourceDepositJob();
                    } else {
                        console.warn('\tRun out of resource deposit jobs.')
                    }
                }, 3000);
            });
        }
    });

    $watcher.resourceDepositJobs = $scope.resourceDeposit.$watch('jobs.length', function(newLen, oldLen) {
        if (newLen > 0 && oldLen === undefined) {
            startResourceDepositJob();
        }
    });
}

function startResourceDepositJob() {
    var jobs = $scope.resourceDeposit.jobs;
    var warehouseStorage = getWarehouseStorage();
    var jobResourceTypes = [];

    // build a list with available job's resource types
    for (var i=0; i<jobs.length; i++) {
        var job = jobs[i];
        if (jobResourceTypes.indexOf(job.resource_type) === -1) {
            jobResourceTypes.push(job.resource_type);
        }
    }
    var resources = getResourceListAmount(jobResourceTypes);
    var sortedResources = sortResourcesByAmount(resources);


    for (var i=0; i<jobs.length; i++) {
        var job = jobs[i];
        if (job.resource_type === sortedResources[0] && (job.amount + resources[job.resource_type] <= warehouseStorage)) {
            console.info('\tResource deposit job started: '+ job.resource_type +' ('+ job.id + ')');
            $scope.resourceDeposit.startJob(job);
            return;
        }
    }
}

/**
 * Public functions
 */
/*
 return {
 initialize: initialize(),
 startAutoBuild: startAutoBuild(),
 toggleView: toggleView()
 };
 })();
 */



function initBuildingPanels() {
    var promise = new Promise(function(resolve, reject) {
        // Open village view for initialize scopes
        if (!inVillage) {
            toggleView();

            $timeout(function() {
                resolve(getAngularScope('#building-label-wrapper'));
            }, 2000);
        } else {
            resolve(getAngularScope('#building-label-wrapper'));
        }
    });
    return promise;
}

function initBuildingSubPanels(buildingScope) {
    var promise = new Promise(function(resolve, reject) {
        buildingScope.openMenu(buildings.headquarter);
        $timeout(function() {
            resolve(getAngularScope('#context-menu ul'));
        }, 1000);
    });
    return promise;
}

function initWarehouse(buildingScope, buildingSubMenuScope) {
    var promise = new Promise(function(resolve, reject) {
        buildingScope.openMenu(buildings.warehouse);
        buildingSubMenuScope.openSubMenu(buildingActions.openScreen);
        $timeout(function() {
            resolve(getAngularScope('.building-warehouse .win-content'));
        }, 1000);
    });
    return promise;
}

function initResourceDeposit() {
    var promise = new Promise(function(resolve, reject) {
        $service.windowDisplay.openResourceDeposit();
        $timeout(function() {
            resolve(getAngularScope('.win-main.resource-deposit'));
        }, 1000);
    });
    return promise;
}

function collectResourceDepositJob(job) {
    var promise = new Promise(function(resolve, reject) {
        $timeout(function() {
            resolve($scope.resourceDeposit.collectJob(job));
        }, 2000);
    });
    return promise;
}
