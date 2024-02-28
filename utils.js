import { isObject, isFunction } from '@/utils/is'

export const platform = navigator.userAgent.match(/Android/i) ? 2 : 1;

// 执行函数的类型 回调类型 / promise类型
export const EXEC_TYPE = {
  PROMISE: 'promise',
  CALLBACK: 'callback',
};

export function deepMerge(src = {}, target = {}) {
  let key;
  for (key in target) {
    src[key] = isObject(src[key]) ? deepMerge(src[key], target[key]) : (src[key] = target[key]);
  }
  return src;
}

/**
 * Add the object as a parameter to the URL
 * @param baseUrl url
 * @param obj
 * @returns {string}
 * eg:
 *  let obj = {a: '3', b: '4'}
 *  setObjToUrlParams('www.baidu.com', obj)
 *  ==>www.baidu.com?a=3&b=4
 */
export function setObjToUrlParams(baseUrl, obj) {
  let parameters = '';
  for (const key in obj) {
    parameters += key + '=' + encodeURIComponent(obj[key]) + '&';
  }
  parameters = parameters.replace(/&$/, '');
  return /\?$/.test(baseUrl) ? baseUrl + parameters : baseUrl.replace(/\/?$/, '?') + parameters;
}

export function checkedExecuteType(success, error) {
  if (!success || !isFunction(success)) {
    return EXEC_TYPE.PROMISE;
  }

  if (success && !isFunction(success)) {
    throw new Error(`success must be function`);
  }

  if (error && !isFunction(error)) {
    throw new Error(`error must be function`);
  }

  return EXEC_TYPE.CALLBACK
}
