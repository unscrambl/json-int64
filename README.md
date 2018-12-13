[![Build Status](https://travis-ci.com/unscrambl/json-int64.svg?branch=master)](https://travis-ci.org/unscrambl/json-int64)

# json-int64

JSON.parse/stringify with Int64 support. Based on Douglas Crockford [JSON.js](https://github.com/douglascrockford/JSON-js) package and [node-int64.js](https://github.com/broofa/node-int64) library.

Example:

```js
var JSONInt64 = require('json-int64');

var json = '{ "value" : 9223372036854775807, "v2": 123 }';
console.log('Input:%s\n', json);
var parsedValue = JSONInt64.parse(json);
console.log('Parsed int64 value: ', JSONInt64.util.toDecimalString(parsedValue.value));
console.log('Value after performing stringify operation on JS object:', JSONLong.stringify(parsedValue));
```

Output:

```
Input: { "value" : 9223372036854775807, "v2": 123 }
Parsed int64 value:   9223372036854775807
Value after performing stringify operation on JS object: {"value":9223372036854775807,"v2":123}
```

## LICENSE
[Apache 2.0](https://github.com/unscrambl/json-int64/blob/master/LICENSE)