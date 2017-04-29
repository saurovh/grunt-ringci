
module.exports.init = initFunc;

function initFunc(grunt) {
    var angular = {},
        r_ob = createMocks(),
        CONSTANT_DEPENDENCIES = {},
        MODULE_MAP = {};


    angular.noop = function() { }
    angular.constant = function angularConstantDefination(key, val) {
        // console.log(key);
        if (!CONSTANT_DEPENDENCIES[key]) {
            CONSTANT_DEPENDENCIES[key] = val; /* { */
                // val : val,
                // type: 'constant'
            /* }; */
        }
        return angular;
    };

    angular.module = function angularModuleDefination(key, fn) {
        // console.log(key);
        if (!MODULE_MAP[key]) {
            MODULE_MAP[key] = fn
        }
        return angular;
    };


    angular.modules = MODULE_MAP;
    angular.constants = CONSTANT_DEPENDENCIES;

    r_ob.angular = angular;
    r_ob.resetMap = function resetMap(moveToMap) {
        for(var key in CONSTANT_DEPENDENCIES) {
            moveToMap[key] = CONSTANT_DEPENDENCIES[key];
        }

        CONSTANT_DEPENDENCIES = {};
        angular.constants = CONSTANT_DEPENDENCIES;
    };
    return r_ob;
}
function createMocks() {
    var mock_ob = {};

        mock_ob.location = {
            href: 'LOCATION_HREF',
            protocol: 'LOCATION_PROTOCOL',
            hostname: 'LOCATION_HOSTNAME'
        };
    return mock_ob;
}

