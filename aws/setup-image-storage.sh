#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-southeast-2}"
EB_ENVIRONMENT="${EB_ENVIRONMENT:-Aws-library-system-env}"
EB_EC2_ROLE="${EB_EC2_ROLE:-aws-elasticbeanstalk-ec2-role}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
IMAGE_BUCKET="${IMAGE_BUCKET:-cloudlibrary-images-${ACCOUNT_ID}-${AWS_REGION}}"

export AWS_PAGER=""

echo "Image bucket: ${IMAGE_BUCKET}"
if ! aws s3api head-bucket --bucket "${IMAGE_BUCKET}" 2>/dev/null; then
  if [[ "${AWS_REGION}" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "${IMAGE_BUCKET}" --region "${AWS_REGION}" >/dev/null
  else
    aws s3api create-bucket --bucket "${IMAGE_BUCKET}" --region "${AWS_REGION}" \
      --create-bucket-configuration LocationConstraint="${AWS_REGION}" >/dev/null
  fi
fi

aws s3api put-public-access-block --bucket "${IMAGE_BUCKET}" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket "${IMAGE_BUCKET}" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
aws s3api put-bucket-versioning --bucket "${IMAGE_BUCKET}" --versioning-configuration Status=Enabled

TMP_DIR="$(mktemp -d)"; trap 'rm -rf "${TMP_DIR}"' EXIT
cat > "${TMP_DIR}/image-policy.json" <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ManageCloudLibraryImages",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::${IMAGE_BUCKET}/uploads/*"
    },
    {
      "Sid": "ReadCloudLibraryImageBucket",
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
      "Resource": "arn:aws:s3:::${IMAGE_BUCKET}",
      "Condition": {"StringLike": {"s3:prefix": ["uploads/*"]}}
    }
  ]
}
POLICY

aws iam put-role-policy \
  --role-name "${EB_EC2_ROLE}" \
  --policy-name CloudLibraryImageStoragePolicy \
  --policy-document "file://${TMP_DIR}/image-policy.json"

aws elasticbeanstalk update-environment \
  --environment-name "${EB_ENVIRONMENT}" \
  --region "${AWS_REGION}" \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_REGION,Value="${AWS_REGION}" \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_IMAGE_BUCKET,Value="${IMAGE_BUCKET}" \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_IMAGE_BASE_URL,Value="" >/dev/null

echo "Private S3 image storage is ready. Images are proxied through /api/media/..."
echo "Bucket: ${IMAGE_BUCKET}"
