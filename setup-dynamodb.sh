#!/bin/bash

# Script to create DynamoDB table for Marketing Assistant
# Make sure you have AWS CLI configured with your credentials

echo "Creating DynamoDB table: marketing-assistant..."

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

echo "Waiting for table to be created..."
aws dynamodb wait table-exists --table-name marketing-assistant --region us-west-2

echo "Table created successfully!"
echo "You can view it at: https://console.aws.amazon.com/dynamodb/home?region=us-west-2#tables:selected=marketing-assistant"