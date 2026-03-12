# Austin Local Business Marketing Assistant

An AI-powered SaaS tool that generates social media posts, Google My Business updates, and email content specifically for Austin small businesses.

## Features
- Austin-specific content generation (mentions local events, landmarks, culture)
- Social media posts for Facebook/Instagram
- Google My Business posts 
- Email newsletter templates
- Simple 5-minute business setup

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (production: PostgreSQL)
- **AI**: AWS Bedrock (Claude)
- **Payments**: Stripe
- **Deployment**: AWS

## Project Structure
```
austin-marketing-assistant/
├── frontend/          # React application
├── backend/           # Node.js API server  
├── shared/            # Shared types/utilities
└── docs/              # Documentation
```

## Getting Started

### Prerequisites
- Node.js 18+
- AWS account with Bedrock access
- Stripe account

### Development
1. Clone the repository
2. Install dependencies: `npm run install:all`
3. Set up environment variables
4. Start development servers: `npm run dev`

## Environment Variables
See `.env.example` files in frontend/ and backend/ directories.