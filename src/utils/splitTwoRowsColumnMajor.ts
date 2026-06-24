/** 按列优先拆成两行：0,2,4… 在上行；1,3,5… 在下行 */
export function splitTwoRowsColumnMajor<T>(items: T[]): { top: T[]; bottom: T[] } {
  const top: T[] = []
  const bottom: T[] = []
  items.forEach((item, index) => {
    if (index % 2 === 0) top.push(item)
    else bottom.push(item)
  })
  return { top, bottom }
}
