var Q = require('q');
var _ =  require('lodash');
var ObjectID = require('bson-objectid');
var jsonfile = require('jsonfile');
var path = require('path');
var fs = require('fs');
var relativeFixer = '../../';
jsonfile.spaces = 2;

function monkey(uri, options, callback) {
  options = options || {};
  var self = this;

  var monkeyDBFilename = getJsonPath();
  var monkeyDB = initializeDB();

  // if (_.isFunction(callback)) {
  //   // when do you use this? what should this return?
  //   callback();
  // }

  return {
    close: close,
    create: create,
    get: get
  };

  function initializeDB() {
    if (fs.existsSync(monkeyDBFilename)) {
      return require(monkeyDBFilename);
    } else {
      return {};
    }
  }

  function getJsonPath() {
    if (options.monkeyDB) {
      if (path.extname(options.monkeyDB) !== 'json') {
        console.error('monkeyDB expects to be a json file');
        return;
      }
      options.monkeyDB = path.isAbsolute(options.monkeyDB) ?
           options.monkeyDB : path.join(relativeFixer, options.monkeyDB);
    }

    return options.monkeyDB || path.join(relativeFixer, 'monkeyDB.json');
  }

  function writeFile() {
    jsonfile.writeFileSync(monkeyDBFilename, monkeyDB);
  }

  function close() {
    return;
  }

  function create(collectionName) {
    return get(collectionName);
  }

  function get(collectionName) {
    if (!_.isString(collectionName)) {
      return;
    }

    if (!monkeyDB[collectionName]) {
      monkeyDB[collectionName] = [];

      writeFile();
    }

    return collection(monkeyDB[collectionName]);
  }

  function collection(collection) {
    return {
      find: find,
      findOne: findOne,
      insert: insert,
      update: update,
      index: index
    };

    function find(query) {
      var deferred = Q.defer();
      var results = _.filter(collection, query);
      deferred.resolve(results);

      return deferred.promise;
    }

    function index(filedsOrSpecs, options) {
      if (_.isNil(options) ||
        (!_.isString(filedsOrSpecs) && !_.isObject(filedsOrSpecs))) {
        return;
      }
      if (_.isString(filedsOrSpecs)) {
        var attribute = filedsOrSpecs;
        filedsOrSpecs = {};
        var parsedOptions = _.pick(options, ['unique', 'sparse']);
        filedsOrSpecs[attribute] = parsedOptions;

        if (_.isNil(collection._headers)) {
          collection._headers = {};
        }

        _.forEach(filedsOrSpecs, function(value, indexField) {
          var result = {};
          result[indexField] = _.pick(options, ['unique', 'sparse']);
          // add indexes to headers of collection
          _.assign(collection._headers, result);
        });
      }

      _.forEach(filedsOrSpecs);
    }

    function findOne(query) {
      var deferred = Q.defer();
      var results = _.find(collection, query);
      deferred.resolve(results);

      return deferred.promise;
    }

    function insert(docs) {
      var deferred = Q.defer();

      docs = _.isObject(docs) ? [ docs ] : docs;

      if (!_.isEmpty(collection._headers)) {
        var allSparseFields =
          _.pickBy(_.mapValues(collection._headers, 'sparse'), _.identity);

        var isDocsSparseCorrectly =
          _.every(docs, function(doc) {
            return checkObjectSparseValidity(doc, allSparseFields);
          });

        if (!isDocsSparseCorrectly) {
          deferred.reject('new docs require error');
          return deferred.promise;
        }

        var allUniqueFields =
          _.pickBy(_.mapValues(collection._headers, 'unique'), _.identity);

        var isDocsUniqueValid = _.isEmpty(collection) ? true :
          _.every(docs, function(doc) {
            return checkUniqueValidity(doc, collection, allUniqueFields);
          });

        if (!isDocsUniqueValid) {
          deferred.reject('new docs unique error');
          return deferred.promise;
        }
      }

      _.forEach(docs, function(doc) {
        doc.id = ObjectID();
        collection.push(doc);
      });

      writeFile();

      deferred.resolve();

      return deferred.promise;
    }

    function update(query, update) {
      var deferred = Q.defer();

      var split = _.partition(collection, query);

      _.forEach(split[0], function(itemToUpdate) {
        if (update.$addToSet) {
          var fieldToUpdate = _.keys(update.$addToSet)[0];
          if (_.isObject(update.$addToSet) &&
            _.isArray(itemToUpdate[fieldToUpdate])) {

            var finalizedData = _.isArray(update.$addToSet[fieldToUpdate].$each) ?
              update.$addToSet[fieldToUpdate].$each :
              [ update.$addToSet[fieldToUpdate] ];

            itemToUpdate[fieldToUpdate] =
              _.union(itemToUpdate[fieldToUpdate],
                finalizedData);
          } else {
            deferred.reject([
              '$addToSet works on array fields. ',
              fieldToUpdate, ' is a ', typeof itemToUpdate[fieldToUpdate]
            ].join(''));
          }

        } else {
          _.assign(itemToUpdate, update);
        }
      });

      writeFile();
      deferred.resolve();

      return deferred.promise;
    }

    function checkObjectSparseValidity(object, allSparseFields) {
      return _.every(_.keys(allSparseFields), _.partial(_.has, object));
    }

    function checkUniqueValidity(object, collection, allUniqueFields) {
      var foundItems = false;
      _.forEach(_.keys(allUniqueFields), function (field) {
        var searchObj = {};
        searchObj[field] = object[field];
        var match = _.find(collection, searchObj);
        if (match) {
          foundItems = true;
          // break out of the loop
          return false;
        }
      });

      return !foundItems;
    }
  }
}

module.exports = monkey;
