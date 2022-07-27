import {
  Project,
  ClassDeclaration,
  ObjectLiteralExpression,
  IndentationText,
  VariableDeclarationKind,
  JSDocTag,
} from 'ts-morph'
import path from 'path'
import {
  types2JsonSchema,
  genNode,
  prettierFile,
  deletejsDocByName,
} from './gen/utils'
import { collectTypeDeps } from './gen/collect'
import {
  jsonSchema2json,
  ISchema,
  extractSchema,
  paramsHandler,
} from './gen/jsonSchema2json'
import { Command } from 'commander'

const args = process.argv
const program = new Command()
program
  .requiredOption('-c, --configPath <string>', 'ts-doc2的配置文件')
  .parse(args)

const JSDOC_TAG = 'tsDoc'
const cwd = process.cwd()
export async function genJson() {
  //配置文件路径
  const optPath = program.opts().configPath

  //读取配置文件
  const {
    scanDir = ['**/*.ts'],
    outFilePath = 'doc-meta.ts',
    tsConfigFilePath,
  } = await import(path.resolve(cwd, optPath))
  //若未配置tsConfigFilePath则抛出异常
  if (!tsConfigFilePath) throw Error('not specified tsConfigFilePath')

  //初始化project
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    manipulationSettings: { indentationText: IndentationText.TwoSpaces },
    tsConfigFilePath: path.resolve(cwd, tsConfigFilePath),
  })
  //根据scanDir添加sourceFiles
  const sourceFiless = project.addSourceFilesAtPaths(scanDir)

  // 收集带有tsDoc的class
  const classRefers = sourceFiless
    .flatMap((v) => v.getClasses())
    .filter((v) => {
      return (
        v.getJsDocs()[0]?.getFullText().includes(`@${JSDOC_TAG}`) &&
        v.getMethods().some((v) => {
          return v.getJsDocs()[0]?.getFullText().includes(`@${JSDOC_TAG}`)
        })
      )
    }) as ClassDeclaration[]

  //如果找不到带有tsDoc装饰的方法则抛出异常
  if (!classRefers.length) {
    throw Error('tsDoc method not found')
  }

  let collector = project.createSourceFile(
    'type-collections.ts',
    //取消最外层Promise的包裹,避免解析失败
    'type $unwrapPromise<T> = T extends Promise<infer U> ? U : T',
    {
      overwrite: true,
    }
  )

  classRefers.forEach((v) => {
    const className = v.getName() as string
    if (className) {
      const classNS = collector.addModule({ name: className })
      const methods = v.getMethods()

      const methodsReturnTypesNodes = methods.map((v) => {
        return v.getReturnTypeNode()
      })

      const paramsTypesNodes = methods.map((v) => {
        return v.getParameters().map((v) => v.getTypeNode())
      })

      methods.forEach((v) => {
        classNS.addInterface({
          name: `$${v.getName()}`,
          properties: [
            {
              name: 'params',
              type: `[${v
                .getParameters()
                .map((v) => v.getTypeNode()?.getText())
                .join()}]`,
            },
            {
              name: 'return',
              type: `$unwrapPromise<${
                v.getReturnTypeNode()?.getText() || '{}'
              }>`,
            },
          ],
          isExported: true,
        })

        classNS.addInterface({
          name: '$methods',
          properties: [
            {
              name: v.getName(),
              type: `$${v.getName()}`,
            },
          ],
          isExported: true,
        })
      })

      const typeDeclaraions = collectTypeDeps(
        [...methodsReturnTypesNodes, ...paramsTypesNodes.flat(2)],
        project
      )
      //收集类型
      typeDeclaraions.forEach((v) => {
        const name = v.getName()
        if (name) genNode(classNS, name, v as ClassDeclaration)
      })
    }
  })

  // collector.saveSync()

  const meta = classRefers.map((v) => {
    const className = v.getName()
    const originClassSchema = jsonSchema2json(
      types2JsonSchema(
        collector.getFullText(),
        `${className}.$methods`
      ) as ISchema,
      true
    )
    const defaltClassSchema = jsonSchema2json(
      types2JsonSchema(
        collector.getFullText(),
        `${className}.$methods`
      ) as ISchema
    )

    return {
      className,
      classComments:
        v
          ?.getJsDocs()
          ?.map((v) => deletejsDocByName(v.getInnerText(), JSDOC_TAG)) || [],
      methods: v.getMethods().map((v) => {
        const methodName = v.getName()

        const defaultMethodsSchema = extractSchema(
          defaltClassSchema,
          methodName
        ) as ObjectLiteralExpression

        const originMethodsSchema = extractSchema(
          originClassSchema,
          methodName
        ) as ObjectLiteralExpression

        const paramsTypes = paramsHandler(
          extractSchema(originMethodsSchema, 'params')?.getText()
        )

        return {
          name: methodName,
          methodComments:
            v
              ?.getJsDocs()
              ?.map((v) => deletejsDocByName(v.getInnerText(), JSDOC_TAG)) ||
            [],
          decorators: v.getDecorators().map((v) => {
            return { name: v.getName() }
          }),
          params: v.getParameters().map((v, i) => {
            return {
              name: v.getName(),
              comments: v.getLeadingCommentRanges()?.map((v) => v.getText()),
              required:
                v.getQuestionTokenNode()?.getFullText() === '?' ? false : true,
              type: paramsTypes[i],
            }
          }),
          returnType:
            '\n' +
            prettierFile(
              extractSchema(defaultMethodsSchema, 'return')?.getText() || '{}'
            ),
        }
      }),
    }
  })

  const prj = new Project({
    manipulationSettings: { indentationText: IndentationText.TwoSpaces },
  })
  const sf = prj.createSourceFile(outFilePath, '/* eslint-disable */', {
    overwrite: true,
  })
  const statement = sf.addVariableStatement({
    declarations: [
      {
        //key
        name: 'meta',
        //value
        initializer: prettierFile(JSON.stringify(meta)),
      },
    ],
    //设置定义修饰符 为 const
    declarationKind: VariableDeclarationKind.Const,
  })
  statement.setIsExported(true)
  sf.saveSync()
}

async function init() {
  genJson()
}

init().catch((e) => {
  console.log(e)
})
