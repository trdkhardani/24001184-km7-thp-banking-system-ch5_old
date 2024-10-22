import Jwt from 'jsonwebtoken';
const jwt = Jwt;

import Dotenv from 'dotenv';
const dotenv = Dotenv.config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

import express from 'express';
const app = express();

import authMiddleware from './auth.js'

app.use(authMiddleware, function(req, res, next){
    const role = req.user.role

    if(role !== 'admin'){
        return res.status(403).json({
            status: 'failed',
            message: 'Forbidden'
        })
    }

    next();
})

export default app;