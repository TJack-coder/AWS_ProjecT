#!/usr/bin/env bash
set -euo pipefail

# Run this once in AWS CloudShell while signed in to the AWS account.
AWS_ACCOUNT_ID="521024927908"
AWS_REGION="ap-southeast-2"
GITHUB_OWNER="TJack-coder"
GITHUB_REPO="AWS_ProjecT"
GITHUB_BRANCH="develop_2.0"
ROLE_NAME="aws-library-github-deploy"
EB_EC2_ROLE="aws-elasticbeanstalk-ec2-role"
BACKEND_REPO="aws-library-backend"
FRONTEND_REPO="aws-library-frontend"

ACTUAL_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
if [[ "$ACTUAL_ACCOUNT_ID" != "$AWS_ACCOUNT_ID" ]]; then
  echo "Wrong AWS account. Expected $AWS_ACCOUNT_ID but got $ACTUAL_ACCOUNT_ID." >&2
  exit 1
fi

echo "AWS account: $ACTUAL_ACCOUNT_ID"
echo "GitHub source: ${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}"

# Ensure ECR repositories exist.
for REPOSITORY in "$BACKEND_REPO" "$FRONTEND_REPO"; do
  if aws ecr describe-repositories \
      --repository-names "$REPOSITORY" \
      --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "ECR repository exists: $REPOSITORY"
  else
    aws ecr create-repository \
      --repository-name "$REPOSITORY" \
      --image-tag-mutability IMMUTABLE \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 \
      --region "$AWS_REGION" >/dev/null
    echo "Created ECR repository: $REPOSITORY"
  fi
done

# Allow Elastic Beanstalk EC2 instances to pull private ECR images.
aws iam attach-role-policy \
  --role-name "$EB_EC2_ROLE" \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

# Ensure GitHub's OIDC provider exists.
OIDC_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
if aws iam get-open-id-connect-provider \
    --open-id-connect-provider-arn "$OIDC_ARN" >/dev/null 2>&1; then
  echo "GitHub OIDC provider already exists."
else
  aws iam create-open-id-connect-provider \
    --url "https://token.actions.githubusercontent.com" \
    --client-id-list "sts.amazonaws.com" >/dev/null
  echo "Created GitHub OIDC provider."
fi

if ! aws iam get-open-id-connect-provider \
    --open-id-connect-provider-arn "$OIDC_ARN" \
    --query "ClientIDList" --output text \
    | tr '\t' '\n' | grep -qx "sts.amazonaws.com"; then
  aws iam add-client-id-to-open-id-connect-provider \
    --open-id-connect-provider-arn "$OIDC_ARN" \
    --client-id "sts.amazonaws.com"
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cat > "$TMP_DIR/trust-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "${OIDC_ARN}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_OWNER}/${GITHUB_REPO}:ref:refs/heads/${GITHUB_BRANCH}"
        }
      }
    }
  ]
}
EOF

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam update-assume-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-document "file://$TMP_DIR/trust-policy.json"
  echo "Updated IAM role: $ROLE_NAME"
else
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://$TMP_DIR/trust-policy.json" \
    --description "GitHub Actions deploy AWS Library System" >/dev/null
  echo "Created IAM role: $ROLE_NAME"
fi

EB_BUCKET="$(
  aws elasticbeanstalk create-storage-location \
    --region "$AWS_REGION" \
    --query S3Bucket \
    --output text
)"

cat > "$TMP_DIR/permissions-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GetECRAuthorizationToken",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "PushLibraryImages",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeImages",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": [
        "arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/${BACKEND_REPO}",
        "arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/${FRONTEND_REPO}"
      ]
    },
    {
      "Sid": "ReadBeanstalkBucket",
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketAcl",
        "s3:GetBucketLocation",
        "s3:GetBucketPolicy",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::${EB_BUCKET}"
    },
    {
      "Sid": "ManageBeanstalkBundles",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectAcl",
        "s3:GetObjectVersion",
        "s3:GetObjectVersionAcl",
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:DeleteObject",
        "s3:DeleteObjectVersion"
      ],
      "Resource": "arn:aws:s3:::${EB_BUCKET}/*"
    },
    {
      "Sid": "ReadBeanstalkCloudFormationStack",
      "Effect": "Allow",
      "Action": [
        "cloudformation:GetTemplate",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackResource",
        "cloudformation:DescribeStackResources",
        "cloudformation:DescribeStackEvents",
        "cloudformation:ListStackResources"
      ],
      "Resource": "arn:aws:cloudformation:${AWS_REGION}:${AWS_ACCOUNT_ID}:stack/awseb-*/*"
    },
    {
      "Sid": "ReadBeanstalkAutoScaling",
      "Effect": "Allow",
      "Action": [
        "autoscaling:DescribeAutoScalingGroups",
        "autoscaling:DescribeAutoScalingInstances",
        "autoscaling:DescribeLaunchConfigurations",
        "autoscaling:DescribeScalingActivities"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DeployElasticBeanstalk",
      "Effect": "Allow",
      "Action": [
        "elasticbeanstalk:CreateApplicationVersion",
        "elasticbeanstalk:DescribeApplicationVersions",
        "elasticbeanstalk:DescribeEnvironments",
        "elasticbeanstalk:DescribeEvents",
        "elasticbeanstalk:UpdateEnvironment"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name AWSLibraryGitHubDeployPolicy \
  --policy-document "file://$TMP_DIR/permissions-policy.json"


# Elastic Beanstalk coordinates CloudFormation, Auto Scaling, S3, EC2 and ELB
# during an application-version update. This AWS-managed policy avoids missing
# service-read permissions while the inline policy keeps ECR/S3 scope explicit.
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess-AWSElasticBeanstalk

ROLE_ARN="$(aws iam get-role --role-name "$ROLE_NAME" --query Role.Arn --output text)"

cat <<EOF

AWS setup completed.

Create these GitHub repository variables:

AWS_ROLE_ARN=$ROLE_ARN
EB_BUCKET=$EB_BUCKET

GitHub path:
Settings -> Secrets and variables -> Actions -> Variables

Then open Actions -> Deploy AWS Library -> Run workflow.
EOF
