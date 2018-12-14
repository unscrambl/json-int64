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

// This file is copied from the Thrift project under Apache 2.0 license
// There are some changes to variable names and styling
// The other changes are documented before the changes

var Int64 = require('node-int64');

var Int64Util = module.exports = {};

var POW2_24 = Math.pow(2, 24);
var POW2_31 = Math.pow(2, 31);
var POW2_32 = Math.pow(2, 32);
var POW10_11 = Math.pow(10, 11);

Int64Util.toDecimalString = function (i64)
{
    var i64Buffer = i64.buffer;
    var i64Offset = i64.offset;
    if ((!i64Buffer[i64Offset] && !(i64Buffer[i64Offset + 1] & 0xe0)) ||
        (!~i64Buffer[i64Offset] && !~(i64Buffer[i64Offset + 1] & 0xe0)))
    {
        // The magnitude is small enough.
        return i64.toString();
    }
    else
    {
        var negative = i64Buffer[i64Offset] & 0x80;
        if (negative)
        {
            // 2's complement
            var incremented = false;
            var buffer = new Buffer(8);
            for (var i = 7; i >= 0; --i)
            {
                buffer[i] = (~i64Buffer[i64Offset + i] + (incremented ? 0 : 1)) & 0xff;
                incremented |= i64Buffer[i64Offset + i];
            }
            i64Buffer = buffer;
        }
        var high2 = i64Buffer[i64Offset + 1] + (i64Buffer[i64Offset] << 8);
        // Lesser 11 digits with exceeding values but is under 53 bits capacity.
        var low = i64Buffer[i64Offset + 7] + (i64Buffer[i64Offset + 6] << 8) + (i64Buffer[i64Offset + 5] << 16) +
            i64Buffer[i64Offset + 4] * POW2_24 // Bit shift renders 32th bit as sign, so use multiplication
            +
            (i64Buffer[i64Offset + 3] + (i64Buffer[i64Offset + 2] << 8)) * POW2_32 + high2 * 74976710656; // The literal is 2^48 % 10^11
        // 12th digit and greater.
        var high = Math.floor(low / POW10_11) + high2 * 2814; // The literal is 2^48 / 10^11
        // The following if block was added when this file was copied from the Thrift project to fix an issue where 
        // small negative numbers would have unnecessary leading zeros
        if (!high)
        {
            low = String(low % POW10_11).slice(-11);
            return (negative ? '-' : '') + low;
        }
        // Make it exactly 11 with leading zeros.
        low = ('00000000000' + String(low % POW10_11)).slice(-11);
        return (negative ? '-' : '') + String(high) + low;
    }
};

Int64Util.fromDecimalString = function (text)
{
    var negative = text.charAt(0) === '-';
    if (text.length < (negative ? 17 : 16))
    {
        // The magnitude is smaller than 2^53.
        return new Int64(+text);
    }
    else if (text.length > (negative ? 20 : 19))
    {
        throw new RangeError('Too many digits for Int64: ' + text);
    }
    else
    {
        // Most significant (up to 5) digits
        var high5 = +text.slice(negative ? 1 : 0, -15);
        var low = +text.slice(-15) + high5 * 2764472320; // The literal is 10^15 % 2^32
        var high = Math.floor(low / POW2_32) + high5 * 232830; // The literal is 10^15 / 2^&32
        low = low % POW2_32;
        // The equality operators were changed to '===' from '==' when this file was copied from the Thrift project
        if (high >= POW2_31 &&
            !(negative && high === POW2_31 && low === 0) // Allow minimum Int64
        )
        {
            throw new RangeError('The magnitude is too large for Int64.');
        }
        if (negative)
        {
            // 2's complement
            high = ~high;
            if (low === 0)
            {
                high = (high + 1) & 0xffffffff;
            }
            else
            {
                low = ~low + 1;
            }
            high = 0x80000000 | high;
        }
        return new Int64(high, low);
    }
};
