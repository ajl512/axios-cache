import { cloneDeep } from 'lodash-es'
import { RequestEnum } from './httpEnum'
import { isJSONString } from '@/utils/util'
import { widthPageSearchApiName } from './helper'

const API_CACHE_NAME_EXP = '_API_CACHE_NAME_EXP'
const DEF_EXP_TIME = 1296000000 // 毫秒 默认15天

let apiNameExpMap = new Map();
let timer = null

/**
 * 两套存储
 * 所有需要缓存的api的key和过期时间的存储
 * _API_CACHE_NAME_EXP: [["name1",1699521027292],["name2",1699521027252]]
 * 散存的
 * name1： "{user_id: xxx; …… }"
 */

// 是否过期
function isExpired(expSec) {
  return expSec < Date.now()
}

function removeCache({ clearAll, clearExp } ) {
  const cloneApiNameExpMap = cloneDeep(apiNameExpMap)
  for (const [key, value] of cloneApiNameExpMap) {
    if (clearAll || (clearExp && isExpired(value))) {
      // 删除过期的apiNameExpMap
      apiNameExpMap.delete(key);
      // 删除过期的result缓存
      localStorage.removeItem(key);
    }
  }
}

function localStorageSetItem(name, data) {
  try {
    localStorage.setItem(name, data)
  } catch(error) {
    // 捕获存储配额超限错误
    if (error.name === 'QuotaExceededError' || error.name === "NS_ERROR_DOM_QUOTA_REACHED") {
      removeCache({ clearAll: true })
    } else {
      // 处理其他类型的错误
      console.error('存储操作发生错误：', error);
    }
  }
}

// 获取api接口缓存的数据
function getResultByCacheName(cacheName) {
  let result = null
  try {
    const local = localStorage.getItem(cacheName)
    if (local) {
      result = cloneDeep(JSON.parse(local))
    }
  } catch(e) {
    localStorage.removeItem(cacheName)
  }
  return result
}

// 设置api接口数据缓存
function setResultCache(name, data) {
  localStorageSetItem(name, JSON.stringify(data))
}

// 获取NameExp的缓存
function getCacheNameExpMap(name) {
  let resultMap = new Map()
  try {
    const local = localStorage.getItem(name)
    if (local && isJSONString(local)) {
      resultMap = new Map(JSON.parse(local))
    }
  } catch(error) {
    localStorage.removeItem(name)
  }
  return resultMap
}

// 设置NameExp的缓存
function setCacheNameExpMap(name, dataMap) {
  localStorageSetItem(name, JSON.stringify(Array.from(dataMap.entries())))
}

function setApiNameExpMapKV(name, exp) {
  apiNameExpMap.set(name, exp)
}

function getApiNameExpMapExp(name) {
  return apiNameExpMap.get(name)
}

function lazySetCache(storageCall) {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => {
      storageCall && storageCall()
    }, { timeout: 3000 })
  } else {
    clearTimeout(timer)
    timer = setTimeout(() => {
      storageCall && storageCall()
    },0)
  }
}

export function getCacheNameByRoute(restConf, api) {
  const { method, params, data } = restConf
  // pageName+api+search
  let cacheName = widthPageSearchApiName(location?.href, api);
  if (!cacheName.includes('uid=')) {
    if (method === RequestEnum.GET) {
      cacheName += params?.uid ? `&uid=${params.uid}` : ''
    } else {
      cacheName += data?.uid ? `&uid=${data.uid}` : ''
    }
  }
  return cacheName
}

export function getCache(cacheName) {
  // 首次进入删除旧的缓存
  if (apiNameExpMap.size === 0) {
    apiNameExpMap = getCacheNameExpMap(API_CACHE_NAME_EXP)
    // 删除不再使用的缓存
    localStorage.removeItem('_API_RESPONSE_CACHE_NAME')
  }
  if (!apiNameExpMap.has(cacheName) || isExpired(getApiNameExpMapExp(cacheName))) {
    // 这里不处理过期的删除操作
    return null
  }
  return getResultByCacheName(cacheName)
}

export function addCache(cacheName, { data }) {
  if (!cacheName) return
  // 过期时间设置为当前时间延后15天
  setApiNameExpMapKV(cacheName, Date.now() + DEF_EXP_TIME)
  lazySetCache(() => {
    // 删除过期的缓存
    removeCache({ clearExp: true })
    // 缓存api的key value值
    setResultCache(cacheName, data)
    // 缓存api的key-exp值
    setCacheNameExpMap(API_CACHE_NAME_EXP, apiNameExpMap)
  })
}
