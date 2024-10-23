import Router from 'express-promise-router';
const router = Router();

import Bcrypt from 'bcrypt';
const bcrypt = Bcrypt;

import Jwt from 'jsonwebtoken';
const jwt = Jwt;

import Dotenv from 'dotenv';
const dotenv = Dotenv.config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

import { PrismaClient, Prisma } from '@prisma/client'
const prisma = new PrismaClient()

import validateUser from '../validation/user.js';
import validateCredentials from '../validation/login.js';

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Registers a new user with a hashed password and profile details.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               password:
 *                 type: string
 *                 example: john123
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               identity_type:
 *                 type: string
 *                 enum: [Silver, Gold, Platinum]
 *                 example: Silver
 *               identity_number:
 *                 type: string
 *                 example: 1234567890
 *               address:
 *                 type: string
 *                 example: 123 Main St, Jakarta
 *     responses:
 *       201:
 *         description: User registered successfully.
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
 *                   example: Successfully added John Doe's data
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     password:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Validation error for user input.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: '"name" is not allowed to be empty'
 *                   path:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["name"]
 *                   type:
 *                     type: string
 *                     example: "string.empty"
 *                   context:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         example: "name"
 *                       value:
 *                         type: string
 *                         example: ""
 *                       key:
 *                         type: string
 *                         example: "name"
 *       409:
 *         description: Email already exists.
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
 *                   example: Email has already been taken
 */
router.post('/register', async (req, res, next) => {
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
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user with email and password, and returns a JWT token if successful. Note that the token will expire in 6 hours.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: john123
 *     responses:
 *       200:
 *         description: Successful login.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged in as John Doe
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         password:
 *                           type: string
 *                         role:
 *                           type: string
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Invalid email or password.
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
 *                   example: Invalid email or password
 *       500:
 *         description: Server error.
 */
router.post('/login', async (req, res, next) => {
    const validatedData = {
        email: req.body.email,
        password: req.body.password,
    }; 

    const response = validateCredentials(validatedData)

    if(response.error){ // if the fields don't meet the requirements
        return res.status(400).send(response.error.details)
    }

    try {
        let user = await prisma.user.findUnique({
            where: {
                email: validatedData.email
            }
        })

        if(!user){ // if no email found from the request body
            return res.status(400).json({
                status: 'failed',
                message: `Invalid email or password`
            })
        }

        let isPasswordCorrect = await bcrypt.compare(validatedData.password, user.password)

        if(!isPasswordCorrect){ // if entered password is false or incorrect
            return res.status(400).json({
                status: 'failed',
                message: `Invalid email or password`
            })
        }

        let token = jwt.sign(user, JWT_SECRET_KEY, {expiresIn: '6h'})

        return res.json({
            message: `Logged in as ${user.name}`,
            data: {
                user,
                token
            }
        })

    } catch(err) {
        next(err)
    }
})

/**
 * @swagger
 * /api/v1/auth/authenticate:
 *   get:
 *     summary: Verify JWT authentication
 *     description: Verifies if the provided JWT token is valid. Returns a success message if authenticated, or an error if unauthorized.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User successfully authenticated.
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
 *                   example: Authenticated
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
 *                 error:
 *                   type: string
 *                   example: jwt expired
 *       500:
 *         description: Internal server error.
 */
router.get('/authenticate', (req, res) => {
    const { authorization } = req.headers;

    if(!authorization || !authorization.startsWith('Bearer ')){
        return res.status(401).json({
            status: 'failed',
            message: 'Unauthorized'
        })
    }

    // Extract the token from "Bearer <token>"
    const token = authorization.split(' ')[1];

    jwt.verify(token, JWT_SECRET_KEY, (err) => {
        if(err){
            return res.status(401).json({
                status: 'failed',
                message: 'Unauthorized',
                error: err.message
            })
        }

        return res.json({
            status: 'success',
            message: 'Authenticated'
        })
    })
})

export default router;