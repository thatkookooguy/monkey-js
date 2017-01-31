var Q = require('q');
var _ =  require('lodash');
var ObjectID = require('bson-objectid');
var jsonfile = require('jsonfile');
var file = 'testDB.json';
jsonfile.spaces = 2;

var db = {};

jsonfile.writeFileSync(file, db);

function manager(uri, options, callback) {
  console.log('connected to fake DB');
  return {
    close: close,
    create: create,
    get: get
  };
}

function close() {
  return;
}

function create(name) {
  return get(name);
}

function get(name) {
  if (!name) {
    return;
  }

  if (!db[name]) {
    db[name] = [];

    jsonfile.writeFileSync(file, db);
  }

  return collection(db[name]);
}

function collection(collection) {
  var find = function(query) {
    var deferred = Q.defer();
    var results = _.filter(collection, query);
    deferred.resolve(results);

    return deferred.promise;
  };

  var index = function(filedsOrSpecs, options) {
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
  };

  var findOne = function(query) {
    var deferred = Q.defer();
    var results = _.find(collection, query);
    deferred.resolve(results);

    return deferred.promise;
  };

  var insert = function(docs) {
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

    jsonfile.writeFileSync(file, db);

    deferred.resolve();

    return deferred.promise;
  };

  var update = function(query, update) {
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

    jsonfile.writeFileSync(file, db);
    deferred.resolve();

    return deferred.promise;
  };

  return {
    find: find,
    findOne: findOne,
    insert: insert,
    update: update,
    index: index
  };
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

var monk = manager('lalala');
var users = monk.get('users');
console.log('initial collection', db.users);
users.index('hello', { unique: true, sparse: true });
users.insert({ hello: 'world', pizza: true }).then(function() {
  console.log('success adding first world');
}, function(err) {
  console.error(err);
});
users.insert({ hello: 'world2', pizza: true }).then(function() {
  console.log('success adding second world');
}, function(err) {
  console.error(err);
});
users.insert({ hell: 'tits', ass: false }).then(function() {
  console.log('success adding tits');
}, function(err) {
  console.error(err);
});
users.insert({ hello: 'tits', ass: [ 'this' ] }).then(function() {
  console.log('success adding tits');
}, function(err) {
  console.error(err);
});
users.find({ ass: false }).then(function(user) {
  console.log('found our user! yayyy!', user);
});
monkey.
users.update({ hello: 'tits' }, {
  $addToSet: {
    ass: {
      $each: ['is', 'nice!']
    }
  }
}).then(function(data) {
  console.log('item successfully updated!');
}, function(err) {
  console.error(err);
});

module.exports = manager;
