import Router from 'express-promise-router';
const router = Router();

import { PrismaClient, Prisma } from '@prisma/client'
const prisma = new PrismaClient();

import validateTransaction from '../validation/transaction.js';

import authMiddleware from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';

/**
 * @swagger
 * /api/v1/transactions:
 *   post:
 *     summary: Create a new transaction
 *     description: This endpoint allows an authenticated user to create a new transaction between two bank accounts. The user must own the source account, and the transaction amount must not exceed the available balance.
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []  # Requires a Bearer token for authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source_account_id:
 *                 type: integer
 *                 example: 1
 *                 description: The ID of the source bank account (must belong to the authenticated user).
 *               destination_account_id:
 *                 type: integer
 *                 example: 2
 *                 description: The ID of the destination bank account.
 *               amount:
 *                 type: number
 *                 example: 100.00
 *                 description: The amount to transfer. Must be less than or equal to the source account's balance.
 *     responses:
 *       201:
 *         description: Transaction created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     source_account_id:
 *                       type: integer
 *                       example: 1
 *                     destination_account_id:
 *                       type: integer
 *                       example: 2
 *                     amount:
 *                       type: number
 *                       example: 100.00
 *                 source_account:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     user_id:
 *                       type: integer
 *                       example: 1
 *                     bank_name:
 *                       type: string
 *                       example: Bank of America
 *                     bank_account_number:
 *                       type: string
 *                       example: 1234567890
 *                     balance:
 *                       type: number
 *                       example: 5000
 *                 destination_account:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     user_id:
 *                       type: integer
 *                       example: 2
 *                     bank_name:
 *                       type: string
 *                       example: Chase Bank
 *                     bank_account_number:
 *                       type: string
 *                       example: 9876543210
 *                     balance:
 *                       type: number
 *                       example: 5100
  *       400:
 *         description: Validation error. Input data does not meet the required format.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: '"amount" must be a positive number'
 *                   path:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["amount"]
 *                   type:
 *                     type: string
 *                     example: "number.positive"
 *                   context:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         example: "amount"
 *                       value:
 *                         type: number
 *                         example: 0
 *                       key:
 *                         type: string
 *                         example: "amount"
 *       403:
 *         description: Forbidden. The authenticated user does not own the source account.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: The source account doesn't belong to this user
 *       409:
 *         description: Conflict error. Invalid account IDs, insufficient balance, or same account used as source and destination.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: Cannot do transaction between same account
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: Internal server error.
 */
router.post('/', authMiddleware, async (req, res, next) => {
    const userId = req.user.id;
    
    const validatedData = {
        source_account_id: Number(req.body.source_account_id),
        destination_account_id: Number(req.body.destination_account_id),
        amount: Number(req.body.amount)
    };
    
    const response = validateTransaction(validatedData);

    if(response.error){ // if the fields don't meet the requirements
        return res.status(400).send(response.error.details);
    }
    
    try {
        let getSourceAccInfo = await prisma.bank_Account.findUnique({ // fetch data of source bank account
            where: {
                id: validatedData.source_account_id,
            }
        })

        let getDestAccInfo = await prisma.bank_Account.findUnique({ // fetch data of destination bank account
            where: {
                id: validatedData.destination_account_id
            }
        })

        if(!getSourceAccInfo || !getDestAccInfo){ // if getSourceAccInfo or getDestAccInfo can't find matching data of bank_account's id
            return res.status(409).json({
                status: 'failed',
                message: `Invalid account id`
            })
        } else if(validatedData.source_account_id === validatedData.destination_account_id){ // if the entered source_account_id and destination_account_id have the same id
            return res.status(409).json({
                status: 'failed',
                message: `Cannot do transaction between same account`
            })
        } else if(userId !== getSourceAccInfo.user_id){ // if the authenticated user don't have the entered source account
            return res.status(403).json({
                status: 'failed',
                message: `The source account doesn't belong to this user`
            })
        } else if(validatedData.amount > getSourceAccInfo.balance){ // if entered amount is greater than source bank account's balance
            return res.status(409).json({
                status: 'failed',
                message: `Insufficient balance`
            })
        }

        let transaction = await prisma.transaction.create({ // create transaction data
            data: {
                source_account_id: validatedData.source_account_id,
                destination_account_id: validatedData.destination_account_id,
                amount: validatedData.amount
            }
        })

        let updateSourceAccBalance = await prisma.bank_Account.update({ // update source bank_account's balance data
            where: {
                id: validatedData.source_account_id
            }, 
            data: {
                balance: Number(getSourceAccInfo.balance) - Number(validatedData.amount)
            }
        })

        let updateDestAccBalance = await prisma.bank_Account.update({ // update destination bank_account's balance data
            where: {
                id: validatedData.destination_account_id
            }, 
            data: {
                balance: Number(getDestAccInfo.balance) + Number(validatedData.amount)
            }
        })

        return res.status(201).json({
            status: 'success',
            transaction: transaction,
            source_account: updateSourceAccBalance,
            destination_account: updateDestAccBalance
        }) 
    } catch(err) {
        next(err)
    }
})

