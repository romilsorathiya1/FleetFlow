# 🚀 How to Run FleetFlow

This guide provides step-by-step instructions to set up and run the FleetFlow project on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: Version 18.0.0 or higher (Check with `node -v`)
- **npm**: Usually comes with Node.js (Check with `npm -v`)
- **MongoDB**: Version 6.0 or higher. You can use a local installation or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cloud instance.

---

## 🛠️ Step-by-Step Setup

### 1. Clone the Repository
Open your terminal and run:
```bash
git clone https://github.com/romilsorathiya1/FleetFlow.git
cd FleetFlow/fleetflow
```

### 2. Install Dependencies
Install all required packages using npm:
```bash
npm install
```

### 3. Configure Environment Variables
Create a file named `.env.local` in the root of the `fleetflow` directory and add the following variables:

```env
# MongoDB Connection String
# For local: mongodb://localhost:27017/fleetflow
# For Atlas: mongodb+srv://<username>:<password>@cluster.mongodb.net/fleetflow
MONGODB_URI=your_mongodb_connection_uri

# NextAuth Configuration
# Generate a secret key (you can use any strong random string)
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=http://localhost:3000

# Email Configuration (System Sender)
# These credentials are used by the system to SEND OTP emails to all users.
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_google_app_password
```

> [!NOTE]
> The `EMAIL_USER` and `EMAIL_PASS` (App Password) act as the "Mail Transfer Agent". Without these, the system cannot send OTP codes to any user.

#### 📧 How to get `EMAIL_PASS` (Google App Password)
For security, Google does not allow using your regular password. You must generate an **App Password**:
1. Go to your [Google Account Security Settings](https://myaccount.google.com/security).
2. Ensure **2-Step Verification** is turned ON.
3. Search for "App Passwords" in the search bar or go to the 2-Step Verification section.
4. Select "Mail" and "Other (Custom name)" (e.g., FleetFlow).
5. Copy the 16-character code generated (the App Password).
6. Paste this code into `EMAIL_PASS` in your `.env.local`.

---

### 4. Update Seed Data (Receive OTP in your Inbox)
The "Forgot Password" functionality sends a real email to the user's registered address. To see this OTP in your own mailbox and complete the password reset flow:

1. Open `app/api/seed/route.js`.
2. Locate the `users` array (around line 30).
3. Change the `email` for the roles you want to test (e.g., `fleet_manager`) to **your real email address**.
    - **Reason**: When you click "Forgot Password" on the login page and enter this email, the system will send the 6-digit OTP to *this* address. You will then see it in your mail and can use it to verify.
4. Repeat this for `scripts/seedData.js` if you are using the CLI seeder.

---

### 5. Seed the Database
You can seed the database in two ways:

**Option A: Using the CLI (Recommended)**
```bash
node scripts/seedData.js
```

**Option B: Using the Web UI**
Start the project and click the **"🌱 Seed Demo Data"** button on the Login page.

---

### 6. Start the Project
Now, run the development server:
```bash
npm run dev
```

The application will be available at **[http://localhost:3000](http://localhost:3000)**.

---

## 🐳 Docker Setup (Easiest Way)

If you have **Docker** and **Docker Compose** installed, you can run the entire system (App + MongoDB) without installing anything else.

### 1. Configure `.env.local`
Ensure you have created the `.env.local` file as described in Step 3 above. You **must** provide the `EMAIL_USER` and `EMAIL_PASS`.

### 2. Run with Docker Compose
Run the following command in the project root:
```bash
docker-compose up --build
```

- This will build the application image (`nextjs_app`).
- It will start a MongoDB container (`mongodb`) automatically.
- **Hot-Reloading**: The project directory is mounted inside the container, so changes you make to the code will reflect immediately.
- The application will be reachable at **http://localhost:3000**.

### 3. Seed Data (Docker)
Once the containers are running, you can seed the data by clicking the **"🌱 Seed Demo Data"** button on the Login page in your browser.

---

## 🛡️ Production Deployment Note
When deploying to production (e.g., Vercel):
1. Set `NODE_ENV=production`.
2. Update `NEXTAUTH_URL` to your production domain.
3. Ensure all environment variables are added to your hosting provider's dashboard.
