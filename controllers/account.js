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