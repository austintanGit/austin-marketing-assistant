require('dotenv').config();
const { CreateTableCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: 'us-west-2' });

async function createSocialConnectionsTable() {
  try {
    console.log('🚀 Creating social_connections_v2 table...\n');

    const socialConnectionsTable = {
      TableName: 'social_connections_v2',
      KeySchema: [
        { AttributeName: 'user_id', KeyType: 'HASH' }, // String partition key
        { AttributeName: 'platform', KeyType: 'RANGE' } // String sort key
      ],
      AttributeDefinitions: [
        { AttributeName: 'user_id', AttributeType: 'S' }, // String
        { AttributeName: 'platform', AttributeType: 'S' } // String
      ],
      BillingMode: 'PAY_PER_REQUEST'
    };

    await client.send(new CreateTableCommand(socialConnectionsTable));
    console.log('✅ Created social_connections_v2 table successfully!');
    
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('✅ Table social_connections_v2 already exists');
    } else {
      console.error('❌ Error creating table:', error.message);
    }
  }
}

createSocialConnectionsTable();