import express from 'express';
import bodyParser from 'body-parser';
import {LoadBalancerController} from '../../controller/load-balancer';
import {logger} from '../../utils/logger';
import {LoadBalancerService} from '../../service/load-balancer';
import {Server, ServerStatus} from '../../domain/server';

const port = Number(process.env.PORT) || 8000;
let servers: Server[] = [];

const app = express();

const service = new LoadBalancerService(servers);
const controller = new LoadBalancerController(service);

app.use(bodyParser.json());

app.use('/', controller.getRouter());

app.listen(port, () => {
    logger.info(`Started express server with PORT: ${port}...`);
});