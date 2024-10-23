import Router from 'express-promise-router';
const router = Router();

import { PrismaClient, Prisma } from '@prisma/client'
const prisma = new PrismaClient();

import validateTransaction from '../validation/transaction.js';

import authMiddleware from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';

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