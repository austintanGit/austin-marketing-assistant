# AWS Account Transfer Guide

When you're ready to move from your test AWS account to production, follow these steps:

## 1. Production AWS Account Setup

### Create DynamoDB Table in Production
```bash
# Run this in your production AWS account
aws dynamodb create-table \
    --table-name marketing-assistant \
    --attribute-definitions \
        AttributeName=PK,AttributeType=S \
        AttributeName=SK,AttributeType=S \
        AttributeName=GSI1PK,AttributeType=S \
        AttributeName=GSI1SK,AttributeType=S \
    --key-schema \
        AttributeName=PK,KeyType=HASH \
        AttributeName=SK,KeyType=RANGE \
    --global-secondary-indexes \
        IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL},BillingMode=PAY_PER_REQUEST \
    --billing-mode PAY_PER_REQUEST \
    --region us-west-2
```

### Create IAM User for Application
```bash
# Create IAM user
aws iam create-user --user-name marketing-assistant-app

# Create access key
aws iam create-access-key --user-name marketing-assistant-app

# Attach DynamoDB policy
aws iam attach-user-policy \
    --user-name marketing-assistant-app \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

## 2. Environment Variables Update

Update your production `.env` file:

```env
# Production AWS Configuration
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA... # New production keys
AWS_SECRET_ACCESS_KEY=... # New production secret

# Production DynamoDB
DYNAMODB_TABLE_NAME=marketing-assistant

# Production S3 (if needed)
S3_BUCKET_NAME=your-production-bucket
CLOUDFRONT_URL=https://your-production-cdn.com
```

## 3. Data Migration (Optional)

If you need to migrate test data:

```javascript
// migration-script.js
const AWS = require('aws-sdk');

// Source (test account) 
const sourceDynamoDB = new AWS.DynamoDB.DocumentClient({
  region: 'us-west-2',
  accessKeyId: 'TEST_ACCESS_KEY',
  secretAccessKey: 'TEST_SECRET_KEY'
});

// Destination (production account)
const destDynamoDB = new AWS.DynamoDB.DocumentClient({
  region: 'us-west-2', 
  accessKeyId: 'PROD_ACCESS_KEY',
  secretAccessKey: 'PROD_SECRET_KEY'
});

async function migrateData() {
  // Scan all items from test table
  const params = { TableName: 'marketing-assistant' };
  const result = await sourceDynamoDB.scan(params).promise();
  
  // Batch write to production table
  for (const item of result.Items) {
    await destDynamoDB.put({
      TableName: 'marketing-assistant',
      Item: item
    }).promise();
  }
}
```

## 4. Production Deployment Checklist

- [ ] Production DynamoDB table created with GSI
- [ ] IAM user created with minimal permissions
- [ ] Environment variables updated
- [ ] S3 bucket configured (if using file uploads)
- [ ] CloudFront distribution set up (if needed)
- [ ] Domain and SSL certificates configured
- [ ] Application deployed to production environment
- [ ] Health checks and monitoring configured

## 5. Cost Optimization for Production

### DynamoDB Cost Controls
```env
# Set up billing alerts in AWS Console for:
# - DynamoDB read/write capacity
# - DynamoDB storage costs
# - Total monthly AWS spend
```

### Monitoring Setup
- Enable CloudWatch metrics for DynamoDB
- Set up billing alerts
- Monitor read/write capacity utilization

## 6. Security Best Practices

1. **IAM Permissions**: Use least-privilege principle
2. **VPC**: Consider running in private subnets
3. **Encryption**: Enable encryption at rest and in transit
4. **Secrets**: Use AWS Secrets Manager for sensitive data
5. **Logging**: Enable CloudTrail for auditing

## 7. Backup Strategy

```bash
# Enable point-in-time recovery
aws dynamodb update-continuous-backups \
    --table-name marketing-assistant \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

## 8. Testing Production Setup

Create a simple test script to verify everything works:

```javascript
// test-production.js
require('dotenv').config();
const db = require('./src/database');

async function testProduction() {
  try {
    // Test basic connectivity
    const testUser = await db.createUser('test@production.com', 'hashedpassword');
    console.log('✅ Production DynamoDB working:', testUser);
    
    // Clean up test data
    // (implement cleanup as needed)
  } catch (error) {
    console.error('❌ Production test failed:', error);
  }
}
```

## Estimated Production Costs

- **DynamoDB**: $0-10/month (free tier covers most small apps)
- **S3**: $1-5/month (for file storage)
- **CloudFront**: $1-2/month (CDN)
- **EC2/Lambda**: $5-20/month (hosting)

**Total**: ~$7-37/month for a small to medium marketing assistant app

## Support

- Test everything in staging first
- Keep test environment for development
- Monitor costs weekly initially
- Set up billing alerts before going live