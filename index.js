// axios配置  可自行根据项目进行更改，只需更改该文件即可，其他文件可以不动
// The axios configuration can be changed according to the project, just change the file, other files can be left unchanged
import { Toast } from '@/comps'
import { isString } from '@/utils/is';

import { VAxios } from './Axios';
import { checkStatus } from './checkStatus';
import { joinTimestamp, formatRequestDate } from './helper';
import { deepMerge, setObjToUrlParams, platform  } from './utils'
import { ResultEnum, RequestEnum, ContentTypeEnum } from './httpEnum'
import { sign } from './sign'
import { getBaseUrl } from './getDomain'

let domainUrl = null

function setCommonParams(params, { method, url}) {
  params = {
    ...params,
    platform,
    api_source: 'h5',
  }

  params.snake_sign = sign({
    params,
    url,
    method,
  })
  return params
}

/**
 * @description: 数据处理，方便区分多种处理方式
 */
const transform = {
  /**
   * @description: 处理请求数据。如果数据不是预期格式，可直接抛出错误
   */
  transformRequestHook: (res, options) => {
    const { isTransformResponse, isReturnNativeResponse } = options;
    // 是否返回原生响应头 比如：需要获取响应头时使用该属性
    if (isReturnNativeResponse) {
      return res;
    }
    // 不进行任何处理，直接返回
    // 用于页面代码可能需要直接获取code，data，message这些信息时开启
    if (!isTransformResponse) {
      return res.data;
    }
    // 错误的时候返回
    const { data } = res;
    if (!data) {
      // return '[HTTP] Request has no return value';
      throw new Error('请求出错，请稍后重试');
    }
    //  这里 code，result，message为 后台统一的字段，需要在 types.ts内修改为项目自己的接口返回格式
    const { code, message, data: serverData, time } = data;
    // 这里逻辑可以根据项目进行修改
    const hasSuccess = data && Reflect.has(data, 'code') && code === ResultEnum.SUCCESS;
    if (hasSuccess) {
      const ret = Array.isArray(serverData) ? data : {
        ...serverData,
        server_time: time
      };
      return ret;
      // return serverData;
    }

    // 在此处根据自己项目的实际情况对不同的code执行不同的操作
    // 如果不希望中断当前请求，请return数据，否则直接抛出异常即可
    let timeoutMsg = '';
    switch (code) {
      case ResultEnum.TIMEOUT:
        timeoutMsg = '登录超时，请重新登录';
        break;
      default:
        if (message) {
          timeoutMsg = message;
        }
    }

    Toast(timeoutMsg)
    return Promise.reject(data);
    // throw new Error(timeoutMsg || t('sys.api.apiRequestFailed'));
  },

  // 请求之前处理config
  beforeRequestHook: async (config, options) => {
    const { apiUrl, joinParamsToUrl, formatDate, joinTime = true } = options;
    const originUrl = config.url
    // 缓存名使用
    config.api = originUrl
    if (!config.baseURL && !apiUrl) {
      if (!domainUrl) {
        domainUrl = await getBaseUrl()
      }
      config.url = `${domainUrl}${config.url}`;
    }

    if (apiUrl && isString(apiUrl)) {
      config.url = `${apiUrl}${config.url}`;
    }
    const params = config.params || {};
    const data = config.data || false;
    formatDate && data && !isString(data) && formatRequestDate(data);
    const method = config.method?.toUpperCase()
    const isGET = method === RequestEnum.GET
    if (isGET) {
      if (!isString(params)) {
        config.params = setCommonParams(params, { method: config.method, url: originUrl})
        // 给 get 请求加上时间戳参数，避免从缓存中拿数据。
        Object.assign(config.params || {}, joinTimestamp(joinTime, false));
      } else {
        // 兼容restful风格
        config.url = config.url + params + `${joinTimestamp(joinTime, true)}`;
        config.params = undefined;
      }
    } else {
      if (!isString(params)) {
        formatDate && formatRequestDate(params);
        if (Reflect.has(config, 'data') && config.data && Object.keys(config.data).length > 0) {
          config.data = setCommonParams(data, { method: config.method, url: originUrl});
          delete config.params
        } else {
          // 非GET请求如果没有提供data，则将params视为data
          config.data = setCommonParams(params, { method: config.method, url: originUrl});
          delete config.params
        }
        if (joinParamsToUrl) {
          config.url = setObjToUrlParams(
            config.url,
            Object.assign({}, config.params, config.data)
          );
        }
      } else {
        // 兼容restful风格
        config.url = config.url + params;
        config.params = undefined;
      }
    }

    return config;
  },

  /**
   * @description: 请求拦截器处理
   */
  requestInterceptors: (config) => {
    return config;
  },

  /**
   * @description: 响应拦截器处理
   */
  responseInterceptors: (res) => {
    return res;
  },

  /**
   * @description: 响应错误处理
   */
  responseInterceptorsCatch: (error) => {
    const { response, code, message } = error || {};
    const msg = response?.data?.error?.message ?? '';
    const err = error?.toString?.() ?? '';
    let errMessage = '';
    try {
      if (code === 'ECONNABORTED' && message.indexOf('timeout') !== -1) {
        errMessage = '接口请求超时，请刷新页面重试';
      }
      if (err?.includes('Network Error')) {
        errMessage = '网络异常，请检查您的网络连接是否正常';
      }

      if (errMessage) {
        Toast(errMessage)
        return Promise.reject(error);
      }
    } catch (error) {
      throw new Error(error);
    }

    checkStatus(error?.response?.status, msg);
    return Promise.reject(error);
  },
};

export function createAxios(opt) {
  return new VAxios(
    deepMerge(
      {
        // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#authentication_schemes
        // authentication schemes，e.g: Bearer
        // authenticationScheme: 'Bearer',
        authenticationScheme: '',
        timeout: 14 * 1000,
        // 基础接口地址
        // baseURL: banner_baseURL,
        // 接口可能会有通用的地址部分，可以统一抽取出来
        // urlPrefix: urlPrefix,
        // 如果是form-data格式
        headers: { 'Content-Type': ContentTypeEnum.FORM_URLENCODED },
        // 数据处理方式
        transform,
        // 配置项，下面的选项都可以在独立的接口请求中覆盖
        requestOptions: {
          // 是否返回原生响应头 比如：需要获取响应头时使用该属性
          isReturnNativeResponse: false,
          // 需要对返回数据进行处理
          isTransformResponse: true,
          // post请求的时候添加参数到url
          joinParamsToUrl: false,
          // 格式化提交参数时间
          formatDate: true,
          // 消息提示类型
          errorMessageMode: 'message',
          // 接口地址
          // apiUrl: banner_baseURL, // 用于覆盖baseURL
          //  是否加入时间戳
          joinTime: true,
          // 忽略重复请求
          ignoreCancelToken: true,
          // 是否携带token
          withToken: true,
          // 是否缓存以及读取缓存
          cache: false,
        },
      },
      opt || {}
    )
  );
}

// 先要处理baseUrl
export const defHttp = createAxios();
