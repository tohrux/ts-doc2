export function booleanHandler(bool: boolean): '是' | '否' {
  return bool ? '是' : '否'
}

export function paramsCommentsHandler(
  str: string | undefined
): string | undefined {
  if (str && str[0] === '/' && str[1] === '/') return str.slice(2).trim()
  else return str
}

export function revertEscapeCharacter(
  str: string | undefined
): string | undefined {
  return str?.trim().replaceAll('\n', '<br>').replaceAll(' ', '&nbsp;')
}

export function paramsTypeHandler(str: string | undefined) {
  return str?.replaceAll('"', '')
}
