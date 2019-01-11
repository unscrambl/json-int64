var Int64Util = require('./int64_util.js');
var constants = require('./constants.js');

/*
    json2.js
    2013-05-26
    Public Domain.
    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
    See http://www.JSON.org/js.html
    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html
    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO NOT CONTROL.
    This file creates a global JSON object containing two methods: stringify and parse.
        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.
            replacer    an optional parameter that determines how object values are stringified for objects. It can be a
                        function or an array of strings.
            space       an optional parameter that specifies the indentation of nested structures. If it is omitted, the
                        text will be packed without extra whitespace. If it is a number, it will specify the number of
                        spaces to indent at each level. If it is a string (such as '\t' or '&nbsp;'), it contains the
                        characters used to indent at each level.
            This method produces a JSON text from a JavaScript value. When an object value is found, if the object
            contains a toJSON method, its toJSON method will be called and the result will be stringified. A toJSON
            method does not serialize: it returns the value represented by the name/value pair that should be
            serialized, or undefined if nothing should be serialized. The toJSON method will be passed the key
            associated with the value, and this will be bound to the value.
            For example, this would serialize Dates as ISO strings.
                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }
                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };
            You can provide an optional replacer method. It will be passed the key and value of each member, with this
            bound to the containing object. The value that is returned from your method will be serialized. If your
            method returns undefined, then the member will be excluded from the serialization. If the replacer parameter
            is an array of strings, then it will be used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are stringified. Values that do not have JSON
            representations, such as undefined or functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use a replacer function to replace those with
            JSON values. JSON.stringify(undefined) returns undefined. The optional space parameter produces a
            stringification of the value that is filled with line breaks and indentation to make it easier to read. If
            the space parameter is a non-empty string, then that string will be used for indentation. If the space
            parameter is a number, then the indentation will be that many spaces.
            Example:
            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'
            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'
            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'
    This is a reference implementation. You are free to copy, modify, or redistribute.
*/

/*jslint evil: true, regexp: true */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply, call, charCodeAt, getUTCDate, getUTCFullYear,
    getUTCHours, getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join, lastIndex, length, parse, prototype,
    push, replace, slice, stringify, test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the methods in a closure to avoid creating global
// variables.

var JSON = module.exports;

var BASE_16 = 16;

const INT64_OBJECT_KEYS_2_TYPE_CHECKER = {
    buffer: (T) => T instanceof Uint8Array,
    offset: (T) => typeof T === 'number'
};
const INT64_KEYS = ["buffer", "offset"];

const ARRAY_REPRESENTATION = "[object Array]";
const NULL = "null";

const UNICODE_PADDING = "0000";
const UNICODE_LENGTH = 4;

const CHARACTER_2_ESCAPED_CHARACTER = {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '"': '\\"',
    '\\': '\\\\'
};


