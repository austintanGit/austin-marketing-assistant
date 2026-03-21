const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  BatchWriteCommand
} = require('@aws-sdk/lib-dynamodb');

class DynamoDBService {
  constructor() {
    try {
      const clientConfig = {
        region: process.env.AWS_REGION || 'us-west-2',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        },
        requestHandler: {
          requestTimeout: 10000, // 10 seconds
          httpsAgent: {
            maxSockets: 50,
            keepAlive: true
          }
        },
        maxAttempts: 2 // Reduce retry attempts to fail faster
      };

      // Use local DynamoDB if endpoint is specified
      if (process.env.DYNAMODB_ENDPOINT) {
        clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
        console.log(`🔧 Using DynamoDB Local: ${process.env.DYNAMODB_ENDPOINT}`);
      }

      const client = new DynamoDBClient(clientConfig);
      this.docClient = DynamoDBDocumentClient.from(client);
      this.tableName = process.env.DYNAMODB_TABLE_NAME || 'marketing-assistant';
      this.connected = true;
      console.log(`🔥 DynamoDB service initialized - Region: ${clientConfig.region}`);
    } catch (error) {
      console.error('❌ DynamoDB connection failed:', error.message);
      this.connected = false;
      this.mockData = new Map(); // In-memory fallback for development
      console.log('📝 Using fallback mock data for development');
    }
  }

  // Check if DynamoDB is available
  isConnected() {
    return this.connected;
  }

  // Fallback method for development when DynamoDB is unreachable
  _fallback(operation, data = null) {
    console.log(`📝 DynamoDB fallback: ${operation} (network unavailable - using mock data)`);
    
    switch (operation) {
      case 'createUser':
        const userId = Date.now().toString();
        const user = { id: userId, email: data.email, created_at: new Date().toISOString() };
        this.mockData.set(`user:${data.email}`, user);
        return Promise.resolve(user);
      
      case 'getUserByEmail':
        const foundUser = this.mockData.get(`user:${data}`);
        return Promise.resolve(foundUser || null);
      
      case 'getUserById':
        const userById = Array.from(this.mockData.values()).find(u => u.id === data);
        return Promise.resolve(userById || null);
      
      default:
        return Promise.resolve(null);
    }
  }

  // Generate unique IDs
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Helper for queries
  async query(params) {
    try {
      const result = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        ...params
      }));
      return result.Items || [];
    } catch (error) {
      console.error('DynamoDB Query Error:', error);
      throw error;
    }
  }

  // Helper for single item operations
  async put(item) {
    try {
      return await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));
    } catch (error) {
      console.error('DynamoDB Put Error:', error);
      throw error;
    }
  }

  async get(pk, sk) {
    try {
      const result = await this.docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk }
      }));
      return result.Item || null;
    } catch (error) {
      console.error('DynamoDB Get Error:', error);
      throw error;
    }
  }

  async update(pk, sk, updateExpression, expressionAttributeValues, expressionAttributeNames = {}) {
    try {
      const params = {
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      if (Object.keys(expressionAttributeNames).length > 0) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }

      const result = await this.docClient.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      console.error('DynamoDB Update Error:', error);
      throw error;
    }
  }

  async delete(pk, sk) {
    try {
      return await this.docClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk }
      }));
    } catch (error) {
      console.error('DynamoDB Delete Error:', error);
      throw error;
    }
  }

  // User operations
  async createUser(email, passwordHash) {
    if (!this.connected) {
      return this._fallback('createUser', { email, passwordHash });
    }

    const userId = this.generateId();
    const timestamp = new Date().toISOString();
    
    const item = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      entity_type: 'user',
      id: userId,
      email,
      password_hash: passwordHash,
      extra_image_credits: 0,
      created_at: timestamp,
      updated_at: timestamp,
      GSI1PK: `EMAIL#${email}`,
      GSI1SK: 'USER'
    };

    try {
      await this.put(item);
      return { id: userId, email, created_at: timestamp };
    } catch (error) {
      console.error('DynamoDB createUser error, using fallback:', error.message);
      this.connected = false;
      return this._fallback('createUser', { email, passwordHash });
    }
  }

  async getUserByEmail(email) {
    if (!this.connected) {
      return this._fallback('getUserByEmail', email);
    }

    try {
      const items = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :email AND GSI1SK = :sk',
        ExpressionAttributeValues: {
          ':email': `EMAIL#${email}`,
          ':sk': 'USER'
        }
      });

      return items[0] || null;
    } catch (error) {
      console.error('DynamoDB getUserByEmail error, using fallback:', error.message);
      this.connected = false;
      return this._fallback('getUserByEmail', email);
    }
  }

  async getUserById(userId) {
    if (!this.connected) {
      return this._fallback('getUserById', userId);
    }

    try {
      return await this.get(`USER#${userId}`, 'PROFILE');
    } catch (error) {
      console.error('DynamoDB getUserById error, using fallback:', error.message);
      this.connected = false;
      return this._fallback('getUserById', userId);
    }
  }

  async updateUserCredits(userId, credits) {
    return await this.update(
      `USER#${userId}`,
      'PROFILE',
      'SET extra_image_credits = :credits, updated_at = :timestamp',
      {
        ':credits': credits,
        ':timestamp': new Date().toISOString()
      }
    );
  }

  // Business operations
  async createBusiness(userId, businessData) {
    if (!this.connected) {
      console.log('📝 DynamoDB fallback: createBusiness (using mock data)');
      return Promise.resolve({ id: 'mock-business-id', ...businessData });
    }

    try {
      const businessId = this.generateId();
      const timestamp = new Date().toISOString();

      const item = {
        PK: `USER#${userId}`,
        SK: `BUSINESS#${businessId}`,
        entity_type: 'business',
        id: businessId,
        user_id: userId,
        business_name: businessData.business_name,
        business_type: businessData.business_type,
        address: businessData.address || null,
        phone: businessData.phone || null,
        website: businessData.website || null,
        description: businessData.description || null,
        target_audience: businessData.target_audience || null,
        tone: businessData.tone || 'friendly',
        logo_path: businessData.logo_path || null,
        created_at: timestamp,
        updated_at: timestamp
      };

      await this.put(item);
      return { id: businessId, ...businessData, created_at: timestamp };
    } catch (error) {
      console.error('DynamoDB createBusiness error, using fallback:', error.message);
      this.connected = false;
      return { id: 'mock-business-id', ...businessData };
    }
  }

  async getUserBusinesses(userId) {
    if (!this.connected) {
      console.log('📝 DynamoDB fallback: getUserBusinesses (using mock data)');
      return Promise.resolve([]);
    }

    try {
      return await this.query({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'BUSINESS#'
        }
      });
    } catch (error) {
      console.error('DynamoDB getUserBusinesses error, using fallback:', error.message);
      this.connected = false;
      return [];
    }
  }

  async getBusiness(userId, businessId) {
    return await this.get(`USER#${userId}`, `BUSINESS#${businessId}`);
  }

  async updateBusinessLogo(userId, businessId, logoPath) {
    const timestamp = new Date().toISOString();
    
    return await this.update(
      `USER#${userId}`,
      `BUSINESS#${businessId}`,
      'SET logo_path = :logoPath, updated_at = :timestamp',
      {
        ':logoPath': logoPath,
        ':timestamp': timestamp
      }
    );
  }

  // Content operations
  async createContent(businessId, contentData) {
    const contentId = this.generateId();
    const timestamp = new Date().toISOString();

    const item = {
      PK: `BUSINESS#${businessId}`,
      SK: `CONTENT#${contentId}`,
      entity_type: 'content',
      id: contentId,
      business_id: businessId,
      content_type: contentData.content_type,
      title: contentData.title || null,
      content: contentData.content,
      platform: contentData.platform || null,
      scheduled_date: contentData.scheduled_date || null,
      status: contentData.status || 'draft',
      published_at: contentData.published_at || null,
      published_platforms: contentData.published_platforms || '',
      created_at: timestamp,
      GSI1PK: `STATUS#${contentData.status || 'draft'}`,
      GSI1SK: timestamp
    };

    await this.put(item);
    return { id: contentId, ...contentData, created_at: timestamp };
  }

  async getBusinessContent(businessId) {
    return await this.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `BUSINESS#${businessId}`,
        ':sk': 'CONTENT#'
      }
    });
  }

  async updateContent(businessId, contentId, updateData) {
    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    if (updateData.status) {
      updateExpression.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = updateData.status;
    }

    if (updateData.content) {
      updateExpression.push('content = :content');
      expressionAttributeValues[':content'] = updateData.content;
    }

    updateExpression.push('updated_at = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    return await this.update(
      `BUSINESS#${businessId}`,
      `CONTENT#${contentId}`,
      `SET ${updateExpression.join(', ')}`,
      expressionAttributeValues,
      expressionAttributeNames
    );
  }

  async getContentByStatus(status) {
    return await this.query({
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :status',
      ExpressionAttributeValues: {
        ':status': `STATUS#${status}`
      }
    });
  }

  // Subscription operations
  async createOrUpdateSubscription(userId, subscriptionData) {
    const timestamp = new Date().toISOString();

    const item = {
      PK: `USER#${userId}`,
      SK: 'SUBSCRIPTION',
      entity_type: 'subscription',
      user_id: userId,
      stripe_customer_id: subscriptionData.stripe_customer_id || null,
      stripe_subscription_id: subscriptionData.stripe_subscription_id || null,
      plan: subscriptionData.plan || 'basic',
      billing_cycle: subscriptionData.billing_cycle || 'monthly',
      status: subscriptionData.status || 'active',
      current_period_start: subscriptionData.current_period_start || null,
      current_period_end: subscriptionData.current_period_end || null,
      cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
      created_at: subscriptionData.created_at || timestamp,
      updated_at: timestamp
    };

    await this.put(item);
    return item;
  }

  async getUserSubscription(userId) {
    return await this.get(`USER#${userId}`, 'SUBSCRIPTION');
  }

  async updateSubscription(userId, updateData) {
    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    Object.keys(updateData).forEach(key => {
      if (key === 'status') {
        updateExpression.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = updateData[key];
      } else if (key === 'plan') {
        updateExpression.push('#plan = :plan');
        expressionAttributeNames['#plan'] = 'plan';
        expressionAttributeValues[':plan'] = updateData[key];
      } else {
        updateExpression.push(`${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = updateData[key];
      }
    });

    updateExpression.push('updated_at = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    return await this.update(
      `USER#${userId}`,
      'SUBSCRIPTION',
      `SET ${updateExpression.join(', ')}`,
      expressionAttributeValues,
      expressionAttributeNames
    );
  }

  // Social connection operations
  async createOrUpdateSocialConnection(userId, platform, connectionData) {
    if (!this.connected) {
      console.log(`📝 DynamoDB fallback: createOrUpdateSocialConnection (${platform}) - using mock data`);
      const connection = {
        user_id: userId,
        platform,
        platform_page_id: connectionData.platform_page_id,
        platform_page_name: connectionData.platform_page_name,
        created_at: new Date().toISOString()
      };
      this.mockData.set(`social:${userId}:${platform}`, connection);
      return Promise.resolve(connection);
    }

    const timestamp = new Date().toISOString();

    const item = {
      PK: `USER#${userId}`,
      SK: `SOCIAL#${platform}`,
      entity_type: 'social_connection',
      user_id: userId,
      platform,
      platform_user_id: connectionData.platform_user_id || null,
      platform_page_id: connectionData.platform_page_id || null,
      platform_page_name: connectionData.platform_page_name || null,
      access_token: connectionData.access_token,
      refresh_token: connectionData.refresh_token || null,
      token_expiry: connectionData.token_expiry || null,
      extra_data: connectionData.extra_data || null,
      created_at: connectionData.created_at || timestamp,
      updated_at: timestamp
    };

    await this.put(item);
    return item;
  }

  async getUserSocialConnection(userId, platform) {
    if (!this.connected) {
      console.log(`📝 DynamoDB fallback: getUserSocialConnection (${platform}) - using mock data`);
      const connection = this.mockData.get(`social:${userId}:${platform}`);
      return Promise.resolve(connection || null);
    }

    return await this.get(`USER#${userId}`, `SOCIAL#${platform}`);
  }

  async getUserSocialConnections(userId) {
    if (!this.connected) {
      console.log('📝 DynamoDB fallback: getUserSocialConnections - using mock data');
      const connections = [];
      for (const [key, connection] of this.mockData.entries()) {
        if (key.startsWith(`social:${userId}:`)) {
          connections.push(connection);
        }
      }
      return Promise.resolve(connections);
    }

    return await this.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'SOCIAL#'
      }
    });
  }

  async deleteSocialConnection(userId, platform) {
    if (!this.connected) {
      console.log(`📝 DynamoDB fallback: deleteSocialConnection (${platform}) - using mock data`);
      this.mockData.delete(`social:${userId}:${platform}`);
      return Promise.resolve(true);
    }

    return await this.delete(`USER#${userId}`, `SOCIAL#${platform}`);
  }

  // Usage tracking and quota management
  async getQuotaUsage(userId, quotaType, period = 'daily') {
    if (period === 'daily') {
      return await this.getDailyUsageCount(userId, quotaType);
    } else if (period === 'monthly') {
      return await this.getMonthlyUsageCount(userId, quotaType);
    }
    return 0;
  }

  // Social post logging
  async logSocialPost(userId, platform, postData) {
    const postId = this.generateId();
    const timestamp = new Date().toISOString();

    const item = {
      PK: `USER#${userId}`,
      SK: `POST#${postId}`,
      entity_type: 'social_post',
      id: postId, // Add explicit id field for frontend compatibility
      user_id: userId,
      platform: platform,
      platform_post_id: postData.platform_post_id || null,
      message: postData.message || '',
      has_image: postData.has_image || false,
      image_source: postData.image_source || null,
      created_at: timestamp,
      TTL: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
    };

    await this.put(item);
    return item;
  }

  // Get user's social posts
  async getUserSocialPosts(userId, platform = null, limit = 50) {
    if (!this.connected) {
      console.log('📝 DynamoDB fallback: getUserSocialPosts - using mock data');
      return Promise.resolve([]);
    }

    try {
      const params = {
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'POST#'
        },
        ScanIndexForward: false, // Sort by SK descending (newest first)
        Limit: limit
      };

      // If platform is specified, add filter
      if (platform) {
        params.FilterExpression = 'platform = :platform';
        params.ExpressionAttributeValues[':platform'] = platform;
      }

      const items = await this.query(params);
      
      // Ensure each item has an id field for frontend compatibility
      return items.map(item => ({
        ...item,
        id: item.id || item.SK.replace('POST#', '') // Extract ID from SK if not present
      }));
    } catch (error) {
      console.error('DynamoDB getUserSocialPosts error:', error.message);
      return [];
    }
  }

  // Get monthly social posts count
  async getMonthlySocialPostsCount(userId, platform = null) {
    if (!this.connected) {
      console.log('📝 DynamoDB fallback: getMonthlySocialPostsCount - using mock data');
      return Promise.resolve(0);
    }

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const params = {
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'POST#',
          ':startDate': startOfMonth.toISOString(),
          ':endDate': startOfNextMonth.toISOString()
        },
        FilterExpression: 'created_at BETWEEN :startDate AND :endDate'
      };

      // If platform is specified, add to filter
      if (platform) {
        params.FilterExpression += ' AND platform = :platform';
        params.ExpressionAttributeValues[':platform'] = platform;
      }

      const items = await this.query(params);
      return items.length;
    } catch (error) {
      console.error('DynamoDB getMonthlySocialPostsCount error:', error.message);
      return 0;
    }
  }

  // Check for processed operations (prevent duplicates)
  async checkProcessed(userId, operationType, operationId) {
    try {
      const item = await this.get(`USER#${userId}`, `PROCESSED#${operationType}#${operationId}`);
      return !!item;
    } catch (error) {
      return false;
    }
  }

  async markProcessed(userId, operationType, operationId) {
    const timestamp = new Date().toISOString();
    const item = {
      PK: `USER#${userId}`,
      SK: `PROCESSED#${operationType}#${operationId}`,
      entity_type: 'processed_operation',
      user_id: userId,
      operation_type: operationType,
      operation_id: operationId,
      created_at: timestamp,
      TTL: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
    };

    await this.put(item);
    return item;
  }

  // Usage tracking operations
  async incrementUsageLog(userId, logType, additionalData = {}) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const pk = `USER#${userId}`;
    const sk = `LOG#${logType}#${date}`;

    try {
      // Try to increment existing log
      await this.update(
        pk, 
        sk,
        'SET #count = if_not_exists(#count, :zero) + :inc, updated_at = :timestamp ADD #items :item',
        {
          ':zero': 0,
          ':inc': 1,
          ':timestamp': new Date().toISOString(),
          ':item': new Set([JSON.stringify({ ...additionalData, created_at: new Date().toISOString() })])
        },
        {
          '#count': 'count',
          '#items': 'items'
        }
      );
    } catch (error) {
      // If item doesn't exist, create it
      if (error.name === 'ConditionalCheckFailedException' || error.name === 'ValidationException') {
        const item = {
          PK: pk,
          SK: sk,
          entity_type: 'usage_log',
          user_id: userId,
          log_type: logType,
          date,
          count: 1,
          items: new Set([JSON.stringify({ ...additionalData, created_at: new Date().toISOString() })]),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          TTL: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
        };
        await this.put(item);
      } else {
        throw error;
      }
    }
  }

  async getUserUsageLog(userId, logType, date = null) {
    const dateStr = date || new Date().toISOString().split('T')[0];
    return await this.get(`USER#${userId}`, `LOG#${logType}#${dateStr}`);
  }

  // Get monthly usage count for a user
  async getMonthlyUsageCount(userId, logType) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}`;
    
    try {
      const items = await this.query({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `LOG#${logType}#${monthPrefix}`
        }
      });
      
      return items.reduce((total, item) => total + (item.count || 0), 0);
    } catch (error) {
      console.error('Error getting monthly usage count:', error);
      return 0;
    }
  }

  // Get daily usage count for a user
  async getDailyUsageCount(userId, logType) {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const item = await this.getUserUsageLog(userId, logType, today);
      return item ? item.count : 0;
    } catch (error) {
      console.error('Error getting daily usage count:', error);
      return 0;
    }
  }

  // Clear all data from the table (for development/testing)
  async clearAllData() {
    try {
      console.log('🗑️  Clearing all data from DynamoDB table...');
      
      // Scan the entire table to get all items
      let items = [];
      let lastEvaluatedKey;
      
      do {
        const scanParams = {
          TableName: this.tableName
        };
        
        if (lastEvaluatedKey) {
          scanParams.ExclusiveStartKey = lastEvaluatedKey;
        }
        
        const scanResult = await this.docClient.send(new ScanCommand(scanParams));
        
        if (scanResult.Items) {
          items = items.concat(scanResult.Items);
        }
        lastEvaluatedKey = scanResult.LastEvaluatedKey;
      } while (lastEvaluatedKey);
      
      console.log(`📊 Found ${items.length} items to delete`);
      
      if (items.length === 0) {
        console.log('✅ Table is already empty');
        return { deletedCount: 0 };
      }
      
      // Delete items in batches
      const batchSize = 25; // DynamoDB limit for batch operations
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const deleteRequests = batch.map(item => ({
          DeleteRequest: {
            Key: { PK: item.PK, SK: item.SK }
          }
        }));
        
        await this.docClient.send(new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: deleteRequests
          }
        }));
        
        console.log(`🗑️  Deleted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(items.length / batchSize)}`);
      }
      
      console.log('✅ All data cleared from DynamoDB table');
      return { deletedCount: items.length };
    } catch (error) {
      console.error('❌ Error clearing DynamoDB data:', error);
      throw error;
    }
  }

  // Migration helper - convert SQLite row to DynamoDB item
  migrateUser(sqliteUser) {
    return {
      PK: `USER#${sqliteUser.id}`,
      SK: 'PROFILE',
      entity_type: 'user',
      id: sqliteUser.id.toString(),
      email: sqliteUser.email,
      password_hash: sqliteUser.password_hash,
      extra_image_credits: sqliteUser.extra_image_credits || 0,
      created_at: sqliteUser.created_at,
      updated_at: sqliteUser.updated_at,
      GSI1PK: `EMAIL#${sqliteUser.email}`,
      GSI1SK: 'USER'
    };
  }

  async updateSubscriptionByStripeId(stripeSubscriptionId, updateData) {
    try {
      // Find subscription by stripe_subscription_id using scan
      const scanParams = {
        TableName: this.tableName,
        FilterExpression: 'stripe_subscription_id = :stripeSubId AND entity_type = :entityType',
        ExpressionAttributeValues: {
          ':stripeSubId': stripeSubscriptionId,
          ':entityType': 'subscription'
        }
      };

      const result = await this.docClient.send(new ScanCommand(scanParams));
      
      if (!result.Items || result.Items.length === 0) {
        console.log(`No subscription found with stripe_subscription_id: ${stripeSubscriptionId}`);
        return null;
      }

      const subscription = result.Items[0];
      const updatedItem = {
        ...subscription,
        ...updateData,
        updated_at: new Date().toISOString()
      };

      await this.put(updatedItem);
      return updatedItem;
    } catch (error) {
      console.error('Error updating subscription by Stripe ID:', error);
      throw error;
    }
  }
}

module.exports = new DynamoDBService();