/**
 * 以下方法源自 https://github.com/hughfenghen/ts-rpc
 */

import {
  ClassDeclaration,
  EnumDeclaration,
  ImportTypeNode,
  InterfaceDeclaration,
  ModuleDeclaration,
  Project,
  TypeAliasDeclaration,
  TypeReferenceNode,
  Node,
  ImportSpecifier,
  SyntaxKind,
  QualifiedName,
  Identifier,
} from 'ts-morph'

// 收集依赖树只考虑这四种场景
export type ITCDeclaration =
  | InterfaceDeclaration
  | TypeAliasDeclaration
  | ClassDeclaration
  | EnumDeclaration

export function collectTypeDeps(
  nodes: Array<undefined | Node>,
  prj: Project
): ITCDeclaration[] {
  const depsMap = new Set<ITCDeclaration>()
  nodes
    .filter((v) => v)
    .forEach((node) => {
      if (node instanceof TypeReferenceNode) {
        findIdentifier(node.getChildrenOfKind(SyntaxKind.Identifier))
      } else if (isITCDeclaration(node)) {
        addDep(node)
        // addDep中会调用 queryInTree
        return
      }
      // 深度优先遍历树，找到引用Type类型，然后找到 Declaration
      queryInTree(node as Node)
    })

  return Array.from(depsMap.values())

  function addDep(n: ITCDeclaration): void {
    // 避免重复，标准依赖无须添加
    if (depsMap.has(n) || isStandardType(n)) return
    const nodeName = n.getNameNode()?.getText()
    if (nodeName == null) throw new Error('dependency must be named')
    depsMap.add(n)
    // 被添加的依赖项，递归检查其依赖项
    queryInTree(n)
  }

  function queryInTree(n: Node): void {
    n.forEachChild((c) => {
      if (c instanceof TypeReferenceNode || c instanceof QualifiedName) {
        findIdentifier(c.getChildrenOfKind(SyntaxKind.Identifier))
      } else if (c instanceof ImportTypeNode) {
        findIT4Import(c)
      } else if (c instanceof Identifier) {
        findIdentifier([c])
      }

      queryInTree(c)
    })
  }

  // 收集依赖树只考虑这4种场景
  function isITCDeclaration(n: Node | undefined): n is ITCDeclaration {
    return (
      n instanceof InterfaceDeclaration ||
      n instanceof TypeAliasDeclaration ||
      n instanceof ClassDeclaration ||
      n instanceof EnumDeclaration
    )
  }

  function findIdentifier(idfs: Identifier[]): void {
    idfs
      .map((i) => i.getSymbol())
      .map((s) => s?.getDeclarations())
      .flat()
      .forEach((d) => {
        if (d == null) return
        if (isITCDeclaration(d)) addDep(d)
        else if (d instanceof ImportSpecifier) findIT4ImportSpecifier(d)
      })
  }

  // 解析动态 import 函数
  function findIT4Import(n: ImportTypeNode): void {
    const fPath = n.getArgument().getText().slice(1, -1)
    const sf = prj.getSourceFile((sf) => sf.getFilePath().includes(fPath))
    if (sf == null) throw new Error(`Could not find file ${fPath}`)

    const impName = n.getQualifier()?.getText() ?? ''
    const declaration =
      sf.getInterface(impName) ??
      sf.getTypeAlias(impName) ??
      sf.getClass(impName) ??
      sf.getEnum(impName)

    if (declaration == null)
      throw Error(
        `Could not find interface, class, enum or type (${impName}) in ${fPath}`
      )

    addDep(declaration)
  }

  // 解析import语法，从其他文件中查找依赖项
  function findIT4ImportSpecifier(is: ImportSpecifier): void {
    const impSf = is.getImportDeclaration().getModuleSpecifierSourceFile()
    if (impSf == null)
      throw new Error(`Could not find import var ${is.getText()}`)

    const impName = is.getText()
    const declaration =
      impSf.getInterface(impName) ??
      impSf.getTypeAlias(impName) ??
      impSf.getClass(impName) ??
      impSf.getEnum(impName)

    if (declaration == null)
      throw Error(
        `Could not find interface, class, enum or type (${impName}) in ${impSf.getFilePath()}`
      )

    addDep(declaration)
  }
}

export function isStandardType(n: Node): boolean {
  return /typescript\/lib|@types\/node/.test(n.getSourceFile().getFilePath())
}

export function addNode(
  container: ModuleDeclaration,
  n: Node
): ITCDeclaration | null {
  if (n instanceof InterfaceDeclaration) {
    return container.addInterface(n.getStructure())
  } else if (n instanceof TypeAliasDeclaration) {
    return container.addTypeAlias(n.getStructure())
  } else if (n instanceof EnumDeclaration) {
    return container.addEnum(n.getStructure())
  } else if (n instanceof ClassDeclaration) {
    return container.addClass(n.getStructure())
  }
  return null
}
