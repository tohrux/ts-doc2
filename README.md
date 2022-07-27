# ts-doc2

根据ts文件中的类和方法上下文进行ast分析并获取类名、类的注释、类中方法的注释、出参、入参的注释等元数据信息生成ts文件

灵感来以及部分方法来自https://github.com/hughfenghen/ts-rpc

### 使用方法

#### 1.安装ts-doc2

```shell
> npm i ts-doc2 -D
```

#### 2.建立一个的`json`配置文件,用于`ts-doc2`读取你的配置

##### tsConfigFilePath(必选)

tsconfig.json文件相对于`process.cwd()`的位置

例如:`"./tsconfig.json"`



##### scanDir(非必选)

需要扫描的文件夹范围;glob语法,如果不传的话默认会对`process.cwd()`下所有的ts文件进行扫描

例如:`["demo/controller/*.ts"]`,会扫描`process.cwd()`下的demo/controller下的所有ts文件



##### outFilePath(非必选)

meta文件输出的位置以及名字

例如:`"demo/meta.ts"`,会在`process.cwd()`下的demo文件夹生成一个名为meta.ts的元数据文件



#### 3.在需要生成的类和方法前加上注释`@tsDoc`

```ts
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
```

#### 4.在package.json新建一条script

```json
"scripts": {
   "genDoc": "ts-doc2 -c ./ts-doc2.json",//这里的ts-doc2.json 是上一步建立的json文件的名字
}
```

#### 5.运行刚刚建立的script命令

```shell
> npm run genDoc
```

#### 6.生成成功~

```ts
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
          "returnType": "\n{\n  //收藏列表\n  \"fav\": [\n    {\n      //收藏ID\n      \"id\": 0,\n      //类型\n      \"type\": 0,\n      //封面\n      \"cover\": \"\"\n    }\n  ],\n  //用户id\n  \"uid\": 0,\n  //用户名\n  \"uname\": \"\"\n}\n"
        }
      ]
    }
  ]
;
```



### 额外内容

一个用于渲染上述元数据的前端项目 
https://github.com/tohrux/ts-doc2-view
