// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("DiffUpsert", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const DiffUpsert = require('../index').DiffUpsert;

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
    it("diff(...) treats null as a valid property value", function() {
        // add object property
        var jbase = {
            b: {
                b1: 'blue',
                b2: 'green',
            },
        };
        var jnew = {
            b: {
                b1: null,
                b2: 'green',
            },
        };
        var du = new DiffUpsert();

        // diff detects null
        var delta = du.diff(jnew, jbase);
        should.deepEqual(delta, {
            b: {
                b1: null,
            },
        });

        // upsert applies null value
        should.deepEqual(du.upsert(jbase, delta), jnew);
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
        should.deepEqual(delta,{
            1: {
                d: {
                    d2: 'amber-updated',
                },
            }
        });
    });
    it("diff(obj,objBase) should return diff of updated or inserted fields", function() {
        var jsonold = {
            "w": [{
                w0a: 1,
            }, {
                w1a: 2,
            }],
        };

        var jsonnew = {
            "w": [{
                w0a: 1,
            }, {
                w1a: null,
                w1b: 21,
            }, {
                w2a: 30,
            }],
        };

        var deltaExpected = {
            "w": {
                1: {
                    w1a: null,
                    w1b: 21,
                },
                2: {
                    w2a: 30,
                }
            },
        };

        var du = new DiffUpsert();
        var delta;
        delta = du.diff(jsonnew, jsonold);
        should.deepEqual(delta, deltaExpected);

        du.upsert(jsonold, delta);
        should.deepEqual(jsonold, jsonnew);

        delta = du.diff(jsonnew, null);
        should.deepEqual(delta, jsonnew);

        delta = du.diff(null, jsonold);
        should.deepEqual(delta, null);
    });
    it("diff(obj,obj) returns null if there is no difference", function() {
        var du = new DiffUpsert();

        var obj = {
            a: 'red',
        }
        should(du.diff(obj,obj)).equal(null);

        var obj = [ 1,2,3];
        should(du.diff(obj,obj)).equal(null);


        var obj = {
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
        should(du.diff(obj,obj)).equal(null);
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
            a: {
                0: 1,
                1: 2,
                x: "x2",
            },
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
                b: {
                    0: {
                        x: "x1"
                    }
                },
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
    it("upsert(...) delta type must be compatible with object", function() {
        should.throws(() => du.upsert({
            a: [1, 2]
        }, {
            a: {
                b: "b2"
            }
        }));
    });
    it("diff(...) can detect a change in a real configuration file", function() {
        var confold = JSON.parse(fs.readFileSync(path.join(__dirname, 'confold.json')));
        var confnew = JSON.parse(fs.readFileSync(path.join(__dirname, 'confnew.json')));
        var du = new DiffUpsert();
        var delta = du.diff(confnew, confold);
        should.deepEqual(delta, {
            switches: {
                0: {
                    pin: '373',
                },
            },
            rbHash: 'c40547f27d9c5af04161117788088880',
        });
    });
})

