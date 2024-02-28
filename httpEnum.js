/**
 * @description:  contentTyp
 */
export const ContentTypeEnum = {
  // json
  JSON: 'application/json;charset=UTF-8',
  // form-data qs
  FORM_URLENCODED: 'application/x-www-form-urlencoded;charset=UTF-8',
  // form-data  upload
  FORM_DATA: 'multipart/form-data;charset=UTF-8',
  // 'application/x-www-form-urlencoded'
}

export const RequestEnum = {
  GET: 'GET',
  POST: 'POST',
}

export const ResultEnum  = {
  SUCCESS: 200,
  ERROR: 500,
  TIMEOUT: 401,
  TYPE: 'success',
}
