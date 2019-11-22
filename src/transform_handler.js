'use strict'

const stream = require('stream')
const AWS = require('aws-sdk')
const Parser = require('@resize.to/options-parser')
const Transformer = require('@resize.to/transformer')
const { InvalidConfigError } = require('./errors.js')

class TransformHandler {
  constructor (config, event, context) {
    this.config = config
    this.debug('config: ', config)
    this.event = event
    this.debug('event: ', event)
    this.context = context
    this.S3 = new AWS.S3({ signatureVersion: 'v4' })
  }

  async process () {
    // Setup the parser, streams, transformer, and S3 upload obj
    this.setupParser()
    this.setupStreams()
    this.setupTransformer()
    this.setupS3Upload()

    this.debug('uriFragment: ', this.uriFragment)
    this.debug('location: ', this.location)
    this.debug('parser.path: ', this.parser.path)
    this.debug('parser.optionsString: ', this.parser.optionsString)
    this.debug('optionsCollection: ', this.optionsCollection)

    // Start the transform
    this.transformer.transform(this.inputStream, this.outputStream)

    // Wait for the s3Upload to finish
    const data = await this.s3Upload
    this.debug('S3 response data: ', data)
  }

  setupParser () {
    this.parser = new Parser(this.uriFragment, this.token, this.signatureRequired)
    this.optionsCollection = this.parser.parse()
  }

  setupStreams () {
    this.inputStream = this.S3.getObject(this.s3GetObjectOptions).createReadStream()
    this.outputStream = new stream.PassThrough()
  }

  setupTransformer () {
    this.transformer = new Transformer(this.optionsCollection, this.parser.path)
  }

  setupS3Upload () {
    this.s3Upload = this.S3.upload(this.s3UploadOptions).promise()
  }

  debug (...args) {
    if (this.config.verbose === false) return
    console.debug(...args)
  }

  set config (config) {
    const requiredKeys = ['originals', 'destination', 'region']
    requiredKeys.forEach(key => {
      if (!config[key]) throw new InvalidConfigError(`Missing required key "${key}"`)
    })
    if (config.signed === true && !config.token) {
      throw new InvalidConfigError('"signed" is true but "token" is not set')
    }

    this._config = config
  }

  get config () {
    return this._config
  }

  get s3GetObjectOptions () {
    return {
      Bucket: this.originals,
      Key: this.parser.path
    }
  }

  get s3UploadOptions () {
    return {
      Body: this.outputStream,
      Bucket: this.destination,
      ContentType: this.transformer.outputContentType,
      Key: this.uriFragment
    }
  }

  get uriFragment () {
    return decodeURIComponent(this.event.queryStringParameters.key)
  }

  get location () {
    return [this.uri, this.uriFragment].join('/')
  }

  get originals () {
    return this.config.originals
  }

  get destination () {
    return this.config.destination
  }

  get region () {
    return this.config.region
  }

  get token () {
    return this.config.token
  }

  get signed () {
    return this.config.signed === true
  }

  get uri () {
    this._uri = this.config.uri || `http://${this.destination}.s3-website.${this.region}.amazonaws.com`
    return this._uri.replace(/\/$/, '')
  }
}

module.exports = TransformHandler
