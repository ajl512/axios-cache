const hmacsha1 = require('hmacsha1');
import qs from 'qs'

// 签名 key
const KEY = 's92h743eferyfg53f0a3r'

const sort = (a, b) => {
  const aLen = a.length;
  const bLen = b.length;
  let diff = 0;
  let index = 0;
  for (; index < Math.min(aLen, bLen); index++) {
    diff = a.charCodeAt(index) - b.charCodeAt(index);
    if (diff) return diff;
  }

  return (a.charCodeAt(index) || -1) - (a.charCodeAt(index) || -1);
}
/**
 * 签名规则：https://nc6byfqd9e.feishu.cn/wiki/MbrBwCx4FiVZuokV9uKcX7SCn3d
 */
export const sign = ({
  params,
  url,
  method
}) => {
  params = decodeURIComponent(qs.stringify(params)).split('&').reduce((ret, item) => {
    const [key, value] = item.split('=');
    ret[key] = value;
    return ret;
  }, {});
  const sortedKeys = Object.keys(params).sort(sort);
  const data = sortedKeys.reduce((total, key) => {
    return total + `&${key}=${params[key]}`;
  }, `${method.toUpperCase()}&${url.replace(/^\//, '')}`);

  return hmacsha1(KEY, data);
}
