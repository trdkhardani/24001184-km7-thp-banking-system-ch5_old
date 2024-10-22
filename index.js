import express from 'express';
const app = express();
import router from './routes/router.js';

const port = 3000;

app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use(router);

app.use(function(req, res, next) {
    return res.status(404).json({
        status: 'failed',
        message: 'Not found'
    })
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})