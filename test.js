var monk = require('./monkey.js');

var db = monk('tits');

var users = db.get('users');

users.index('username', { sparse: true, unique: true });
users.insert({ username: 'Thatkookooguy', email: 'neilkalman@gmail.com' });
users.insert({ username: 'Thatkookooguy', email: 'neilkalman@gmail.com' });
users.insert({ username: 'Thatkookooguy', email: 'neilkalman@gmail.com' });
