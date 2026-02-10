# Finance Tracker Backend

A Node.js/Express backend API for the Finance Tracker application with MongoDB database.

## Features

- User authentication (register/login)
- Transaction management (income/expense tracking)
- Financial goals tracking
- Investment portfolio management
- Financial reports and summaries

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB account (Atlas)

### Installation

1. Clone the repository
2. Navigate to the Backend directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

Create a `.env` file in the Backend directory with the following variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://your_username:your_password@finance.xxxxx.mongodb.net/?appName=Finance

# Server Configuration
PORT=5000

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key

# Node Environment
NODE_ENV=development
```

### Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Transactions
- `GET /api/transactions` - Get all transactions (with optional filters)
- `POST /api/transactions` - Create a new transaction
- `PUT /api/transactions/:id` - Update a transaction
- `DELETE /api/transactions/:id` - Delete a transaction

### Goals
- `GET /api/goals` - Get all goals
- `POST /api/goals` - Create a new goal
- `PUT /api/goals/:id` - Update a goal
- `DELETE /api/goals/:id` - Delete a goal

### Investments
- `GET /api/investments` - Get all investments
- `POST /api/investments` - Create a new investment
- `PUT /api/investments/:id` - Update an investment
- `DELETE /api/investments/:id` - Delete an investment

### Reports
- `GET /api/reports/summary` - Get financial summary
- `GET /api/reports/investments` - Get investment summary

## Project Structure

```
Backend/
├── config/
│   └── db.js          # MongoDB connection
├── models/
│   ├── User.js        # User model
│   ├── Transaction.js # Transaction model
│   ├── Goal.js        # Goal model
│   └── Investment.js  # Investment model
├── routes/
│   ├── authRoutes.js
│   ├── transactionRoutes.js
│   ├── goalRoutes.js
│   ├── investmentRoutes.js
│   └── reportRoutes.js
├── .env               # Environment variables
├── server.js          # Entry point
├── package.json
└── README.md
```
