import Router from 'express-promise-router';
const router = Router();

import Bcrypt from 'bcrypt';
const bcrypt = Bcrypt;

import { PrismaClient, Prisma } from '@prisma/client'
const prisma = new PrismaClient()

import validateUser from '../validation/user.js';

import authMiddleware from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';

router.post('/', async (req, res, next) => {
    const validatedData = {
        name: req.body.name,
        password: req.body.password,
        email: req.body.email,
        identity_type: req.body.identity_type,
        identity_number: req.body.identity_number,
        address: req.body.address,
    }; 

    const response = validateUser(validatedData)

    if(response.error){ // if the fields don't meet the requirements
        return res.status(400).send(response.error.details)
    }
    
    let hashedPassword = await bcrypt.hash(validatedData.password, 10) // hash password

    try{
        let user = await prisma.user.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword,
                profile: {
                    create: 
                        {
                            identity_type: validatedData.identity_type,
                            identity_number: validatedData.identity_number,
                            address: validatedData.address
                        }
                }
            },
        })

        return res.status(201).json({
            status: 'success',
            message: `Successfully added ${user.name}'s data`,
            user: user,
        })
    } catch(err){
        if(err.code === 'P2002'){ // if email already exists
            return res.status(409).json({
                status: 'failed',
                message: "Email has already been taken"
            })
        }
        next(err)
    }
})

/**
 * @swagger
 * /api/v1/users/all:
 *   get:
 *     summary: Retrieve all users' data
 *     description: This endpoint allows only **admin users** to retrieve a list of all registered users, ordered by their ID in ascending order.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []  # Requires a Bearer token with admin privileges.
 *     responses:
 *       200:
 *         description: Successfully retrieved all users' data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 users_data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: John Doe
 *                       email:
 *                         type: string
 *                         example: john@example.com
 *                       role:
 *                         type: string
 *                         example: admin
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2023-10-23T12:34:56.789Z
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
 *                   example: Unauthorized. Please provide a valid token.
 *       403:
 *         description: Forbidden. The user does not have admin privileges.
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
router.get('/all', adminMiddleware, async (req, res) => {
    let users = await prisma.user.findMany({
        orderBy: {
            id: 'asc'
        }
    })

    return res.json({
        status: 'success',
        users_data: users,
    })
})

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get authenticated user's info
 *     description: Retrieves the information of the authenticated user, including their profile details.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []  # This indicates the endpoint requires a Bearer token
 *     responses:
 *       200:
 *         description: Successfully retrieved user's info.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 user_data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 4
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       example: john@example.com
 *                     password:
 *                       type: string
 *                       example: $2a$12$0YkhPrnyJ5F.7BQjxZVe7u7zQMq9sOHVuO5grpxoOgAi5S8OStZ9W
 *                     role:
 *                       type: string
 *                       example: customer
 *                     profile:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         user_id:
 *                           type: integer
 *                           example: 4
 *                         identity_type:
 *                           type: string
 *                           example: KTP
 *                         identity_number:
 *                           type: string
 *                           example: 1234567890
 *                         address:
 *                           type: string
 *                           example: 123 Main St, Jakarta
 *       404:
 *         description: User not found.
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
 *                   example: User with id 4 not found
 *       401:
 *         description: Unauthorized. Bearer token is missing or invalid.
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
router.get('/', authMiddleware, async (req, res, next) => {
    const userId = req.user.id // fetch from decoded token in authMiddleware
    
    try {
        let user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            include: {profile: true}
        })
    
        if(!user){ // if no matching data by entered user's id
            return res.status(404).json({
                status: 'failed',
                message: `User with id ${userId} not found`
            })
        }

        return res.json({
            status: 'success',
            user_data: user,
        })
    } catch(err) {
        next(err)
    }
})

export default router;