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
  const T_KEYS_TO_CAMEL_CASE = 'TKeysToCamelCase'
  const camelReg = new RegExp(`${T_KEYS_TO_CAMEL_CASE}<((.|\n|)*)>`)
  // console.log(name, typeDeclaration.getKindName)
  //将typeDeclaration转成InterfaceDeclaration
  if (
    (Node.isTypeAliasDeclaration(typeDeclaration) &&
      isTypeLiteral(typeDeclaration)) ||
    Node.isInterfaceDeclaration(typeDeclaration)
  ) {
    // console.log(name, 1)
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
      //对TKeysToCamelCase进行unwrap
      let typeText = v.getTypeNode()?.getText().trim()
      let formatedTypeText = typeText?.replace(
        /\/\/((.)*)\n/g,
        `\n/**\n * $1\n*/\n`
      )
      let type = formatedTypeText
      let leadingTrivia = v.getLeadingCommentRanges()?.[0]?.getText()

      if (camelReg.test(typeText || '')) {
        type = typeText?.replace(camelReg, '$1')
        let multyComments = v.getJsDocs()?.[0]?.getCommentText()
        //多行注释
        if (multyComments) {
          leadingTrivia = multyLine2MultyComments(
            multyComments + `\n@TJS-id ${T_KEYS_TO_CAMEL_CASE}`
          )
          //单行注释
        } else if (leadingTrivia) {
          let commentText = leadingTrivia.slice(2).trim()
          leadingTrivia = multyLine2MultyComments(
            commentText + `\n@TJS-id ${T_KEYS_TO_CAMEL_CASE}`
          )
        } else {
          leadingTrivia = multyLine2MultyComments('\n@TJS-id toCamelCase')
        }
      }

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
      leadingTrivia: `
      /**
       * interface
       */
      `,
    })

    inter.setIsExported(true)
  } else if (
    Node.isTypeAliasDeclaration(typeDeclaration) &&
    !isTypeLiteral(typeDeclaration) &&
    typeDeclaration.getName() !== T_KEYS_TO_CAMEL_CASE &&
    camelReg.test(typeDeclaration.getTypeNodeOrThrow().getText())
  ) {
    let typeText = typeDeclaration.getTypeNodeOrThrow().getText()
    const typeParameters = typeDeclaration.getTypeParameters().map((v) => {
      return {
        name: v.getText(),
      }
    })
    const leadingTrivia = multyLine2MultyComments('@TJS-id toCamelCase\nhello')
    console.log(typeDeclaration.getName())
    typeText = typeText.replace(camelReg, '$1')
    namespace.addTypeAlias({
      name: typeDeclaration.getName(),
      typeParameters,
      type: typeText,
      leadingTrivia,
    })
  } else {
    addNode(namespace, typeDeclaration)
  }
}

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
  overrides: [
    {
      files: '.prettierrc',
      options: {
        parser: 'json',
      },
    },
    {
      files: 'document.ejs',
      options: {
        parser: 'html',
      },
    },
  ],
}

// 格式化美化文件
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
