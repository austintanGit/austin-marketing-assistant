#!/usr/bin/env node

// Test AWS DynamoDB connectivity
require('dotenv').config({ path: './.env' });

const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

async function testConnection() {
  console.log('🔍 Testing AWS DynamoDB connectivity...');
  console.log(`Region: ${process.env.AWS_REGION}`);
  console.log(`Table: ${process.env.DYNAMODB_TABLE_NAME}`);
  
  try {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-west-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      requestHandler: {
        requestTimeout: 10000 // 10 seconds
      }
    });

    const docClient = DynamoDBDocumentClient.from(client);
    
    console.log('📡 Attempting to list DynamoDB tables...');
    
    const result = await client.send(new ListTablesCommand({}));
    
    console.log('✅ SUCCESS! Connected to DynamoDB');
    console.log('📋 Available tables:', result.TableNames);
    
    if (result.TableNames.includes(process.env.DYNAMODB_TABLE_NAME)) {
      console.log(`✅ Table '${process.env.DYNAMODB_TABLE_NAME}' found!`);
    } else {
      console.log(`❌ Table '${process.env.DYNAMODB_TABLE_NAME}' NOT found!`);
      console.log('💡 You may need to run: ./setup-dynamodb.sh');
    }
    
  } catch (error) {
    console.error('❌ DynamoDB connection failed:');
    console.error('Error Code:', error.name);
    console.error('Error Message:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n🔧 NETWORK ISSUE DETECTED');
      console.log('Possible solutions:');
      console.log('1. Check your internet connection');
      console.log('2. Disable VPN if using one');
      console.log('3. Check firewall/network restrictions');
      console.log('4. Try different network (mobile hotspot)');
    }
    
    if (error.message.includes('credentials')) {
      console.log('\n🔧 CREDENTIAL ISSUE DETECTED');
      console.log('Check your AWS credentials in .env file');
    }
    
    process.exit(1);
  }
}

testConnection();