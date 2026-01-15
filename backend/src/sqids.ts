import Sqids from 'sqids'

// 自定义字典：去掉元音字母(a,e,i,o,u,A,E,I,O,U)和易混淆字符(0,O,1,I,l)
// 防止生成脏话和提高可读性
const CUSTOM_ALPHABET = 'bcdfghjkmnpqrstvwxyzBCDFGHJKMNPQRSTVWXYZ23456789'

// 创建 Sqids 实例，设置最小长度为 4
const sqids = new Sqids({
  alphabet: CUSTOM_ALPHABET,
  minLength: 4
})

/**
 * 将数字 ID 编码为 Sqid
 * @param id 数字 ID
 * @returns 4位字符的 Sqid
 */
export function encodeReviewId(id: number): string {
  return sqids.encode([id])
}

/**
 * 将 Sqid 解码为数字 ID
 * @param sqid Sqid 字符串
 * @returns 数字 ID，如果解码失败返回 null
 */
export function decodeReviewId(sqid: string): number | null {
  try {
    const decoded = sqids.decode(sqid)
    return decoded.length > 0 ? decoded[0] : null
  } catch {
    return null
  }
}
