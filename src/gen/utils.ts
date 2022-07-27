import * as TJS from 'typescript-json-schema'
import * as prettier from 'prettier'
import {
  Project,
  ModuleDeclaration,
  TypeAliasDeclaration,
  Node,
  TypeLiteralNode,
  ts,
} from 'ts-morph'
import { addNode, ITCDeclaration } from './collect'

export function types2JsonSchema(
  code: string,
  typeName: string
): TJS.Definition | null {
  const TEMP_FILE_NAME = 'temp.ts'
  const prj = new Project()
  prj.createSourceFile(TEMP_FILE_NAME, code)

  const generator = TJS.buildGenerator(
    prj.getProgram().compilerObject as ts.Program,
    {
      ignoreErrors: true,
      ref: false,
    },
    [TEMP_FILE_NAME]
  )

  return generator?.getSchemaForSymbol(typeName) ?? null
}

/**
 * 将单行注释转为多行注释,让TJS可以进行注释提取
 */
export function commentHandler(c: string): string {
  //判断是否是单行注释
  function isSingleComment(c: string): boolean {
    if (c[0] === '/' && c[1] === '/') {
      return true
    }
    return false
  }

  //将单行注释转为多行注释
  function singleComment2multyComment(c: string) {
    let _c = c.slice(2)
    return `/**\n* ${_c}\n */\n`
  }

  if (!c) return ''
  if (isSingleComment(c)) {
    return singleComment2multyComment(c)
  } else {
    return c + '\n'
  }
}
function multyLine2MultyComments(str: string) {
  return `/**\n ${str
    .split('\n')
    .map((v) => `* ${v}\n `)
    .join('')}*/\n`
}

function isTypeLiteral(t: TypeAliasDeclaration) {
  const typeNode = t.getTypeNodeOrThrow()
  if (Node.isTypeLiteral(typeNode)) {
    return true
  }
  return false
}

/**
 * 将类型定义写到指定的namespace中
 */
export function genNode(
  namespace: ModuleDeclaration,
  name: string,
  typeDeclaration: ITCDeclaration
) {
  //将typeDeclaration转成InterfaceDeclaration
  if (
    (Node.isTypeAliasDeclaration(typeDeclaration) &&
      isTypeLiteral(typeDeclaration)) ||
    Node.isInterfaceDeclaration(typeDeclaration)
  ) {
    let targetDeclaration: ITCDeclaration | TypeLiteralNode
    if (!Node.isInterfaceDeclaration(typeDeclaration)) {
      targetDeclaration =
        typeDeclaration.getTypeNodeOrThrow() as TypeLiteralNode
    } else {
      targetDeclaration = typeDeclaration
    }
    const typeParameters = typeDeclaration.getTypeParameters().map((v) => {
      return {
        name: v.getText(),
      }
    })

    const properties = targetDeclaration.getProperties().map((v) => {
      let typeText = v.getTypeNode()?.getText().trim()
      //将所有单行注释转为多行注释,因为tsj只能识别多行注释
      let formatedTypeText = typeText?.replace(
        /\/\/((.)*)\n/g,
        `\n/**\n * $1\n*/\n`
      )
      let type = formatedTypeText
      let leadingTrivia = v.getLeadingCommentRanges()?.[0]?.getText()

      return {
        name: v.getName(),
        type,
        leadingTrivia: commentHandler(leadingTrivia),
      }
    })

    let inter = namespace.addInterface({
      name,
      properties,
      typeParameters,
    })

    inter.setIsExported(true)
  } else {
    addNode(namespace, typeDeclaration)
  }
}



// prettier 相关,用于格式化最后输出的meta.ts
const defaultPrettierOptions = {
  parser: 'json',
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 120,
  tabWidth: 2,
  proseWrap: 'always',
  endOfLine: 'lf',
  bracketSpacing: false,
  arrowFunctionParentheses: 'avoid',
}

type prettierFileType = (content: string) => string
export const prettierFile: prettierFileType = (content: string) => {
  let result = content
  try {
    result = prettier.format(content, {
      ...defaultPrettierOptions,
    } as Partial<prettier.RequiredOptions>)
  } catch (error) {
    console.log(error)
  }
  return result
}

//去除@tsDoc
export function deletejsDocByName(str: string, docName: string): string {
  if (!str) return ''
  return str.replace(`@${docName}\n`, '')
}
