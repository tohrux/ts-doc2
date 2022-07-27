/* eslint-disable */
export const meta = [
    {
      "className": "UserController",
      "classComments": ["用户相关controller"],
      "methods": [
        {
          "name": "getUserInfo",
          "methodComments": ["获取用户信息"],
          "decorators": [],
          "params": [
            {"name": "uid", "comments": ["//用户id"], "required": true, "type": "\"number\""},
            {"name": "gender", "comments": ["//性别"], "required": true, "type": " \"boolean\""},
            {"name": "isVip", "comments": ["//是否是会员"], "required": false, "type": " \"boolean\""}
          ],
          "returnType": "\n{\n  //收藏ID\n  \"id\": 0,\n  //类型 *可以是单行注释\n  \"type\": 0,\n  //封面 *可以是多行注释\n  \"cover\": \"\"\n}\n"
        }
      ]
    }
  ]
;