(function ()
{
    'use strict';

    var escapable =
        /[\\"\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        replacer;


    function quote(string)
    {
        // If the string contains no control characters, no quote characters, and no backslash characters, then we can
        // safely slap some quotes around it. Otherwise we must also replace the offending characters with safe escape
        // sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a)
        {
            var c = CHARACTER_2_ESCAPED_CHARACTER[a];
            return typeof c === constants.STRING_TYPE ?
                c :
                '\\u' + (UNICODE_PADDING + a.charCodeAt(0).toString(BASE_16)).slice(-UNICODE_LENGTH);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder)
    {
        // Produce a string from holder[key].

        var i; // The loop counter.
        var k; // The member key.
        var v; // The member value.
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];
        var isInt64 = true;

        if (value !== null && value !== undefined)
        {
            var valueKeys = Object.keys(value).sort();
            // Since javascript is duck-typed, we check the keys of the object and their types. Built-in types are ok.
            if (valueKeys.length === INT64_KEYS.length)
            {
                for (var it = 0; isInt64 && it < valueKeys.length; ++it)
                {
                    if ((valueKeys[it] !== INT64_KEYS[it]) ||
                        !INT64_OBJECT_KEYS_2_TYPE_CHECKER[valueKeys[it]](value[valueKeys[it]]))
                    {
                        isInt64 = false;
                        break;
                    }
                }
                if (isInt64)
                {
                    // We have an Int64 object in our hands.
                    return Int64Util.toDecimalString(value);
                }
            }
        }

        // If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === constants.OBJECT_TYPE && typeof value.toJSON === constants.FUNCTION_TYPE)
        {
            value = value.toJSON(key);
        }

        // If we were called with a replacer function, then call the replacer to obtain a replacement value.

        if (typeof replacer === constants.FUNCTION_TYPE)
        {
            value = replacer.call(holder, key, value);
        }

        // What happens next depends on the value's type.

        switch (typeof value)
        {
        case constants.STRING_TYPE:
            return quote(value);

        case constants.NUMBER_TYPE:

            // JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : NULL;

        case constants.BOOLEAN_TYPE:
        case constants.NULL_TYPE:

            // If the value is a boolean or null, convert it to a string. Note: typeof null does not produce 'null'.
            // The case is included here in the remote chance that this gets fixed someday.

            return String(value);

            // If the type is 'object', we might be dealing with an object or an array or null.

        case constants.OBJECT_TYPE:

            // Due to a specification blunder in ECMAScript, typeof null is 'object', so watch out for that case.

            if (!value)
            {
                return NULL;
            }

            // Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

            // Is the value an array?

            if (Object.prototype.toString.apply(value) === ARRAY_REPRESENTATION)
            {
                // The value is an array. Stringify every element. Use null as a placeholder for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1)
                {
                    partial[i] = str(i, value) || NULL;
                }

                // Join all of the elements together, separated with commas, and wrap them in brackets.

                v = partial.length === 0 ?
                    '[]' :
                    gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

            // If the replacer is an array, use it to select the members to be stringified.

            if (replacer && typeof replacer === constants.OBJECT_TYPE)
            {
                length = replacer.length;
                for (i = 0; i < length; i += 1)
                {
                    if (typeof replacer[i] === constants.STRING_TYPE)
                    {
                        k = replacer[i];
                        v = str(k, value);
                        if (v)
                        {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            else
            {
                // Otherwise, iterate through all of the keys in the object.

                Object.keys(value).forEach(function (k)
                {
                    var v = str(k, value);
                    if (v)
                    {
                        partial.push(quote(k) + (gap ? ': ' : ':') + v);
                    }
                });
            }

            // Join all of the member texts together, separated with commas, and wrap them in braces.

            v = partial.length === 0 ?
                '{}' :
                gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

    // If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== constants.FUNCTION_TYPE)
    {
        JSON.stringify = function (value, replacer, space)
        {
            // The stringify method takes a value and an optional replacer, and an optional space parameter, and returns
            // a JSON text. The replacer can be a function that can replace values, or an array of strings that will
            // select the keys. A default replacer method can be provided. Use of the space parameter can produce text
            // that is more easily readable.

            var i;
            gap = '';
            indent = '';

            // If the space parameter is a number, make an indent string containing that many spaces.

            if (typeof space === constants.NUMBER_TYPE)
            {
                for (i = 0; i < space; i += 1)
                {
                    indent += ' ';
                }

                // If the space parameter is a string, it will be used as the indent string.

            }
            else if (typeof space === constants.STRING_TYPE)
            {
                indent = space;
            }

            // If there is a replacer, it must be a function or an array. Otherwise, throw an error.

            if (replacer && typeof replacer !== constants.FUNCTION_TYPE &&
                (typeof replacer !== constants.OBJECT_TYPE || typeof replacer.length !== constants.NUMBER_TYPE))
            {
                throw new Error('the type of the replacer must be a function or an array, found ' + typeof replacer);
            }

            // Make a fake root object containing our value under the key of ''. Return the result of stringifying the
            // value.

            return str('', { '': value });
        };
    }
}());
