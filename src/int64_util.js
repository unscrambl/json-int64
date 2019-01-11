/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// This file is copied from the Thrift project under the Apache 2.0 license. There are some changes to variable names,
// styling and code.

var Int64 = require('node-int64');

var Int64Util = module.exports = {};

var BYTE_BUFFER_SIZE = 8;

var BYTE_7 = 7;
var BYTE_6 = 6;
var BYTE_5 = 5;
var BYTE_4 = 4;
var BYTE_3 = 3;
var BYTE_2 = 2;
var BYTE_1 = 1;

var MAX_NUM_OF_DECIMAL_DIGITS_REPRESENTABLE_BY_DOUBLE = 15;
var NUM_OF_LEAST_SIGNIFICANT_DIGITS = 11;

var POW10_11 = Math.pow(10, NUM_OF_LEAST_SIGNIFICANT_DIGITS);
var POW10_15 = Math.pow(10, MAX_NUM_OF_DECIMAL_DIGITS_REPRESENTABLE_BY_DOUBLE);
var POW2_24 = Math.pow(2, 24);
var POW2_31 = Math.pow(2, 31);
var POW2_32 = Math.pow(2, 32);
var POW2_48 = Math.pow(2, 48);
var POW10_15_OVER_POW2_32 = Math.floor(POW10_15 / POW2_32);
var POW10_15_REMAINDER_POW2_32 = Math.floor(POW10_15 % POW2_32);
var POW2_48_OVER_POW10_11 = Math.floor(POW2_48 / POW10_11);
var POW2_48_REMAINDER_POW10_11 = Math.floor(POW2_48 % POW10_11);

var FOUR_BYTE_BITMASK = 0xffffffff;
var FOUR_BYTE_HIGH_1_BITMASK = 0x80000000;
var ONE_BYTE_BITMASK = 0xff;
var ONE_BYTE_HIGH_1_BITMASK = 0x80;
var ONE_BYTE_HIGH_3_BITMASK = 0xe0;

var ONE_BYTE_BIT_LENGTH = 8;
var TWO_BYTES_BIT_LENGTH = 16;

var MAX_NUM_OF_CHARACTERS_FOR_INT64 = 19;
var MIN_NUM_OF_CHARACTERS_FOR_INT64 = 16;

var ZERO_PADDING = '00000000000';

Int64Util.toDecimalString = function (i64)
{
    var i64Buffer = i64.buffer;
    var i64Offset = i64.offset;
    if ((!i64Buffer[i64Offset] && !(i64Buffer[i64Offset + BYTE_1] & ONE_BYTE_HIGH_3_BITMASK)) ||
        (!~i64Buffer[i64Offset] && !~(i64Buffer[i64Offset + BYTE_1] & ONE_BYTE_HIGH_3_BITMASK)))
    {
        // The magnitude is small enough.
        return i64.toString();
    }
    var negative = i64Buffer[i64Offset] & ONE_BYTE_HIGH_1_BITMASK;
    if (negative)
    {
        // 2's complement
        var incremented = false;
        var buffer = new Buffer(BYTE_BUFFER_SIZE);
        for (var i = BYTE_BUFFER_SIZE - 1; i >= 0; --i)
        {
            buffer[i] = (~i64Buffer[i64Offset + i] + (incremented ? 0 : 1)) & ONE_BYTE_BITMASK;
            incremented |= i64Buffer[i64Offset + i];
        }
        i64Buffer = buffer;
    }
    var high2 = i64Buffer[i64Offset + BYTE_1] + (i64Buffer[i64Offset] << ONE_BYTE_BIT_LENGTH);
    // Lesser 11 digits with exceeding values but is under 53 bits capacity.
    var low = i64Buffer[i64Offset + BYTE_7] + (i64Buffer[i64Offset + BYTE_6] << ONE_BYTE_BIT_LENGTH) +
        (i64Buffer[i64Offset + BYTE_5] << TWO_BYTES_BIT_LENGTH) +
        i64Buffer[i64Offset + BYTE_4] * POW2_24 // Bit shift renders 32th bit as sign, so use multiplication
        +
        (i64Buffer[i64Offset + BYTE_3] + (i64Buffer[i64Offset + BYTE_2] << ONE_BYTE_BIT_LENGTH)) *
        POW2_32 + high2 * POW2_48_REMAINDER_POW10_11;
    // 12th digit and greater.
    var high = Math.floor(low / POW10_11) + high2 * POW2_48_OVER_POW10_11;
    if (!high)
    {
        low = String(low % POW10_11);
        return (negative ? '-' : '') + low;
    }
    // Make it exactly 11 with leading zeros.
    low = (ZERO_PADDING + String(low % POW10_11)).slice(-NUM_OF_LEAST_SIGNIFICANT_DIGITS);
    return (negative ? '-' : '') + String(high) + low;
};

Int64Util.fromDecimalString = function (text)
{
    var negative = text.charAt(0) === '-';
    if (text.length < (negative ? MIN_NUM_OF_CHARACTERS_FOR_INT64 + 1 : MIN_NUM_OF_CHARACTERS_FOR_INT64))
    {
        // The magnitude is smaller than 2^53.
        return new Int64(+text);
    }
    else if (text.length > (negative ? MAX_NUM_OF_CHARACTERS_FOR_INT64 + 1 : MAX_NUM_OF_CHARACTERS_FOR_INT64))
    {
        throw new RangeError('too many digits for Int64: ' + text);
    }
    // Most significant (up to 5) digits
    var high5 = +text.slice(negative ? 1 : 0, -MAX_NUM_OF_DECIMAL_DIGITS_REPRESENTABLE_BY_DOUBLE);
    var low = +text.slice(-MAX_NUM_OF_DECIMAL_DIGITS_REPRESENTABLE_BY_DOUBLE) + high5 *
        POW10_15_REMAINDER_POW2_32;
    var high = Math.floor(low / POW2_32) + high5 * POW10_15_OVER_POW2_32;
    low = low % POW2_32;
    if (high >= POW2_31 && !(negative && high === POW2_31 && low === 0)) // Allow minimum Int64
    {
        throw new RangeError('the magnitude is too large for Int64');
    }
    if (negative)
    {
        // 2's complement
        high = ~high;
        if (low === 0)
        {
            high = (high + 1) & FOUR_BYTE_BITMASK;
        }
        else
        {
            low = ~low + 1;
        }
        high = FOUR_BYTE_HIGH_1_BITMASK | high;
    }
    return new Int64(high, low);
};
