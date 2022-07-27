interface IFavItems {
  //收藏ID
  id: number
  //类型 *可以是单行注释
  type: number
  /**
   * 封面 *可以是多行注释
   */
  cover: string
}

/**
 * @tsDoc
 * 用户相关controller
 */
class UserController {
  /**
   * @tsDoc
   * 获取用户信息
   */
  getUserInfo(
    //用户id
    uid: number,
    //性别
    gender: boolean,
    //是否是会员
    isVip?: boolean
  ): IFavItems {
    return {} as any
  }
}
