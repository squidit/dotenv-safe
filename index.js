'use strict'

const dotenv = require('dotenv')
const yaml = require('js-yaml')
const fs = require('fs')
const get = require('lodash/get')
const MissingEnvVarsError = require('./MissingEnvVarsError.js')

function difference (arrA, arrB) {
  return arrA.filter(a => arrB.indexOf(a[0]) < 0 && a[1] !== 'empty')
}

function compact (obj) {
  const result = {}
  Object.keys(obj).forEach(key => {
    if (obj[key]) {
      result[key] = obj[key]
    }
  })
  return result
}

module.exports = {
  config: function (options = {}) {
    const dotenvResult = dotenv.load(options)
    const example = options.example || options.sample || '.env.example'
    const allowEmptyValues = options.allowEmptyValues || false
    const processEnv = allowEmptyValues ? process.env : compact(process.env)
    const exampleVars = dotenv.parse(fs.readFileSync(example))
    const missingDotenv = difference(Object.entries(exampleVars), Object.keys(processEnv))

    if (missingDotenv.length > 0) {
      throw new MissingEnvVarsError(allowEmptyValues, options.path || '.env', example, missingDotenv, dotenvResult.error)
    }

    if (options.hasKub) {
      const kub = options.kub || './kub/kub_deployment.yml.template'
      const envKub = get(yaml.safeLoad(fs.readFileSync(kub, 'utf8')), 'spec.template.spec.containers[0].env')
      const missingKub = difference(Object.entries(exampleVars), envKub.map(e => e.name))
      if (missingKub.length > 0) {
        throw new MissingEnvVarsError(allowEmptyValues, kub, example, missingKub, dotenvResult.error)
      }
    }

    // Key/value pairs defined in example file and resolved from environment
    const required = Object.keys(exampleVars).reduce((acc, key) => {
      acc[key] = process.env[key]
      return acc
    }, {})
    const error = dotenvResult.error ? { error: dotenvResult.error } : {}
    const result = {
      parsed: dotenvResult.error ? {} : dotenvResult.parsed,
      required: required
    }
    return Object.assign(result, error)
  },
  parse: dotenv.parse,
  MissingEnvVarsError: MissingEnvVarsError
}

module.exports.load = module.exports.config
module.exports.MissingEnvVarsError = MissingEnvVarsError
