import express from 'express';
import bodyParser from 'body-parser';
import { MainController } from '../../controller/main';
import { logger } from '../../utils/logger';
import axios from "axios";

const port = process.env.PORT || 3000;
const app = express();
const controller = new MainController();

app.use(bodyParser.json());

app.use('/', controller.getRouter());

app.listen(port, () => {
    logger.info(`Started express server with PORT: ${port}...`);

    axios({
        method: 'PATCH',
        url: 'http://localhost:8000/server',
        data: {
            append: {
                host: 'localhost',
                port,
                healthyCount: 0,
                errorCount: 0,
                slowCount: 0
            }
        }
    }).then((response) => {
        logger.info('OK');
    })
});