# Setup Guide: Running SwitchWise AI on a New Machine

Follow these steps to get the project up and running after cloning.

## Prerequisites
- **Node.js** (v18 or higher recommended)
- **MongoDB** (Ensure a local instance is running or have a remote connection string)
- **Git**

---

## 1. Project Structure
The repository is split into two main parts:
- `/backend`: Node.js/Express API with MongoDB
- `/frontend`: React application using Vite

---

## 2. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   - Create a `.env` file in the `backend` folder.
   - Copy the contents from `.env.template` into `.env`.
   - Update the values if necessary (especially `MONGODB_URI` and `JWT_SECRET`).

4. **Start the backend server**:
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:4000`.

---

## 3. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173` (or the port shown in your terminal).

---

## 4. Initial Data (Optional but Recommended)
If the database is empty, you may want to ingest the fund data to see real NAVs and metrics:
1. In the `backend` directory, run the ingestion script:
   ```bash
   node src/scripts/ingestAmfi.js
   ```

---

## Troubleshooting
- **CORS Issues**: Ensure `CLIENT_ORIGIN` in the backend `.env` matches your frontend URL.
- **DB Connection**: Verify that MongoDB is running and the `MONGODB_URI` is correct.
- **Missing NAVs**: If portfolio values show 0, ensure you have run the AMFI ingestion script.
