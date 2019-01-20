# resize.to s3 404 strategy

This is a lambda using the serverless framework built in order to respond to a 404 redirect to an s3 bucket. The idea here is to have two s3 buckets: one for the originals and one for the transforms. The transforms bucket can have an expiration policy to keep from storing images that are no longer needed. You'll make requests to the transform bucket and on 404 it will redirect to this lambda and stream the image from the originals bucket, transform with sharp, stream to the transforms bucket, and redirect back to the original URI.
