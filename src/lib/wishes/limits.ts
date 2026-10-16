/** 星愿标题长度上限。前后端共享同一约束，避免整批同步被一条超长记录拒绝。 */
export const WISH_TITLE_MAX = 200;

/** 标题是否满足同步到账户的约束（超长/空标题记录仅保留在本机）。 */
export function isWishTitleSyncable(title: string): boolean {
  return title.length > 0 && title.length <= WISH_TITLE_MAX;
}
