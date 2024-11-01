import Router from 'express-promise-router';
const router = Router();

import { PrismaClient, Prisma } from '@prisma/client'
const prisma = new PrismaClient();

import validateAccount from '../validation/account.js';

import authMiddleware from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';

/**
 * @swagger
 * /api/v1/accounts:
 *   post:
 *     summary: Add a new bank account
 *     description: This endpoint allows only **admin users** to create a new bank account for a user, with a starting balance.
 *     tags:
 *       - Accounts
 *     security:
 *       - bearerAuth: []  # This ensures the endpoint is secured with a Bearer token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the user the account belongs to.
 *               bank_name:
 *                 type: string
 *                 example: Bank of America
 *               bank_account_number:
 *                 type: string
 *                 example: 1234567890
 *               balance:
 *                 type: number
 *                 example: 1000.00
 *                 description: Initial balance for the new bank account. Must be positive.
 *     responses:
 *       201:
 *         description: Successfully created the bank account.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: successfully added account for user_id 1
 *       400:
 *         description: Validation error. Invalid input fields or balance is not positive.
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
 *                   example: Balance must be a positive number
 *       403:
 *         description: User's role is not an admin.
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
 *       409:
 *         description: Conflict error. Either the user_id does not exist, or the bank account number already exists.
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
 *                   example: No user with user_id 1
 *       401:
 *         description: Unauthorized. Token is missing or invalid.
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
 */
router.post('/', adminMiddleware, async (req, res, next) => {
    const validatedData = {
        user_id: Number(req.body.user_id),
        bank_name: req.body.bank_name,
        bank_account_number: req.body.bank_account_number,
    };

    const response = validateAccount(validatedData)

    const balance = Number(req.body.balance);

    if(response.error){ // if the fields don't meet the requirements
        return res.status(400).send(response.error.details)
    } else if(isNaN(balance) || balance < 0){ // if the balance is a NaN or negative
        return res.status(400).json({
            status: 'failed',
            message: 'Balance must be a positive number'
        })
    }

    try {
        let account = await prisma.bank_Account.create({
            data: {
                user_id: validatedData.user_id,
                bank_name: validatedData.bank_name,
                bank_account_number: validatedData.bank_account_number,
                balance: balance
            }
        })
        
        return res.status(201).json({
            status: 'success',
            message: `successfully added account for user_id ${account.user_id}`
        })
    } catch(err) {
        if(err.code === 'P2003'){ // if no matching data for entered user_id
            return res.status(409).json({
                status: 'failed',
                message: `No user with user_id ${validatedData.user_id}`
            })
        } else if(err.code === 'P2002'){ // if account number already exists
            return res.status(409).json({
                status: 'failed',
                message: `Bank account number ${validatedData.bank_account_number} has already taken`
            })
        }
        next(err);
    }
})

