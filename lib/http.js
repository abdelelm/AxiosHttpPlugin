import axios from "axios";
import url from "url";
import ErrorHandler from "./components/httpErrorHandler.vue"
import Loader from "./components/loader.vue"
import {
    StorageManager
} from "browsercachemanager/dist/storageManager.js"
class Notify {
    constructor(){
        this.errors = [];
    }

    Add(data) {
        this.errors.push(data);
        if (data.timeout) {
            setTimeout(() => this.RemoveNotify(data), data.timeout);
        }
    }
    Error(data) {
        data.type = "danger"
        data.icon = "error"
        this.Add(data);
    }
    Info(data) {
        data.type = "info"
        data.icon = "info"
        this.Add(data);
    }
    Warning(data) {
        data.type = "warning"
        data.icon = "warning"
        this.Add(data);
    }
    Success(data) {
        data.type = "success"
        data.icon = "check"
        this.Add(data);
    }
    Remove(data) {
        data.show = false;
        var index = this.errors.indexOf(data);
        if (index > -1)
            this.errors.splice(index, 1)
    }
}
class Http {
    constructor(vue, config) {
        this.Vue = vue;
        this.config = config || {};
        this.Init();
    }
    Init() {
        this.loading = 0;
        if (this.config.cache) {
            this.cacheHandler = new StorageManager(this.config.cache);
            var versionmanager = new StorageManager("local");
            if (this.config.version)
                versionmanager.getItem("cacheVersion").then(result => {
                    if (result != this.config.version)
                        this.cacheHandler.allStorages().clear();
                    versionmanager.setItem("cacheVersion", this.config.version)
                }).catch(() => {
                    this.cacheHandler.allStorages().clear();
                    versionmanager.setItem("cacheVersion", this.config.version)
                })
            else
                this.cacheHandler.allStorages().clear();
        }

    }
    // Utils
    Normalize(apis, params, data, method) {
        if (typeof apis === "string")
            return [{
                url: apis,
                data: data,
                params: params,
                method: method
            }]

        if (Array.isArray(apis)) {
            apis.forEach((api, i) => {
                if (typeof api === "string")
                    apis[i] = {
                        url: api,
                        data: data,
                        params: params,
                        method: method
                    };
            });
        } else if (typeof apis === "object") {
            apis.method = method;
            apis = [apis]
        }
        return apis;
    }
    // Cache
    GetCache(config) {
        if (!config || !this.cacheHandler)
            return Promise.resolve(null);

        var name = url.resolve((config.baseurl || ""), (config.url || ""));
        return this.cacheHandler.getItem(name, "json").then(cache => {
            if (!cache)
                return null;

            if ((new Date()).getTime() > cache.timeout)
                return;

            return cache.data;
        })


    }
    CleanCache() {
        if (!this.cacheHandler)
            return;
        return this.cacheHandler.clear();
    }
    SaveCache(config, response) {
        if (!config || !response || !this.cacheHandler)
            return;

        var time = config.cacheTime || this.config.cacheTime || 0;

        if (!time)
            return;

        var name = url.resolve((config.baseurl || ""), (config.url || ""));
        var data = {
            endtime: (new Date()).getTime() + time,
            data: response
        };
        return this.cacheHandler.setItem(name, JSON.stringify(data));
    }
    // Http
    SendRequest(config) {
        return new Promise((res, rej) => {
            var loading = config.loading || (config.loading == undefined && this.config.loading);
            if (loading)
                this.IncLoading();
            var request = Object.assign(JSON.parse(JSON.stringify(this.config)), config);
            var done = (e, nocache, error) => {
                if (loading)
                    this.DecLoading();
                try {
                    if (!nocache && !error)
                        this.SaveCache(config, e);
                    if (nocache && process && process.env.NODE_ENV !== "production")
                        console.log("[AxiosPlugin]", "FROM CACHE", config.url)
                } catch (e) {
                    console.error(e)
                } finally {
                    error ? rej(e) : res(e)
                }

            }
            this.GetCache(config).then(cache => {
                if (cache)
                    done(cache, true)
                else
                    axios.request(request).then(done).catch(e => done(e, false, true));
            });


        });
    }
    Requests(requests) {
        var ctr = 0;
        var that = this;

        var prom = new Promise((res, rej) => {
            var done = (e, _conf, error) => {
                ++ctr;
                prom.requests[(error ? "errors" : "results")][_conf.url] = e;

                if (error) {
                    if (typeof this.config.errorMap === "function")
                        e = this.config.errorMap.bind(this.Vue)(e) || e;
                } else {
                    if (typeof this.config.responseMap === "function")
                        e = this.config.responseMap.bind(this.Vue)(e) || e;
                }



                if (_conf.notify != false && e.notify)
                    this.Vue.$notify.Add(e.notify);


                if (ctr >= requests.length) {
                    if (ctr == 1)
                        error ? rej(e) : res(e)
                    else
                        res(prom.requests.results)
                }

            };

            requests.forEach(req => {
                this.SendRequest(req).then(x => done(x, req)).catch(x => done(x, req, true));
            })
        });

        prom.requests = {
            promises: {},
            results: {},
            errors: {}
        };
        return prom;
    }
    Get(api, data) {
        return this.Requests(this.Normalize(api, data, null, "get"))
    }
    Post(api, data, query) {
        return this.Requests(this.Normalize(api, query, data, "post"))
    }
    Put(api, data, query) {
        return this.Requests(this.Normalize(api, query, data, "put"))
    }
    Patch(api, data, query) {
        return this.Requests(this.Normalize(api, query, data, "patch"))
    }
    Head(api, data, query) {
        return this.Requests(this.Normalize(api, query, data, "head"))
    }
    Delete(api, data, query) {
        return this.Requests(this.Normalize(api, query, data, "delete"))
    }
    Connect(api, data, query) {
        return this.Requests(this.Normalize(api, query, data, "connect"))
    }
    Options(api, data, query) {
        return this.Requests(this.Normalize(api, query, data, "options"))
    }
    Trace(api, data, query) {
        return this.Requests(this.Normalize(api, query, data, "trace"))
    }
    Request(api, method, data, query) {
        return this.Requests(this.Normalize(api, query, data, method))
    }
    IncLoading() {
        ++this.loading;
    }
    DecLoading() {
        --this.loading;
    }

}

const HttpPlugin = {
    install(Vue, options) {
        Vue.prototype.$notify = new Notify();
        Vue.prototype.$http = new Http(Vue, options);
        Vue.prototype.$axios = axios;


        Vue.component("axios-error-handler", ErrorHandler)
        Vue.component("axios-loader", Loader)

    }
}

export default HttpPlugin;