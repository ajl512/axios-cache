# 使用介绍

## 1. 基本使用

### 1. 自定义baseUrl/apiUrl 等其他参数

```js
import { createAxios } from '@/services/axios/index.js'
const defHttp = createAxios({
  baseURL: 'xxxx/xx/xx'
  requestOptions: {}
})

defHttp.get({
  url: '/api/share/get_list',
  params: {}
}).then(() => {})
```

这里面会根据路由是否携带dev做处理

* dev=2设置apiUrl为预发布域名
* dev=3设置apiUrl为130域名
* 不懈怠dev时，判断如果处于客户端，会从$getAppInfo/$getUserInfo 获取domain

```js
import { defHttp } from '@/services/axios/index.js'

defHttp.post({
  url: '/api/xx/xx',
  params: {}
}).then(() => {})
```

# 使用缓存

使用缓存必须使用callback函数，这里必须按照如下形式写入

```js
  function getData(readCache) {
    const { buff_activity_id, buff_activity_type, uid } = this.baseParams
    defHttp.get({
      url: '/share/xx/xx',
      params: this.baseParams,
      cache: boolean | option, // 默认是开启的
      success: (data, { from_cache: true | false}),
      error: () => {},
    })
  }
```

除了必传的`url params`; 这里还有必传字段`cacheOption`和`success`

* success: Function
  * 为成功后的回调函数，在有缓存时会先返回缓存字段，接着发送请求到远端服务器获取最新结果再次返回并执行
* cacheOption: Object<name, exp, readCache>
  * name: 缓存的字段名。为避免出现重复，建议格式中涵盖`${pageName}` `${uid}`; 如果是通过参数迭代的活动，请加上参数标志
  * exp: 过期时间，用于做缓存过期清理使用。 支持两种类型，
    ｜ 静态设置如 '2023-10-31 23:59:59'; 请自行根据活动下线时间配置，不清楚时可以设定一个月后；
    ｜ 动态设置如 'end_time'; 表示动态读取接口返回值`end_time`; 请服务器也用'YYYY-MM-DD HH:MM:SS'格式返回
  * readCache：是否先读缓存, 默认为true；一般在页面刚进入时设置该值为true; 如果是后续刷新，可设置为false;
