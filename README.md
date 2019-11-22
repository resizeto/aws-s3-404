# resize.to s3 404 strategy

This is a lambda using the serverless framework built in order to respond to a 404 redirect to an s3 bucket. The idea here is to have two s3 buckets: one for the originals and one for the transforms (also referred to as destination). The transforms bucket can have an expiration policy to keep from storing images that are no longer needed. You'll make requests to the transform bucket and on 404 it will redirect to this lambda and stream the image from the originals bucket, transform with sharp, stream to the transforms bucket, and redirect back to the original URI.

## Deploying

There is a `package` npm script that will use a docker image to install the sharp dependency and then revert it back after packaging. Then there is a `deploy` npm script to push that package out.

```bash
npm run package
npm run deploy
```

You can tail the logs via the serverless cli like so:

```bash
npx serverless logs -t -f resizeto404
```

## S3 Buckets

The originals bucket can be locked down but the destination bucket will need to be configured for [serving a website](https://docs.aws.amazon.com/AmazonS3/latest/user-guide/static-website-hosting.html). You'll need to add the following XML fragment to the Redirection Rules input making sure to set the correct value for `<HostName>` which is output after deploying and for `<ReplaceKeyPrefixWith>`.

```xml
<RoutingRules>
  <RoutingRule>
    <Condition>
      <KeyPrefixEquals/>
      <HttpErrorCodeReturnedEquals>404</HttpErrorCodeReturnedEquals>
    </Condition>
    <Redirect>
      <Protocol>https</Protocol>
      <HostName><example>.execute-api.<region>.amazonaws.com</HostName>
      <ReplaceKeyPrefixWith><stage>/resizeto404?key=</ReplaceKeyPrefixWith>
      <HttpRedirectCode>307</HttpRedirectCode>
    </Redirect>
  </RoutingRule>
</RoutingRules>
```
