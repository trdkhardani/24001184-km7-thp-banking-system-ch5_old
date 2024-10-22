# Basic Banking System

## Profile
Name: Tridiktya Hardani Putra

## Installation
### Prerequisites
Before installing, ensure you have the following prerequisites installed on your system:
- **Node.js**: The project requires Node.js to run. You can download it from Node.js official website.
- **npm**: npm (Node Package Manager) is used to manage the dependencies and should come installed with Node.js.

### Installing Dependencies
To set up the project for development on your local machine, please follow the steps below:

1. First, clone this repository to your local machine using Git commands. For example:
```bash
   git clone https://github.com/trdkhardani/24001184-km7-thp-banking-system-ch4.git
    cd 24001184-km7-thp-banking-system-ch4
```
2. Run the following command in the root directory of the project to install all necessary dependencies:
   
   ```npm install```

## Starting the App
### Running the Application
Once the installation is complete, you can start the application using one of the following methods:
1. **npm**
   
   Automatically start using **nodemon** (if you have installed all the required dependencies and configured the value of "start" under the "scripts" to "nodemon index.js" in `package.json` file).
   
   ```npm start```

2. **Directly using Node.js or nodemon**
   
   ```node index.js``` or ```nodemon index.js```

## Connect to PostgreSQL
Adjust the `.env` file to your own database information.
### Database Migration
Use this command `npx prisma migrate dev` to start the migration from `schema.prisma` file.

## Available Endpoints
- **`POST /api/v1/users`**: Add a new user along with their profile.
  - Request Bodies:
    - name
    - email
    - password
    - identity_type
    - identity_number
    - address
- **`GET /api/v1/users`**: Display a list of users.
- **`GET /api/v1/users/:userId`**: Display detailed information about a user (also show their profile).
- **`POST /api/v1/accounts`**: Add a new account to an already registered user.
  - Request Bodies:
    - user_id
    - bank_name
    - bank_account_number
    - balance
- **`GET /api/v1/accounts`**: Display a list of accounts.
- **`GET /api/v1/accounts/:accountId`**: Display account details.
- **`DELETE /api/v1/accounts/:accountId`**: Delete selected account (by account's id).
- **`POST /api/v1/transactions`**: Send money from one account to another (specify the request body).
  - Request Bodies:
    - source_account_id
    - destination_account_id
    - amount
- **`GET /api/v1/transactions`**: Display a list of transactions.
- **`GET /api/v1/transactions/:transactionId`**: Display transaction details (also show the sender and recipient).

For each POST method request bodies, see the validation rules [here](https://github.com/trdkhardani/24001184-km7-thp-banking-system-ch4/tree/main/validation).