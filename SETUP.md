# Austin Marketing Assistant - Setup Guide

This guide will help you set up the Austin Marketing Assistant MVP for local development and testing.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** installed
- **AWS Account** with Bedrock access (us-east-1 region)
- **Stripe Account** for payment processing
- **Git** for version control

## Quick Start (5 minutes)

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd austin-marketing-assistant

# Install all dependencies
npm run install:all
```

### 2. Set Up Environment Variables

#### Backend Environment (.env)
Copy `backend/.env.example` to `backend/.env` and fill in:

```bash
# Copy the example file
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
# Database
DATABASE_PATH=./database.sqlite

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# AWS Bedrock Configuration  
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

#### Frontend Environment (.env)
Copy `frontend/.env.example` to `frontend/.env`:

```bash
# Copy the example file
cp frontend/.env.example frontend/.env
```

### 3. Start Development Servers

```bash
# Start both backend and frontend
npm run dev
```

This will start:
- Backend API server on http://localhost:3001
- Frontend React app on http://localhost:5173

## AWS Bedrock Setup

### 1. Enable Bedrock Access

1. Go to AWS Console → Bedrock
2. Navigate to "Model access" in the left sidebar
3. Click "Manage model access"
4. Enable access to **Claude 3 Haiku** model
5. Wait for approval (usually instant)

### 2. Create AWS IAM User

1. Go to AWS Console → IAM
2. Create new user with programmatic access
3. Attach policy: `AmazonBedrockFullAccess`
4. Save Access Key ID and Secret Access Key

### 3. Test Bedrock Connection

```bash
# From the backend directory
cd backend
node -e "
const bedrock = require('./src/services/bedrock');
bedrock.generateContent('Test message').then(console.log).catch(console.error);
"
```

## Stripe Setup

### 1. Create Stripe Account

1. Sign up at https://stripe.com
2. Get your test API keys from Dashboard → Developers → API keys

### 2. Set Up Webhook (for production)

1. Go to Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/payments/webhook`
3. Select events: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
4. Copy webhook secret to your `.env` file

## Database

The app uses SQLite for development (no setup required). The database file will be created automatically when you first run the backend.

To reset the database:
```bash
rm backend/database.sqlite
# Restart the backend server
```

## Testing the Application

### 1. Register a New User
- Go to http://localhost:5173
- Click "Get Started" 
- Create an account

### 2. Complete Business Setup
- Fill out the 4-step business setup wizard
- Use a real Austin address for best results

### 3. Generate Content
- Click "Generate New Content" in the dashboard
- Wait 10-30 seconds for AI generation
- Review your Austin-specific marketing content!

## Common Issues

### "AWS Bedrock access denied"
- Check your AWS credentials in `.env`
- Ensure Claude 3 Haiku model access is enabled
- Verify you're using us-east-1 region

### "Database connection error"
- Make sure you have write permissions in the backend directory
- Check that no other process is using the database file

### "CORS errors"
- Ensure frontend is running on port 5173
- Check that `FRONTEND_URL` in backend `.env` matches

### "Stripe webhook failures"
- For local development, webhooks aren't required
- Use Stripe CLI for local webhook testing if needed

## Deployment

### Backend (AWS Lambda + RDS)
- Use PostgreSQL instead of SQLite
- Set up environment variables in Lambda
- Configure VPC and security groups

### Frontend (Vercel/Netlify)
- Build: `npm run build`
- Deploy the `frontend/dist` folder
- Set environment variable: `VITE_API_BASE_URL=https://your-api-domain.com/api`

## Architecture Overview

```
austin-marketing-assistant/
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # AWS Bedrock integration
│   │   └── database.js # SQLite database
│   └── package.json
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── pages/     # Main application pages
│   │   ├── components/# Reusable UI components
│   │   └── contexts/  # Authentication context
│   └── package.json
└── package.json       # Root package with dev scripts
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user

### Business Profile
- `GET /api/business/types` - Get business types
- `POST /api/business/profile` - Create/update business profile
- `GET /api/business/profile` - Get business profile

### Content Generation
- `POST /api/content/generate` - Generate marketing content
- `GET /api/content/history` - Get previous content

### Payments
- `POST /api/payments/create-checkout-session` - Start subscription
- `POST /api/payments/success` - Handle successful payment
- `GET /api/payments/subscription` - Get subscription status

## Next Steps

1. **Add more content types** (Instagram stories, LinkedIn posts)
2. **Implement content scheduling** (auto-post to social media)
3. **Add analytics** (track content performance)
4. **Multi-location support** (for businesses with multiple locations)
5. **White-label solution** (for marketing agencies)

## Support

For questions or issues:
- Check this documentation first
- Review the code comments
- Test with simple examples
- Contact support if needed

Happy marketing! 🤠