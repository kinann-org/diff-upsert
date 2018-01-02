var should = require("should");

(function(exports) {

    class DiffUpsert {
        constructor(opts={}) {
            this.excludeKey = opts.excludeKey;
        }

        upsert(dst, delta) {
            if (dst == null || delta == null) {
                return null;
            }
            should && dst.should.not.instanceof(Array);
            should && dst.should.instanceof(Object);
            var keys = Object.keys(delta);
            for (var i = keys.length; i-- > 0;) {
                var key = keys[i];
                var deltaVal = delta[key];
                var dstVal = dst[key];
                if (dstVal == null) {
                    dst[key] = deltaVal;
                } else if (deltaVal == null) {
                    dst[key] = deltaVal;
                } else if (dstVal instanceof Array) {
                    if (dstVal.length === deltaVal.length) {
                        for (var j = 0; j < dstVal.length; j++) {
                            if (deltaVal[j] != null) {
                                dstVal[j] = deltaVal[j];
                            }
                        }
                    } else {
                        dst[key] = deltaVal;
                    }
                } else if (deltaVal instanceof Array) {
                    dst[key] = deltaVal;
                } else if (typeof dstVal == 'object' && typeof deltaVal === 'object') {
                    this.upsert(dst[key], deltaVal);
                } else {
                    dst[key] = deltaVal;
                }
            }
            return dst;
        }

        _diffCore(obj1, obj2) {
            if (obj1 === obj2) {
                return {
                    same: true
                };
            }
            if (obj1 == null) {
                return {
                    same: false,
                    diff: obj1
                };
            }
            if (obj2 == null) {
                return {
                    same: false,
                    diff: obj1
                };
            }
            if (typeof obj1 === 'undefined' || typeof obj2 === 'undefined') {
                return {
                    same: false,
                    diff: obj1
                };
            }
            if (obj1.constructor !== obj2.constructor) {
                return {
                    same: false,
                    diff: obj1
                };
            }
            if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
                return {
                    same: false,
                    diff: obj1
                }; // atomic nodes differ
            }
            var delta = {
                same: true
            };
            if (obj1.constructor === Array) {
                delta.diff = [];
                if (obj1.length == obj2.length) {
                    for (var i = 0; i < obj1.length; i++) {
                        var kidDelta = this._diffCore(obj1[i], obj2[i]);
                        if (kidDelta.same) {
                            //delta.diff[i] = null;
                        } else {
                            //delta.diff[i] = kidDelta.diff;
                            delta.same = false;
                            delta.diff = obj1;
                            break;
                        }
                    }
                } else {
                    delta.diff = obj1;
                    delta.same = false;
                }
            } else { // object
                var keys = Object.keys(obj1);
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    if (this.excludeKey && this.excludeKey.test(key)) {
                        continue;
                    }
                    var kidDelta = this._diffCore(obj1[key], obj2[key]);
                    if (!kidDelta.same) {
                        delta.diff = delta.diff || {};
                        delta.diff[key] = kidDelta.diff;
                        delta.same = false;
                    }
                }
            }
            return delta;
        }

        diff(obj1, obj2, options) {
            options = options || {};
            var result = this._diffCore(obj1, obj2).diff || null;
            return result;
        }
    }

    module.exports = exports.DiffUpsert = DiffUpsert;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("DiffUpsert", function() {
    var DiffUpsert = exports.DiffUpsert;

    it("diff(obj,objBase) returns delta with new or updated properties", function() {
        // add object property
        var jbase = {
            a: 'red', 
            b: {
                b1: 'blue',
                b2: 'green',
            },
            c: 'black',
        };
        var jnew = {
            a: 'red-update',
            b: {
                b1: 'blue-update',
                b2: 'green',
                b3: 'white-new',
            },
            c: 'black',
        };
        var du = new DiffUpsert();
        should.deepEqual(du.diff(jnew, jbase), {
            a: 'red-update',
            b: {
                b1: 'blue-update',
                b3: 'white-new',
            },
        });
    });
    it("upsert(obj,delta) applies delta to object", function() {
        var jobj = {
            a: 'red', 
            b: {
                b1: 'blue',
                b2: 'green',
            },
            c: 'black',
        };
        var jnew = {
            a: 'red-update',
            b: {
                b1: 'blue-update',
                b2: 'green',
                b3: 'white-new',
            },
            c: 'black',
        };
        var du = new DiffUpsert();

        // upsert() applies delta  object
        var delta = du.diff(jnew, jobj);
        var r = du.upsert(jobj, delta);
        should.deepEqual(r, jnew);
        should.deepEqual(jobj, jnew);
        should(r===jobj).equal(true);
        should(jnew===jobj).equal(false);

        // updated object is independent of delta
        var jobjstr = JSON.stringify(jobj);
        delta.a = 'red-delta';
        delta.b.b1 = 'blue-delta';
        delta.b.b3 = 'white-delta';
        delta.c = 'black-delta';
        should(JSON.stringify(jobj)).equal(jobjstr);
    });
    it("arrays are treated as objects", function() {
        var e1 = JSON.stringify({
            a: 'red',
            b: {
                b1: 'blue',
                b2: 'green',
            },
        });
        var e2 = JSON.stringify({
            c: 'purple',
            d: {
                d1: 'brown',
                d2: 'amber',
            },
        });
        var e2new = JSON.stringify({
            c: 'purple',
            d: {
                d1: 'brown',
                d2: 'amber-updated',
            },
        });
        var jbase = [e1,e2].map(e => JSON.parse(e));
        var jnew = [e1,e2new].map(e => JSON.parse(e));
        var du = new DiffUpsert();
        var delta = du.diff(jnew, jbase);
        /*
        should.deepEqual(delta,{
            1: {
                d: {
                    d2: 'amber-updated',
                },
            }
        });
        */

    });
    it("diff(obj,objBase) should return diff of updated or inserted fields", function() {
        var jsonold = {
            "w": [{
                va: 1,
                wa: 11,
            }, {
                vc: 3,
                wc: 31,
            }],
            "x": {
                "A": "1",
                "B": 2,
                "D": "Something",
                "E": [10, 20, 30]
            },
            "y": ["a", "b", "c"],
            "z": {
                "p": 911
            },
        };

        var jsonnew = {
            "w": [{
                va: 1,
                wa: 11,
            }, {
                va: 2,
                wb: 21,
            }, {
                vc: 30,
                wc: 31,
            }],
            "x": {
                "A": "1",
                "B": 2.1,
                "C": "3",
                "D": "Different",
                "E": [10, 21, 30]
            },
            "y": ["a", "b", "d"],
            "z": {
                "p": 911
            },
        };

        var deltaExpected = {
            "w": [{
                va: 1,
                wa: 11,
            }, {
                va: 2,
                wb: 21,
            }, {
                vc: 30,
                wc: 31,
            }],
            "x": {
                "B": 2.1,
                "C": "3",
                "D": "Different",
                //"E": [null, 21, null]
                "E": [10, 21, 30]
            },
            "y": ["a", "b", "d"],
        };

        var du = new DiffUpsert();
        var delta;
        delta = du.diff(jsonnew, jsonold);
        should.deepEqual(delta, deltaExpected);

        du.upsert(jsonold, delta);
        should.deepEqual(jsonold, jsonnew);

        var selfDiff = du.diff(jsonold, jsonold);
        should(selfDiff == null).True;

        delta = du.diff(jsonnew, null);
        should.deepEqual(delta, jsonnew);

        delta = du.diff(null, jsonold);
        should.deepEqual(delta, null);
    });
    it("diff(obj,objBase) ignores excluded keys", function() {
        var jsonOld = {
            version: {
                major: 1,
            }
        };
        var jsonNew = {
            $$hashKey: "angular:##",
            version: {
                major: 1,
            }
        };
        var du = new DiffUpsert({
            excludeKey: /^\$\$.*/,
        });
        var delta = du.diff(jsonNew, jsonOld);
        should.deepEqual(delta, null);
        jsonNew.version.minor = 2;
        var delta = du.diff(jsonNew, jsonOld);
        should.deepEqual(delta, {
            version: {
                minor: 2,
            }
        });
    });
    it("falsy and truthy", function() {
        var obj = {
            y: 0
        };
        var undef;

        // Things that work well
        should(obj.x == null).True; // it's nully
        should(undef == null).True;
        should(obj.x === null).False; // it's undefined
        should(obj.y < 10).True; // (but see below)
        should("a" === 10).False; // (but see below)
        should("a" == 10).False; // (but see below)

        // DANGER: comparing numbers with non-numbers is asymmetric and highly inconsistent
        should(obj.undef < 10).False; // DANGER
        should(undef < 10).False; // DANGER
        should("a" < 10).False;
        should("a" > 10).False; // asymmetric
        should(null < 10).True;
    });
    it("empty objects", function() {
        var a = {};
        should(a == {}).equal(false);
        should(a === {}).equal(false);
        Object.keys(a).length.should.equal(0);
        Object.keys("").length.should.equal(0);
        Object.keys(123).length.should.equal(0);
        Object.keys(true).length.should.equal(0);
        Object.keys([]).length.should.equal(0);
        should.throws(function() {
            Object.keys(null).length;
        });
    });
    it("upsert(dst, delta) should update dst with delta", function() {
        var du = new DiffUpsert();
        should.deepEqual(du.upsert({}, {
            a: "av"
        }), {
            a: "av"
        });
        should.deepEqual(du.upsert({
            a: "a1",
            c: "c1",
            d: "d1",
        }, {
            a: "a2",
            b: "b1",
            d: null,
        }), {
            a: "a2",
            b: "b1",
            c: "c1",
            d: null,
        });
        should.deepEqual(du.upsert({
            x: "x1",
            y: {
                a: "a1",
                c: "c1",
            },
        }, {
            y: {
                a: "a2",
                b: "b1",
            },
            z: {
                d: "d1",
                e: "e1",
            },
        }), {
            x: "x1",
            y: {
                a: "a2",
                b: "b1",
                c: "c1",
            },
            z: {
                d: "d1",
                e: "e1",
            },
        });
        should.deepEqual(du.upsert({
            a: {
                x: "x2"
            }
        }, {
            a: [1, 2]
        }), {
            a: [1, 2]
        });
        should.deepEqual(du.upsert({
            a: [1, 2]
        }, {
            a: {
                b: "b2"
            }
        }), {
            a: {
                b: "b2"
            }
        });
        should.deepEqual(du.upsert({
            a: 1
        }, {
            a: {
                b: "b2"
            }
        }), {
            a: {
                b: "b2"
            }
        });
        should.deepEqual(du.upsert({}, {
            a: ["a2"]
        }), {
            a: ["a2"]
        });
        should.deepEqual(du.upsert({
            a: {
                b: [],
                c: "red"
            }
        }, {
            a: {
                b: [{
                    x: "x1"
                }],
                d: "d1",
            }
        }), {
            a: {
                b: [{
                    x: "x1"
                }],
                c: "red",
                d: "d1",
            }
        });
        should.deepEqual(du.upsert({
            a: [1, 2]
        }, {
            a: [2, 3]
        }), {
            a: [2, 3]
        });
    });
})

