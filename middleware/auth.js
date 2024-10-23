import Jwt from 'jsonwebtoken';
const jwt = Jwt;

import Dotenv from 'dotenv';
const dotenv = Dotenv.config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

import express from 'express';
const app = express();

app.use(async function(req, res, next){
    const { authorization } = req.headers;

    
    try {
        if(!authorization || !authorization.startsWith('Bearer ')){
            return res.status(401).json({
                status: 'failed',
                message: 'Unauthorized'
            })
        }
    
        // Extract the token from "Bearer <token>"
        const token = authorization.split(' ')[1];
        
        jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
            if(err){
                return res.status(401).json({
                    status: 'failed',
                    message: 'Unauthorized',
                    error: err.message
                })
            }
    
            req.user = decoded;
            next();
        })
    } catch(err) {
        next(err);
    }
})

export default app;