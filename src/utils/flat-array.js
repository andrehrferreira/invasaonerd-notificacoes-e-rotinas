export default (array) => {
  if (Array.isArray(array)) {
    return [].concat.apply([], array)
  }
  throw new Error('Param is not a Array')
}
