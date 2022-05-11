getFullPath = (directory) =>
  path = require 'path'
  p = path.resolve process.cwd(), directory
  (name) =>
    path.resolve p, name

module.exports = {
  getFullPath
}
