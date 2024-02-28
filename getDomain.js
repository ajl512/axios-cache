import { $getUserInfo,$getAppInfo } from '@/mixins/bridgeMethod';
import { IS_IOS } from '@/config/deviceInfo';
import { getParams } from '@/libs/util-lite'
import { banner_baseURL } from '@/config'

import {
  SERVER_ADDRESS,
  CLIENT_SERVER
} from '@/config/consts'
// 替换逻辑
// 替换 baseURL 参数
export const replaceDomain = (params, domain) => {
  domain && (params[3] = domain);
  return params;
}

// 将客户端获取的 domain 转化成 web 需要的 domain
const transformClient2Web = (domain) => {
  if (!domain) return SERVER_ADDRESS.PROD;
  for(let key in CLIENT_SERVER) {
    const value = CLIENT_SERVER[key];
    const isMatch = value.some(item => (typeof item === 'string' && item === domain) || (toString.call(item) === '[object RegExp]' && item.test(domain)))
    // 匹配到对应的环境
    if (isMatch) {
      return SERVER_ADDRESS[key];
    }
  }
  return domain.replace(/\/$/, '');
};

/**
 * 获取客户端环境下的服务器接口地址
 */
let clientDomain = '';
export const getBaseUrl = () => {
  return new Promise((resolve) => {
    const search = getParams(location.href)
    if (clientDomain || search.dev || !($getAppInfo && $getUserInfo)) {
      clientDomain = banner_baseURL
      resolve(clientDomain)
    } else {
      // android 在 getUserInfo 接口中，iOS 在 getAppInfo 中
      (IS_IOS ? $getAppInfo() : $getUserInfo()).then((data) => {
        console.log(data)
        const { domain } = data
        clientDomain = transformClient2Web(domain)
        // 老的预发布地址换成新的预发布
        resolve(clientDomain);
      })
    }
  });
}
