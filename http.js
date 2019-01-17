import axios from "axios";
import url from "url";
import ErrorHandler from "./httpErrorHandler"
import Loader from "./loader"


class Http {
    constructor(vue, config) {
        this.Vue = vue;
        this.config = config || {};
        this.errors = [];
        this.loading = 0;
        this.prefix = config.prefix || "api:";
        this.version = config.version || "";
        this.CleanCache();
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
    ParseJson(d){
        try { 
            return JSON.parse(d);
        }
        catch(e)
        {
            console.warn("corrupt cache" , d)
            return null;
        }
    }
    // Cache
    GetCache(config){
        if(!config || !localStorage || !localStorage.getItem)
           return;
        var name =  url.resolve((config.baseurl || "") , (config.url || ""));
        var cache = this.ParseJson(localStorage.getItem(this.prefix+this.version+name));
       
        if(!cache || !cache.endtime)
            return;
        if((new Date()).getTime() > cache.endtime)
            return;
        
        return cache.data;
    }
    CleanCache(){
        if(!localStorage)
            return;
        for(var i in localStorage)
        {
            if(i.indexOf(this.prefix) == 0)
            {
                var cache = this.ParseJson(localStorage.getItem(i));
                if(!cache || !cache.endtime)
                     return localStorage.removeItem(i);
                if((new Date()).getTime() > cache.endtime)
                    return localStorage.removeItem(i);
            }
         
        }
    }
    SaveCache(config, response){
        if(!config || !response)
           return;
        if(!localStorage)
            return;
        var time = config.cacheTime || this.config.cacheTime || 0;
       
        if(!time)
            return;
        var name =  url.resolve((config.baseurl || "") , (config.url || ""));
        var data = {
            endtime : (new Date()).getTime() + time,
            data : response 
        };
       
        localStorage[this.prefix+this.version+name] = JSON.stringify(data);
    }
    // Http
    Request(config) {
        return new Promise((res, rej) => {
          
            if(config.loading || (config.loading == undefined && this.config.loading))
                this.IncLoading();
 
            var response;
            var request = Object.assign(JSON.parse(JSON.stringify(this.config)), config);
            var done = (e, nocache,error) => {
                if(config.loading || (config.loading == undefined && this.config.loading))
                   this.DecLoading();
                try{
                    if(!nocache && !error)
                        this.SaveCache(config, e);
                    if(nocache && process.env.NODE_ENV !== "production")
                        console.log("[AxiosPlugin]","FROM CACHE" , config.url)
                }
                catch(e)
                {
                    console.error(e)
                 }
                finally{
                    error ? rej(e) : res(e)
                }
              
            }
            var cache = this.GetCache(config);
            if(cache)
                done(cache, true)
            else
              axios.request(request).then(done).catch(e => done(e,false,true));

        });
    }
    Requests(requests) {
        var ctr = 0;
        var that = this;
        var prom = new Promise((res, rej) => {
        var done = (e, _conf ,  error) => {
                ++ctr;
               
                prom.requests[(error ? "errors": "results")][_conf.url] = e;

                if(error)
                {
                    if (typeof this.config.errorMap === "function")
                     e = this.config.errorMap(e) || e;
                }
                else
                {
                    if (typeof this.config.responseMap === "function")
                     e = this.config.responseMap(e) || e;
                }

             

                if(_conf.notify != false)
                    if(this.config.notify && e.status != 401)
                    {
                        var message = typeof e.message  === "object" ? (error ? "An internal error occured" : "Succefully done") : e.message;
                        this.Notify({
                            message : message,
                            timeout : _conf.timeout || this.config.timeout ||  5000,
                            type : error ? "error" : "success"
                        })
                    }
                  

                if (ctr >= requests.length)
                {
                    if (ctr == 1)
                        error ? rej(e) : res(e)
                    else
                        res(prom.requests.results)
                }
                   
            };
           
            requests.forEach(req => {
                this.Request(req).then(x => done(x, req)).catch( x => done(x,req, true));
            })
        });

        prom.requests = {
            promises: {},
            results: {},
            errors : {}
        };
        return prom;
    }
    Get(api, data) {
        return this.Requests( this.Normalize(api, data, null, "get"))
    }
    Post(api, data) {

        return this.Requests(this.Normalize(api, data, null, "post"))
    }
    Put(api, data) {

        return this.Requests(this.Normalize(api, data, null, "put"))
    }
    Update(api, data) {

        return this.Requests(this.Normalize(api, data, null, "update"))
    }
  
    IncLoading()
    {
        ++this.loading;
    }
    DecLoading()
    {
        --this.loading;
    }
    //Errors
    Notify(data){
        this.errors.push(data);
		if(data.timeout)
		{
			setTimeout(() => this.RemoveNotify(data), data.timeout);
		} 
    }
    RemoveNotify(data)
    {
        data.show = false;
		var index = this.errors.indexOf(data);
		if(index > -1)
			this.errors.splice(index,1)
    }
}

const HttpPlugin = {
    install(Vue, options) {
        Vue.prototype.$http = new Http(Vue, options);
        Vue.prototype.$axios = axios;
        Vue.component("axios-error-handler" , ErrorHandler)
        Vue.component("axios-loader" , Loader)
   
    }
}

export default HttpPlugin;