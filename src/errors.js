class InvalidConfigError extends Error {
  get name () {
    return 'InvalidConfigError'
  }
}

module.exports = {
  InvalidConfigError
}
