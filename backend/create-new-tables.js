const { CreateTableCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: 'us-west-2' });

async function createNewTables() {
  console.log('🚀 Creating new tables with String user_id...\n');

  // 1. Create scheduled_posts_v2 table
  try {
    const scheduledPostsTable = {
      TableName: 'scheduled_posts_v2',
      KeySchema: [
        { AttributeName: 'user_id', KeyType: 'HASH' },  // String partition key
        { AttributeName: 'post_id', KeyType: 'RANGE' }  // String sort key
      ],
      AttributeDefinitions: [
        { AttributeName: 'user_id', AttributeType: 'S' }, // String
        { AttributeName: 'post_id', AttributeType: 'S' }, // String
        { AttributeName: 'scheduled_time', AttributeType: 'S' } // String for GSI
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'scheduled-time-index',
          KeySchema: [
            { AttributeName: 'scheduled_time', KeyType: 'HASH' }
          ],
          Projection: { ProjectionType: 'ALL' },
          BillingMode: 'PAY_PER_REQUEST'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    };

    await client.send(new CreateTableCommand(scheduledPostsTable));
    console.log('✅ Created scheduled_posts_v2 table');
  } catch (error) {
    console.log('⚠️  scheduled_posts_v2 table might already exist:', error.message);
  }

  // 2. Create posting_schedules_v2 table  
  try {
    const postingSchedulesTable = {
      TableName: 'posting_schedules_v2',
      KeySchema: [
        { AttributeName: 'user_id', KeyType: 'HASH' },         // String partition key
        { AttributeName: 'business_category', KeyType: 'RANGE' } // String sort key
      ],
      AttributeDefinitions: [
        { AttributeName: 'user_id', AttributeType: 'S' },         // String
        { AttributeName: 'business_category', AttributeType: 'S' } // String
      ],
      BillingMode: 'PAY_PER_REQUEST'
    };

    await client.send(new CreateTableCommand(postingSchedulesTable));
    console.log('✅ Created posting_schedules_v2 table');
  } catch (error) {
    console.log('⚠️  posting_schedules_v2 table might already exist:', error.message);
  }

  // 3. Create social_connections_v2 table
  try {
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
    console.log('✅ Created social_connections_v2 table');
  } catch (error) {
    console.log('⚠️  social_connections_v2 table might already exist:', error.message);
  }

  console.log('\n🎉 All new tables created successfully!');
  console.log('\nNext steps:');
  console.log('1. Update backend to use new table names');
  console.log('2. Update Lambda to use new table names');
  console.log('3. Test everything works');
  console.log('4. Delete old tables when confirmed working');
}

createNewTables().catch(console.error);