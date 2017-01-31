# monkey.js 🐵 🍌 [![Supported achievements](http://achievibit.herokuapp.com/achievementsShield)](https://achievibit.herokuapp.com) [![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=102)](https://github.com/ellerbrock/open-source-badge/)

`monkey.js` is a [`monk.js`](https://github.com/Automattic/monk) mock library for testing. Saves data to a local file to check results against.

This repo is still in early development. I'm writing this based on my needs.
If anyone have a request or want to report a bug, you can do so [here](https://github.com/Thatkookooguy/monkey-js/issues/new)

Currently, the following functionality works:

- database is saved in a `testDB.json`, no matter which url you give `monkey.js`
- all functions are currently only synchronous. Simulating async use is planned soon
- Implemented so far:
  - `var monk = require('monk');` :banana: `var monkey = require('monkey')`
  - `var db = monk(url);` :banana: `var db = monkey(url);`
  - `monk.get` :banana: `monkey.get`
  - `monk.create` :banana: `monkey.create`
  - `monk.close` :banana: `monkey.close`
  - `monk.create` :banana: `monkey.create`

## License

[MIT License](LICENSE)

Copyright (c) 2017 Neil Kalman &lt;neilkalman@gmail.com&gt;
