'use strict'

const stream = require('stream')
const AWS = require('aws-sdk')
const S3 = new AWS.S3({
  signatureVersion: 'v4'
})
const Parser = require('@resize.to/options-parser')
const Transformer = require('@resize.to/transformer')
const config = require('./config.json')
const token = config.token
const signatureRequired = config.signed

const uri = config.uri || `http://${config.destination}.s3-website.${config.region}.amazonaws.com`

function errorResponse (error) {
  return {
    statusCode: '500',
    body: error.message
  }
}

module.exports.resizeto = async (event, context) => {
  let optionsCollection, transformer, s3Upload
  const uriFragment = decodeURIComponent(event.queryStringParameters.key)
  const parser = new Parser(uriFragment, token, signatureRequired)

  try {
    optionsCollection = parser.parse()
  } catch (e) {
    console.debug('error while parsing the options')
    console.error(e)
    return errorResponse(e)
  }

  const location = [uri, uriFragment].join('/')
  const inputStream = S3.getObject({ Bucket: config.originals, Key: parser.path }).createReadStream()
  const outputStream = new stream.PassThrough()

  console.debug('uriFragment: ', uriFragment)
  console.debug('location: ', location)
  console.debug('parser.path', parser.path)
  console.debug('parser.optionsString', parser.optionsString)
  console.debug('optionsCollection', optionsCollection)

  try {
    transformer = new Transformer(optionsCollection, parser.path)
  } catch (e) {
    console.debug('error while setting up the transformer')
    console.error(e)
    return errorResponse(e)
  }

  try {
    console.debug('contentType', transformer.outputContentType)

    s3Upload = S3.upload({
      Body: outputStream,
      Bucket: config.destination,
      ContentType: transformer.outputContentType,
      Key: uriFragment
    }).promise().catch((e) => {
      console.debug('error while uploading')
      console.error(e)
      return errorResponse(e)
    })

    transformer.transform(inputStream, outputStream)

    const data = await s3Upload

    console.debug('s3 response data', data)
    console.debug({
      originals: config.originals,
      destination: config.destination,
      location: location
    })

    return {
      statusCode: '301',
      headers: { location: location },
      body: ''
    }

  } catch (e) {
    // error transforming/streaming
    console.debug('error while streaming')
    console.error(e)
    return errorResponse(e)
  }
}
