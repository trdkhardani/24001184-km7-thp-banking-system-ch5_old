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

import validateCredentials from '../validation/login.js';

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

        let token = jwt.sign(user, JWT_SECRET_KEY)

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

export default router;