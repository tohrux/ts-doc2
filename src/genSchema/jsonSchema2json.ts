import {
  Project,
  SyntaxKind,
  ObjectLiteralExpression,
  Node,
  IndentationText,
} from 'ts-morph'
function log(p: any) {
  console.dir(p, { depth: null })
}
export type ISchema = {
  type: 'array' | 'object' | 'string' | 'number' | 'boolean'
  properties?: { [key: string]: ISchema }
  items?: ISchema[] | ISchema
  required?: string[]
  description?: string
  id?: string
}

//注释处理器
function descriptionHandler(s: string | undefined) {
  if (s && s.trim()) {
    return `//${s.split('\n').join('\n//')}\n`
  }
  return ''
}

function getDefaulValue(type: string, pureString: boolean = false) {
  if (type === 'boolean') return false
  if (type === 'number') return 0
  if (type === 'string') return pureString ? '' : '""'
}

function getOriginValue(type: string) {
  if (type === 'boolean') return 'boolean'
  if (type === 'number') return 'number'
  if (type === 'string') return 'string'
}

// 下划线转换驼峰
export function snakeToCamel(name: string): string {
  if (typeof name !== 'string') {
    return name
  }
  return name.replace(/_(\w)/g, function (_, letter) {
    return letter.toUpperCase()
  })
}

export function jsonSchema2json(schema: ISchema, origin = false) {
  // log(schema)
  let prj = new Project({
    manipulationSettings: { indentationText: IndentationText.FourSpaces },
  })
  let sf = prj.createSourceFile('output.ts', '', { overwrite: true })
  let variableStatement = sf.addVariableStatement({
    declarations: [{ name: 'root', initializer: '{}' }],
  })

  let root = variableStatement.getFirstDescendantByKind(
    SyntaxKind.ObjectLiteralExpression
  )
  log(schema)
  gen(schema, root, origin)
  const value = root
    ?.getFirstChildByKind(SyntaxKind.PropertyAssignment)
    ?.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression)

  // sf.saveSync()

  return value
}

function gen(
  _schema: ISchema,
  node: ObjectLiteralExpression | undefined,
  origin: boolean,
  keyName = 'value',
  toCamel?: boolean
) {
  if (!node) return
  const format = origin ? getOriginValue : getDefaulValue
  const type = _schema.type
  if (_schema.id === 'toCamelCase') {
    toCamel = true
  }
  switch (type) {
    case 'boolean':
    case 'string':
    case 'number':
      node?.addPropertyAssignment({
        name: toCamel ? snakeToCamel(keyName) : keyName,
        initializer: `${format(_schema.type)}`,
        leadingTrivia: descriptionHandler(_schema.description),
      })
      break
    case 'object':
      node?.addPropertyAssignment({
        name: toCamel ? snakeToCamel(keyName) : keyName,
        initializer: `{}`,
        leadingTrivia: descriptionHandler(_schema.description),
      })
      let objectLiteral = node?.getFirstDescendant((node) => {
        return Boolean(
          node.getKindName() ===
            SyntaxKind[SyntaxKind.ObjectLiteralExpression] &&
            node
              .getFirstAncestorByKind(SyntaxKind.PropertyAssignment)
              ?.getName() === keyName
        )
      }) as ObjectLiteralExpression
      for (let key in _schema.properties) {
        gen(_schema.properties[key], objectLiteral, origin, key, toCamel)
      }
      break
    case 'array':
      //元组
      if (Array.isArray(_schema.items)) {
        node?.addPropertyAssignment({
          name: keyName,
          initializer: `${JSON.stringify([])}`,
          leadingTrivia: descriptionHandler(_schema.description),
        })

        let list = node
          ?.getFirstChildByKind(SyntaxKind.PropertyAssignment)
          ?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression)

        _schema.items.forEach((v) => {
          if (
            v.type === 'boolean' ||
            v.type === 'number' ||
            v.type === 'string'
          ) {
            list?.addElement(JSON.stringify(format(v.type, true)))
          } else if (v.type === 'object') {
            for (let key in v.properties) {
              gen(
                v.properties[key],
                list?.addElement('{}') as ObjectLiteralExpression,
                origin,
                key,
                toCamel
              )
            }
          }
        })
      } else if (
        //对象数组
        Object.prototype.toString.call(_schema.items) === '[object Object]' &&
        _schema.items?.type === 'object'
      ) {
        node?.addPropertyAssignment({
          name: keyName,
          initializer: `[{}]`,
          leadingTrivia: descriptionHandler(_schema.description),
        })
        let objectLiteral = node?.getFirstDescendant((node) => {
          return Boolean(
            node.getKindName() ===
              SyntaxKind[SyntaxKind.ObjectLiteralExpression] &&
              node
                .getFirstAncestorByKind(SyntaxKind.PropertyAssignment)
                ?.getName() === keyName
          )
        }) as ObjectLiteralExpression
        for (let key in _schema.items.properties) {
          gen(
            _schema.items.properties[key],
            objectLiteral,
            origin,
            key,
            toCamel
          )
        }
      } else if (
        //number[]
        _schema.items?.type === 'number' ||
        //string[]
        _schema.items?.type === 'string' ||
        //boolean[]
        _schema.items?.type === 'boolean'
      ) {
        let str = `[${format(_schema.items?.type)}]`
        node?.addPropertyAssignment({
          name: keyName,
          initializer: str,
          leadingTrivia: descriptionHandler(_schema.description),
        })
      }
  }
}

//提取ObjectLiteralExpression中某个key的值
export function extractSchema(
  o: ObjectLiteralExpression | undefined,
  name: string
) {
  const parent = o?.getFirstDescendant((node) => {
    return Node.isPropertyAssignment(node) && node.getName() === name
  })
  return (
    parent?.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression) ||
    parent?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression) ||
    parent?.getFirstChildByKind(SyntaxKind.NumericLiteral) ||
    parent?.getFirstChildByKind(SyntaxKind.StringLiteral) ||
    parent?.getFirstChildByKind(SyntaxKind.FalseKeyword) ||
    undefined
  )
}

export function paramsHandler(string: string | undefined) {
  if (!string) return []
  else return string.trim().slice(1, -1).split(',')
}