/**
 * @swagger
 * /api/v1/accounts/all:
 *   get:
 *     summary: Retrieve all bank accounts
 *     description: This endpoint allows only **admin users** to retrieve a list of all bank accounts in the system, ordered by account ID in ascending order.
 *     tags:
 *       - Accounts
 *     security:
 *       - bearerAuth: []  # This ensures the endpoint is secured with a Bearer token
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of all bank accounts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 accounts_data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 1
 *                       bank_name:
 *                         type: string
 *                         example: Bank of America
 *                       bank_account_number:
 *                         type: string
 *                         example: 1234567890
 *                       balance:
 *                         type: number
 *                         example: 1000.00
 *       401:
 *         description: Unauthorized. The request lacks a valid token or the token is invalid.
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
 *                   example: Unauthorized. Please provide a valid token.
 *       403:
 *         description: Forbidden. User does not have admin privileges.
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
 *                   example: Forbidden. Admin access required.
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
router.get('/all', adminMiddleware, async (req, res, next) => {
    try {
        let accounts = await prisma.bank_Account.findMany({
            orderBy: {
                id: 'asc'
            }
        })

        return res.json({
            status: 'success',
            accounts_data: accounts,
        })
    } catch(err) {
        next(err);
    }
})

/**
 * @swagger
 * /api/v1/accounts:
 *   get:
 *     summary: Get authenticated user's bank account information
 *     description: This endpoint retrieves the bank accounts linked to the authenticated user. The request must include a valid JWT token.
 *     tags:
 *       - Accounts
 *     security:
 *       - bearerAuth: []  # This ensures the endpoint is secured with a Bearer token
 *     responses:
 *       200:
 *         description: Successfully retrieved the authenticated user's account data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 account_data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 1
 *                       bank_name:
 *                         type: string
 *                         example: Bank of America
 *                       bank_account_number:
 *                         type: string
 *                         example: 1234567890
 *                       balance:
 *                         type: number
 *                         example: 5000.00
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: John Doe
 *                           email:
 *                             type: string
 *                             example: john@example.com
 *       401:
 *         description: Unauthorized. The request lacks a valid token or the token is invalid.
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
 *                   example: Unauthorized. Please provide a valid token.
 *       404:
 *         description: No account found for the authenticated user.
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
 *                   example: No bank account found for the authenticated user.
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
// get authenticated user account's info
router.get('/', authMiddleware, async (req, res, next) => {
    const userId = req.user.id
    try {
        let account = await prisma.bank_Account.findMany({
            where: {
                user_id: userId
            },
            include: {user: true}
        })

        return res.json({
            status: 'success',
            account_data: account
        })
    } catch(err) {
        next(err);
    }
})

/**
 * @swagger
 * /api/v1/accounts/{accountId}:
 *   get:
 *     summary: Get specific account information
 *     description: Retrieves information for a specific bank account. The authenticated user can only access their own accounts unless they are an admin, in which case they can access all accounts.
 *     tags:
 *       - Accounts
 *     security:
 *       - bearerAuth: []  # The endpoint requires a Bearer token for authentication.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The ID of the bank account to retrieve.
 *     responses:
 *       200:
 *         description: Successfully retrieved the account information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 account_data:
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
 *                       example: 5000.00
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         email:
 *                           type: string
 *                           example: john@example.com
 *       401:
 *         description: Unauthorized. The request lacks a valid token or the token is invalid.
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
 *                   example: Unauthorized. Please provide a valid token.
 *       403:
 *         description: Forbidden. The user does not own the account and is not an admin.
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
 *                   example: This account doesn't belong to this user
 *       404:
 *         description: Account not found.
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
 *                   example: Account with id 1 not found
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
// get specific account info
router.get('/:accountId', authMiddleware, async (req, res, next) => {
    const accId = Number(req.params.accountId);
    const userId = req.user.id;
    const role = req.user.role;
    try {
        let account = await prisma.bank_Account.findUnique({
            where: {
                id: accId, 
            },
            include: {user: true}
        })
        
        if(!account){ // if no matching data by entered account's id
            return res.status(404).json({
                status: 'failed',
                message: `Account with id ${accId} not found`
            })
        } else if(account.user_id !== userId && role !== 'admin'){ // if the authenticated user don't have the entered account and not the admin
            // (only admin can access all accounts)
            return res.status(403).json({
                status: 'failed',
                message: `This account doesn't belong to this user`
            })
        }

        return res.json({
            status: 'success',
            account_data: account
        })
    } catch(err) {
        next(err);
    }
})

/**
 * @swagger
 * /api/v1/accounts/{accountId}:
 *   delete:
 *     summary: Delete a specific bank account
 *     description: This endpoint allows only **admin users** to delete a bank account by its ID.
 *     tags:
 *       - Accounts
 *     security:
 *       - bearerAuth: []  # Requires a Bearer token for admin access
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The ID of the bank account to delete.
 *     responses:
 *       200:
 *         description: Successfully deleted the bank account.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Account with id 1 deleted successfully
 *                 deleted_account:
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
 *                       example: 5000.00
 *       401:
 *         description: Unauthorized. A valid admin token is required.
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
 *                   example: Unauthorized. Please provide a valid token.
 *       403:
 *         description: Forbidden. The user is not authorized to delete the account (only admins can delete).
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
 *                   example: Forbidden. Admin access required.
 *       404:
 *         description: Account not found. No account matches the given ID.
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
 *                   example: Account with id 1 not found
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
router.delete('/:accountId', adminMiddleware, async (req, res, next) => {
    const accId = Number(req.params.accountId);
    try {
        let account = await prisma.bank_Account.delete({
            where: {
                id: accId
            }
        })

        return res.json({
            status: 'success',
            message: `Account with id ${accId} deleted successfully`,
            deleted_account: account
        })
    } catch(err) {
        if(err.code === 'P2025'){ // if no matching data by entered account's id
            return res.status(404).json({
                status: 'failed',
                message: `Account with id ${accId} not found`
            })
        }
        next(err)
    }
})

export default router;