const Utils = (() => {

  const arrify = (item) => Array.isArray(item) ? item : (isNU(item) ? [] : [item])

  const isUndefined = (item) => typeof item === typeof undefined
  const isNull = (item) => item === null
  const isNU = (item) => isNull(item) || isUndefined(item)

  return {
    isUndefined,
    isNull,
    isNU,
    arrify
  }

})()
