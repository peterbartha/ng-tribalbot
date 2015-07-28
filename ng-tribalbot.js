/**
 * @name Tribal Wars 2 bottom
 *
 * @author Peter Bartha
 * @version 0.1
 *
 * @license GNU General Public License Version 2
 */

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
};

var buildingActions = {
    levelup: 'levelup',
    openScreen: 'open-screen'
};

var resourceTypes = {
    clay: 'clay',
    wood: 'wood',
    iron: 'iron',
    food: 'food'
};

var resourceWatchers = {
    clay: null,
    wood: null,
    iron: null,
    food: null
};

var delay = 2000;

var $mainScope = angular.element($('#main-canvas')).scope();
var $buildingScope = angular.element($('#building-label-wrapper')).scope();
//var $buildingSubScope = null;
var $resourcesScope = angular.element($('#resources-wrapper')).scope();
var $buildingQueueScope = angular.element($('#interface-building-queue ul')).scope();

var buildQueue = [buildings.barracks, buildings.timber_camp, buildings.timber_camp, buildings.clay_pit];
var buildingQueue = $buildingQueueScope.buildingQueueData.queue;



function build() {
    console.info('Build process started!');
    if (buildingQueue.length >=0 && buildQueue.length >= 1) {
        console.info('1 slot is available.');
        upgradeLevel(buildQueue[0]);
        buildQueue.shift();
    } else {
        console.error('Slots is full.');
    }
    console.info('Build process ended!');
}


function upgradeLevel(building) {
    $buildingScope.openMenu(building);
    //$buildingSubScope = angular.element($('#context-menu ul')).scope();
    $buildingSubScope.openSubMenu(buildingActions.levelup);
    console.info('Building process added for: ' + building);
}

function getBuildingCosts(building) {
    if ($buildingScope.buildings[building] && $buildingScope.buildings[building].nextLevelCosts) {
        return $buildingScope.buildings[building].nextLevelCosts;
    } else {
        console.error('Building ' + building + ' is not in buildings list.');
        return null;
    }
}

function getResources() {
    var resources = $resourcesScope.resources;
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

function resourcesAreEnough(costs, resources) {
    return costs.clay <= resources.clay &&
           costs.wood <= resources.wood &&
           costs.iron <= resources.iron &&
           costs.food <= resources.food;
}

function getMissingResourcesList(costs, resources) {
    var missing = [];
    if (costs.clay >= resources.clay) missing.push(resourceTypes.clay);
    if (costs.wood >= resources.wood) missing.push(resourceTypes.wood);
    if (costs.iron >= resources.iron) missing.push(resourceTypes.iron);
    if (costs.food >= resources.food) missing.push(resourceTypes.food);
    return missing;
}

/*
$resourcesScope.$watch('resources.clay.currentProduction', function(value) {console.log(value)});
$resourcesScope.$watch('resources.iron.currentProduction', function(value) {console.log(value)});
$resourcesScope.$watch('resources.wood.currentProduction', function(value) {console.log(value)});
*/

$buildingQueueScope.$watch('buildingQueueData.queue.length', function(newLen, oldLen) {
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
        console.error('Not enough resource for building ' + nextBuilding);
        var missing = getMissingResourcesList(costs, resources);
        console.error('Missing resource(s): ' + missing.join(', '));

        if (missing.indexOf(resourceTypes.clay) >= 0 && !resourceWatchers.clay) {
            console.info('Clay is not enough. Watcher added.');
            resourceWatchers.clay = $resourcesScope.$watch('resources.clay.currentProduction', function(quanity) {
               if (quanity >= costs.clay) {
                   resources = getResources();
                   if (resourcesAreEnough(costs, resources)) {
                       build();
                   }
                   resourceWatchers.clay();
                   resourceWatchers.clay = null;
                   console.info('Clay watcher removed.');
               }
            });
        }

        if (missing.indexOf(resourceTypes.wood) >= 0 && !resourceWatchers.wood) {
            console.info('Wood is not enough. Watcher added.');
            resourceWatchers.wood = $resourcesScope.$watch('resources.wood.currentProduction', function(quanity) {
                if (quanity >= costs.wood) {
                    resources = getResources();
                    if (resourcesAreEnough(costs, resources)) {
                        build();
                    }
                    resourceWatchers.wood();
                    resourceWatchers.wood = null;
                    console.info('Wood watcher removed.');
                }
            });
        }

        if (missing.indexOf(resourceTypes.iron) >= 0 && !resourceWatchers.iron) {
            console.info('Iron is not enough. Watcher added.');
            resourceWatchers.iron = $resourcesScope.$watch('resources.iron.currentProduction', function(quanity) {
                if (quanity >= costs.iron) {
                    resources = getResources();
                    if (resourcesAreEnough(costs, resources)) {
                        build();
                    }
                    resourceWatchers.iron();
                    resourceWatchers.iron = null;
                    console.info('Iron watcher removed.');
                }
            });
        }
    }
});
