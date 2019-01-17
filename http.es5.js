"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _axios = require("axios");

var _axios2 = _interopRequireDefault(_axios);

var _url = require("url");

var _url2 = _interopRequireDefault(_url);

var _httpErrorHandler = require("./httpErrorHandler");

var _httpErrorHandler2 = _interopRequireDefault(_httpErrorHandler);

var _loader = require("./loader");

var _loader2 = _interopRequireDefault(_loader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Http = function () {
    function Http(vue, config) {
        _classCallCheck(this, Http);

        this.Vue = vue;
        this.config = config || {};
        this.errors = [];
        this.loading = 0;
        this.prefix = config.prefix || "api:";
        this.version = config.version || "";
        this.CleanCache();
    }

    // Utils


    _createClass(Http, [{
        key: "Normalize",
        value: function Normalize(apis, params, data, method) {
            if (typeof apis === "string") return [{
                url: apis,
                data: data,
                params: params,
                method: method
            }];

            if (Array.isArray(apis)) {
                apis.forEach(function (api, i) {
                    if (typeof api === "string") apis[i] = {
                        url: api,
                        data: data,
                        params: params,
                        method: method
                    };
                });
            } else if ((typeof apis === "undefined" ? "undefined" : _typeof(apis)) === "object") {
                apis.method = method;
                apis = [apis];
            }
            return apis;
        }
    }, {
        key: "ParseJson",
        value: function ParseJson(d) {
            try {
                return JSON.parse(d);
            } catch (e) {
                console.warn("corrupt cache", d);
                return null;
            }
        }
        // Cache

    }, {
        key: "GetCache",
        value: function GetCache(config) {
            if (!config || !localStorage || !localStorage.getItem) return;
            var name = _url2.default.resolve(config.baseurl || "", config.url || "");
            var cache = this.ParseJson(localStorage.getItem(this.prefix + this.version + name));

            if (!cache || !cache.endtime) return;
            if (new Date().getTime() > cache.endtime) return;

            return cache.data;
        }
    }, {
        key: "CleanCache",
        value: function CleanCache() {
            if (!localStorage) return;
            for (var i in localStorage) {
                if (i.indexOf(this.prefix) == 0) {
                    var cache = this.ParseJson(localStorage.getItem(i));
                    if (!cache || !cache.endtime) return localStorage.removeItem(i);
                    if (new Date().getTime() > cache.endtime) return localStorage.removeItem(i);
                }
            }
        }
    }, {
        key: "SaveCache",
        value: function SaveCache(config, response) {
            if (!config || !response) return;
            if (!localStorage) return;
            var time = config.cacheTime || this.config.cacheTime || 0;

            if (!time) return;
            var name = _url2.default.resolve(config.baseurl || "", config.url || "");
            var data = {
                endtime: new Date().getTime() + time,
                data: response
            };

            localStorage[this.prefix + this.version + name] = JSON.stringify(data);
        }
        // Http

    }, {
        key: "Request",
        value: function Request(config) {
            var _this = this;

            return new Promise(function (res, rej) {

                if (config.loading || config.loading == undefined && _this.config.loading) _this.IncLoading();

                var response;
                var request = Object.assign(JSON.parse(JSON.stringify(_this.config)), config);
                var done = function done(e, nocache, error) {
                    if (config.loading || config.loading == undefined && _this.config.loading) _this.DecLoading();
                    try {
                        if (!nocache && !error) _this.SaveCache(config, e);
                        if (nocache && process.env.NODE_ENV !== "production") console.log("[AxiosPlugin]", "FROM CACHE", config.url);
                    } catch (e) {
                        console.error(e);
                    } finally {
                        error ? rej(e) : res(e);
                    }
                };
                var cache = _this.GetCache(config);
                if (cache) done(cache, true);else _axios2.default.request(request).then(done).catch(function (e) {
                    return done(e, false, true);
                });
            });
        }
    }, {
        key: "Requests",
        value: function Requests(requests) {
            var _this2 = this;

            var ctr = 0;
            var that = this;
            var prom = new Promise(function (res, rej) {
                var done = function done(e, _conf, error) {
                    ++ctr;

                    prom.requests[error ? "errors" : "results"][_conf.url] = e;

                    if (error) {
                        if (typeof _this2.config.errorMap === "function") e = _this2.config.errorMap(e) || e;
                    } else {
                        if (typeof _this2.config.responseMap === "function") e = _this2.config.responseMap(e) || e;
                    }

                    if (_conf.notify != false) if (_this2.config.notify && e.status != 401) {
                        var message = _typeof(e.message) === "object" ? error ? "An internal error occured" : "Succefully done" : e.message;
                        _this2.Notify({
                            message: message,
                            timeout: _conf.timeout || _this2.config.timeout || 5000,
                            type: error ? "error" : "success"
                        });
                    }

                    if (ctr >= requests.length) {
                        if (ctr == 1) error ? rej(e) : res(e);else res(prom.requests.results);
                    }
                };

                requests.forEach(function (req) {
                    _this2.Request(req).then(function (x) {
                        return done(x, req);
                    }).catch(function (x) {
                        return done(x, req, true);
                    });
                });
            });

            prom.requests = {
                promises: {},
                results: {},
                errors: {}
            };
            return prom;
        }
    }, {
        key: "Get",
        value: function Get(api, data) {
            return this.Requests(this.Normalize(api, data, null, "get"));
        }
    }, {
        key: "Post",
        value: function Post(api, data) {

            return this.Requests(this.Normalize(api, data, null, "post"));
        }
    }, {
        key: "Put",
        value: function Put(api, data) {

            return this.Requests(this.Normalize(api, data, null, "put"));
        }
    }, {
        key: "Update",
        value: function Update(api, data) {

            return this.Requests(this.Normalize(api, data, null, "update"));
        }
    }, {
        key: "IncLoading",
        value: function IncLoading() {
            ++this.loading;
        }
    }, {
        key: "DecLoading",
        value: function DecLoading() {
            --this.loading;
        }
        //Errors

    }, {
        key: "Notify",
        value: function Notify(data) {
            var _this3 = this;

            this.errors.push(data);
            if (data.timeout) {
                setTimeout(function () {
                    return _this3.RemoveNotify(data);
                }, data.timeout);
            }
        }
    }, {
        key: "RemoveNotify",
        value: function RemoveNotify(data) {
            data.show = false;
            var index = this.errors.indexOf(data);
            if (index > -1) this.errors.splice(index, 1);
        }
    }]);

    return Http;
}();

var HttpPlugin = {
    install: function install(Vue, options) {
        Vue.prototype.$http = new Http(Vue, options);
        Vue.prototype.$axios = _axios2.default;
        Vue.component("axios-error-handler", _httpErrorHandler2.default);
        Vue.component("axios-loader", _loader2.default);
    }
};

exports.default = HttpPlugin;