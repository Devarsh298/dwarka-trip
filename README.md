# Expense Tracker

A modern expense tracking application built with Next.js 14 and MongoDB Atlas.

## Features

- 📊 Track your expenses with ease
- 💰 View total expenses and individual transactions
- 🏷️ Categorize expenses (Food, Transportation, Entertainment, etc.)
- 📅 Date-based expense tracking
- 🔍 Filter expenses by category or description
- ✏️ Full CRUD operations (Create, Read, Update, Delete)
- 🎨 Modern UI with Tailwind CSS
- 🌙 Dark mode support

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB Atlas
- **API**: Next.js API Routes (RESTful)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier works great)
- npm or yarn package manager

### Installation

1. Clone or navigate to the project directory:

```bash
cd et
```

2. Install dependencies (already done if you just set up):

```bash
npm install
```

3. Set up your MongoDB connection:

   - Create a `.env.local` file in the root directory
   - Add your MongoDB connection string:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

   Replace `<username>`, `<password>`, `<cluster>`, and `<database>` with your actual MongoDB Atlas credentials.

### Running the Application

1. Start the development server:

```bash
npm run dev
```

2. Open your browser and navigate to:

```
http://localhost:3000
```

3. You should see the Expense Tracker home page with options to:
   - View existing expenses
   - Add new expenses

## Project Structure

```
et/
├── app/
│   ├── api/
│   │   └── expenses/          # API routes for CRUD operations
│   │       ├── route.ts       # GET all & POST new expense
│   │       └── [id]/
│   │           └── route.ts   # GET, PUT, DELETE single expense
│   ├── expenses/
│   │   ├── page.tsx           # View all expenses
│   │   └── new/
│   │       └── page.tsx       # Add new expense form
│   ├── globals.css            # Global styles with Tailwind
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
├── lib/
│   └── mongodb.ts             # MongoDB connection utility
├── types/
│   └── expense.ts             # TypeScript interfaces
├── .env.example               # Example environment variables
├── .env.local                 # Your actual environment variables (create this)
├── package.json               # Dependencies
├── tailwind.config.ts         # Tailwind configuration
└── tsconfig.json              # TypeScript configuration
```

## API Endpoints

### Get All Expenses
- **GET** `/api/expenses`
- Returns all expenses sorted by date (newest first)

### Create Expense
- **POST** `/api/expenses`
- Body: `{ amount, category, description, date }`

### Get Single Expense
- **GET** `/api/expenses/[id]`

### Update Expense
- **PUT** `/api/expenses/[id]`
- Body: `{ amount?, category?, description?, date? }`

### Delete Expense
- **DELETE** `/api/expenses/[id]`

## Expense Categories

- Food
- Transportation
- Entertainment
- Shopping
- Bills
- Healthcare
- Education
- Other

## MongoDB Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP address (or allow access from anywhere for development)
5. Get your connection string
6. Replace the placeholders in `.env.local`

## Build for Production

```bash
npm run build
npm start
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
"# dwarka-trip" 
