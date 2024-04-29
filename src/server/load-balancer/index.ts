import express from 'express';
import bodyParser from 'body-parser';
import {LoadBalancerController} from '../../controller/load-balancer';
import {logger} from '../../utils/logger';
import {LoadBalancerService} from '../../service/load-balancer';
import {Server, ServerStatus} from '../../domain/server';

const port = Number(process.env.PORT) || 8000;
const serverCount = Number(process.env.SERVER_COUNT) || 3;
let servers: Server[] = [];

const app = express();

// for (let i=0; i<serverCount; i++) {
//     servers.push({
//         host: 'localhost',
//         port: 3000 + i,
//         status: ServerStatus.AVAILABLE
//     });
// }

const service = new LoadBalancerService(servers);
const controller = new LoadBalancerController(service);

app.use(bodyParser.json());

app.use('/', controller.getRouter());

app.listen(port, () => {
    logger.info(`Started express server with PORT: ${port}...`);
});