/**
 * @swagger
 * /api/v1/transactions/all:
 *   get:
 *     summary: Retrieve all transactions data
 *     description: This endpoint allows only **admin users** to retrieve a list of all transactions, ordered by their ID in ascending order.
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []  # Requires a Bearer token with admin privileges.
 *     responses:
 *       200:
 *         description: Successfully retrieved all transactions data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 transactions_data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       source_account_id:
 *                         type: integer
 *                         example: 1
 *                       destination_account_id:
 *                         type: integer
 *                         example: 2
 *                       amount:
 *                         type: number
 *                         example: 500.00
 *       401:
 *         description: Unauthorized. A valid token is required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       403:
 *         description: Forbidden. Only admin users can access this endpoint.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: Forbidden
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/all', adminMiddleware, async (req, res, next) => {
    try{
        let transactions = await prisma.transaction.findMany({
            orderBy: {
                id: 'asc'
            }
        })

        return res.json({
            status: 'success',
            transactions_data: transactions
        });
    } catch(err) {
        next(err)
    }
})

/**
 * @swagger
 * /api/v1/transactions:
 *   get:
 *     summary: Retrieve authenticated user's transactions
 *     description: This endpoint retrieves all transactions related to the authenticated user, either as the source or destination account holder.
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []  # Requires a Bearer token for authentication.
 *     responses:
 *       200:
 *         description: Successfully retrieved the user's transactions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 transactions_data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       source_account_id:
 *                         type: integer
 *                         example: 1
 *                       destination_account_id:
 *                         type: integer
 *                         example: 2
 *                       amount:
 *                         type: number
 *                         example: 250.00
 *       401:
 *         description: Unauthorized. A valid token is required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/', authMiddleware, async (req, res, next) => {
    const userId = req.user.id;
    try{
        let transactions = await prisma.transaction.findMany({
            orderBy: {
                id: 'asc'
            },
            where: {
                OR: [ // show only source and destination account that related to authenticated user
                    {
                        sourceAccount: {
                            user_id: userId
                        }
                    },
                    {
                        destinationAccount: {
                            user_id: userId
                        }
                    }
                ]
            },
        })

        return res.json({
            status: 'success',
            transactions_data: transactions
        });
    } catch(err) {
        next(err)
    }
})

/**
 * @swagger
 * /api/v1/transactions/{transactionId}:
 *   get:
 *     summary: Retrieve a specific transaction by ID
 *     description: This endpoint retrieves detailed information for a specific transaction. The authenticated user must be involved in the transaction (as the sender or receiver) or have an admin role to access it.
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []  # Requires a Bearer token for authentication.
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The ID of the transaction to retrieve.
 *     responses:
 *       200:
 *         description: Successfully retrieved the transaction details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     source_account_id:
 *                       type: integer
 *                       example: 1
 *                     destination_account_id:
 *                       type: integer
 *                       example: 2
 *                     amount:
 *                       type: number
 *                       example: 100.00
 *                     sourceAccount:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         bank_name:
 *                           type: string
 *                           example: Bank of America
 *                         bank_account_number:
 *                           type: string
 *                           example: 11112222222
 *                         balance:
 *                           type: string
 *                           example: 2000
 *                         user:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: John Doe
 *                     destinationAccount:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 2
 *                         bank_name:
 *                           type: string
 *                           example: Chase Bank
 *                         bank_account_number:
 *                           type: string
 *                           example: 22221111111
 *                         balance:
 *                           type: string
 *                           example: 1000
 *                         user:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: Jane Smith
 *       401:
 *         description: Unauthorized. A valid token is required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       403:
 *         description: Forbidden. The user is not authorized to access this transaction.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: This user is not authorized to access this transaction
 *       404:
 *         description: Transaction not found. No transaction matches the given ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: Transaction with id 1 not found
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/:transaction', authMiddleware, async (req, res, next) => {
    const transactionId = Number(req.params.transaction)
    const userId = req.user.id;
    const role = req.user.role;
    try{
        let transaction = await prisma.transaction.findUnique({
            where: {
                id: transactionId
            },
            include: {
                sourceAccount: {
                    include: {
                        user: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                destinationAccount: {
                    include: {
                        user: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        })

        if(!transaction){ // if no matching data by entered transaction's id
            return res.status(404).json({
                status: 'failed',
                message: `Transaction with id ${transactionId} not found`
            })
        } 
        
        const sourceAccId = transaction.sourceAccount.user_id
        const destAccId = transaction.destinationAccount.user_id
        
        if (sourceAccId !== userId && destAccId !== userId && role !== 'admin'){
            // Check if the authenticated user is involved in the transaction
            // The user must be either the sender (source account owner) or the receiver (destination account owner).
            // Additionally, allow access if the user's role is 'admin'.
            // If none of these conditions are met, deny access with a 403 Forbidden response.
            return res.status(403).json({
                status: 'failed',
                message: `This user is not authorized to access this transaction`
            })
        } else 

        return res.json({
            status: 'success',
            transaction: transaction
        })
    } catch(err) {
        next(err)
    }
})

export default router;