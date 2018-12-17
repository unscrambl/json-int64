var expect = require('chai').expect;
var Assertion = require('chai').Assertion;
var Int64 = require('node-int64');
var JSONInt64 = require('../index');

Assertion.addMethod('equalInt64', function (other)
{
    var object = this._obj;
    new Assertion(object).to.be.an.instanceof(Int64);
    new Assertion(other).to.be.an.instanceof(Int64);
    this.assert(
        object.equals(other),
        "expected #{this} to be equal to #{act}",
        "expected #{this} to be not equal to #{act}",
        other,
        object);
});

describe("Tests the Int64 support", function ()
{
    var input = '{"int64MaxValue": 9223372036854775807, "int64MinValue": -9223372036854775807, "number": 123}';

    it("tests the JSON parse and stringify functionality", function (done)
    {
        var parsedObject = JSONInt64.parse(input);
        expect(parsedObject.number).to.be.equal(123);
        expect(parsedObject.int64MaxValue).to.be.instanceof(Int64);
        expect(JSONInt64.toDecimalString(parsedObject.int64MaxValue)).to.be.equal("9223372036854775807");
        expect(parsedObject.int64MinValue).to.be.instanceof(Int64);
        expect(JSONInt64.toDecimalString(parsedObject.int64MinValue)).to.be.equal("-9223372036854775807");

        var expectedObject = JSONInt64.stringify(parsedObject);
        expect(expectedObject).to.be.equal(input);
        done();
    });

    it("tests the from/to decimal string conversion utilities", function (done)
    {
        var decimalString = "1234";
        var decimalInt64 = new Int64(1234);
        var negativeDecimalString = "-1234";
        var negativeDecimalInt64 = new Int64(-1234);
        var maxJsSafeIntegerPlusOneDecimalString = "9007199254740992";
        var maxJsSafeIntegerPlusOneDecimalInt64 = new Int64("20000000000000");
        var minJsSafeIntegerMinusOneDecimalString = "-9007199254740992";
        var minJsSafeIntegerMinusOneDecimalInt64 = new Int64("ffe0000000000000");
        var maxSignedInt64DecimalString = "9223372036854775807";
        var maxSignedInt64DecimalInt64 = new Int64("7fffffffffffffff");
        var minSignedInt64DecimalString = "-9223372036854775808";
        var minSignedInt64DecimalInt64 = new Int64("8000000000000000");

        var testCases = [
            [decimalString, decimalInt64],
            [negativeDecimalString, negativeDecimalInt64],
            [maxJsSafeIntegerPlusOneDecimalString, maxJsSafeIntegerPlusOneDecimalInt64],
            [minJsSafeIntegerMinusOneDecimalString, minJsSafeIntegerMinusOneDecimalInt64],
            [maxSignedInt64DecimalString, maxSignedInt64DecimalInt64],
            [minSignedInt64DecimalString, minSignedInt64DecimalInt64]
        ];

        testCases.forEach(function (stringAndInt64)
        {
            expect(JSONInt64.toDecimalString(stringAndInt64[1])).to.be.equal(stringAndInt64[0]);
            expect(JSONInt64.fromDecimalString(stringAndInt64[0])).to.be.equalInt64(stringAndInt64[1]);
        });

        done();
    });
});
