/* eslint-env jest */
const fs = require('fs')
const path = require('path')
const AWSMock = require('aws-sdk-mock')
const AWS = require('aws-sdk')
AWSMock.setSDKInstance(AWS)

jest.mock('./config.json', () => ({
  originals: 'originals-bucket-name',
  destination: 'processed-bucket-name',
  region: 'us-east-2',
  signed: false,
  token: null,
  uri: 'https://resize.to',
  verbose: false
}), { virtual: true })

const { resizeto } = require('./handler.js')

describe('handler', () => {
  const mockS3 = function () {
    const inputPath = path.resolve(__dirname, 'fixtures', '1.jpg')
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

  it('should return 301 when successful', async () => {
    const uriFragment = 'width:100/path/to/image.jpg'
    const event = {
      queryStringParameters: {
        key: encodeURIComponent(uriFragment)
      }
    }
    const context = {}

    const response = await resizeto(event, context)
    expect(response.statusCode).toStrictEqual('301')
    expect(response.headers.location).toStrictEqual('https://resize.to/width:100/path/to/image.jpg')
    expect(response.body).toStrictEqual('')
  })

  it('should return 500 when unsuccessful', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    const uriFragment = 'width:100,output:tiff/path/to/image.jpg'
    const event = {
      queryStringParameters: {
        key: encodeURIComponent(uriFragment)
      }
    }
    const context = {}

    const response = await resizeto(event, context)
    expect(response.statusCode).toStrictEqual('500')
    expect(response.body).toStrictEqual("'tiff' is an invalid value for option 'output'")
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
