import SwaggerUI from 'swagger-ui-express';
const swaggerUI = SwaggerUI;
import swaggerSpec from './swagger.js'

import express from 'express';
const app = express();
import router from './routes/router.js';

const port = 3000;

import CORS from 'cors';
const cors = CORS;

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use(router);
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

app.use(function(req, res, next) {
    return res.status(404).json({
        status: 'failed',
        message: 'Not found'
    })
})

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({
        status: 'failed',
        message: 'Internal server error'
    })
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})