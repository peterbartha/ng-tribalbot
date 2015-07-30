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
    jobState = {
        running: 0,
        completed: 1,
        ready: 2
    };

// Scope variables for manipulating view model
var $scope = {
    main: getAngularScope('#main-canvas'),
    building: getAngularScope('#building-label-wrapper'),
    resources: getAngularScope('#resources-wrapper'),
    buildingQueue: getAngularScope('#interface-building-queue ul'),
    bottomPanel: getAngularScope('#interface-bottom-center'),

    // initialize with delay
    buildingSubMenu: null,
    resourceDeposit: null,
    warehouse: null
};

// Useful service references for lower access
var $service = {
    windowDisplay: getAngularService('windowDisplayService')
};

// Watching values
var $watchers = {
    resourceDepositJobs: null
};

// Global variables
var buildQueue = [buildings.clay_pit],
    buildingQueue = $scope.buildingQueue.buildingQueueData.queue,
    inVillage = $scope.bottomPanel.inVillageView;


/**
 * Constructor for bot
 */
function initialize() {
    $scope.building.openMenu(buildings.headquarter);
    window.setTimeout(function() {
        $scope.buildingSubMenu = angular.element($('#context-menu ul')).scope();
    }, 1000);

    $scope.bottomPanel.$watch('inVillageView', function(isVillageView) {
        inVillage = isVillageView;
        if (inVillage) console.info('You are in village.');
        else console.info('You are on map.');
    });
}

/**
 * Starting automated build
 */
function startAutoBuild() {
    $scope.buildingQueue.$watch('buildingQueueData.queue.length', function(newLen) {
        console.info('Building queue size is: ' + newLen);

        if (newLen >= 2) {
            console.error('Building queue is full!');
            return;
        }
        if (buildQueue.length === 0) {
            console.error('Building queue is empty!');
            return;
        }

        var nextBuilding = buildQueue[0];
        var costs = getBuildingCosts(nextBuilding);
        var resources = getResources();

        if (resourcesAreEnough(costs, resources)) {
            build();
        } else {
            console.log('\n');
            console.error('Not enough resource for building ' + nextBuilding);
            var missing = getMissingResourcesList(costs, resources);
            console.error('Missing resource(s): ' + missing.join(', '));

            if (missing.indexOf(resourceTypes.clay) >= 0 && !resourceWatchers.clay) {
                console.info('Clay is not enough. Watching resource values.');
                addResourceWatcher(resourceTypes.clay, costs);
            }
            if (missing.indexOf(resourceTypes.wood) >= 0 && !resourceWatchers.wood) {
                console.info('Wood is not enough. Watching resource values.');
                addResourceWatcher(resourceTypes.wood, costs);
            }
            if (missing.indexOf(resourceTypes.iron) >= 0 && !resourceWatchers.iron) {
                console.info('Iron is not enough. Watching resource values.');
                addResourceWatcher(resourceTypes.iron, costs);
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
        console.error('Building ' + building + ' is not in buildings list.');
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
    console.info('Building task added: ' + building);
}

/**
 * Build the next building in queue
 */
function build() {
    if (buildingQueue.length >= 0 && buildQueue.length >= 1) {
        upgradeLevel(buildQueue[0]);
        buildQueue.shift();
    } else {
        console.error('Slots is full.');
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
function addResourceWatcher(resourceType, costs) {
    resourceWatchers[resourceType] = $scope.resources.$watch('resources.'+ resourceType +'.currentProduction', function(quanity) {
        if (quanity >= costs.iron) {
            var resources = getResources();
            if (resourcesAreEnough(costs, resources)) {
                build();
            }
            resourceWatchers[resourceType]();
            resourceWatchers[resourceType] = null;
            console.info('Watcher removed from '+ resourceType +' resource.');
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

function sortResourcesByAmount() {
    var resources = getResources();
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
    $service.windowDisplay.openResourceDeposit();
    window.setTimeout(function() {
        $scope.resourceDeposit = angular.element($('.win-main.resource-deposit')).scope();
    }, 1000);
}

/**
 * Opens warehouse window and set its scope
 */
function openWarehousePanel() {
    $scope.building.openMenu(buildings.warehouse);
    $scope.buildingSubMenu.openSubMenu(buildingActions.openScreen);
    window.setTimeout(function() {
        $scope.warehouse = angular.element($('.building-warehouse .win-content')).scope();
    }, 1000);
}

function autoMiningDeposit() {
    if ($scope.resourceDeposit) {
        if (!!($scope.resourceDeposit.collectibleAndRunningJobs.length > 0)) {
            console.info('Job already started.');
            if ($watchers.resourceDepositJobs !== null) return; // user already has a registered watcher
        } else {
            startResourceDepositJob();
        }

        $watchers.resourceDepositJobs = $scope.resourceDeposit.$watch('jobs.length', function() {
            startResourceDepositJob();
        });
    }
}

function startResourceDepositJob() {
    var jobs = $scope.resourceDeposit.jobs;
    var warehouseStorage = getWarehouseStorage();
    var resources = getResources();
    var sortedResources = sortResourcesByAmount();

    // remove food from the sorted list
    var foodIndex = sortedResources.indexOf(resourceTypes.food);
    if (foodIndex > -1) {
        sortedResources.splice(foodIndex, 1);
    }


    for (var i = 0; i < jobs.length; i++) {
        var job = jobs[i];
        var jobStateWatcher = null;

        if (job.resource_type === sortedResources[0] && (job.amount + resources[job.resource_type] <= warehouseStorage)) {
            console.info('Resource deposit job started: '+ job.resource_type +' ('+ job.id + ')');
            $scope.resourceDeposit.startJob(job);

            jobStateWatcher = $scope.resourceDeposit.$watch('jobs['+ i +'].state', function(newState) {
                if (newState === jobState.completed) {
                    console.info('Resource deposit job completed: '+ job.resource_type +' ('+ job.id + ')');
                    $scope.resourceDeposit().collectJob(job);
                    jobStateWatcher();
                }
            });
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
/*
 $resourcesScope.$watch('resources.clay.currentProduction', function(value) {console.log(value)});
 $resourcesScope.$watch('resources.iron.currentProduction', function(value) {console.log(value)});
 $resourcesScope.$watch('resources.wood.currentProduction', function(value) {console.log(value)});
 */
//hasRemainingTime, jobs
