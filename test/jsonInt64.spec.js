var mocha  = require('mocha');
var assert = require('chai').assert;
var expect = require('chai').expect;
var Int64 = require('node-int64');
var JSONInt64 = require('../index');

describe("Tests the Int64 support", function(){
    var input = '{"int64MaxValue":9223372036854775807,"int64MinValue":-9223372036854775807,"number":123}';

    it("tests the JSON parse and stringify functionality", function(done){
        var parsedObject = JSONInt64.parse(input);
        expect(parsedObject.number.toString()).to.equal("123");
        expect(parsedObject.int64MaxValue).to.be.instanceof(Int64);
        expect(JSONInt64.util.toDecimalString(parsedObject.int64MaxValue)).to.equal("9223372036854775807");
        expect(parsedObject.int64MinValue).to.be.instanceof(Int64);
        expect(JSONInt64.util.toDecimalString(parsedObject.int64MinValue)).to.equal("-9223372036854775807");

        var expectedObject = JSONInt64.stringify(parsedObject);
        expect(expectedObject).to.equal(input);
        done();
    });
});