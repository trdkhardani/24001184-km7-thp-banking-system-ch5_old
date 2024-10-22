import userController from '../controllers/user.js';
import accountController from '../controllers/account.js';
import transactionController from '../controllers/transaction.js';

import express from 'express';
const app = express();

app.use('/api/v1/users', userController);
app.use('/api/v1/accounts', accountController);
app.use('/api/v1/transactions', transactionController);

export default app;