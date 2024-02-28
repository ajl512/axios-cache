import axios from 'axios'
import qs from 'qs'
import { cloneDeep } from 'lodash-es'

import { isFunction } from '@/utils/is'
import { AxiosCanceler } from './axiosCancel'
import { ContentTypeEnum, RequestEnum } from './httpEnum'
import { checkedExecuteType, EXEC_TYPE } from './utils.js'
import { getCache, addCache, getCacheNameByRoute } from './cache'
import { trackLog } from './helper'

export class VAxios {
  axiosInstance;
  options;

  constructor(options) {
    this.options = options;
    this.axiosInstance = axios.create(options);
    this.setupInterceptors();
  }

  /**
   * @description:  Create axios instance
   */
  createAxios(config) {
    this.axiosInstance = axios.create(config);
  }

  getTransform() {
    const { transform } = this.options;
    return transform;
  }

  getAxios(){
    return this.axiosInstance;
  }

  /**
   * @description: Reconfigure axios
   */
  configAxios(config) {
    if (!this.axiosInstance) {
      return;
    }
    this.createAxios(config);
  }

  /**
   * @description: Set general header
   */
  setHeader(headers) {
    if (!this.axiosInstance) {
      return;
    }
    Object.assign(this.axiosInstance.defaults.headers, headers);
  }

  /**
   * @description: Interceptor configuration
   */
  setupInterceptors() {
    const transform = this.getTransform();
    if (!transform) {
      return;
    }
    const {
      requestInterceptors,
      requestInterceptorsCatch,
      responseInterceptors,
      responseInterceptorsCatch,
    } = transform;

    const axiosCanceler = new AxiosCanceler();

    // Request interceptor configuration processing
    this.axiosInstance.interceptors.request.use((config) => {
      // If cancel repeat request is turned on, then cancel repeat request is prohibited
      const {
        headers: { ignoreCancelToken },
      } = config;

      const ignoreCancel =
        ignoreCancelToken !== undefined
          ? ignoreCancelToken
          : this.options.requestOptions?.ignoreCancelToken;

      !ignoreCancel && axiosCanceler.addPending(config);
      if (requestInterceptors && isFunction(requestInterceptors)) {
        config = requestInterceptors(config, this.options);
      }
      return config;
    }, undefined);

    // Request interceptor error capture
    requestInterceptorsCatch &&
      isFunction(requestInterceptorsCatch) &&
      this.axiosInstance.interceptors.request.use(undefined, requestInterceptorsCatch);

    // Response result interceptor processing
    this.axiosInstance.interceptors.response.use((res) => {
      res && axiosCanceler.removePending(res.config);
      if (responseInterceptors && isFunction(responseInterceptors)) {
        res = responseInterceptors(res);
      }
      return res;
    }, undefined);

    // Response result interceptor error capture
    responseInterceptorsCatch &&
      isFunction(responseInterceptorsCatch) &&
      this.axiosInstance.interceptors.response.use(undefined, responseInterceptorsCatch);
  }


  // support form-data
  supportFormData(config) {
    const headers = config.headers || this.options.headers;
    const contentType = headers?.['Content-Type'] || headers?.['content-type'];

    if (
      contentType !== ContentTypeEnum.FORM_URLENCODED ||
      !Reflect.has(config, 'data') ||
      config.method?.toUpperCase() === RequestEnum.GET
    ) {
      return config;
    }

    return {
      ...config,
      data: qs.stringify(config.data, { arrayFormat: 'brackets' }),
    };
  }

  get(config, options) {
    return this.request({ ...config, method: 'GET' }, options);
  }

  post(config, options){
    return this.request({ ...config, method: 'POST' }, options);
  }

  async request(config, options) {
    const start = Date.now();
    let conf = cloneDeep(config);
    const transform = this.getTransform();

    // Default configuration at instantiation
    const { requestOptions } = this.options;

    // options The latest overridden configuration passed in
    const opt = Object.assign({}, requestOptions, options);

    const { beforeRequestHook, requestCatchHook, transformRequestHook } = transform || {};
    let { cache = true, success, error, ...restConf } = conf

    const isCallBack = checkedExecuteType(success, error) === EXEC_TYPE.CALLBACK

    if (beforeRequestHook && isFunction(beforeRequestHook)) {
      restConf = await beforeRequestHook(restConf, opt);
    }

    restConf.requestOptions = opt;
    let cacheName = getCacheNameByRoute(restConf, config.url)

    if (isCallBack && cache) {
      const data = getCache(cacheName)
      if (data) {
        data && success(data, { from_cache: true })
        trackLog(`response cache === ${restConf.url} cacheName: ${cacheName} duration: ${Date.now() - start}ms`, data)
      }
    }

    return new Promise((resolve, reject) => {
      restConf = this.supportFormData(restConf);
      trackLog(`request === ${restConf.url}`, restConf)
      this.axiosInstance
        .request(restConf)
        .then((res) => {
          try {
            let data = res
            if (transformRequestHook && isFunction(transformRequestHook)) {
              data = transformRequestHook(res, opt);
            }
            if (isCallBack) {
              success(data, { from_cache: false })
              addCache(cacheName, { data: data })
            }
            trackLog(`response === ${restConf.url} duration: ${Date.now() - start}ms`, data)
            resolve(data);
          } catch (err) {
            reject(err || new Error('request error!'));
          }
        })
        .catch((e) => {
          if (requestCatchHook && requestCatchHook) {
            reject(requestCatchHook(e, opt));
            return;
          }
          reject(e);
        });
    });
  }
}
