#!/bin/bash

# Script to run DynamoDB Local for development

echo "🚀 Setting up DynamoDB Local for development..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Pulling DynamoDB Local Docker image..."
docker pull amazon/dynamodb-local

echo "🔧 Starting DynamoDB Local on port 8000..."
docker run -p 8000:8000 --name dynamodb-local -d amazon/dynamodb-local

# Wait for DynamoDB to start
sleep 3

echo "📋 Creating marketing-assistant table..."

# Create the main table
docker exec dynamodb-local aws dynamodb create-table \
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
    IndexName=GSI1,KeySchema="[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}]",Projection="{ProjectionType=ALL}",ProvisionedThroughput="{ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url http://localhost:8000 \
  --region us-west-2

echo "✅ DynamoDB Local is running!"
echo "📍 Access DynamoDB Admin UI at: http://localhost:8000/shell/"
echo "🔗 Your app should now connect to local DynamoDB"
echo ""
echo "To stop DynamoDB Local: docker stop dynamodb-local"
echo "To remove DynamoDB Local: docker rm dynamodb-local"