getFullPath = (directory) =>
  path = require 'path'
  p = path.join process.cwd(), directory
  (name) =>
    path.join p, name

module.exports = {
  getFullPath
}
