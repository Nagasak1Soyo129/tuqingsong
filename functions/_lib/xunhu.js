// 虎皮椒(Xunhupay)签名工具
import { md5 } from './md5';

// 签名算法:非空参数(排除 hash)按 key 字典序排序 → k=v&k=v → 末尾直接拼 secret → MD5 小写
export function sign(params, secret) {
  const keys = Object.keys(params)
    .filter((k) => k !== 'hash' && params[k] !== '' && params[k] != null)
    .sort();
  const str = keys.map((k) => k + '=' + params[k]).join('&');
  return md5(str + secret);
}

export function nonceStr(len = 16) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}
