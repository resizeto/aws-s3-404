/* eslint-env jest */
const fs = require('fs')
const path = require('path')
const stream = require('stream')
const crypto = require('crypto')
const AWSMock = require('aws-sdk-mock')
const AWS = require('aws-sdk')
const { InvalidConfigError } = require('./errors.js')
const TransformHandler = require('./transform_handler.js')
AWSMock.setSDKInstance(AWS)

const configExample = {
  originals: 'originals-bucket-name',
  destination: 'processed-bucket-name',
  region: 'us-east-2',
  signed: true,
  token: 'asdf',
  uri: 'https://resize.to',
  verbose: false
}

function sign (token, options, path) {
  const hmac = crypto.createHmac('sha1', token)
  hmac.update(`${options}/${path}`)
  const signature = hmac.digest('hex')
  return `${options}-signature:${signature}/${path}`
}

describe('TransformHandler', () => {
  it('should allow verbose output via console.debug', () => {
    const spy = jest.spyOn(console, 'debug').mockImplementation()

    const config = Object.assign({}, configExample)
    config.verbose = true
    const event = {}
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    transformHandler.debug('test')

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy).toHaveBeenLastCalledWith('test')
    spy.mockRestore()
  })

  it('should throw an error if missing "originals" config key', () => {
    const config = Object.assign({}, configExample)
    delete config.originals
    const event = {}
    const context = {}
    expect(() => {
      new TransformHandler(config, event, context) // eslint-disable-line
    }).toThrow(InvalidConfigError)
  })

  it('should throw an error if missing "destination" config key', () => {
    const config = Object.assign({}, configExample)
    delete config.destination
    const event = {}
    const context = {}
    expect(() => {
      new TransformHandler(config, event, context) // eslint-disable-line
    }).toThrow(InvalidConfigError)
  })

  it('should throw an error if missing "region" config key', () => {
    const config = Object.assign({}, configExample)
    delete config.region
    const event = {}
    const context = {}
    expect(() => {
      new TransformHandler(config, event, context) // eslint-disable-line
    }).toThrow(InvalidConfigError)
  })

  it('should throw an error if missing "token" config key and "signed" is true', () => {
    const config = Object.assign({}, configExample)
    delete config.token
    const event = {}
    const context = {}
    expect(() => {
      new TransformHandler(config, event, context) // eslint-disable-line
    }).toThrow(InvalidConfigError)
  })

  it('should not throw an error for a valid config without "signed"', () => {
    const config = Object.assign({}, configExample)
    delete config.token
    config.signed = false
    const event = {}
    const context = {}
    expect(() => {
      new TransformHandler(config, event, context) // eslint-disable-line
    }).not.toThrow(InvalidConfigError)
  })

  it('should not throw an error for a valid config with "signed"', () => {
    const config = Object.assign({}, configExample)
    const event = {}
    const context = {}
    expect(() => {
      new TransformHandler(config, event, context) // eslint-disable-line
    }).not.toThrow(InvalidConfigError)
  })

  it('should have an accessor for uri that uses config.uri when set', () => {
    const config = Object.assign({}, configExample)
    const event = {}
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    expect(transformHandler.uri).toStrictEqual(config.uri)
  })

  it('should strip trailing slash from uri', () => {
    const config = Object.assign({}, configExample)
    const uri = config.uri
    config.uri = `${uri}/`
    const event = {}
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    expect(transformHandler.uri).toStrictEqual(uri)
  })

  it('should have an accessor for uri that defaults to s3 uri', () => {
    const config = Object.assign({}, configExample)
    delete config.uri
    const event = {}
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    expect(transformHandler.uri).toStrictEqual(`http://${config.destination}.s3-website.${config.region}.amazonaws.com`)
  })

  it('should have an accessor for signed', () => {
    const config = Object.assign({}, configExample)
    const event = {}
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    expect(transformHandler.signed).toStrictEqual(true)
  })

  it('should have an accessor for token', () => {
    const config = Object.assign({}, configExample)
    const event = {}
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    expect(transformHandler.token).toStrictEqual('asdf')
  })

  it('should have an accessor for region', () => {
    const config = Object.assign({}, configExample)
    const event = {}
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    expect(transformHandler.region).toStrictEqual('us-east-2')
  })

  it('should have an accessor for destination', () => {
    const config = Object.assign({}, configExample)
    const event = {}
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    expect(transformHandler.destination).toStrictEqual('processed-bucket-name')
  })

  it('should have an accessor for originals', () => {
    const config = Object.assign({}, configExample)
    const event = {}
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    expect(transformHandler.originals).toStrictEqual('originals-bucket-name')
  })

  it('should have an accessor for uriFragment', () => {
    const uriFragment = 'width:100/path/to/image.jpg'
    const config = Object.assign({}, configExample)
    const event = {
      queryStringParameters: {
        key: encodeURIComponent(uriFragment)
      }
    }
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    expect(transformHandler.uriFragment).toStrictEqual(uriFragment)
  })

  it('should have an accessor for location', () => {
    const uriFragment = 'width:100/path/to/image.jpg'
    const config = Object.assign({}, configExample)
    const event = {
      queryStringParameters: {
        key: encodeURIComponent(uriFragment)
      }
    }
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    expect(transformHandler.location).toStrictEqual([config.uri, uriFragment].join('/'))
  })

  it('has an optionsCollection property after calling setupParser', () => {
    const uriFragment = 'width:100/path/to/image.jpg'
    const config = Object.assign({}, configExample)
    const event = {
      queryStringParameters: {
        key: encodeURIComponent(uriFragment)
      }
    }
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    transformHandler.setupParser()
    expect(transformHandler.optionsCollection.length).toStrictEqual(1)
    expect(transformHandler.optionsCollection[0].width).toStrictEqual(100)
  })

  it('has an accessor for s3GetObjectOptions after calling setupParser', () => {
    const uriFragment = 'width:100/path/to/image.jpg'
    const config = Object.assign({}, configExample)
    const event = {
      queryStringParameters: {
        key: encodeURIComponent(uriFragment)
      }
    }
    const context = {}
    const transformHandler = new TransformHandler(config, event, context)
    transformHandler.setupParser()
    expect(transformHandler.s3GetObjectOptions).toStrictEqual({
      Bucket: config.originals,
      Key: 'path/to/image.jpg'
    })
  })

  describe('with S3 mock', () => {
    const mockS3 = function () {
      const inputPath = path.resolve(__dirname, '..', 'fixtures', '1.jpg')
      const inputStream = fs.createReadStream(inputPath)

      AWSMock.mock('S3', 'getObject', inputStream)
      AWSMock.mock('S3', 'upload', (params, callback) => {
        callback(null, {
          ETag: '"MockedETag"',
          Location: 'http://mocked.location',
          Key: 'mocked-key',
          Bucket: 'mocked-bucket'
        })
      })
    }

    beforeEach(() => mockS3())
    afterEach(() => AWSMock.restore())

    it('should have an accessor for s3UploadOptions', async () => {
      const uriFragment = 'width:100/path/to/image.jpg'
      const config = Object.assign({}, configExample)
      const event = {
        queryStringParameters: {
          key: encodeURIComponent(uriFragment)
        }
      }
      const context = {}
      const transformHandler = new TransformHandler(config, event, context)
      await transformHandler.process()
      expect('Body' in transformHandler.s3UploadOptions).toBe(true)
      expect(transformHandler.s3UploadOptions.Bucket).toStrictEqual(transformHandler.destination)
      expect(transformHandler.s3UploadOptions.ContentType).toStrictEqual(transformHandler.transformer.outputContentType)
      expect(transformHandler.s3UploadOptions.Key).toStrictEqual(transformHandler.uriFragment)
    })

    it('should have an inputStream and outputStream', async () => {
      const uriFragment = 'width:100/path/to/image.jpg'
      const config = Object.assign({}, configExample)
      const event = {
        queryStringParameters: {
          key: encodeURIComponent(uriFragment)
        }
      }
      const context = {}
      const transformHandler = new TransformHandler(config, event, context)
      await transformHandler.process()
      expect(transformHandler.inputStream instanceof stream.Stream).toBe(true)
      expect(transformHandler.outputStream instanceof stream.Stream).toBe(true)
    })

    it('should throw error for invalid options values', async () => {
      expect.assertions(1)

      const uriFragment = 'width:123,output:tiff/path/to/image.jpg'
      const config = Object.assign({}, configExample)
      const event = {
        queryStringParameters: {
          key: encodeURIComponent(uriFragment)
        }
      }
      const context = {}
      const transformHandler = new TransformHandler(config, event, context)

      try {
        await transformHandler.process()
      } catch (err) {
        expect(err.name).toBe('OptionValueInvalidError')
      }
    })

    it('should throw error for invalid option keys', async () => {
      expect.assertions(1)

      const uriFragment = 'width:100,unknown:unknown/path/to/image.jpg'
      const config = Object.assign({}, configExample)
      const event = {
        queryStringParameters: {
          key: encodeURIComponent(uriFragment)
        }
      }
      const context = {}
      const transformHandler = new TransformHandler(config, event, context)

      try {
        await transformHandler.process()
      } catch (err) {
        expect(err.name).toBe('OptionKeyUnknownError')
      }
    })

    it('should throw error for missing output type', async () => {
      expect.assertions(1)

      const uriFragment = 'width:100/path/to/image'
      const config = Object.assign({}, configExample)
      const event = {
        queryStringParameters: {
          key: encodeURIComponent(uriFragment)
        }
      }
      const context = {}
      const transformHandler = new TransformHandler(config, event, context)

      try {
        await transformHandler.process()
      } catch (err) {
        expect(err.name).toBe('MissingOutputFormatError')
      }
    })

    it('should throw error for invalid output type', async () => {
      expect.assertions(1)

      const uriFragment = 'width:100/path/to/image.tiff'
      const config = Object.assign({}, configExample)
      const event = {
        queryStringParameters: {
          key: encodeURIComponent(uriFragment)
        }
      }
      const context = {}
      const transformHandler = new TransformHandler(config, event, context)

      try {
        await transformHandler.process()
      } catch (err) {
        expect(err.name).toBe('InvalidOutputFormatError')
      }
    })

    it('should throw error for signature mismatch with invalid token', async () => {
      expect.assertions(1)

      const config = Object.assign({}, configExample)
      config.signed = true
      config.token = 'asdf'
      const uriFragment = sign('invalid', 'width:100', 'path/to/image.jpg')
      const event = {
        queryStringParameters: {
          key: encodeURIComponent(uriFragment)
        }
      }
      const context = {}
      const transformHandler = new TransformHandler(config, event, context)

      try {
        await transformHandler.process()
      } catch (err) {
        expect(err.name).toBe('SignatureMismatchError')
      }
    })

    it('should not throw error for signature mismatch with valid token', async () => {
      expect.assertions(0)

      const config = Object.assign({}, configExample)
      config.signed = true
      config.token = 'asdf'
      const uriFragment = sign(config.token, 'width:100', 'path/to/image.jpg')
      const event = {
        queryStringParameters: {
          key: encodeURIComponent(uriFragment)
        }
      }
      const context = {}
      const transformHandler = new TransformHandler(config, event, context)

      try {
        await transformHandler.process()
      } catch (err) {
        expect(false).toBe(true)
      }
    })
  })
})
