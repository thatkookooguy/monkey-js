var Q = require('q');
var _ =  require('lodash');
var ObjectID = require('bson-objectid');
var jsonfile = require('jsonfile');
var path = require('path');
var fs = require('fs');
jsonfile.spaces = 2;

function monkey(uri, options, callback) {
  options = options || {};
  var self = this;

  var monkeyDBFilename = getJsonPath();
  var monkeyDB = {};
  var headers = {};
  syncWithFile(monkeyDB);

  // if (_.isFunction(callback)) {
  //   // when do you use this? what should this return?
  //   callback();
  // }

  return {
    close: close,
    create: create,
    get: get
  };

  function getJsonPath() {
    if (options.monkeyDB) {
      if (path.extname(options.monkeyDB) !== 'json') {
        console.error('monkeyDB expects to be a json file');
        return;
      }
    }

    return options.monkeyDB || 'monkeyDB.json';
  }

  function writeFile() {
    jsonfile.writeFileSync(monkeyDBFilename, monkeyDB);
  }

  function syncWithFile(database) {
    if (fs.existsSync(monkeyDBFilename)) {
      try {
        _.assign(database, jsonfile.readFileSync(monkeyDBFilename));
      } catch (error) {
        console.error('json is not parsed correctly. cleaning db');
        // initialize the file itself
        jsonfile.writeFileSync(monkeyDBFilename, database);
      }
    } else {
      // create the file
      jsonfile.writeFileSync(monkeyDBFilename, database);
    }
  }

  function getCollection(collectionName) {
    syncWithFile(monkeyDB);

    return monkeyDB[collectionName];
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

    return collection(collectionName);
  }

  function collection(collectionName) {
    return {
      find: find,
      findOne: findOne,
      insert: insert,
      update: update,
      index: index
    };

    function find(query) {
      var deferred = Q.defer();

      var collection = getCollection(collectionName);

      var results = _.filter(collection, query);
      deferred.resolve(results);

      return deferred.promise;
    }

    function index(filedsOrSpecs, options) {
      // sync collection
      var collection = getCollection(collectionName);

      if (_.isNil(options) ||
        (!_.isString(filedsOrSpecs) && !_.isObject(filedsOrSpecs))) {
        return;
      }
      filedsOrSpecs = _.isString(filedsOrSpecs) ?
        [ filedsOrSpecs ] : filedsOrSpecs;

      filedsOrSpecs = _.isObject(filedsOrSpecs) ?
        _.keys(filedsOrSpecs) : filedsOrSpecs;

      if (_.isNil(headers[collectionName])) {
        headers[collectionName] = {};
      }

      _.forEach(filedsOrSpecs, function(attribute) {
        var result = {};
        result[attribute] = _.pick(options, ['unique', 'sparse']);
          // add indexes to headers of collection
        if (!_.isEmpty(result[attribute])) {
          _.assign(headers[collectionName], result);
        }
      });
    }

    function findOne(query) {
      var deferred = Q.defer();

      var collection = getCollection(collectionName);

      var results = _.find(collection, query);
      deferred.resolve(results);

      return deferred.promise;
    }

    function insert(docs) {
      var deferred = Q.defer();

      var collection = getCollection(collectionName);

      docs = !_.isArray(docs) ? [ docs ] : docs;

      if (!_.isEmpty(headers[collectionName])) {
        var allSparseFields =
          _.pickBy(_.mapValues(headers[collectionName], 'sparse'), _.identity);

        var isDocsSparseCorrectly =
          _.every(docs, function(doc) {
            return checkObjectSparseValidity(doc, allSparseFields);
          });

        if (!isDocsSparseCorrectly) {
          deferred.reject('new docs require error');
          return deferred.promise;
        }

        var allUniqueFields =
          _.pickBy(_.mapValues(headers[collectionName], 'unique'), _.identity);

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

      var collection = getCollection(collectionName);

      var split = _.partition(collection, query);

      _.forEach(split[0], function(itemToUpdate) {
        if (update.$addToSet) {
          var fieldToUpdate = _.keys(update.$addToSet)[0];
          if (_.isObject(update.$addToSet)) {

            if (_.isNil(itemToUpdate[fieldToUpdate])) {
              itemToUpdate[fieldToUpdate] = [];
            }

            if (!_.isArray(itemToUpdate[fieldToUpdate])) {
              deferred.reject([
                '$addToSet works on array fields. ',
                fieldToUpdate, ' is a ', typeof itemToUpdate[fieldToUpdate]
              ].join(''));
            }

            var finalizedData =
              _.isArray(update.$addToSet[fieldToUpdate].$each) ?
                update.$addToSet[fieldToUpdate].$each :
                [ update.$addToSet[fieldToUpdate] ];

            itemToUpdate[fieldToUpdate] =
              _.union(itemToUpdate[fieldToUpdate],
                finalizedData);
          } else {
            deferred.reject([
              '$addToSet should contain an object'
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
