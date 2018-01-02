(function(exports) {

    class DiffUpsert {
        constructor(opts={}) {
            this.excludeKey = opts.excludeKey;
        }

        upsert(dst, delta) {
            if (dst == null || delta == null) {
                return null;
            }
            var keys = Object.keys(delta);
            for (var i = keys.length; i-- > 0;) {
                var key = keys[i];
                var deltaVal = delta[key];
                var dstVal = dst[key];
                if (dstVal == null) {
                    dst[key] = deltaVal;
                } else if (deltaVal == null) {
                    dst[key] = deltaVal;
                } else if (false && dstVal instanceof Array) {
                    if (dstVal.length === deltaVal.length) {
                        for (var j = 0; j < dstVal.length; j++) {
                            if (deltaVal[j] != null) {
                                dstVal[j] = deltaVal[j];
                            }
                        }
                    } else {
                        dst[key] = deltaVal;
                    }
                } else if (false && deltaVal instanceof Array) {
                    dst[key] = deltaVal;
                } else if (dstVal instanceof Array && typeof deltaVal === 'object') {
                    this.upsert(dst[key], deltaVal);
                } else if (typeof dstVal === 'object' && typeof deltaVal === 'object') {
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
            if (false && obj1.constructor === Array) {
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

        diff(obj1, obj2) {
            var result = this._diffCore(obj1, obj2).diff || null;
            return result;
        }
    }

    module.exports = exports.DiffUpsert = DiffUpsert;
})(typeof exports === "object" ? exports : (exports = {}));
