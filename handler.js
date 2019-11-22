'use strict'

const config = require('./config.json')
const TransformHandler = require('./src/transform_handler.js')

module.exports.resizeto = async (event, context) => {
  try {
    const transformHandler = new TransformHandler(config, event, context)
    await transformHandler.process(event, context)

    return {
      statusCode: '301',
      headers: { location: transformHandler.location },
      body: ''
    }
  } catch (err) {
    console.error(err)
    return {
      statusCode: '500',
      body: err.message
    }
  }
}
