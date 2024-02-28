import { isObject, isString } from '@/utils/is';

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';


export function joinTimestamp(join, restful = false) {
  if (!join) {
    return restful ? '' : {};
  }
  const now = new Date().getTime();
  if (restful) {
    return `?_t=${now}`;
  }
  return { _t: now };
}

/**
 * @description: Format request parameter time
 */
export function formatRequestDate(params) {
  if (Object.prototype.toString.call(params) !== '[object Object]') {
    return;
  }

  for (const key in params) {
    if (params[key] && params[key]._isAMomentObject) {
      params[key] = params[key].format(DATE_TIME_FORMAT);
    }
    if (isString(key)) {
      const value = params[key];
      if (value) {
        try {
          params[key] = isString(value) ? value.trim() : value;
        } catch (error) {
          throw new Error(error);
        }
      }
    }
    if (isObject(params[key])) {
      formatRequestDate(params[key]);
    }
  }
}

export function trackLog(title, data) {
  console.log(title, JSON.stringify(data));
}

// 添加page api 无v的search
export function widthPageSearchApiName(url = '', api) {
  const queryString = url.split('?')[1] || '';
  // 匹配以&/空开头的，多个非&符合的字符 以&结尾或者字符结尾的
  const withoutVParam = queryString.replace(/(&|^)(v=[^&]*)(?=&|$)/g, '').replace(/^&/, '');
  const pageName = window.__RELEASE_INFO__ ? window.__RELEASE_INFO__.name: '';
  return `${pageName}/${api}/${withoutVParam}`;
}
